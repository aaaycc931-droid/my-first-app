# S3 本机谱项目 MusicXML／MXL GM1 乐器归属严格 round-trip 验收

QA level recommendation：**strict**

## 范围

本切片把既有 canonical 单 part 的乐器归属接入当前受控 MusicXML／MXL 交换层，不改
`score-document-v13`、`local-score-project-storage-v14` 或任何迁移：

- `instrument.kind: "unassigned"` 不生成乐器或 MIDI 声明；
- `instrument.kind: "gm1-program"` 的 canonical `program: 0–127` 写为 MusicXML
  一基 `midi-program: 1–128`；
- 有 GM1 归属时，`score-part` 固定依次包含 `part-name`、唯一
  `score-instrument`、唯一 `midi-instrument`；
- `score-instrument/instrument-name` 必须与 canonical part name 完全一致；
- 两个 instrument 容器必须用同一非空 ID 关联。

MusicXML 官方使用 1–128 表达 MIDI 1.0 program，canonical 继续使用既有 0–127；
转换只做精确 `+1/-1`，不得截断、限制范围、取整或猜测。

## Fail-closed 边界

- 缺少任一容器、重复容器、ID 缺失／不一致、错误顺序、额外属性、namespace／大小写
  变体、CDATA、comment、processing instruction、额外文本或子元素均 blocking。
- `instrument-name` 与 part name 不一致时 blocking，避免导入后静默丢失乐器显示语义。
- `midi-program` 只接受无符号、无前导零、无首尾空白、无小数或指数的 canonical
  十进制 `1–128`。
- `midi-channel`、`midi-bank`、`midi-name`、`midi-unpitched`、volume、pan、
  elevation、instrument-sound、solo／ensemble、virtual-instrument、instrument
  change 和多 instrument 继续不支持并 blocking。
- 任一阻断候选不得分配 event ID、生成项目、修改 revision／undo／redo 或持久化。

## 自动验收

1. canonical program `0`、代表中间值与 `127` 在 `.musicxml`／`.mxl` 中精确
   round-trip 为 MusicXML `1`、中间值 `+1` 与 `128`；
2. unassigned part 不生成 instrument markup；
3. part name XML escaping 与 instrument-name 完全一致；
4. 缺失、重复、错序、错 ID、额外语义、属性、namespace／大小写、文本节点类型及所有
   非 canonical program 输入失败关闭；
5. blocking 输入不分配 event ID；
6. 既有 credits、tempo、harmony、pedal、notations、歌词与结构 round-trip 回归通过；
7. focused import/export tests、完整 `check`、Android 本地校验与远端
   Quality／android-local 门禁通过。

## 未执行与不宣称

真实浏览器下载／重开、Android WebView／实体设备、MuseScore／Dorico／Sibelius、
真实 GM1 音色选择与播放、MIDI 文件往返及教师审核均保持 `NOT_EXECUTED`。

本切片不支持多乐器、多 part／staff／voice、program change、bank／channel、打击乐、
自定义音色或完整 MusicXML/MXL，也不宣称完成 S3、正式 V1 或最终 APK。
