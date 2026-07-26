# S1 本机谱项目声部组生命周期验收

## 定位

本切片承接多谱表／多声部定向编辑，使用户能够在现有本机谱项目中新增和安全删除
声部组（part）。它是 S1 结构基础的收尾，也是进入 S2 乐器、模板与分谱管理前的
最小桥接。

本切片不升级 `ScoreDocument` 或 IndexedDB schema。现有 `score-document-v3` 与
`local-score-project-storage-v4` 已原生保存完整 `parts[]`。

## 领域语义

- 新增声部组必须接收显式、全项目唯一且合法的 `partId`、`staffId` 与 `voiceId`。
- 新声部组固定包含一个 `pitched` 谱表和一个空声部；谱号只允许当前支持的高音或
  低音谱号。
- 新声部组的空小节编号取当前完整文档所有声部的小节号去重升序并集，并始终包含
  第 1 小节；不得复制任何事件、歌词、延音关系或选择状态。
- 只允许删除所有谱表、声部和小节都没有事件的声部组；完整文档至少保留一个声部组。
- 缺失目标、重复或非法 ID、非法谱号、非空目标、最后一个目标、旧 revision、
  非法时间或设备时钟回退都必须拒绝，canonical 项目不得变化。
- 每个成功命令只增加一个连续 document revision，复用现有 CAS、时间、内容校验、
  undo／redo 与 redo 清空语义。

## UI 与持久化

- “声部组”选择器旁提供“新增声部组”和“删除空声部组”操作，使用简体中文说明。
- 新增成功后可选择新声部组并在其首个谱表／声部中定向编辑；其他声部组的身份、
  事件、歌词与小节位置不得被删除、重排或改写。
- 删除当前空声部组后，稳定回退到剩余的首个声部组及其首个谱表／声部，并清除不再
  适用的事件选择和复制板。
- 所有结构写入继续先持久化、成功后发布。事务、容量、CAS 或存储失败时不得出现
  UI-only 幽灵声部组，最后保存的 canonical 项目保持可用。
- 新增／删除在播放、节拍器、settings autosave dirty／saving／deferred 或恢复候选
  待处理时禁用，handler 同时 fail closed；普通声部组切换仍可进行且不得停止或重建
  正在运行的完整文档 transport。
- undo／redo、返回列表与重新打开后，声部组结构和当前完整项目内容保持一致。

## Presentation 与播放

- 五线谱与固定 C 简谱继续接收精确
  `partId + staffId + voiceId`；新声部组可被精确呈现。
- 指定 tuple 缺失时继续 fail closed；省略目标时仍兼容默认第一声部组／谱表／声部。
- 播放计划继续消费完整 canonical document，不因当前编辑声部组而缩窄。

## 自动验收

- domain 测试覆盖新增、全谱小节并集、唯一 ID、非法输入、CAS、时钟、连续 revision、
  删除空目标、拒绝非空／最后目标，以及 undo／redo。
- mounted Panel 测试覆盖新增、选择、定向编辑、失败无幽灵状态、播放／autosave 互斥、
  删除回退、撤销／重做和重新打开。
- storage、capacity、IndexedDB recovery 与 recovery candidate 回归证明完整多声部组
  项目仍按现有协议 round-trip，失败不会发布未保存结构。
- 相关 focused tests、`npm run lint`、`npm run typecheck`、`npm run check` 与
  `git diff --check` 必须通过。

## 明确不做

- 声部组名称、乐器、移调、排序、复制或分谱。
- 跨声部组移动／粘贴、逐声部 mute／solo／音量／声像或单独播放。
- 模板、同屏总谱排版、跨谱表连谱号、大谱表括号或分页。
- S2 高级符号、tab／鼓／古筝谱种、MusicXML／MXL／MIDI 或视觉／音频导出。
- OMR、云同步、版本比较、教师批注或协作。

## 门禁与证据边界

QA level recommendation：`strict`。本切片改变核心谱面层级、revision、undo／redo、
持久化与播放文档。

桌面浏览器、Android WebView、Android 真机、多指／旋转、低存储、后台恢复和进程
强杀均保持 `NOT_EXECUTED`，直到取得对应人工证据；自动测试和 CI Debug APK 不能
替代这些证据。
