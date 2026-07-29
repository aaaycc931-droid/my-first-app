# S3 本机谱项目 MusicXML/MXL 指法 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- canonical pitched note 已有的 `fingering: 1 | 2 | 3 | 4 | 5 | null`
  映射为零或一个 MusicXML
  `<notations><technical><fingering>N</fingering></technical></notations>`。
  本切片不修改 canonical schema、storage 版本、指法编辑器或既有双谱面显示。
- rest 不承载指法；`null` 不生成 `technical` 或 `fingering`。
- 本切片只传递用户已经明确保存的单个手指编号，不推断左右手、不生成自动指法，也不
  解释替代指法、换指或其他演奏技术。
- `.musicxml` 与 `.mxl` 必须由当前 canonical importer 无损重建同一指法。legacy
  parser 不表达指法，不能作为指法 identity 或完整 round-trip 证据。

## 严格 MusicXML 结构

- 每个 pitched note 最多一个直接 `<notations>`；其中最多一个直接
  `<technical>`，且该容器必须无属性并只包含一个直接 `<fingering>`。
- `<fingering>` 必须无属性、无子元素，且只有一个值为 `1`、`2`、`3`、`4` 或 `5`
  的普通文本节点。空值、前后空白、小数、符号、`0`、`6` 或其他文本均不接受。
- `technical` 与 `fingering` 中的旁路文本、CDATA、comment、processing
  instruction、嵌套或错误层级必须 blocking。
- 带指法 note 的当前未映射属性、重复 `technical`／`fingering`、rest fingering，
  以及 `pluck`、`string`、`hammer-on` 等其他 `technical` 内容必须失败关闭；不得
  选择第一项、trim、猜测或静默丢弃。
- fermata、tied、slur 与指法共存时复用唯一 `<notations>`。导出顺序固定为
  fermata、tied stop、tied start、slur stop、slur start、technical/fingering；
  可选歌词仍位于整个 `<notations>` 之后。
- canonical 中不属于 `1–5 | null` 的原始值无法通过 canonical 校验，必须阻断导出，
  不能在导出时取整、截断或替换。

## 自动验收

- 覆盖 `1` 至 `5` 的全部合法值、`null` 和上下边界；XML／MXL re-import 后保持
  exact canonical `fingering`。
- 覆盖指法与单附点、fermata、tie／tied、slur 和单段歌词在同一 note 上共存，以及
  唯一 `<notations>` 的确定性顺序。
- 同一 canonical revision 重复生成 XML／MXL 字节一致；MXL 解包 XML 与直接 XML
  语义一致。
- legacy parser 交叉验证指法 markup 不改变其能够表达的音高、时值、小节或拍位。
- 覆盖 `0`、`6`、空值、前后空白、属性、CDATA、comment、processing instruction、
  子元素、重复、错层级、其他 technical 内容、note 属性和 rest 指法，且 blocking
  输入不得分配 canonical event id。
- focused import／export tests、lint、typecheck、完整 `check`、Android 本地校验／
  构建和 `git diff --check` 必须通过。

## 人工与外部 QA

真实桌面浏览器导入、下载与重开，Android WebView／真机，以及
MuseScore／Dorico／Sibelius 等第三方独立阅读器中的指法显示、位置和 XML/MXL 重开
检查均为 `NOT_EXECUTED`。仓库内部 parser、DOM 测试、CI 或 APK 不能替代这些证据。

左右手语义、多个或替代指法、换指、自动指法生成、出版级定位和其他 technical
记号不属于本切片。真实音频、教师审核、MIDI、OMR、完整 MusicXML/MXL、完整 S3 与
正式版 V1 仍未完成或为 `NOT_EXECUTED`；本切片不得被描述为完整格式往返或正式发布
完成。
