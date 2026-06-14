# Audiveris CLI 本地 POC（Phase A13）

## 1. 使用范围

这个 POC 只用于开发者自己的本地机器，不用于 Vercel，也不用于任何生产环境。
它不会接入 Next.js、`/api/recognize` 或默认识别流程，当前默认 provider 仍然是
`mock`。

## 2. 验证目标

后续在本地手动验证真实 Audiveris CLI 时，需要依次确认：

1. 本机是否已经安装 Audiveris。
2. Audiveris 是否能通过命令行调用。
3. 输入图片或 PDF 后，是否能生成 `.mxl` 或 `.musicxml` 文件。
4. 生成结果是否能交给现有 dev-only MusicXML API，或直接交给
   `parseMusicXML` 做解析验证。

这些验证不会成为 `npm run build` 或 `npm run validate:musicxml` 的前置条件。

## 3. 本地路径配置

使用 `AUDIVERIS_PATH` 记录本地 Audiveris 可执行入口或启动脚本路径：

```bash
AUDIVERIS_PATH=/path/to/audiveris npm run audiveris:check-local
```

`audiveris:check-local` 只检查环境变量配置并输出 JSON，不检查文件是否存在，也不会
执行 Audiveris 或 Java。

Windows 下的安装目录和可执行入口可能因安装方式、版本及用户选择而不同，例如可能是
安装目录中的启动脚本。开发者必须在自己的机器上确认真实路径，不能直接假定固定的
`Program Files` 路径。

## 4. CLI 参数仍需验证

当前 `npm run audiveris:dry-run` 输出的 command shape 只是参数组织草案。它没有
经过真实 Audiveris CLI 验证，不能视为可直接用于本地或生产执行的最终命令。

真实调用前需要根据本机 Audiveris 版本核对 CLI 帮助和导出行为，包括输入参数、
batch/export 参数、输出目录、输出文件名及退出状态。本阶段不调用 `child_process`、
`spawn` 或 `exec`，也不执行真实识别。

## 5. 结果验证与脱敏

真实 Audiveris 导出的 MusicXML、日志或 metadata 可能包含输入文件、本地工作目录、
用户名或其他绝对路径。把任何生成结果提交到仓库之前，必须检查并移除这些本地信息，
同时在 fixture 的来源说明中记录脱敏范围。

脱敏后的 `.musicxml` 可以交给现有 dev-only MusicXML API 或 `parseMusicXML`
验证；`.mxl` 如需验证，应先按现有解析边界支持的格式进行处理，不应借此改变线上图片
上传流程。
