# MusicXML 开发验证 API（Phase A5）

## 用途与边界

`POST /api/dev/recognize-musicxml` 是一个受控的开发/验证入口，用于验证以下链路：

```text
MusicXML 文件
  ↓
MusicXMLRecognizer
  ↓
parseMusicXML
  ↓
RecognizeResponse
```

这个 route：

- 只用于开发和链路验证，不是正式的产品上传入口。
- 不会替代现有的 `/api/recognize` 图片识别 API。
- 不会接入页面 UI，也不会改变播放器或 Tone.js 逻辑。
- 不负责图片识别，也不接入 Audiveris。

## 开启方式

该 API 默认关闭。只有在服务端环境变量严格设置为以下值时才会开放：

```bash
MUSICXML_DEV_API_ENABLED=true
```

本地开发时可以将它加入 `.env.local`，然后重启 Next.js 开发服务器。未设置、设置为空或
设置为其他值时，route 返回 `404`，因此不会默认暴露在 Vercel production。

## 请求格式

发送 `POST` 和 `multipart/form-data` 请求，并使用 `file` 字段上传 MusicXML 文件。

使用仓库中的样例文件验证：

```bash
curl --fail-with-body \
  -X POST \
  -F "file=@lib/musicxml/__fixtures__/simple-score.musicxml;type=application/vnd.recordare.musicxml+xml" \
  http://localhost:3000/api/dev/recognize-musicxml
```

也可以在启动服务时临时开启：

```bash
MUSICXML_DEV_API_ENABLED=true npm run dev
```

空文件是有效的验证输入，会返回包含 `notes: []` 的响应，而不会使 API 崩溃。缺少
`file` 字段或无法解析 form-data 时，会返回带有 `error` 的友好 JSON 响应。

## 预期响应

成功响应遵循应用已有的 `RecognizeResponse` 契约，并包含：

- `notes`：`parseMusicXML` 转换出的音符；样例文件会产生多个音符。
- `source`：值为 `"musicxml"`。
- `metadata`：包含 `"musicxml"` provider、format 和版本信息。
- `raw.musicXml`：上传的原始 MusicXML，供开发调试使用。

响应结构示意：

```json
{
  "notes": [
    {
      "pitch": "C4",
      "note": "C4",
      "duration": "quarter",
      "measure": 1,
      "beat": 1,
      "confidence": 0.8,
      "source": "musicxml"
    }
  ],
  "source": "musicxml",
  "metadata": {
    "provider": "musicxml",
    "format": "musicxml",
    "version": "2026-06-14"
  },
  "raw": {
    "musicXml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>..."
  }
}
```
