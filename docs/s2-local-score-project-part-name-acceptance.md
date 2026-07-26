# S2 本机谱项目声部组名称验收

## 定位

本切片承接 S1 声部组生命周期，把声部组名称纳入 canonical 乐谱文档，使用户能在
本机谱项目中识别和重命名多个声部组。名称不是 UI-only 别名；它必须随文档、
撤销／重做、恢复候选和持久化一起演进。

本切片升级到 `score-document-v4` 与
`local-score-project-storage-v5`。读取旧数据只在内存中迁移，不因打开项目自动
写回；下一次显式保存才持久化新版本。

## 领域语义

- 每个 `parts[]` 项必须保存 `name`；身份和所有定向操作仍只使用稳定 `partId`。
- 名称先 trim，结果必须非空、最多 40 个 Unicode code point，且不得包含 C0／C1
  控制字符。非法输入必须拒绝，canonical 项目不得变化。
- 名称不要求唯一；真实编制允许同名声部组。选择器必须以稳定序号消除同名歧义，
  不能把显示名称当作定位键。
- storage v1–v4、`score-document-v1`–v3 及其 undo／redo content 在读取时按
  `parts[]` 顺序获得确定性名称“声部组 1”“声部组 2”……，并迁移为 v5／v4。
- 新增声部组默认使用尚未占用的最小“声部组 N”；不能只用 `parts.length + 1`，
  以免删除后与保留名称冲突。
- 重命名必须精确匹配一个 `partId`，并复用现有 CAS、时钟、连续 revision、
  undo／redo和 redo 清空语义。成功命令只增加一个 revision。
- 名称变化不得改写或重排任何谱表、声部、小节、事件、歌词、延音、谱号或调号。

## UI 与持久化

- “声部组”选择器显示 canonical 名称与稳定序号；同名项仍可明确选择。
- 当前声部组提供简体中文名称输入与“保存名称”操作。输入无效、没有变化或结构写入
  被禁用时，给出明确状态且不产生无效 revision。
- 重命名继续先持久化、成功后发布。事务、容量、CAS 或存储失败时不得出现 UI-only
  幽灵名称，最后保存的 canonical 项目保持可用。
- 重命名在播放、节拍器、settings autosave dirty／saving／deferred 或恢复候选
  待处理时禁用，handler 同时 fail closed；普通声部组切换仍可进行且不得停止或
  重建正在运行的完整文档 transport。
- 新增后自动选中使用生成的 canonical 名称；删除、撤销／重做、返回列表和重新打开
  后，名称与当前文档保持一致。

## Presentation 与播放

- 五线谱、固定 C 简谱、播放计划和编辑定位继续使用
  `partId + staffId + voiceId`；名称不得参与解析或缩窄播放文档。
- v4 文档必须保持现有 v3 的谱号、调号、多声部和完整文档播放行为。
- 切换声部组或五线谱／固定 C 简谱不得因名称支持而停止播放；成功结构写入仍遵循
  现有保存后停止 transport 的规则。

## 自动验收

- domain 测试覆盖名称校验、同名允许、精确目标、CAS、时钟、连续 revision、
  无效输入不变、默认名称分配，以及 undo／redo。
- migration 测试覆盖 storage v1–v4、document v1–v3、undo／redo content，
  并证明纯读取不自动写回。
- mounted Panel 测试覆盖显示、同名消歧、重命名、失败无幽灵状态、播放／autosave
  互斥、普通切换不中断播放、撤销／重做和重新打开。
- storage、capacity、IndexedDB recovery 与 recovery candidate 回归证明 v5
  名称完整 round-trip，失败不会发布未保存名称。
- 相关 focused tests、`npm run lint`、`npm run typecheck`、`npm run check` 与
  `git diff --check` 必须通过。

## 明确不做

- 乐器、移调、声部排序／复制、模板、分谱、同屏总谱排版。
- 逐声部 mute／solo／音量／声像、播放音色或音频路由。
- 跨谱表连谱号、大谱表括号、分页或 S2 高级符号。
- MusicXML／MXL／MIDI 或视觉／音频导出、OMR、云同步、协作与教师批注。

## 门禁与证据边界

QA level recommendation：`strict`。本切片改变 canonical 谱面 schema、revision、
undo／redo、持久化和播放文档兼容边界。

桌面浏览器、Android WebView、Android 真机、多指／旋转、低存储、后台恢复和进程
强杀均保持 `NOT_EXECUTED`，直到取得对应人工证据；自动测试和 CI Debug APK 不能
替代这些证据。
