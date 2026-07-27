# S3 本机谱项目 MusicXML/MXL 延音线 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- canonical pitched note 的 `tieToNext: true` 导出为源 note 直接子级
  `<tie type="start"/>`，以及同一 note 的 `<notations>` 内
  `<tied type="start"/>`；同声部紧邻、同音高且时间连续的目标 pitched note 同时
  写入对应的 direct tie stop 与 notation tied stop。
- 当前 canonical importer 重新导入 `.musicxml`，以及安全解包 `.mxl` 后的同一 XML，
  必须在两套 marker 完全对应且关系合法时恢复源 note 的同一 `tieToNext: true`。
- 支持同一小节内的延音线、源 note 恰好结束于下一小节起点的跨小节延音线，以及中间
  note 同时 stop 前一段并 start 后一段的同音高链式关系。
- 没有延音线的 note 保持 `tieToNext: false`；rest 不承载该字段。不同音高的圆滑连接
  仍属于 slur，不得降级或猜测为 tie。
- 本切片只扩展既有单 part、单 pitched staff、单 voice 严格子集，不扩大音高、时值、
  调号、拍号、谱号、速度、乐器、credits 或资源边界。

## 双 marker 与确定性 notations

- direct `<tie>` 必须是 note 的直接子元素；notation `<tied>` 必须直接位于该 note 唯一、
  无属性且无非空文本的 `<notations>` 中。
- 每个 `<tie>`／`<tied>` 只能有唯一 `type="start"` 或 `type="stop"` 属性，不得含
  文本或子元素。
- 每个 note 最多分别包含一个 direct stop、一个 direct start、一个 tied stop 和一个
  tied start；链式中间 note 可同时包含 stop 与 start。
- 同一 note 的 direct tie type 集合必须与 tied type 集合完全一致；direct-only、
  tied-only 或 stop/start 不对应均形成 blocking ledger。
- canonical fermata、slur 与 tie 可共存。所有 notation marker 必须复用一个
  `<notations>`；direct tie 按 stop、start，notations marker 按 fermata、tied stop、
  tied start、slur stop、slur start 的固定顺序输出，不存在的 marker 跳过。不得创建
  重复容器。
- `.musicxml` 与 `.mxl` 必须使用同一确定性 XML；同一 canonical revision 重复生成
  候选时，内容、fingerprint 和摘要保持确定。

## 配对、音高与连续性

- start 只连接事件序列中紧邻的下一个 pitched note；该目标必须有对应 stop，且音高
  必须与源 note 完全相同。
- start 源 note 的结束拍必须等于目标 note 的起始拍。跨小节时，源 note 必须恰好
  结束在下一小节起点；不能跨空拍、空小节、缺失小节或非连续小节编号。
- stop 前必须是紧邻且同时带 start 的同音高 pitched note；谱首孤立 stop、谱尾未闭合
  start、start 后缺少 stop、stop 前缺少 start 均失败关闭。
- rest 不能开始或结束延音线；tie 不能跨越 rest。
- `type="continue"`、缺失或未知 type、额外 `number`／time-only／orientation／
  placement 等属性、重复 marker、多个 `<notations>`、错误层级、非空文本、嵌套元素
  和其他未映射语义均形成 blocking ledger。
- 任一 blocking 项都必须阻止确认、保存或下载；不得静默丢弃、自动修复、补齐另一套
  marker、推断音高／配对或降级为 warning。

## 自动证据

- importer focused tests 覆盖同小节、跨小节、同音高链式关系，以及与 fermata／slur
  共存时 canonical `tieToNext` 的恢复。
- importer focused tests 覆盖 direct-only、tied-only、两套 type 不一致、孤立
  start／stop、不同音高、跨 rest、空拍不连续、rest marker、未知 type、额外属性、
  重复 marker／容器、文本、嵌套和错误层级的失败关闭。
- exporter focused tests 覆盖 `.musicxml`／`.mxl` 的确定性 direct tie 与 tied
  start／stop 输出、链式 stop+start、共享 `<notations>`，以及 canonical re-import
  后的语义等价。
- legacy parser 只交叉核对它能够表达的音符音高、时值、小节和拍位；它不表达
  `tieToNext`，不能单独作为延音线 round-trip 证据。
- Mobile 行为测试覆盖含 canonical 延音线的项目生成候选、明确确认和单次下载；自动
  测试不得冒充真实浏览器或 Android 下载。
- 既有 canonical tie continuity 与 playback 延音链回归必须通过；focused tests、
  typecheck、完整 `check`、Android 本地门禁和 `git diff --check` 必须通过。这些结果
  只证明仓库内部候选与静态／构建门禁。

## 未执行与明确不做

- 真实桌面浏览器下载、重新选择文件与重开：`NOT_EXECUTED`。
- Android WebView／真机选择、下载、文件权限与重开：`NOT_EXECUTED`。
- MuseScore、Dorico、Sibelius 等第三方独立阅读器打开与语义核对：
  `NOT_EXECUTED`。
- 真实延音播放、真实音频和听感核对：`NOT_EXECUTED`。
- 教师审核：`NOT_EXECUTED`。
- MIDI 导入／导出和 round-trip：`NOT_EXECUTED`。
- 图片／PDF OMR、Audiveris production 与真实识谱：`NOT_EXECUTED`。
- 完整 MusicXML/MXL、任意多 part/staff/voice、跨声部 tie、任意嵌套／重叠 tie、
  布局和雕刻属性：`NOT_EXECUTED`。
- 完整 S3 和正式版 V1：`NOT_EXECUTED`。

本切片只建立 canonical `tieToNext` 在当前严格单声部子集中的仓库内部受控双向映射。
它不扩大完整 MusicXML/MXL 支持，不证明第三方兼容；真实音频与外部程序未执行，也
不能仅凭已有 playback 单元测试宣称真实延音听感已经通过。
