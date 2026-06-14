# Audiveris 接入方案（Phase A2）

## 1. Audiveris 是什么

Audiveris 是一个开源 OMR（Optical Music Recognition，光学乐谱识别）工具，目标是从乐谱图片或 PDF 中识别五线谱结构，并导出标准 MusicXML 文件。

在当前产品中，Audiveris 的定位不是前端功能，也不是直接替代播放器，而是作为后端识别链路中的“图片到 MusicXML 转换器”。它负责从用户上传的乐谱图片中识别谱表、音符、休止符、小节线、调号、拍号等音乐元素，并尽量还原为可被程序解析的 MusicXML。

当前 Phase A2 只做系统集成设计，不接入真实 Audiveris，不写调用代码，不修改 UI。

## 2. Audiveris 如何将 image 转换为 MusicXML

Audiveris 的核心流程可以理解为：

1. **读取输入文件**
   - 输入可以是乐谱图片，例如 PNG、JPG。
   - 也可以是 PDF 等包含乐谱页面的文件。

2. **图像分析与预处理**
   - 分析页面尺寸、灰度、二值化结果和页面结构。
   - 检测五线谱线、谱表区域和系统边界。

3. **音乐符号识别**
   - 识别符头、符干、符尾、休止符、小节线、谱号、调号、拍号等符号。
   - 判断符号之间的关系，例如音符归属哪个谱表、哪个小节、哪个声部。

4. **音乐语义重建**
   - 将图像中的符号关系转换成音乐结构。
   - 推断音高、时值、小节、声部、谱表等信息。

5. **导出 MusicXML**
   - 将识别结果导出为 MusicXML 文件。
   - MusicXML 作为中间标准格式，后续再由系统内部的 `musicxmlParser` 转换为当前前端需要的 `RecognizeResponse`。

## 3. 输入输出流程

### 3.1 输入

Audiveris 接入后的输入来自当前 `/api/recognize` 接口收到的上传图片。

输入文件要求建议如下：

- 文件类型：优先支持 PNG、JPG、JPEG。
- 内容：优先支持清晰、正向、单页的印刷体五线谱。
- MVP 阶段暂不优先支持复杂手写谱、多页 PDF、严重倾斜图片和低清扫描件。

### 3.2 输出

Audiveris 的输出应作为后端中间产物保存或读取：

- 主要输出：MusicXML 文件或 MusicXML 字符串。
- 可选输出：识别日志、错误信息、临时工程文件。

系统不应直接把 Audiveris 的原始输出返回给前端，而应通过 `musicxmlParser` 转换为稳定的 `RecognizeResponse`。

### 3.3 临时文件建议

真实接入时，建议把上传图片、Audiveris 输出和日志都视为临时文件：

```text
/tmp/audiveris-jobs/{jobId}/input.png
/tmp/audiveris-jobs/{jobId}/output.musicxml
/tmp/audiveris-jobs/{jobId}/audiveris.log
```

MVP 阶段只需要保证单次请求可运行，后续再考虑任务队列、持久化、清理策略和并发隔离。

## 4. 完整识别流程设计

目标流程如下：

```text
上传图片
  ↓
/api/recognize
  ↓
RecognizerFactory
  ↓
MusicXMLRecognizer（未来新增）
  ↓
调用 Audiveris
  ↓
输出 MusicXML 文件
  ↓
musicxmlParser
  ↓
转换为 RecognizeResponse
  ↓
前端展示并播放
```

### 4.1 上传图片

前端继续沿用当前上传入口，不改变 UI，不改变用户操作路径。

前端职责：

- 选择或上传五线谱图片。
- 调用 `/api/recognize`。
- 接收标准 `RecognizeResponse`。
- 展示识别结果并交给播放器播放。

### 4.2 `/api/recognize`

`/api/recognize` 继续作为唯一对前端暴露的识别入口。

后端职责：

- 接收上传图片。
- 做基础校验，例如文件是否存在、类型是否允许、大小是否合理。
- 调用 `RecognizerFactory` 获取当前启用的识别器。
- 返回统一的 `RecognizeResponse`。

MVP 阶段不建议让前端知道 Audiveris、MusicXML 或识别器实现细节。

### 4.3 `RecognizerFactory`

`RecognizerFactory` 用于隔离不同识别实现。

未来可以支持：

- `MockRecognizer`：当前模拟识别结果，用于开发和回归验证。
- `MusicXMLRecognizer`：调用 Audiveris 并解析 MusicXML 的真实识别器。
- `AIRecognizer`：未来可能接入的 AI 模型识别器。
- `FallbackRecognizer`：用于组合多种识别方式。

