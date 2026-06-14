# MusicXML 验证边界（Phase A6）

## 验证目标

本阶段为以下转换链路固定一组可重复检查的输入和预期输出：

```text
MusicXML
  ↓
MusicXMLRecognizer
  ↓
parseMusicXML
  ↓
RecognizeResponse
```

- 输入 fixture：`lib/musicxml/__fixtures__/simple-score.musicxml`
- 预期 notes：`lib/musicxml/__fixtures__/simple-score.expected.json`

预期文件只固化 `notes`，因为这是 parser 和 recognizer 之间最重要的 MVP 数据边界。
dev API 的完整响应还应包含顶层 `source: "musicxml"`、MusicXML metadata 和
`raw.musicXml`。

## 手动验证样例 MusicXML

项目目前没有 test script 或已有测试框架，因此 Phase A6 不新增测试依赖。可以通过
dev-only API 对 fixture 和 expected JSON 做可重复的手动比较。

先在一个终端开启 API：

```bash
MUSICXML_DEV_API_ENABLED=true npm run dev
```

然后在另一个终端请求样例文件，并仅提取 `notes`：

```bash
curl --fail-with-body --silent \
  -X POST \
  -F "file=@lib/musicxml/__fixtures__/simple-score.musicxml;type=application/vnd.recordare.musicxml+xml" \
  http://localhost:3000/api/dev/recognize-musicxml \
  | node -e '
let body = "";
process.stdin.on("data", (chunk) => body += chunk);
process.stdin.on("end", () => {
  process.stdout.write(JSON.stringify({ notes: JSON.parse(body).notes }, null, 2) + "\n");
});
' > /tmp/simple-score.actual.json

diff -u \
  lib/musicxml/__fixtures__/simple-score.expected.json \
  /tmp/simple-score.actual.json
```

`diff` 没有输出且退出码为 `0` 表示 notes 与 fixture 一致。该结果应包含 5 个音符，
其中包括 `F#4`；第二小节的 quarter rest 本身不应成为 note，但它会推进拍点，因此
`G4` 应位于 measure 2、beat 3。每个 note 的 `source` 应为 `"musicxml"`。

如需检查 recognizer 响应的顶层 source：

```bash
curl --fail-with-body --silent \
  -X POST \
  -F "file=@lib/musicxml/__fixtures__/simple-score.musicxml;type=application/vnd.recordare.musicxml+xml" \
  http://localhost:3000/api/dev/recognize-musicxml \
  | node -e '
let body = "";
process.stdin.on("data", (chunk) => body += chunk);
process.stdin.on("end", () => {
  const response = JSON.parse(body);
  if (response.source !== "musicxml") process.exit(1);
  console.log(response.source);
});
'
```

## 验证 API 默认关闭

停止已开启的开发服务器，并在未设置环境变量时重新启动：

```bash
env -u MUSICXML_DEV_API_ENABLED npm run dev
```

以下请求应返回 HTTP `404`：

```bash
curl --silent --output /tmp/musicxml-disabled.json --write-out "%{http_code}\n" \
  -X POST \
  -F "file=@lib/musicxml/__fixtures__/simple-score.musicxml;type=application/vnd.recordare.musicxml+xml" \
  http://localhost:3000/api/dev/recognize-musicxml
```

也可以用显式的 `MUSICXML_DEV_API_ENABLED=false npm run dev` 启动后重复请求，结果同样
应为 `404`。只有值严格等于 `true` 时 API 才开放。

## 验证空文件

保持 API 已开启，创建并上传一个空文件：

```bash
: > /tmp/empty.musicxml

curl --fail-with-body --silent \
  -X POST \
  -F "file=@/tmp/empty.musicxml;type=application/vnd.recordare.musicxml+xml" \
  http://localhost:3000/api/dev/recognize-musicxml \
  | node -e '
let body = "";
process.stdin.on("data", (chunk) => body += chunk);
process.stdin.on("end", () => {
  const response = JSON.parse(body);
  if (!Array.isArray(response.notes) || response.notes.length !== 0) process.exit(1);
  console.log(JSON.stringify({ notes: response.notes }));
});
'
```

命令应输出 `{"notes":[]}`。空 XML 是有效边界输入，不应导致 route 或 recognizer
崩溃。

## 当前范围

这组 fixture 只验证当前单声部、基础时值、升号和休止符拍点处理的 MVP MusicXML
能力。它不代表完整 MusicXML 标准支持，也不代表图片到乐谱的完整 OMR 能力。未来接入
Audiveris 时，应继续让其 MusicXML 输出经过这里固化的 recognizer/parser 边界，并在
获得真实输出样本后增量增加 fixture，而不是改坏现有样例行为。
