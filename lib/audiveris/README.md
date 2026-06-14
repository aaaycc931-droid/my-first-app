# Audiveris Runner

当前目录只定义 Audiveris Runner 的本地接入边界。

- 当前只提供输入和结果类型，不执行 Audiveris CLI。
- 当前不调用 Java、`child_process` 或远程 OMR 服务。
- 当前不接入应用运行流程，也不会给 `npm run build` 增加本机 Audiveris 依赖。
- 未来 Phase A12 之后的本地 POC 才会逐步实现或验证 Runner。
- MusicXML 解析仍由 `lib/musicxml` 和 `MusicXMLRecognizer` 负责，Runner 不解析
  MusicXML。

详细职责、阶段路线、环境变量、错误及隐私边界见
`docs/audiveris-runner.md`。