建议通过环境变量控制默认识别器，例如：

```text
RECOGNIZER_PROVIDER=mock
RECOGNIZER_PROVIDER=audiveris
```

### 4.4 `MusicXMLRecognizer`（未来新增）

`MusicXMLRecognizer` 是未来接入 Audiveris 时新增的后端识别器，职责是把“图片识别”封装成“返回标准识别结果”。

它内部可以分为三步：

1. **准备输入**
   - 接收 `/api/recognize` 传入的图片。
   - 写入临时目录。
   - 生成本次识别任务的 `jobId`。

2. **调用 Audiveris**
   - 通过 CLI、Docker 或独立 Java 服务调用 Audiveris。
   - 等待 MusicXML 输出。
   - 捕获错误日志和退出状态。

3. **解析并转换结果**
   - 读取 MusicXML。
   - 调用 `musicxmlParser`。
   - 转换为 `RecognizeResponse`。

`MusicXMLRecognizer` 不应直接处理前端播放逻辑，也不应把 MusicXML 解析细节泄漏给页面组件。

### 4.5 `musicxmlParser`

`musicxmlParser` 负责把 MusicXML 中的音乐结构转换为当前系统内部的音符数据。

重点字段：

- `pitch`：由 MusicXML 的 `step`、`alter`、`octave` 转换而来，例如 `C4`、`F#4`、`Bb3`。
- `duration`：由 MusicXML 的 `duration`、`divisions`、`type` 等字段归一化为当前播放器使用的时值。
- `measure`：来自 MusicXML 的小节编号。
- `beat`：根据小节内累计时值计算。
- `confidence`：如果 MusicXML 没有置信度，MVP 阶段可以使用默认值，例如 `0.8`，并在后续版本优化。

### 4.6 `RecognizeResponse`

`RecognizeResponse` 是前后端之间的稳定契约。

Audiveris 接入后，前端仍然只关心类似结构：

```json
{
  "notes": [
    {
      "pitch": "C4",
      "duration": 1,
      "confidence": 0.8,
      "measure": 1,
      "beat": 1
    }
  ]
}
```

这样可以保证真实识别接入后，前端展示和播放逻辑不需要大规模重构。

## 5. 系统结构设计

推荐结构如下：

```text
/api/recognize
   ↓
RecognizerFactory
   ↓
MusicXMLRecognizer（未来新增）
   ↓
AudiverisRunner（未来新增，可选）
   ↓
MusicXML 文件或字符串
   ↓
musicxmlParser
   ↓
RecognizeResponse
```

### 5.1 分层职责

| 层级 | 职责 |
| --- | --- |
| `/api/recognize` | 接收请求、校验输入、返回统一响应 |
| `RecognizerFactory` | 选择当前识别器实现 |
| `MusicXMLRecognizer` | 编排 Audiveris 调用和 MusicXML 解析 |
| `AudiverisRunner` | 封装 CLI、Docker 或服务调用细节 |
| `musicxmlParser` | 解析 MusicXML 并转换为内部音符结构 |
| `RecognizeResponse` | 对前端稳定输出识别结果 |

### 5.2 为什么需要 `AudiverisRunner`

虽然 Phase A2 不写代码，但未来真实接入时建议把 Audiveris 调用细节单独隔离出来。

这样做的原因：

- CLI、本地 Docker、独立 Java 服务三种部署方式可以共用上层 `MusicXMLRecognizer`。
- 方便单独处理超时、退出码、日志、临时文件路径和错误信息。
- 后续如果替换为其他 OMR 工具，只需要替换 Runner 层。

## 6. 部署方式设计

### 6.1 本地运行 Audiveris CLI

适用场景：

- 本地开发。
- 快速验证真实识别链路。
- 单机 MVP 部署。

流程：

```text
Next.js API
  ↓
执行本机 Audiveris CLI
  ↓
读取输出 MusicXML
  ↓
解析并返回 RecognizeResponse
```

优点：

- 接入路径最短。
- 易于本地调试。
- 不需要额外服务间通信。

限制：

- 需要服务器安装 Java 和 Audiveris。
- 进程调用需要处理超时和并发。
- 部署环境差异可能导致识别结果或运行稳定性不一致。

### 6.2 Docker 方式运行 Audiveris

适用场景：

- 希望隔离 Java/Audiveris 运行环境。
- 希望部署结果更稳定。
- 后续需要在不同机器上复用相同环境。

