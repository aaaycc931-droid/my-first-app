# S3 MusicXML／MXL note 容器 fail-closed 硬化验收

状态：**严格导入加固候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

本切片只收紧当前单 part／staff／voice 导入中每个 note/rest 事件的外层容器：

- 必须是大小写精确、无 namespace 的 `<note>`；
- `<note>` 必须没有任何属性；
- pitched note、rest 与全部既有受控子语义继续使用同一门禁；
- 阻断必须发生在 canonical event ID 分配、项目物化或持久化之前。

本切片不增加音乐语义，不修改 `score-document-v13`、
`local-score-project-storage-v14` 或迁移链。

## Fail-closed 边界

- `print-object`、`pizzicato`、`attack`、`release`、`default-x` 等显示、播放、时间或
  布局属性必须 blocking；未知属性和 namespace 属性同样 blocking。
- `<NOTE>` 等大小写变体与 `<m:note>` 等 namespace 变体必须 blocking，不得按
  local-name 或大小写折叠后接受。
- pitched note 与 rest 使用相同规则；不得因为事件没有 lyric、fingering、
  articulation 或 dynamics 而绕过属性检查。
- 本切片不声称已经硬化 `pitch`、`duration`、`voice`、`type` 等全部后代容器；
  这些结构仍受既有边界约束，并可在后续独立切片继续审计。

## 自动验收

- XML 与 MXL 输入都覆盖 pitched note 和 rest 的显示、播放、时间、布局、未知及
  namespace 属性；
- XML 与 MXL 输入都覆盖错误大小写和外部 namespace 的 note 容器；
- 每个阻断候选都产生稳定 `unsupported-note-container` ledger，并分配 0 个 event ID；
- 当前合法 note/rest、增／减三和弦及全部既有严格语义回归保持通过。

## 人工与外部 QA

真实浏览器导入、下载与重开，Android WebView／真机，
MuseScore／Dorico／Sibelius 等第三方独立阅读器，以及显示、布局和播放验证均为
`NOT_EXECUTED`。教师审核、目标用户验证和教育有效性也为 `NOT_EXECUTED`。

本切片不证明完整 note 结构、完整 MusicXML/MXL、第三方兼容、完整 S3 或正式版 V1。
