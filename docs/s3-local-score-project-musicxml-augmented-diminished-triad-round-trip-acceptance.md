# S3 MusicXML／MXL 增三与减三和弦严格 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- 在既有受控 `chordSymbol` 双向映射上只增加两类无转位三和弦：
  `Caug` ↔ `<kind>augmented</kind>`，以及
  `Cdim` ↔ `<kind>diminished</kind>`。
- 根音仍只接受 `A–G`，以及可选的单个 ASCII `#`／`b`。两类 kind 与 21 种
  根音组合形成 42 个新增 exact 映射。
- note/rest 锚定、`<root>`／`<root-alter>`／`<kind>`／`<staff>` 顺序，以及与
  pedal、tempo、credits 和其他既有受控语义的共存规则保持不变。
- 本切片不修改 canonical schema、storage 版本、迁移链、编辑器、谱面显示或播放。

## Fail-closed 边界

- `C+`、`C°` 等别名不得归一化；`Caug7`、`Cdim7`、`Cø7`、
  `half-diminished`、`diminished-seventh` 不得退化为三和弦。
- slash chord、bass／inversion、sus／add、扩展音、双升降和 Unicode 升降号继续
  blocking，不得静默丢失或改变音乐语义。
- kind、root、root-alter、staff 的属性、错序、重复、未知值、错误层级、CDATA、
  comment 或 processing instruction 继续按既有严格规则 blocking。
- 任何阻断候选必须在 canonical event ID 分配前失败。

## 自动验收

- 纯映射覆盖 augmented／diminished、全部 7 个自然根音及其单升／单降形式。
- XML 与 MXL 都以 pitched note 上的 `C#aug`、rest 上的 `Dbdim` 验证 exact
  re-import，并验证事件 ID 连续且仅分配给合法事件。
- 导出覆盖新增两类 kind，并与既有 major、minor、dominant、major-seventh、
  minor-seventh、tempo、pedal 及其他受控记号共存。
- 既有五类和弦和全部 fail-closed 回归必须保持通过；新增别名、七和弦、未知 kind
  与结构变体必须稳定阻断。

## 人工与外部 QA

真实桌面浏览器导入、下载与重开，Android WebView／真机，
MuseScore／Dorico／Sibelius 等第三方独立阅读器中的显示、布局、播放及重开均为
`NOT_EXECUTED`。教师审核、目标用户验证和教育有效性也为 `NOT_EXECUTED`。

本切片不证明完整和弦系统、完整 MusicXML/MXL、第三方兼容、完整 S3 或正式版 V1。
