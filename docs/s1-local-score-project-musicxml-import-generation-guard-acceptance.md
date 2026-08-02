# S1 本机谱项目 MusicXML／MXL 导入文件读取 generation guard 验收

QA level recommendation：**strict**

## 范围

本切片只硬化 `mobile/src/LocalScoreProjectPanel.tsx` 的本机文件导入异步边界：每次
选择或清除文件都会推进当前读取 generation；旧的 `File.text()`、`File.arrayBuffer()`、
MXL 解包或 MusicXML 草稿生成完成后，如果 generation 已过期，则不再发布候选、状态或
错误文案。输入仍只在本机内存处理，确认保存继续通过既有 blocking ledger、
`score-document-v13` 与 `local-score-project-storage-v14`。

为使这个边界对用户可达，读取期间仍可选择替换文件，并可清除当前候选／读取；清除只
撤销内存候选，不写入或删除本机项目。

## 自动验收

- `test:mobile-local-score-project-behavior` 覆盖旧文件延迟读取后被新文件替换：新候选
  保持可见，旧文件完成的成功结果不会覆盖新候选；随后清除候选后不残留导入预览。
- `validate:android-local` 对 generation ref、过期 generation 检查和清除时推进
  generation 做源码边界验证。
- 既有 MusicXML/MXL parser、blocking ledger、确认后原子保存、导出与存储测试继续运行。
- `git diff --check`、`npm run lint`、`npm run typecheck` 为本地门禁；远端 Quality、
  android-local、Vercel 与其他检查仍是合并门禁。

## 未执行与不宣称

自动行为测试和源码静态验证不能替代真实浏览器、Android WebView、Android/iOS 真机、
屏幕阅读器、第三方 MusicXML 阅读器或教师／目标用户 QA；上述外部证据保持
`NOT_EXECUTED`。本切片不改变 MusicXML 语义、迁移链、存储版本、网络上传、云同步或
生产 OMR 能力，也不声称完成正式 V1。
