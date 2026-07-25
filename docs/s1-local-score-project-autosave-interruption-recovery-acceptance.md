# S1 本机谱项目自动保存与中断恢复验收

## 完成范围

- 自动保存只覆盖项目标题与合法整数 BPM 设置；标题复用现有规范化规则，BPM
  必须在 30–240 范围内。
- 标题或 BPM 输入停止变化 600 ms 后，才允许生成一次 canonical settings
  修改。两项必须由同一领域命令合并保存，成功只产生一个连续 document revision。
- 标题与 BPM 均与 canonical 项目相同时为 no-op，不更新 `updatedAt`，不增加
  revision，也不写恢复候选。
- settings 修改复用现有 expected revision CAS、ISO 时间与设备时钟回退检查；
  成功不加入或清空谱面 content undo/redo history，保持既有重命名与速度修改语义。
- 谱面结构修改和新增、更新、移动、粘贴、删除事件继续由用户显式保存；本切片不得
  把这些操作纳入 600 ms 自动保存。
- 每次自动保存必须先以当前 canonical 项目为 base stage 一个完整 recovery
  candidate，再通过 `projects + recovery-candidates` 同一 readwrite transaction
  atomic promote。不得绕过候选直接覆盖 canonical 项目。
- 播放或节拍器状态不是 `idle` 时，600 ms debounce 后允许先 stage 已验证的恢复
  候选，但必须 defer canonical promote；回到 `idle` 后重新核对当前 canonical
  revision、草稿值和候选身份，再安全提升。暂存与提升均不得停止或重建播放状态。
- stage、promote、容量、quota、事务、CAS 或时钟失败时，canonical 项目保持不变；
  UI 必须保留可重试草稿并显示简体中文失败原因，不得宣称已保存。
- 打开项目发现有效 recovery candidate 时，必须显式提供“恢复修改”和“丢弃候选”
  两条路径。不得静默提升、覆盖 canonical 项目或自动合并冲突候选。
- 恢复只恢复 candidate 中已经通过领域校验的项目数据；不恢复或自动启动播放、
  节拍器、音频上下文，不恢复五线谱/简谱视图、播放光标、选区或复制板。
- `pagehide` 只允许触发 best-effort stage/flush；它不是 durability 保证，不能作为
  canonical promote 成功或 Android 进程强杀恢复证据。

## 状态与并发语义

- 每个待保存 settings 草稿绑定它读取时的 canonical project、document identity、
  base revision 与 base fingerprint。
- 新输入会取消旧 600 ms timer；若旧异步流程尚未进入 atomic promote，则 generation
  检查会停止或替换旧候选。若 storage 已开始不可取消的 atomic promote，捕获的旧
  settings 快照可能先成为一个连续 canonical revision，但迟到结果不得覆盖编辑器
  中更新的输入，协调器必须继续把最新草稿保存为下一 revision。
- 项目切换或返回列表后，旧流程不得重新发布或重新打开原项目；已 stage 但未提升的
  候选留待下次显式恢复或丢弃。
- 多标签页、重开页面或并发 writer 造成 base revision/fingerprint 不匹配时 fail
  closed，保留 canonical 项目与可检查候选，要求用户重新加载或显式处理。当前会话
  在 stage 前发现不属于自己的候选时，不得递增 sequence 覆盖，必须转入显式恢复或
  丢弃流程。
- 用户选择丢弃候选时只删除精确 candidate；删除失败必须继续显示候选，不得假装
  已丢弃。
- 用户选择恢复时必须使用 storage 层 atomic promote；成功后删除精确候选并加载
  promoted canonical 项目，失败时两边均保持原状。

## 自动验收

- 领域测试覆盖标题+BPM 联合修改只增加一个 revision、标题规范化、合法 BPM、
  同值 no-op、stale revision、时钟回退与非法 BPM。
- 联合 settings 修改前后 content 与 undo/redo history 保持一致；既有 rename 与
  change tempo 入口继续保持相同领域语义。
- coordinator 测试使用可控时钟证明 599 ms 不保存、600 ms 才开始保存；后续输入
  取消旧 timer，结构/事件修改不触发自动保存。
- 播放与节拍器任一非 idle 时，允许在 debounce 后 stage 一次候选但不 promote；
  相同草稿不得重复改写候选，回到 idle 后按最新 canonical 状态提升或重新调度。
- 自动保存严格证明 stage 先于 promote；stage/promote 失败、stale CAS、容量与
  quota 均不改变 canonical 项目，并保留正确重试/恢复状态。
- 重开项目只为 storage 层已验证的候选展示显式恢复/丢弃；损坏、未来版本、身份
  不一致、revision 或 fingerprint 冲突由 recovery protocol 与 storage focused
  tests 证明 fail closed。
- 恢复与丢弃测试证明播放、节拍器、音频、视图、光标、选区和复制板均不恢复。
- 本切片不依赖 `pagehide` 发起保存；600 ms 后已完成的 candidate stage 是当前
  中断恢复证据。未来若增加 lifecycle flush，其测试只能断言发起 best-effort
  行为，不得把异步完成当成 unload 保证。

## 明确不做

- 谱面结构或事件的自动保存、后台周期保存、跨设备同步或云端备份。
- 自动合并、多标签页冲突解决、候选“另存为副本”或静默选择较新版本。
- 播放、节拍器、音频、视图、光标、选区、复制板的中断恢复。
- 依赖 `beforeunload` / `pagehide` 保证 IndexedDB 写入完成。
- 修改 `score-document-v3`、`local-score-project-storage-v4` 或 recovery protocol
  schema。

## 门禁与证据边界

- `npm run test:local-score-project`
- 自动保存 coordinator 与恢复 UI focused tests
- `npm run test:local-score-project-recovery-candidate`
- `npm run test:local-score-project-indexeddb-recovery`
- `npm run test:local-score-project-storage`
- `npm run test:local-score-project-capacity`
- `npm run lint`
- `npm run typecheck`
- `npm run check`
- `git diff --check`

本切片的自动测试只能证明领域、协调器与 fake IndexedDB 中断恢复语义；不能证明真实
浏览器关闭、掉电、Android 进程强杀或 WebView 后台回收时一定完成写入。

QA level recommendation：`strict`。自动保存改变 canonical 持久化时机，中断恢复
改变用户重新进入项目时的核心流程。桌面浏览器、Android WebView、Android 真机、
低存储、后台回收与强杀恢复均必须保持 `NOT_EXECUTED`，直到取得对应实测证据。
