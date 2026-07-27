# S3 本机谱项目 MusicXML/MXL 延长记号 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

## 范围

- canonical note 与 rest 的 `fermataMark: "fermata"` 导出为事件直接子级
  `<notations><fermata/></notations>`。
- `.musicxml` 与 `.mxl` 使用同一确定性 XML；当前 canonical importer 重新导入后必须
  恢复同一事件上的 `fermataMark`。
- 无延长记号的事件保持 `fermataMark: null`，不得因相邻事件或 measure 继承标记。

## 严格导入边界

- 本切片交付时，每个 note/rest 最多一个直接 `<notations>`，且该容器只包含一个
  `<fermata/>`。
- `<notations>` 与 `<fermata>` 均不得带属性或非空文本；`<fermata>` 不得包含子元素。
- 重复 `<notations>`、重复 `<fermata>`、空容器、属性、文本、嵌套元素或错误层级必须
  形成 blocking ledger，不能静默忽略或降级。
- slur、tie、articulation、ornament 等其他 notations 语义不属于本切片；后续独立
  slur 切片允许 fermata 与严格 slur marker 共用同一个 `<notations>`，不反向扩大
  本切片当时的验收结论。

## 自动证据

- importer focused tests 覆盖 note/rest 成功映射及属性、文本、重复、空容器和错误层级
  的失败关闭。
- exporter focused tests 覆盖 note/rest 的确定性 XML/MXL 输出、canonical re-import
  和既有 blocking ledger 回归。
- Mobile 行为测试覆盖导入后保存 marker，以及带 marker 项目仍遵守导出候选、确认与
  下载流程；XML marker 内容由 exporter focused tests 验证。
- typecheck、完整 `check`、Android 本地门禁与 `git diff --check` 必须通过。

## 未执行与明确不做

- 真实桌面浏览器下载与重开：`NOT_EXECUTED`。
- Android WebView／真机选择、下载与重开：`NOT_EXECUTED`。
- MuseScore、Dorico、Sibelius 等第三方独立阅读器：`NOT_EXECUTED`。
- 真实 fermata 播放时值、MIDI、真实音频和教师审核：`NOT_EXECUTED`。
- 本切片不支持 fermata 类型、位置、形状等属性，不支持其他 notations，不代表完整
  MusicXML/MXL round-trip、S3 完成或正式版 V1 完成。

后续圆滑线双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-slur-round-trip-acceptance.md`。浏览器真实下载、
Android WebView／真机、第三方独立阅读器、真实音频、教师审核、MIDI、OMR、完整
MusicXML、S3 与正式版 V1 均仍为 `NOT_EXECUTED` 或未完成。
