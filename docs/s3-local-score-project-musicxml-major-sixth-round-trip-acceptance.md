# S3 MusicXML／MXL 大六和弦严格 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- 在既有受控 `chordSymbol` 双向映射上只增加一种和弦类别：
  `C6` ↔ `<kind>major-sixth</kind>`。
- 根音仍只允许 `A–G`，以及可选的单个 ASCII `#`／`b`；因此新增 21 个确定性组合。
- MusicXML 与 MXL 的 note/rest 锚定、harmony 结构、踏板共存顺序、blocking ledger、
  明确确认、re-import 和 legacy parser 边界全部复用既有严格门禁。
- 不修改 canonical schema、storage version、迁移链、编辑器、谱面显示或播放语义。

## 失败关闭边界

- `Cmaj6` 或其他 alias 不得归一化为 `C6`。
- `C6`／`major-sixth` 不得与 `Cm6`／`minor-sixth`、major 或其他 kind 混同或降级。
- sus／add／扩展音及其他未列出的和弦类别继续 blocking。
- slash／bass／inversion、双升降、Unicode 升降号、属性、额外节点、错序、重复、
  namespace／大小写变体及非规范间隔继续 blocking。
- blocking 输入不得分配 canonical event ID，也不得静默删除或改变和弦语义。

## 自动验收

- 纯映射覆盖 major-sixth、全部 7 个自然根音及其单升／单降形式。
- XML 与 MXL 都以 pitched note 上的 `C#6`、rest 上的 `Db6` 验证 exact import；
  导出 fixture 验证 `<kind>major-sixth</kind>` 和 exact re-import。
- `Cmaj6` alias、`Cm6`／minor-sixth、未知 kind、结构变体和所有既有 blocker 保持
  失败关闭，blocking import 不分配 event ID。
- focused import/export、typecheck、documentation hygiene、完整 check、Android
  本地门禁和 `git diff --check` 必须通过。

## 外部证据

真实浏览器导入／下载／重开、Android WebView／真机、MuseScore／Dorico／Sibelius
中的显示、布局、重开与真实播放继续为 `NOT_EXECUTED`。教师审核、目标用户验证和
教育有效性也为 `NOT_EXECUTED`。

本切片不是完整和弦系统、完整 MusicXML/MXL、完整 S3 或正式版 V1。
