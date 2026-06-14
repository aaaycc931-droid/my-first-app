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
- OMR-like fixture：`lib/musicxml/__fixtures__/omr-like-score.musicxml`
- OMR-like 预期 notes：`lib/musicxml/__fixtures__/omr-like-score.expected.json`

预期文件只固化 `notes`，因为这是 parser 和 recognizer 之间最重要的 MVP 数据边界。
dev API 的完整响应还应包含顶层 `source: "musicxml"`、MusicXML metadata 和
`raw.musicXml`。

## Fixture 来源分类

- `simple-score` 是用于验证基础解析行为的 synthetic fixture。
- `omr-like-score` 是手写的 OMR-like synthetic fixture，只模拟常见 OMR 导出层级。
- `lib/musicxml/__fixtures__/audiveris/` 目录只用于未来加入有来源说明的真实
  Audiveris fixture。
- 当前仓库还没有真实 Audiveris 输出样本。
- 不得把 `omr-like-score` 描述或用作真实 Audiveris 识别结果。

未来真实样本的来源记录、命名、接入顺序和 parser 增强边界见
`docs/audiveris-sample-intake.md`。

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

## 验证 OMR-like MusicXML

`omr-like-score.musicxml` 是手写的兼容性样本，用于模拟比基础样例更接近真实 OMR
导出结果的 MusicXML 结构。它包含 metadata、`part-list`、`key`、`time`、`clef`、
单个 part、两个 measure、休止符以及升降记号，但它不来自 Audiveris，也不代表完整的
Audiveris 输出或完整 MusicXML 标准。

这个样本用于验证 parser 能在额外导出结构存在时继续读取单声部、单 staff notes，并
兼容：

- `attributes` 中的 `divisions`、`key`、`time` 和 `clef`
- `part-list` 与 `score-part`
- 不输出 rest，但按其时值推进 beat
- `alter=1` 的 `F#4` 和 `alter=-1` 的 `Bb4`
- quarter、half 和 eighth 类型及两个 measure 的编号

保持 dev API 已开启后，可以上传该 fixture 并将 notes 与 expected JSON 对比：

```bash
curl --fail-with-body --silent \
  -X POST \
  -F "file=@lib/musicxml/__fixtures__/omr-like-score.musicxml;type=application/vnd.recordare.musicxml+xml" \
  http://localhost:3000/api/dev/recognize-musicxml \
  | node -e '
let body = "";
process.stdin.on("data", (chunk) => body += chunk);
process.stdin.on("end", () => {
  process.stdout.write(JSON.stringify({ notes: JSON.parse(body).notes }, null, 2) + "\n");
});
' > /tmp/omr-like-score.actual.json

diff -u \
  lib/musicxml/__fixtures__/omr-like-score.expected.json \
  /tmp/omr-like-score.actual.json
```

`diff` 没有输出且退出码为 `0` 表示实际 notes 与
`omr-like-score.expected.json` 一致。预期结果包含 7 个音符、`F#4` 和 `Bb4`；
measure 2 的 eighth rest 不出现在 notes 中，但其后的 `D5` 应位于 beat 2.5。所有
notes 的 `source` 都应为 `"musicxml"`。

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

这组 fixture 只验证当前单声部、单 staff、基础时值、升降号和休止符拍点处理的 MVP
MusicXML 能力。OMR-like fixture 只是对常见导出层级的模拟，不代表完整 MusicXML
标准支持，也不代表真实 Audiveris 输出或图片到乐谱的完整 OMR 能力。未来接入
Audiveris 时，应继续让其 MusicXML 输出经过这里固化的 recognizer/parser 边界，并在
获得真实输出样本后增量增加 fixture，而不是改坏现有样例行为。
