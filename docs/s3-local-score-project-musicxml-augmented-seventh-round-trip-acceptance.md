# S3 MusicXML／MXL 增七和弦严格 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- 在既有受控 `chordSymbol` 双向映射上只增加一种和弦类别：
  `Caug7` ↔ `<kind>augmented-seventh</kind>`。
- 根音仍只允许 `A–G`，以及可选的单个 ASCII `#`／`b`；因此新增 21 个确定性组合。
- MusicXML 与 MXL 的 note/rest 锚定、harmony 结构、踏板共存顺序、blocking ledger、
  明确确认、re-import 和 legacy parser 边界全部复用既有严格门禁。
- 不修改 canonical schema、storage version、迁移链、编辑器、谱面显示或播放语义。

## 失败关闭边界

- `C+7`、`C+` 或其他 alias 不得归一化为 `Caug7`。
- `Caug`／`augmented` 不得与 `Caug7`／`augmented-seventh` 混同或互相降级。
- diminished-seventh、half-diminished、其他七和弦、sus／add／扩展音继续 blocking。
- slash／bass／inversion、双升降、Unicode 升降号、属性、额外节点、错序、重复、
  namespace／大小写变体及非规范间隔继续 blocking。
- blocking 输入不得分配 canonical event ID，也不得静默删除或改变和弦语义。

## 自动验收

- 纯映射覆盖 augmented-seventh、全部 7 个自然根音及其单升／单降形式。
- XML 与 MXL 都以 pitched note 上的 `C#aug7`、rest 上的 `Dbaug7` 验证 exact
  import；导出 fixture 验证 `<kind>augmented-seventh</kind>` 和 exact re-import。
- `C+7` alias、普通 augmented 三和弦、未知 kind、结构变体和所有既有 blocker
  保持失败关闭。
- focused import/export、typecheck、documentation hygiene、完整 check、Android
  本地门禁和 `git diff --check` 必须通过。

## 外部证据

真实浏览器导入／下载／重开、Android WebView／真机、MuseScore／Dorico／Sibelius
中的显示、布局、重开与真实播放继续为 `NOT_EXECUTED`。教师审核、目标用户验证和
教育有效性也为 `NOT_EXECUTED`。

本切片不是完整和弦系统、完整 MusicXML/MXL、完整 S3 或正式版 V1。
