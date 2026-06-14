# Audiveris Runner

当前目录定义 Audiveris Runner 的本地接入边界和 Phase A12 dry-run 实现。

- `audiverisTypes.ts` 提供 Runner 的输入和结果类型。
- `audiverisDryRunRunner.ts` 只校验非空路径字符串并构建未来命令参数数组。
- dry-run command shape 是尚未通过真实 Audiveris CLI 验证的参数草案。
- 当前不调用 Java、`child_process` 或远程 OMR 服务。
- 当前不接入应用运行流程，也不会给 `npm run build` 增加本机 Audiveris 依赖。
- 可运行
  `npm run audiveris:dry-run -- <inputPath> <outputDir>` 查看 JSON，不会执行命令。
- 未来 Phase A13 的本地 POC 才会实际验证 Audiveris CLI。
- MusicXML 解析仍由 `lib/musicxml` 和 `MusicXMLRecognizer` 负责，Runner 不解析
  MusicXML。

详细职责、阶段路线、环境变量、错误及隐私边界见
`docs/audiveris-runner.md`。
