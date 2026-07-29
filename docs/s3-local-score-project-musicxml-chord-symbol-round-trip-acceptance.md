# S3 本机谱项目 MusicXML/MXL 受控和弦标记 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- 复用当前 canonical note/rest 事件起点的 `chordSymbol: string | null`，不修改
  canonical schema、storage 版本、编辑器、谱面显示或播放语义。
- 本切片只接受自然音根音 `A–G` 与五种无转位和弦：
  `C`（major）、`Cm`（minor）、`C7`（dominant）、
  `Cmaj7`（major-seventh）、`Cm7`（minor-seventh）；`C` 可替换为任一
  `A–G`。
- canonical 和弦标记确定性写为目标 note/rest 之前的 measure-level
  `<harmony>`；`.musicxml` 与 `.mxl` 必须由当前 importer 无损重建原始
  `chordSymbol`。
- canonical 仍以受控字符串为权威，本切片不推断调性、和弦持续区间、转位、低音、
  voicing、degree 或播放音符。

MusicXML 4.0 使用 measure-level `<harmony>` 表达流行音乐和弦标记，`<root>` 与
必需的 `<kind>` 表达根音和和弦类别。本切片进一步收紧为单 part、staff、voice 中
锚定单一事件的无歧义结构。

规范参考：

- <https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/harmony/>
- <https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/root/>
- <https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/root-step/>
- <https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/kind/>

## 严格 MusicXML 结构

- `<harmony>` 必须是 measure 的直接、无 namespace、无属性子元素，并依次且仅含
  `<root><root-step>A–G</root-step></root>`、一个受控 `<kind>` 和
  `<staff>1</staff>`。
- root、root-step、kind 与 staff 均不得包含属性、额外元素、非预期文本、CDATA、
  comment 或 processing instruction；值不得被 trim、改大小写或别名归一化。
- harmony 必须锚定紧随其后的 note/rest；二者之间只允许格式化空白，以及属于同一
  事件、已经通过严格校验的单一制音踏板 direction。每个事件最多一个 harmony。
- 当和弦标记与踏板共存时，导出固定使用 harmony → pedal direction → note/rest
  顺序；踏板 direction 仍紧邻目标事件。
- `root-alter`、`bass`、`inversion`、`degree`、`numeral`、`function`、
  `offset`、`frame`、样式／位置属性、其他 kind、重复、悬空、错误 staff、错误
  层级、非空间隔或其他 harmony 内容必须 blocking。
- canonical 中包含升降号、slash chord、增减和弦、sus、add、扩展音、自由文本或
  任何本轮未列出的值时，导出必须以 `unsupported-chord-symbol` 阻断，不得降级为
  major、截断或静默丢失。

## 自动验收

- XML 与 MXL 覆盖 note/rest、五种 kind、自然音根音、`null`，并验证与 dot、
  fermata、tie/tied、slur、lyric、fingering、articulations、dynamic 和
  damper pedal 共存。
- 同一 canonical revision 重复生成的 XML/MXL 字节一致；解包 XML 一致，
  canonical re-import projection exact 保留 `chordSymbol` 与既有受控记号。
- legacy parser 交叉验证 harmony 不改变其可表达的音高、基础时值、小节或拍位；
  legacy parser 不表达和弦标记，不能单独证明本切片。
- 覆盖属性、错序、未知 kind、非法根音、root-alter、额外子元素、重复、悬空、
  错误 staff、comment 间隔及非受控 canonical 字符串；blocking 输入不得分配
  canonical event id。
- focused import/export tests、S2 chord symbol regressions、documentation
  hygiene、lint、typecheck、完整 `check`、Android 本地校验/构建和
  `git diff --check` 必须通过。

## 人工与外部 QA

真实桌面浏览器导入、下载与重开，Android WebView/真机，以及
MuseScore/Dorico/Sibelius 等第三方独立阅读器中的和弦符号显示、布局和重新打开均为
`NOT_EXECUTED`。真实和弦播放、伴奏、MIDI、教师审核和教育有效性也为
`NOT_EXECUTED`。仓库内部 parser、DOM 测试、CI 或 APK 不能替代这些证据。

升降根音、转位与 slash chord、其他和弦类别、持续区间、真实显示/播放、MIDI、OMR、
完整 MusicXML/MXL、完整 S3 与正式版 V1 仍未完成或为 `NOT_EXECUTED`；本切片不得
描述为完整和弦系统、完整格式往返或正式发布完成。
