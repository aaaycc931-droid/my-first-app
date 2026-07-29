# S3 本机谱项目 MusicXML/MXL 单附点 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- canonical note 的 half／quarter／eighth 与 canonical quarter rest 可使用
  `augmentationDots: 0 | 1`；本切片不扩大休止符基础时值或 canonical schema。
- 单附点导出为 note 的唯一直接子级 `<dot/>`，顺序固定在 `<type>` 后、`<staff>` 前。
- 导入只接受无属性、无非空文本、无 CDATA、无子元素的唯一直接 `<dot/>`；重复、嵌套、
  错层级或非空结构全部失败关闭。
- 导出固定使用 `divisions=4`：half／quarter／eighth 的基础整数 duration 为
  `8`／`4`／`2`，单附点为 `12`／`6`／`3`。
- 导入要求 raw `duration / divisions` 与基础时值或其 `1.5×` 单附点真实时值精确
  一致；不得根据 duration 猜测缺失 dot，也不得忽略与 dot 冲突的 duration。
- 小节容量、事件拍位、后续音符起点以及 slur／tie 的时间连续性都使用附点后的真实
  时值。附点可与当前严格 fermata、slur 和 tie 映射共存。
- `.musicxml` 与 `.mxl` 均须由 canonical importer 无损重建 `augmentationDots`。
  legacy parser 只用 raw duration 校验后续音符拍位，仍只报告基础 duration enum，
  因此不能证明 dot identity。

## 失败关闭边界

- 多附点、任意 dot 显示属性、文本、CDATA、子元素、错误父级或未知结构必须 blocking。
- half／eighth rest 仍由既有 unsupported-rest-duration 边界阻断；本切片只支持
  quarter rest 的零或一个附点。
- 无 dot 却提供附点 duration，或有 dot 却只提供基础 duration，均为 duration
  mismatch；不得自动修复。
- 单段歌词、单指法、单音演奏法和单事件力度记号由后续独立严格切片处理；
  多个／替代指法、其他 technical／articulation、组合／其他力度、和弦、制音踏板
  和其他未映射 MusicXML/canonical 语义继续使用稳定 blocker。

## 自动验收

- XML 与 MXL 覆盖三种 note 基础时值的单附点、quarter rest 单附点及无附点回归。
- 覆盖同小节、跨小节、附点容量边界、overfull，以及与 fermata、slur、tie 的严格
  共存和连续性。
- 输出使用整数 duration、唯一 `<dot/>` 和确定性元素顺序；重复生成字节一致。
- canonical re-import projection 包含 `augmentationDots`，XML 与 MXL 结果一致。
- legacy parser 验证附点后音符的实际拍位，同时明确不声称它表达 dot identity。
- malformed dot、duration mismatch、非 quarter rest 及既有未支持语义全部失败关闭。
- focused tests、lint、typecheck、完整 `check`、Android 本地校验／构建和
  `git diff --check` 必须通过。

## 人工与外部 QA

真实桌面浏览器下载／重开、Android WebView／真机、MuseScore／Dorico／Sibelius 等
第三方独立阅读器、真实音频附点听感与教师审核均为 `NOT_EXECUTED`。仓库内部 parser、
DOM 测试、CI 或 APK 不能替代这些证据。

MIDI、OMR、完整 MusicXML/MXL、完整 S3 与正式版 V1 仍未完成或为
`NOT_EXECUTED`；本切片不得被描述为完整格式往返或正式发布完成。
