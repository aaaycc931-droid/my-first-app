# MusicXMLRecognizer（Phase A4）

## 角色

`MusicXMLRecognizer` 是 recognizer 架构中的 MusicXML adapter。它接收一个包含
MusicXML 的 `File`，并返回与现有 mock、AI recognizer 相同的
`RecognizeResponse`，从而让 MusicXML 输入可以复用系统内部统一的识别结果契约。

它只负责读取和转换已有的 MusicXML，不负责从图片生成 MusicXML，也不调用
Audiveris、CLI、Java 服务或其他 OMR 工具。

## 与 parseMusicXML 的关系

处理流程如下：

```text
MusicXML 文件或字符串
  ↓
MusicXMLRecognizer
  ↓ file.text()
parseMusicXML(xml)
  ↓
RecognizeResponse
```

`MusicXMLRecognizer` 负责 recognizer 接口适配和错误边界；`parseMusicXML` 负责解析
MusicXML，并生成当前应用可展示、可播放的 notes。解析成功时：

- `notes` 来自 `parsed.notes`。
- `source` 为 `"musicxml"`。
- metadata 标记 provider 和 format 均为 `"musicxml"`。
- `raw.musicXml` 保留原始 XML，供未来调试或链路集成使用，不影响前端。

空 XML 或没有可解析音符的 XML 会正常返回 `notes: []`。如果文件读取或转换过程失败，
recognizer 会返回空 notes 和 `error`，避免异常直接使调用链崩溃。

## 为什么暂时不接入 UI

当前 UI 和 `/api/recognize` 仍以乐谱图片上传为入口。Phase A4 只建立内部 adapter，
不增加 MusicXML 上传入口，不改变图片上传流程，也不修改播放器和 Tone.js 逻辑。
后续阶段确认导入方式和 provider 切换策略后，再决定是否暴露开发专用或正式入口。

## 为什么默认 provider 仍然是 mock

`recognizerFactory` 已支持显式创建 `"musicxml"` provider，但默认 provider 继续使用
`"mock"`。这样现有 `/api/recognize` 图片 MVP 的响应和行为保持不变，同时可以在内部
独立验证 MusicXML 转换能力。

## 未来接入 Audiveris

Audiveris 接入后可以把它的输出作为这个 adapter 的输入：

```text
乐谱图片
  ↓
Audiveris
  ↓
MusicXML
  ↓
MusicXMLRecognizer
  ↓
parseMusicXML
  ↓
RecognizeResponse
```

届时 Audiveris 负责“图片到 MusicXML”，`MusicXMLRecognizer` 负责“MusicXML 到统一识别
响应”。两者保持分层，UI 和播放逻辑仍只依赖稳定的 `RecognizeResponse`。