流程：

```text
Next.js API
  ↓
将图片写入挂载目录
  ↓
运行 Audiveris Docker 容器
  ↓
容器输出 MusicXML 到挂载目录
  ↓
Next.js 读取 MusicXML
```

优点：

- 环境一致性更好。
- 不污染 Next.js 运行环境。
- 更容易在服务器上复现问题。

限制：

- 容器启动和文件挂载需要额外处理。
- 并发请求下需要隔离 job 目录。
- 部署平台必须支持 Docker。

### 6.3 独立 Java 服务

适用场景：

- 识别耗时较长。
- 需要独立扩容识别服务。
- Next.js 只负责 API 编排和前端页面。

流程：

```text
Next.js /api/recognize
  ↓
HTTP 调用 Java Audiveris Service
  ↓
Java 服务调用 Audiveris 并生成 MusicXML
  ↓
Java 服务返回 MusicXML 或标准结果
  ↓
Next.js 转换或直接返回 RecognizeResponse
```

优点：

- 识别能力和 Web 应用解耦。
- 更适合后续做任务队列、并发控制和横向扩容。
- Java/Audiveris 相关依赖集中在独立服务中。

限制：

- 系统复杂度更高。
- 需要服务发现、错误重试、日志追踪和部署运维。
- MVP 初期可能过重。

### 6.4 MVP 推荐部署顺序

建议按以下顺序推进：

1. **本地 Audiveris CLI**：最快验证 image → MusicXML → `RecognizeResponse`。
2. **Docker 方式**：当本地链路跑通后，用容器固定运行环境。
3. **独立 Java 服务**：当识别耗时、并发、稳定性成为问题时再拆分。

## 7. 错误处理与降级策略

真实接入时需要至少区分以下错误：

- 上传文件无效。
- Audiveris 进程启动失败。
- Audiveris 识别超时。
- 未生成 MusicXML。
- MusicXML 文件为空或格式错误。
- `musicxmlParser` 无法解析关键字段。
- 解析成功但没有可播放音符。

MVP 阶段建议：

- 后端返回明确错误消息。
- 日志中记录 `jobId`、输入文件名、Audiveris 退出码和错误摘要。
- 前端保持现有错误提示方式，不新增复杂 UI。

## 8. 未来扩展方向

### 8.1 AI fallback

当 Audiveris 无法识别或识别结果质量较差时，可以引入 AI fallback。

可能策略：

- Audiveris 成功时优先使用 Audiveris 输出。
- Audiveris 失败时调用 AI 模型识别图片。
- 对 Audiveris 和 AI 的输出做结果对比或融合。

MVP 阶段只需要预留识别器抽象，不需要实现 AI fallback。

### 8.2 OCR fallback

OCR fallback 主要用于识别乐谱中的文字信息，例如标题、速度标记、歌词、表情术语等。

可能用途：

- 识别曲名和作曲者。
- 识别 BPM 或速度文本。
- 识别歌词。
- 辅助理解乐谱标记。

当前播放器核心只需要音高和时值，因此 OCR fallback 可以放在后续阶段。

### 8.3 MusicXML 标准化

不同 OMR 工具导出的 MusicXML 可能存在差异，因此后续可以增加 MusicXML 标准化步骤。

标准化目标：

- 统一 `duration` 和 `divisions`。
- 统一升降号表示方式。
- 处理缺失或异常的小节编号。
- 合并或过滤不可播放元素。
- 对 rests、chords、ties、voices、staffs 做明确策略。

推荐位置：

```text
Audiveris 输出 MusicXML
  ↓
MusicXMLNormalizer（未来可选）
  ↓
musicxmlParser
  ↓
RecognizeResponse
```

## 9. Phase A2 结论

Phase A2 的核心结论是：

- Audiveris 应作为后端 OMR 工具接入，不直接暴露给前端。
- 系统应以 MusicXML 作为真实识别的中间格式。
- `/api/recognize` 仍然是前端唯一识别入口。
- `RecognizerFactory` 负责选择模拟识别、Audiveris 识别或未来 AI 识别。
- 未来新增 `MusicXMLRecognizer`，负责调用 Audiveris、读取 MusicXML、调用 `musicxmlParser`，并输出稳定的 `RecognizeResponse`。
- MVP 初期建议先用本地 Audiveris CLI 跑通链路，再考虑 Docker 和独立 Java 服务。
- 本阶段不写代码、不接真实 Audiveris、不改 UI，只为下一步真实识别实现提供架构设计依据。
