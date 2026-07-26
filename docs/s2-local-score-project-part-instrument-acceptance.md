# S2 本机谱项目声部组乐器归属验收

## 定位

本切片承接 canonical 声部组名称，为每个声部组保存稳定、可迁移的乐器归属，使多
声部项目能表达基础编制。归属是乐谱语义，不是本地音色资源 ID；现有六个离线钢琴
预设仍是同一合法钢琴采样的演奏 profile，不得冒充六种乐器。

本切片严格依赖声部组名称 PR，升级到 `score-document-v5` 与
`local-score-project-storage-v6`。读取旧数据只在内存中迁移，不因打开项目自动
写回；下一次显式保存才持久化新版本。

## Canonical 语义

- 每个 `parts[]` 项必须保存以下 exact union 之一：
  - `{ kind: "unassigned" }`；
  - `{ kind: "gm1-program", program: 0..127 的安全整数 }`。
- GM1 program 在 canonical 中固定使用 MIDI Program Change 的 0-based 编号；
  中文显示和任何 1-based 外部格式映射只能位于 adapter／UI 边界。
- `instrument` 不保存 UI 中文名、本地 provider、采样版本、资源包 ID、许可或下载
  状态。后续合法资源包必须由独立 capability resolver 解析。
- storage v1–v5、`score-document-v1`–v4 及其 undo／redo content 在读取时为每个
  part 获得 `{ kind: "unassigned" }`，并迁移为 v6／v5；迁移不得原地修改输入。
- 新建项目和新增声部组同样默认“未指定”，不得把历史或 generic part 自动认定为
  钢琴。
- 名称与乐器归属相互独立；改变归属不得自动改名、谱号、调号、实际音高或结构。
- 同一项目可有多个相同归属。身份和所有定向操作仍只使用稳定 `partId`。

## 领域命令

- 导出
  `changeLocalScoreProjectPartInstrument({ project, expectedRevision, partId, instrument, now })`。
- 命令必须精确匹配一个 `partId`，校验 exact union、program 范围、CAS、时间和
  连续 revision，并复用现有 undo／redo 与 redo 清空语义。
- normalized 后相同的归属返回原项目，不产生 revision；非法 kind、额外字段、
  非整数、越界、缺失目标、旧 revision 或时钟回退都必须拒绝且 canonical 不变。
- clone、content fingerprint、serialization、capacity、recovery candidate 与
  IndexedDB round-trip 必须包含深拷贝后的 `instrument`。

## UI 与持久化

- 当前声部组名称区提供“谱面乐器归属”选择器和显式“保存乐器归属”操作，并显示
  canonical “当前已保存”值。
- 首批选择只开放“未指定”、大钢琴（GM1 0）、小提琴（40）、中提琴（41）、
  大提琴（42）、弦乐合奏（48）和长笛（73）；暂不开放移调乐器或打击乐。
- 选择值只是 draft。事务、容量、CAS 或存储失败时不得出现 canonical 幽灵归属，
  最后保存值保持可见，draft 保留以便重试。
- 未变化时不创建 revision，并给出明确状态。切换声部组、删除回退、撤销／重做、
  返回列表和重新打开后，draft 必须跟随当前 canonical part。
- 保存归属复用结构写入互斥：播放、节拍器、settings autosave
  dirty／saving／deferred 或恢复候选待处理时禁用，handler 同时 fail closed。
- 普通声部组切换仍可进行，且不得停止或重建正在运行的完整文档 transport。
- UI 必须明确说明：“当前只记录谱面乐器归属；所有声部仍使用钢琴采样预览。”

## Presentation 与播放

- v5 文档保持 v1–v4 的 presentation／playback 兼容；定位、pointer identity 和
  编辑目标继续使用 `partId + staffId + voiceId`。
- instrument 不进入当前 playback note event、provider 选择、音高、时值或完整文档
  voice selection。非钢琴归属不得被描述为已经播放真实对应音色。
- 仅 instrument 不同、其余内容相同的文档应生成等价音符与时序计划；document
  revision／schedule identity 允许按既有规则不同。

## 自动验收

- domain 测试覆盖默认值、0／127 边界、非法 union／program、精确目标、CAS、时钟、
  no-op、连续 revision、redo clear、undo／redo、同归属和其他结构不变。
- migration 测试覆盖 storage v1–v5、document v1–v4、undo／redo content，
  并证明纯读取不自动写回且输入不被原地修改。
- mounted Panel 测试覆盖多 part 导航、显式保存、失败无 ghost、重试、播放中切换
  不停止、autosave／recovery 互斥、undo／redo、新增默认值和重新打开。
- storage、capacity、IndexedDB recovery、recovery candidate、staff/numbered
  presentation、playback 与 transport 回归必须通过。
- 相关 focused tests、`npm run lint`、`npm run typecheck`、`npm run check` 与
  `git diff --check` 必须通过。

## 明确不做

- 按声部播放音色／音频路由、mute／solo／音量／声像或真实多乐器采样。
- MIDI channel／bank、MusicXML instrument 映射或资源包下载／许可解析。
- 移调、书写音高与实音转换、音域、自动谱号、打击乐／channel 10。
- TAB、古筝谱、自定义乐器库、模板、排序、分谱、总谱括号与页面排版。

## 门禁与证据边界

QA level recommendation：`strict`。本切片改变 canonical 谱面 schema、revision、
undo／redo和持久化，并跨越播放兼容边界。

桌面浏览器、Android WebView、Android 真机、听感、低存储、后台恢复和进程强杀均
保持 `NOT_EXECUTED`，直到取得对应人工证据；自动测试和 CI Debug APK 不能替代这些
证据。
