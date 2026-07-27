# S3 本机谱项目 MusicXML/MXL 圆滑线 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- canonical pitched note 的 `slurToNext: true` 导出为源 note 直接
  `<notations>` 中的 `<slur type="start"/>`，并在同声部紧邻且时间连续的目标
  pitched note 上写入 `<slur type="stop"/>`。
- 当前 canonical importer 重新导入 `.musicxml`，以及安全解包 `.mxl` 后的同一 XML，
  必须把严格配对的 start／stop 恢复为源 note 的同一 `slurToNext: true`。
- 支持同一小节内的圆滑线、源 note 恰好结束于下一小节起点的跨小节圆滑线，以及中间
  note 同时 stop 前一条并 start 后一条的链式关系。
- 没有圆滑线的 note 保持 `slurToNext: false`；rest 不承载该字段。导入不得因邻近
  marker、measure 边界或排版属性猜测关系。
- 本切片只扩展既有单 part、单 pitched staff、单 voice 严格子集，不扩大音高、时值、
  调号、拍号、谱号、速度、乐器、credits 或资源边界。

## 确定性 notations

- 每个 note/rest 最多一个直接、无属性且无非空文本的 `<notations>`。
- 每个 `<slur>` 必须是 `<notations>` 的直接子元素，只能有唯一
  `type="start"` 或 `type="stop"` 属性，并且不得含文本或子元素。
- 每个 note 最多一个 slur stop 和一个 slur start；链式中间 note 可同时包含二者。
- canonical `fermataMark: "fermata"` 可与 slur 共存于同一个 `<notations>`。导出按
  `<fermata/>`、`<slur type="stop"/>`、`<slur type="start"/>` 的固定顺序输出存在
  的 marker，不创建重复容器。
- `.musicxml` 与 `.mxl` 必须使用同一确定性 XML；同一 canonical revision 重复生成
  候选时，内容、fingerprint 和摘要保持确定。

## 配对与连续性

- start 只连接事件序列中紧邻的下一个 pitched note；该目标必须带 stop。
- start 源 note 的结束拍必须等于目标 note 的起始拍。跨小节时，源 note 必须恰好
  结束在下一小节起点；不能跨空拍、缺失小节或非连续小节编号。
- stop 前必须是紧邻且带 start 的 pitched note；谱首孤立 stop、谱尾未闭合 start、
  start 后缺少 stop、stop 前缺少 start 均失败关闭。
- rest 不能开始或结束圆滑线；start／stop 不能跨越 rest。
- `type="continue"`、缺失或未知 type、额外 `number`／placement／bezier／line-type
  等属性、重复 start／stop、多个 `<notations>`、错误层级、非空文本、嵌套元素和其他
  未映射 notations 语义均形成 blocking ledger。
- 任一 blocking 项都必须阻止确认、保存或下载；不得静默丢弃、自动修复、推断配对或
  降级为 warning。

## 自动证据

- importer focused tests 覆盖跨小节链式关系、fermata 共存和 canonical
  `slurToNext` 恢复。
- importer focused tests 覆盖孤立 start／stop、跨 rest、空拍不连续、rest marker、
  非 `start`／`stop` type、额外属性、重复 marker 和重复容器的失败关闭。
- exporter focused tests 覆盖 `.musicxml`／`.mxl` 的确定性 start／stop 输出、同一
  `<notations>` 中 fermata／stop／start 顺序，以及 canonical re-import 后的语义等价。
- legacy parser 只交叉核对它能够表达的音符音高、时值、小节和拍位；它不表达 slur，
  不能单独作为圆滑线 round-trip 证据。
- Mobile 行为测试覆盖含 canonical 圆滑线的项目生成候选、明确确认和单次下载；自动
  测试不得冒充真实浏览器或 Android 下载。
- focused tests、typecheck、完整 `check`、Android 本地门禁和 `git diff --check`
  必须通过；这些结果只证明仓库内候选与静态／构建门禁。

## 未执行与明确不做

- 真实桌面浏览器下载、重新选择文件与重开：`NOT_EXECUTED`。
- Android WebView／真机选择、下载、文件权限与重开：`NOT_EXECUTED`。
- MuseScore、Dorico、Sibelius 等第三方独立阅读器打开与语义核对：
  `NOT_EXECUTED`。
- 真实连奏播放、真实音频和听感核对：`NOT_EXECUTED`。
- 教师审核：`NOT_EXECUTED`。
- MIDI 导入／导出和 round-trip：`NOT_EXECUTED`。
- 图片／PDF OMR、Audiveris production 与真实识谱：`NOT_EXECUTED`。
- 完整 MusicXML/MXL、任意多 part/staff/voice、任意嵌套或重叠 slur、布局和雕刻属性：
  `NOT_EXECUTED`。
- 完整 S3 和正式版 V1：`NOT_EXECUTED`。

本切片只建立 canonical `slurToNext` 在当前严格单声部子集中的仓库内部双向映射，
不改变 playback gate、duration 或真实连奏效果，不证明第三方兼容，也不代表完整
MusicXML/MXL、S3 或正式版 V1 已完成。
