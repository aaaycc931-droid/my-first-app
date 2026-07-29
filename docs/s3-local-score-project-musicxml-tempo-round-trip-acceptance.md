# S3 本机谱项目 MusicXML/MXL 全局速度 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- 复用本机谱项目已经保存并由 playback／transport 消费的全局
  `tempoBpm`，不修改 canonical `ScoreDocument`、storage schema、编辑器或播放调度
  规则。
- 当前 canonical 只表达整份项目唯一、恒定的整数速度，合法范围为
  `30–240 BPM`；本切片不引入 tempo map、小节内速度变化、渐快／渐慢、拍号换算或
  节拍文字。
- 导出把合法 `tempoBpm` 确定性写为第一小节直接 `<attributes>` 之后唯一、空的
  `<sound tempo="N"/>`；`.musicxml` 与 `.mxl` 必须由当前 canonical importer
  无损重建相同 `tempoBpm`。
- 导入文件完全没有 `<sound>` 时使用既有默认值 `90 BPM`。这是明确的默认语义，
  不是从音符密度、拍号、文件名、文字或其他元素猜测速度。
- 本切片只扩大 MusicXML/MXL 交换语义，不把仓库内部 round-trip、自动测试或既有
  Web Audio 调度冒充真实浏览器、Android 或第三方阅读器的速度与听感证据。

MusicXML 4.0 允许 `<sound>` 作为 partwise `<measure>` 的直接子元素，并以
`tempo` 属性表示每分钟四分音符数。本切片采用比标准更窄的单全局速度结构，避免与
当前事件起点的 pedal direction 或 harmony 锚定产生歧义。

规范参考：

- <https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/sound/>
- <https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/measure-partwise/>

## 严格 MusicXML 结构

- 整份 `score-partwise` 最多一个 `<sound>`。存在时，它必须是第一 part 第一小节的
  直接子元素，并且是该小节唯一直接 `<attributes>` 之后的下一个元素。
- `<attributes>` 与 `<sound>` 之间只允许格式化空白；comment、CDATA、processing
  instruction 或任何其他元素都使位置无效。
- `<sound>` 必须使用大小写精确、无 namespace 的 `sound` 元素名，必须为空，并且
  只能有一个大小写精确、无 namespace 的 `tempo` 属性。
- `tempo` 必须是 canonical 十进制整数文本 `30–240`：不接受正负号、小数、指数、
  前后空白、前导零、实体拼接或其他词法形式。
- `<sound>` 后才可出现当前严格支持的 harmony、pedal direction、note 或 rest；
  首事件同时包含和弦和踏板时，确定性顺序为
  attributes → sound → harmony → pedal direction → event。
- 第二小节或更晚小节的 sound、同一小节重复 sound、位于事件／harmony／direction
  之后的 sound、嵌套在 direction 或其他元素中的 sound，以及任何中途速度变化都
  必须 blocking。
- 除 `tempo` 外的所有 sound 属性，以及 sound 的文本、子元素、comment、CDATA 和
  processing instruction 都必须 blocking；不得选择第一项、trim、取整、限制到
  合法范围、自动移动位置或静默丢弃。
- 错大小写、namespace prefix、默认 namespace 或外部 namespace 的 sound／tempo
  不能被当作当前严格子集；必须形成稳定 blocking 项，不能通过 local-name 宽松接受。
- 既有 pedal `<direction>` 仍只能包含当前 pedal 子集，不能携带 `<sound>`；
  metronome direction、words、offset、swing 和其他速度表达继续 blocking。

## 确定性导出与语义

- 所有合法 canonical `tempoBpm`，包括默认 `90`，都显式导出唯一
  `<sound tempo="N"/>`；同一 canonical revision 重复生成 XML/MXL 必须字节一致。
- 导入没有 sound 的受支持文件时 canonical 使用 `90 BPM`；再次导出会产生显式
  `<sound tempo="90"/>`。仓库内部 round-trip 比较 canonical 速度语义，不宣称原始
  输入字节保持不变。
- 速度只影响当前项目既有 playback／transport 的全局 BPM；本切片不改变音符时值、
  divisions、小节容量、tie／slur 连续性、节拍器同步声明或事件身份。
- 导入、导出、候选确认、保存、下载失败均不得修改既有项目、revision、
  undo／redo、IndexedDB、recovery candidate 或其他项目。

## 自动验收

- XML 与 MXL 覆盖 `30`、`90`、`240` 及范围内其他代表值；canonical re-import
  projection exact 保留 `tempoBpm`。
- 覆盖完全无 sound 的输入默认 `90 BPM`，以及再次导出为显式
  `<sound tempo="90"/>`。
- 覆盖首事件同时带 harmony／pedal 时的
  attributes → sound → harmony → pedal direction → event 固定顺序。
- 覆盖重复、第二小节／中途变速、错误位置、额外属性、缺失 tempo、越界、正负号、
  小数、指数、前导零、空白、文本、子元素、comment、CDATA、processing
  instruction、direction 嵌套、namespace 和大小写变体，且 blocking 输入不得分配
  canonical event id 或保存项目。
- 同一 canonical revision 重复生成 XML／MXL 字节一致；MXL 解包 XML 与直接 XML
  语义一致。
- legacy parser 只交叉核对它能够表达的音高、时值、小节和拍位；它不表达本机项目
  `tempoBpm`，不能单独证明本切片。
- focused import／export tests、Mobile 候选／确认／单次下载回归、documentation
  hygiene、lint、typecheck、完整 `check`、Android 本地校验／构建和
  `git diff --check` 必须通过。

## 人工与外部 QA

真实桌面浏览器导入、下载与重开，Android WebView／真机文件选择、保存与重开，以及
MuseScore／Dorico／Sibelius 等第三方独立阅读器中的速度读取、显示、播放和重新保存
均为 `NOT_EXECUTED`。真实设备 Web Audio／扬声器听感、节拍器同步和教师审核也为
`NOT_EXECUTED`。仓库内部 parser、DOM 测试、CI 或 APK 构建不能替代这些证据。

tempo map、中途变速、渐快／渐慢、复合 metronome mark、swing、文字速度、不同拍值
换算、MIDI tempo event、OMR、完整 MusicXML/MXL、完整 S3 与正式版 V1 仍未完成或为
`NOT_EXECUTED`；本切片不得被描述为完整速度系统、完整格式往返或正式发布完成。
