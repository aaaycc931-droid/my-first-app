# S3 本机谱项目 MusicXML/MXL 单音演奏法 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- canonical pitched note 已有的
  `articulations: readonly ("accent" | "staccato" | "tenuto")[]`
  映射为零或一个
  `<notations><articulations>…</articulations></notations>`。
- canonical 固定顺序为 `accent → staccato → tenuto`，每种最多一个；空数组不生成
  articulation markup，rest 不承载演奏法。
- 本切片只传递用户已经保存的谱面标记，不自动识别、生成、推荐或校正演奏法，也不
  改变当前播放的 gate、velocity、时值或连奏效果。
- 本切片不修改 canonical schema、storage 版本、编辑器、双谱面或 Provider 边界。

## 严格 MusicXML 结构

- 每个 pitched note 最多一个直接 `<notations>`；其中最多一个直接、无属性的
  `<articulations>`，并按 canonical 固定顺序包含一至三个唯一空记号：
  `<accent/>`、`<staccato/>`、`<tenuto/>`。
- 容器与记号不得包含属性、文本、CDATA、comment、processing instruction、嵌套或
  未支持子元素；空容器、重复记号、错误顺序和错误层级必须 blocking。
- 带演奏法 note 的当前未映射属性、重复容器、rest articulation，以及
  `strong-accent`、`detached-legato`、`spiccato` 等其他 MusicXML articulation
  必须失败关闭；不得重排、去重、选择第一项或静默丢弃。
- 与 fermata、tied、slur 和 technical/fingering 共存时复用唯一 `<notations>`；
  导出顺序固定为 fermata、tied stop/start、slur stop/start、technical/fingering、
  articulations，可选 lyric 仍位于整个 `<notations>` 之后。

## 自动验收

- 覆盖三个单值、完整组合、空数组和固定顺序；XML／MXL re-import 后保持 exact
  canonical articulation set。
- 覆盖与单附点、fermata、tie／tied、slur、单指法和单段歌词在同一 note 上共存。
- 同一 canonical revision 重复生成 XML／MXL 字节一致；MXL 解包 XML 与直接 XML
  语义一致，legacy parser 的音高、时值、小节和拍位不变。
- 覆盖空容器、重复、错序、属性、文本、CDATA、comment、processing instruction、
  子元素、错层级、其他 articulation、note 属性和 rest，且 blocking 输入不得分配
  canonical event id。
- focused tests、lint、typecheck、完整 `check`、Android 本地校验／构建、文档卫生和
  `git diff --check` 必须通过。

## 人工与外部 QA

真实桌面浏览器导入、下载与重开，Android WebView／真机，以及
MuseScore／Dorico／Sibelius 等第三方独立阅读器中的演奏法显示与位置检查均为
`NOT_EXECUTED`。真实演奏法播放、真实音频、教师审核、MIDI、OMR、完整
MusicXML/MXL、完整 S3 与正式版 V1 也仍未完成或为 `NOT_EXECUTED`。
