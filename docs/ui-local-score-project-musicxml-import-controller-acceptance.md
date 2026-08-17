# 本机谱项目 MusicXML／MXL 导入 controller 验收

状态：**Active implementation acceptance**

最后核验：2026-08-17

规范来源：`docs/final-ui-refactor-compatibility-contract.md`、
`docs/s1-local-score-project-musicxml-import-generation-guard-acceptance.md`

## 1. 动机

`mobile/src/LocalScoreProjectPanel.tsx` 此前直接校验导入文件、读取浏览器 `File`、解包
MXL、调用 canonical MusicXML 草稿 use-case，并用组件内 generation ref 屏蔽迟到结果。
既有行为已经保护快速替换和清除，但平台文件 API、异步流程状态与大型 JSX 仍耦合，
不利于最终 UI 替换或独立验证卸载、迟到失败与文件读取分支。

本切片把选择、校验、状态、latest-wins generation 和草稿生成编排移入框架无关
controller；浏览器 `File.text()`／`File.arrayBuffer()` 与 MXL 解包留在 file adapter；薄
React hook 只负责稳定订阅和 StrictMode-safe 生命周期。既有 canonical import use-case
仍是唯一 MusicXML 语义来源。

## 2. 必须改变

- 面板不再直接读取 `File`、解包 MXL、调用草稿生成 use-case 或拥有 generation ref；
- controller 继续只接受 `.musicxml`、`.xml`、`.mxl`，拒绝空文件和超过 2 MiB 的文件；
- A 读取未完成时选择 B，A 的迟到成功或失败不能覆盖 B；
- pending 时清除或卸载，迟到成功／失败不能重新发布候选、状态或错误；
- 旧读取完成时先验证 generation，再调用 parser、时间／项目 ID／事件 ID 工厂；
- browser file adapter 对 XML／MusicXML 只调用 `text()`，对 MXL 只调用
  `arrayBuffer()` 后交给既有安全 extractor；
- 只有持久化返回 `saved` 后，面板才消费已确认候选；容量或事务失败继续保留候选重试；
- Android 静态门禁改为验证 controller、adapter、hook 依赖方向，并阻止平台读取回流面板。

## 3. 必须保留

- 所有既有简体中文文案、2 MiB 上限、accept 范围、ready／blocked 状态和问题清单；
- `createLocalScoreProjectMusicXmlImportDraft`、blocking ledger、fingerprint、canonical schema、
  项目／事件 ID 规则和时间来源；
- “内存候选 → 检查 → 明确确认 → 原子新增保存”流程；
- 清除只撤销内存候选并重置文件 input，不修改、覆盖或删除任何本机项目；
- 保存失败保留候选和既有项目，成功后打开持久化返回的 canonical 项目；
- 本机、离线、无上传、无账号／云同步、非评分、非正式转写边界；
- MusicXML/MXL 导出、项目编辑、IndexedDB adapter 与其他 score-project 职责保持原边界。

## 4. 自动验收

- `test:mobile-local-score-project-behavior` 覆盖扩展名／空文件／2 MiB 边界、替换、清除、
  detach、迟到成功／失败、当前错误重试、adapter 分流、候选消费和 StrictMode replay；
- 既有面板测试继续覆盖真实 supported／blocked MusicXML 草稿、确认后原子保存与保存失败重试；
- `test:local-score-project-musicxml-import` 继续覆盖 canonical parser 与 ledger；
- `validate:mxl-import` 继续覆盖 MXL 容器安全边界；
- `validate:android-local` 验证 controller／adapter／hook 存在、generation guard 仍有效，且
  面板不重新直接读取文件或调用 extractor；
- `typecheck`、targeted lint、repository／CI policy 与 `git diff --check` 为合并门禁。

## 5. 未执行与不宣称

真实浏览器、Android System WebView、已安装 APK、第三方 MusicXML／MXL 文件、低内存、
大文件性能、屏幕阅读器、教师与目标用户 QA 均保持 `NOT_EXECUTED`。本切片不改变
MusicXML 语义、存储 schema／迁移、正式 OMR、上传、云同步、评分或 V1 完成状态，也不
表示完整 score-project controller、exchange 导出边界或最终 UI 重构已经完成。

QA level recommendation：**strict**。
