# S1 本机谱项目恢复候选协议验收

## 完成范围

- 新增独立、版本化的 `local-score-project-recovery-v1` 协议，用于在后续自动保存
  与中断恢复切片中保存一个已经通过领域校验、但尚未提升为 canonical 项目的候选。
- 恢复候选不是新的 `ScoreDocument` 或正式项目版本，不修改当前
  `score-document-v3` 或 `local-score-project-storage-v4`。
- IndexedDB database version 从 1 升到 2；upgrade 只新增
  `recovery-candidates` object store 与 `projectId` index，不读取、迁移或覆写
  既有 `projects` 记录。
- 协议字段严格限定为：
  `schemaVersion`、`candidateId`、`projectId`、`documentId`、
  `baseRevision`、`baseFingerprint`、`candidateSequence`、`capturedAt`、
  `proposedProject`。
- `baseFingerprint` 必须是对经过当前 parser 完整规范化后的 canonical 基项目 JSON
  计算的确定性双 64-bit FNV-1a 指纹，严格格式为
  `fnv1a64x2-u16le:<16 位小写十六进制>:<16 位小写十六进制>`。该指纹只用于发现
  同 revision 下的内容替换或错误基项目，不是密码学摘要，不提供认证或防篡改安全。
- create 必须接收完整 `baseProject`，由它生成 `baseRevision` 与
  `baseFingerprint`；基项目和 proposed project 的 project id、document id 与
  `createdAt` 必须一致，proposed document revision 必须恰好等于基项目 revision
  加一。
- `proposedProject` 必须是可由当前本机谱项目 parser 接受的完整项目，其 project id
  与 document id 必须与恢复候选信封一致，document revision 必须恰好等于
  `baseRevision + 1`。
- `candidateId` 必须为非空、有限长度标识；`baseRevision` 与
  `candidateSequence` 必须为正安全整数，且不得等于 `Number.MAX_SAFE_INTEGER`；
  `capturedAt` 必须是规范 ISO 时间。
- parser 对缺失、多余、错误类型、未来 schema、损坏 embedded project、身份不一致
  或 revision 不连续全部 fail closed，且不得修改输入。
- create、parse 与 clone 返回的候选必须深克隆 embedded project、document、
  source、key signature、parts、events 和 undo/redo history，避免调用方修改原对象
  后污染已验证候选。
- stage 必须校验 canonical 项目的 base revision 与 base fingerprint 仍等于候选，
  并用 `candidateSequence` CAS 拒绝迟到写入；list 必须按项目索引读取、排序并返回
  深克隆。
- 每个项目最多保留一个 recovery candidate；同项目不同 `candidateId` 必须冲突，
  同一 candidate 只能按严格连续 sequence 替换。
- recovery-candidates 使用独立 5 MiB 总容量上限；替换按“总量减旧候选再加新候选”
  计算，超限只拒绝候选写入，canonical 项目与既有候选保持不变。
- promote 必须在 `projects + recovery-candidates` 同一个 readwrite transaction 内
  重读候选与 canonical 项目，校验候选 sequence、document identity、base revision
  、base fingerprint 和容量；成功时写入完整 proposed project 并删除精确候选，
  任一失败时两边都回滚。
- 删除项目必须在同一个 transaction 内连带删除该项目全部恢复候选，候选不得复活
  已删除项目。

## 自动测试

- 有效候选创建、解析、序列化和反序列化保持确定性。
- clone 与 parse 结果不共享 proposed project、document、key signature、parts、
  event 或 history 引用。
- 输入对象在解析前后保持字节等价。
- 缺失字段、额外字段、空/过长 candidate id、非法 revision/sequence/time、
  非法 fingerprint、future schema 和损坏 proposed project 全部拒绝。
- project id、document id 或 proposed revision 与候选信封不一致时拒绝。
- create 拒绝无关的合法基项目、改变 `createdAt` 的 proposed project，以及不连续的
  revision；提供 canonical 基项目解析时拒绝合法格式但内容被篡改的 fingerprint。
- 即使重建的基项目复用了相同 project id、document id、revision 与 `createdAt`，
  只要 canonical 内容不同，其 fingerprint 也必须不同，候选不得提升到原基项目。
- `test:local-score-project-recovery-candidate` 在 `package.json` 中定义一次，并在
  Quality workflow 中恰好执行一次；workflow coverage test 继续通过。
- database v1 → v2 upgrade 保留既有 raw project 字节内容，并创建正确 store/index。
- stage/reopen/project index、sequence CAS、成功 promote、write/capacity 原子回滚、
  discard、stale canonical conflict 和项目删除级联均有 fake IndexedDB 回归。
- 同项目第二 candidate id、sequence 跳号/MAX、同 ID 替换不增长数量，以及独立
  recovery 5 MiB 总容量失败均有回归。

## 明确不做

- React 自动保存 coordinator、debounce、页面/应用生命周期 flush 或恢复 UI。
- 自动合并、多标签页冲突解决、另存为副本或删除候选。
- 自动恢复播放、节拍器、光标、选择、复制板或任何音频状态。
- 修改 canonical `ScoreDocument`、项目 storage schema、项目 revision 或历史。

## 失败语义

- recovery 容量、浏览器 quota、写入、事务或 CAS 失败时，不删除或覆盖 canonical
  项目，也不自动清理既有候选；调用方必须明确告知候选是否仍可恢复。
- candidate 结构损坏或未来版本继续 fail closed，不得为“继续自动保存”而静默覆盖。

## 门禁与证据边界

- `npm run test:local-score-project-recovery-candidate`
- `npm run test:local-score-project-indexeddb-recovery`
- `npm run test:local-score-project-storage`
- `npm run test:local-score-project-capacity`
- `npm run test:quality-workflow-test-coverage`
- `npm run lint`
- `npm run typecheck`
- `npm run check`
- `git diff --check`

本切片证明协议、fake IndexedDB upgrade、CAS 与事务回滚；不证明真实浏览器或设备的
掉电 durability、浏览器关闭前保存、Android 进程强杀恢复或 UI 自动保存。

QA level recommendation：`strict`。本切片改变 IndexedDB runtime 结构和跨 store
事务；Browser、Android WebView、Android 真机、低存储与强杀恢复均仍为
`NOT_EXECUTED`。
