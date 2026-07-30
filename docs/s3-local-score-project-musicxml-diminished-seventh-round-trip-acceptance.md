# S3 MusicXML／MXL 减七和弦严格 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- 在既有受控 `chordSymbol` 双向映射上只增加一种和弦类别：
  `Cdim7` ↔ `<kind>diminished-seventh</kind>`。
- 根音仍只接受 `A–G`，以及可选的单个 ASCII `#`／`b`，形成 21 个新增 exact 映射。
- note/rest 锚定、root-alter、kind、staff 顺序，以及与 tempo、pedal 和其他受控
  记谱语义的共存规则保持不变。
- 不修改 canonical schema、storage 版本、迁移链、编辑器、显示或播放。

## Fail-closed 边界

- `C°7` 不得归一化为 `Cdim7`；受控 `Cm7b5`／`half-diminished` 与 `Cø7` alias
  均不得混同减七和弦。
- `Caug7`／`augmented-seventh`、其他七和弦、sus／add／扩展音继续 blocking。
- slash chord、bass／inversion、双升降与 Unicode 升降号继续 blocking。
- kind、root、root-alter、staff 的属性、错序、重复、未知值、错误层级、CDATA、
  comment 或 processing instruction 继续按既有严格规则 blocking。
- 任何阻断候选必须在 canonical event ID 分配前失败。

## 自动验收

- 纯映射覆盖 diminished-seventh、全部 7 个自然根音及其单升／单降形式。
- XML 与 MXL 都以 pitched note 上的 `C#dim7`、rest 上的 `Dbdim7` 验证 exact
  re-import，并验证合法输入仅分配预期 event ID。
- 导出覆盖新增 kind，并与既有七类和弦、tempo、pedal 及受控记号共存。
- alias、half-diminished、augmented-seventh、结构变体和所有既有 blocker 保持失败关闭。

## 人工与外部 QA

真实桌面浏览器导入、下载与重开，Android WebView／真机，
MuseScore／Dorico／Sibelius 等第三方独立阅读器中的显示、布局、播放及重开均为
`NOT_EXECUTED`。教师审核、目标用户验证和教育有效性也为 `NOT_EXECUTED`。

半减七和弦的独立严格边界见
`docs/s3-local-score-project-musicxml-half-diminished-seventh-round-trip-acceptance.md`。

本切片不证明完整和弦系统、完整 MusicXML/MXL、第三方兼容、完整 S3 或正式版 V1。
