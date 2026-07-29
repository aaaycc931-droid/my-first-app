# S3 本机谱项目 MusicXML/MXL 单事件力度记号 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- canonical note/rest 的事件起点 `dynamicMark` 可取 `pp`、`p`、`mp`、`mf`、`f`、
  `ff` 或 `null`；本切片不修改 canonical schema、storage 版本、编辑器或播放语义。
- 非空值确定性映射为该 note/rest 唯一 `<notations>` 中、唯一 `<dynamics>` 内的
  一个同名空记号；`null` 不生成力度记号。
- `.musicxml` 与 `.mxl` 必须由 canonical importer 无损重建相同 `dynamicMark`。
- 力度记号与 fermata、tie／tied、slur、fingering、articulations 复用唯一
  `<notations>`；固定顺序为 fermata、tied、slur、technical、articulations、
  dynamics，lyric 仍在 notations 之后。
- MusicXML 4.0 允许 `<dynamics>` 属于 `<notations>` 或 `<direction-type>`。本切片
  只采用 note-associated notations 形式，以精确锚定 canonical 事件；不推断
  measure-level direction 与后续 note 的关联。

规范参考：

- <https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/dynamics/>
- <https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/notations/>

## 严格 MusicXML 结构

- 每个 note/rest 最多一个直接位于 `<notations>` 的 `<dynamics>`。
- `<dynamics>` 不得有属性、非空文本、CDATA、comment、processing instruction 或
  其他内容，并且必须且只能包含一个 `pp`／`p`／`mp`／`mf`／`f`／`ff`。
- 六种力度子元素必须为空，不得有属性、文本、CDATA、comment、processing
  instruction、嵌套元素或错误父级。
- 空容器、多值／组合力度、`fff` 等其他力度、重复容器、错层级、measure-level
  `<direction>`、`<sound dynamics="…">`，以及 note 的 `dynamics`／
  `end-dynamics` 播放属性必须 blocking；不得选择第一项、猜测、归一化或降级。
- 本切片不输出 `<direction>`、`<sound>`、MIDI velocity 或播放强弱变化。
  `dynamicMark` 的真实显示、位置与音频播放不属于仓库内部 round-trip 证据。

## 自动验收

- XML 与 MXL 覆盖六个 canonical 值、note/rest、`null` 及与现有严格记号共存。
- 同一 canonical revision 重复生成 XML／MXL 字节一致；XML 与 MXL 解包 XML
  语义一致，canonical re-import projection exact 保留 `dynamicMark`。
- 覆盖空容器、多值、其他力度、属性、文本、CDATA、comment、processing
  instruction、嵌套、错层级、direction 与播放力度属性，且 blocking 输入不得
  分配 canonical event id。
- focused import／export tests、documentation hygiene、lint、typecheck、完整
  `check`、Android 本地校验／构建和 `git diff --check` 必须通过。

## 人工与外部 QA

真实桌面浏览器导入、下载与重开，Android WebView／真机，以及
MuseScore／Dorico／Sibelius 等第三方独立阅读器中的力度符号显示、布局和重新打开
均为 `NOT_EXECUTED`。真实音频强弱变化与教师审核也为 `NOT_EXECUTED`。仓库内部
parser、DOM 测试、CI 或 APK 不能替代这些证据。

direction-based 力度关联、渐强／渐弱、组合或其他力度、播放 velocity、MIDI、OMR、
完整 MusicXML/MXL、完整 S3 与正式版 V1 仍未完成或为 `NOT_EXECUTED`；本切片不得
被描述为完整力度系统、完整格式往返或正式发布完成。
