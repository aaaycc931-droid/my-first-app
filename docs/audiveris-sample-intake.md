# 真实 Audiveris MusicXML 样本接入规范（Phase A8）

## 1. 真实 Audiveris 样本的定义

本规范中的真实样本，必须是 Audiveris 或其他真实 OMR（Optical Music Recognition）
工具从五线谱图片实际导出的 MusicXML。样本用于验证现有 `parseMusicXML` 和
`MusicXMLRecognizer` 对真实 OMR 导出结构的兼容性，不代表当前应用已经接入图片识别。

必须遵守以下标记边界：

- 不得手写 MusicXML 后将其描述为真实 Audiveris 输出。
- 只有来源说明能够确认由 Audiveris 实际导出的样本，才能标记为
  `audiveris-real`。
- 由其他已确认的真实 OMR 工具导出的样本，应准确记录工具名称，不能标记为
  `audiveris-real`。
- 来源不确定的样本只能标记为 `omr-like`；明确由人工构造的样本应标记为
  `synthetic`。
- 当前仓库尚无真实 Audiveris 输出样本；现有 `simple-score` 和 `omr-like-score`
  都是 synthetic fixture。

## 2. 样本命名与配套文件

未来真实 Audiveris 样本统一放在：

```text
lib/musicxml/__fixtures__/audiveris/
```

每个样本使用相同 basename，并至少包含以下三个文件：

```text
audiveris-basic-01.musicxml
audiveris-basic-01.expected.json
audiveris-basic-01.source.md
```

命名使用小写英文、数字和连字符。名称应描述验证范围并带递增编号，避免使用可能泄露
曲名、用户或文件来源的信息。

### `source.md` 必填信息

每个真实样本的 `source.md` 必须记录：

- **来源说明**：样本如何获得，以及确认其由哪个 OMR 工具导出的依据。
- **是否脱敏**：是否移除了标题、作者、版权、路径、用户信息或其他敏感 metadata。
- **原始图片是否保留**：图片是否仍存在；若存在，说明是否在仓库内以及访问范围。
- **Audiveris 版本**：已知时填写准确版本；未知时明确写“未知”。
- **导出时间**：已知时填写；未知时明确写“未知”。
- **是否允许提交到仓库**：记录授权、版权或内部数据政策结论。

如果无法确认来源或提交权限，不得把文件加入 `audiveris/` 并标记为
`audiveris-real`。

## 3. 真实样本接入流程

未来新增真实 Audiveris 样本时，必须按以下顺序处理：

1. 确认来源、提交权限和脱敏状态，并准备配套 `source.md`。
2. 将原始导出的 `.musicxml` 放入 `lib/musicxml/__fixtures__/audiveris/`，不要为了让
   parser 通过而先手工改写导出结构；如必须脱敏，应在 `source.md` 中记录。
3. 使用 dev-only MusicXML API 或直接调用 parser 解析样本。
4. 根据 parser 当前实际可接受、且人工核对正确的结果生成 `expected.json`，不能为了
   迁就错误输出而盲目固化预期。
5. 检查输出 `notes` 数量。
6. 逐项检查 `pitch`。
7. 逐项检查 `duration`。
8. 逐项检查 `measure`。
9. 逐项检查 `beat`。
10. 检查 rest 不进入 `notes`，但会按其时值推进后续音符的 `beat`。
11. 检查每个 note 的 `source` 为 `"musicxml"`，并检查 recognizer 响应的顶层
    `source` 为 `"musicxml"`。
12. 将实际 notes 与 `expected.json` 做可重复对比，并运行 `npm run build`。
13. 如果 parser 失败，只做覆盖该真实结构所需的最小兼容增强，并确保已有 fixtures
    行为不变。

## 4. Parser 增强边界

真实样本暴露兼容问题时，允许考虑的最小增强包括：

- XML namespace 兼容。
- 更稳健的 measure number 读取。
- 更稳健的 divisions 读取。
- 更稳健地跳过无 pitch 的 note/rest，同时正确推进可确定的拍点。
- 更稳健地忽略或处理不影响 MVP notes 的 metadata、`part-list` 和 `attributes`。

每项增强都应由真实样本触发、可解释、范围最小，并保留
`simple-score`、`omr-like-score` 的现有预期结果。

当前阶段暂时不做：

- 多声部。
- 多 staff。
- chord。
- tie。
- slur。
- tuplets。
- dotted notes。
- grace notes。
- 完整 MusicXML 标准支持。
- 真实图片识别。
- Audiveris CLI、Java、Docker 或服务调用。

如果真实样本包含上述结构，应在 `source.md` 或验证记录中注明当前未支持部分，不要在
同一次样本导入中扩展为完整实现。

## 5. 验证命令

### 启动 dev-only API

```bash
MUSICXML_DEV_API_ENABLED=true npm run dev
```

### 上传真实 MusicXML

将 basename 替换为待验证样本：

```bash
curl --fail-with-body --silent \
  -X POST \
  -F "file=@lib/musicxml/__fixtures__/audiveris/audiveris-basic-01.musicxml;type=application/vnd.recordare.musicxml+xml" \
  http://localhost:3000/api/dev/recognize-musicxml \
  > /tmp/audiveris-basic-01.response.json
```

### 提取 notes 并对比 expected JSON

可以使用 `jq`：

```bash
jq '{ notes: .notes }' \
  /tmp/audiveris-basic-01.response.json \
  > /tmp/audiveris-basic-01.actual.json

diff -u \
  lib/musicxml/__fixtures__/audiveris/audiveris-basic-01.expected.json \
  /tmp/audiveris-basic-01.actual.json
```

如果环境没有 `jq`，可以使用 Node.js：

```bash
node -e '
const fs = require("fs");
const response = JSON.parse(fs.readFileSync("/tmp/audiveris-basic-01.response.json", "utf8"));
process.stdout.write(JSON.stringify({ notes: response.notes }, null, 2) + "\n");
' > /tmp/audiveris-basic-01.actual.json

diff -u \
  lib/musicxml/__fixtures__/audiveris/audiveris-basic-01.expected.json \
  /tmp/audiveris-basic-01.actual.json
```

最后执行生产构建：

```bash
npm run build
```

以上验证仅检查“已有 MusicXML 到统一响应”的兼容性，不会调用 Audiveris，也不会改变
默认 `mock` provider 或 `/api/recognize` 的图片上传行为。
