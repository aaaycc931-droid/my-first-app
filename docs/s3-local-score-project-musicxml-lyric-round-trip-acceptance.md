# S3 本机谱项目 MusicXML/MXL 单段歌词 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- canonical pitched note 的 `lyric: string | null` 可映射为零或一个 MusicXML
  `<lyric><text>…</text></lyric>`；rest 不承载歌词。本切片不修改 canonical schema、
  storage 版本、歌词编辑或既有双谱面显示。
- 非空歌词必须是已经规范化的单行文本：前后没有空白、最多 80 个 Unicode code
  point，且不含 C0／C1 控制字符、`U+2028`／`U+2029` 行段分隔符、孤立 surrogate、
  `U+FFFE`／`U+FFFF` 或高于 XML 1.0 上限 `U+EFFFF` 的字符。内部空格、汉字、emoji
  和普通标点可以保留。
- 导出必须 XML escape `&`、`<`、`>`、双引号和单引号；重新导入后恢复的是解码后的
  exact canonical 文本，不能 trim、猜测、分词或改写。
- 按 MusicXML 4.0 note 内容顺序，`<lyric>` 必须位于 `<staff>` 和可选
  `<notations>` 之后、`</note>` 之前；存在 fermata、tie／tied 或 slur 时，歌词不进入
  `<notations>`，也不改变其既有确定性顺序。
- `.musicxml` 与 `.mxl` 必须由当前 canonical importer 无损重建同一 `lyric`。
  legacy parser 不表达歌词，不能作为歌词 identity 或完整 round-trip 证据。

## 严格 MusicXML 结构

- 每个 pitched note 最多一个直接子级 `<lyric>`；歌词所在 note、`<lyric>` 与
  `<text>` 都不得携带当前 canonical 无法表达的属性。
- `<lyric>` 必须且只能包含一个直接 `<text>`；容器旁不得有非空文本、CDATA、
  comment、processing instruction 或其他子元素。
- `<text>` 必须只有受支持的文字内容，不得包含属性、CDATA、comment、processing
  instruction 或子元素；空文本、纯空白、前后空白、超长、控制字符或 XML 1.0
  不允许的字符必须 blocking。
- `number`、`name`、`placement`、`print-object`、`time-only`、布局属性和
  `xml:lang` 不在本切片；`syllabic`、第二个 `text`、`elision`、`extend`、
  `end-line`、`end-paragraph`、`laughing`、`humming`、`footnote` 与 `level` 也均
  不在本切片。不得根据连字符或空格猜测音节、连字符、换行、verse 或 melisma。
- 重复 lyric、错误父级、错误 note 元素顺序、rest lyric、note 的 `print-lyric`
  或其他未映射属性，以及上述任一未支持结构都必须形成稳定 blocking 项；不得静默
  选择第一段、删除格式、合并文本或降级为 warning。
- canonical 中不符合本切片规范化边界的非空 lyric 必须阻断导出，不能在导出时
  trim 或修正。

## 自动验收

- XML 与 MXL 覆盖中文、内部空格、emoji 和 XML 特殊字符，并保持 exact canonical
  `lyric`；无歌词 note 继续为 `null`。
- 覆盖歌词与单附点、fermata、slur、tie／tied 同 note 共存，以及
  `<staff> → <notations> → <lyric>` 的确定性顺序。
- 同一 canonical revision 重复生成 XML／MXL 字节一致；XML 与 MXL 解包 XML
  语义一致，canonical re-import projection 包含歌词。
- 覆盖 80 个 Unicode code point 边界；81 个、控制字符、Unicode 行段分隔符、
  XML 1.0 范围外字符、空文本、纯空白和前后空白全部失败关闭。
- 覆盖 rest lyric、重复 lyric／text、lyric／text／note 属性、CDATA、comment、
  processing instruction、嵌套、错层级、错顺序、`syllabic`、`elision`、`extend`
  与多 verse 等结构，且 blocking 输入不得分配 canonical event id。
- 单指法和单音演奏法由后续独立严格切片处理；多个／替代指法、其他 technical／
  articulation、和弦、力度、制音踏板和其他未映射语义仍保持稳定 blocker。
- focused import／export tests、lint、typecheck、完整 `check`、Android 本地校验／
  构建和 `git diff --check` 必须通过。

## 人工与外部 QA

真实桌面浏览器导入、下载与重开，Android WebView／真机，以及
MuseScore／Dorico／Sibelius 等第三方独立阅读器中的歌词显示、Unicode、XML escape
和谱面位置检查均为 `NOT_EXECUTED`。仓库内部 parser、DOM 测试、CI 或 APK 不能替代
这些证据。

多 verse、音节连字符、elision、melisma／extend、歌词换行与出版级排版不属于本切片。
真实音频、歌词与歌唱对齐、教师审核、MIDI、OMR、完整 MusicXML/MXL、完整 S3 与正式版
V1 仍未完成或为 `NOT_EXECUTED`；本切片不得被描述为完整格式往返或正式发布完成。
