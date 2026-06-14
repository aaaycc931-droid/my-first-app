# Audiveris Local Runner 边界（Phase A11）

## 1. Runner 的职责

Audiveris Runner 是“输入乐谱文件”和“生成 MusicXML”之间的执行边界。它用于隔离
Audiveris 的本地进程、文件系统和未来独立 OMR 服务调用细节。

Runner 的最小输入为：

- 图片或 PDF 的本地文件路径。
- 本次任务使用的输出目录。

Runner 未来可以选择以下一种执行方式：

- 调用本地 Audiveris CLI。
- 调用独立部署的 OMR 服务。

Runner 的输出为以下一种或多种结果：

- `.musicxml` 文件路径。
- `.mxl` 文件路径。
- MusicXML 文本。
- 用于诊断本次执行的日志或错误摘要。

Runner 不负责：

- 解析 MusicXML。
- 把 MusicXML 转换为应用内部的 notes。
- 前端展示。
- Tone.js 播放。

MusicXML 解析仍由 `lib/musicxml` 和 `MusicXMLRecognizer` 负责。Runner 只生成或取得
MusicXML，不理解其音乐语义。

## 2. 为什么不放进 `/api/recognize`

本地 Audiveris 执行不能直接放入当前 `/api/recognize`：

- Vercel serverless 运行环境不适合安装和执行 Java/Audiveris。
- Audiveris 识别通常耗时较长，不适合作为短生命周期的 serverless 请求内进程。
- CLI 需要稳定的本地文件系统、输出目录和子进程调用能力。
- Java、Audiveris 版本、超时和并发资源都需要独立管理。
- 当前 `/api/recognize` 的图片上传 MVP 行为和默认 `mock` provider 必须保持不变。

因此，Runner 应先作为本地工具验证，未来有部署需求时再拆成独立 OMR 服务。Next.js
API Route 不直接运行 Audiveris。

## 3. 推荐阶段路线

1. **A11：设计 Runner 边界**
   - 固定职责、最小类型、环境变量、错误和安全边界。
   - 不执行 CLI，不改变现有识别流程。
2. **A12：增加 local-only 脚本文档或 dry-run Runner**
   - 验证参数、路径和预期命令的组织方式。
   - dry-run 只能输出计划执行的信息，不能要求 CI 安装 Java/Audiveris。
3. **A13：在本地机器运行 Audiveris CLI**
   - 用明确的本地命令把图片或 PDF 转换为 MusicXML。
   - 处理退出状态、超时、日志和输出文件检查。
4. **A14：接入现有 `MusicXMLRecognizer`**
   - 把 Runner 生成的 MusicXML 交给现有 recognizer/parser 边界。
   - 保持 Runner 与 MusicXML 解析解耦。
5. **A15：评估独立后端服务**
   - 根据耗时、并发、部署和隐私需求决定是否建设独立 OMR 服务。
   - 不默认把 Audiveris 放进 Vercel / Next.js API Route。

## 4. 环境变量规划

| 环境变量 | 用途 | A11 状态 |
| --- | --- | --- |
| `AUDIVERIS_PATH` | 本地 Audiveris 可执行入口或启动脚本路径 | 仅规划，不读取 |
| `AUDIVERIS_OUTPUT_DIR` | 本地识别产物的根输出目录 | 仅规划，不读取 |
| `OMR_PROVIDER` | 未来选择 local Audiveris 或独立 OMR 服务 | 仅规划，不改变默认 recognizer |
| `OMR_SERVICE_URL` | 未来独立 OMR 服务地址 | 仅规划，不发起请求 |
| `MUSICXML_DEV_API_ENABLED` | 控制现有 dev-only MusicXML API | 已有行为保持不变 |

这些变量不能成为 `npm run build`、CI 或现有 fixture 验证的必需条件。未安装
Java/Audiveris 时，应用构建和 `npm run validate:musicxml` 必须继续运行。

## 5. 错误类型规划

未来 Runner 至少需要区分：

- Audiveris 未安装或 `AUDIVERIS_PATH` 无效。
- Java 不可用。
- 输入文件不存在。
- CLI 执行失败，例如非零退出码。
- 输出 MusicXML 不存在。
- 输出文件或输出文本为空。
- 识别超时。
- MusicXML 解析失败。

前七类属于 Runner 或 OMR 执行边界。MusicXML 解析失败属于 parser/recognizer
边界，Runner 可以保留相关上下文，但不应自行实现解析或修复 MusicXML。

Phase A11 的 `AudiverisResult.error` 只保留最小字符串边界；后续阶段再根据真实本地
POC 决定是否增加稳定错误码，避免在没有执行经验前过度设计。

## 6. 安全和隐私

- Audiveris 输出、日志和 metadata 可能包含输入文件或本地工作目录的绝对路径。
- 把生成结果提交为 fixture 前必须检查并移除私人路径、用户名及其他敏感 metadata。
- 每个真实 fixture 的 `source.md` 必须记录具体脱敏范围，而不只是写“已脱敏”。
- 不得把用户私人图片路径、临时任务路径或本机目录结构提交到公开仓库。
- 原始图片是否可保留、是否可提交，应继续遵守
  `docs/audiveris-sample-intake.md` 的来源与授权要求。

## 7. Phase A11 明确不做

- 不调用 `child_process`。
- 不运行 Java 或 Audiveris。
- 不实现线上 OMR API。
- 不修改 `/api/recognize`。
- 不改变默认 `mock` provider。
- 不修改 UI、播放器或 Tone.js。
- 不新增 FastAPI 或 Docker。
- 不让 build、CI 或 MusicXML fixture 验证依赖本机 Audiveris。
