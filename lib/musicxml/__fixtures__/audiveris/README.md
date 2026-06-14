# 真实 Audiveris fixtures

这里存放由 Audiveris 实际导出的 MusicXML 样本。当前样本和后续新增样本都必须保持来源
可确认、结构变更可追溯，并按从简单到复杂的顺序小步接入。

## 新样本接入顺序

1. 先确认文件确由 Audiveris 导出、版本信息和提交权限。
2. 检查原始导出是否包含本地路径或其他敏感 metadata，并只做必要脱敏。
3. 如收到 `.mxl`，在仓库外解压并记录；当前目录只提交解压后的 `.musicxml`。
4. 按 `audiveris-<type>-<two-digit-sequence>` 命名，一次只加入一个样本。
5. 先加入 `.musicxml` 和完整的 `.source.md`，再人工核对解析结果并建立
   `.expected.json`。
6. 将样本加入 metrics 采集范围，更新 metrics 文档并运行全部验证。

建议依次扩展 basic、medium、complex、multi-line 和 longer score 类型。具体命名、分类
和接入清单见
[`docs/audiveris-real-sample-expansion-plan.md`](../../../../docs/audiveris-real-sample-expansion-plan.md)。

## `source.md` 要求

每个真实样本必须配套同 basename 的 `.source.md`，至少记录：

- 样本名称与 `audiveris-real` 分类。
- 导出工具、Audiveris 版本和导出日期。
- 原始输入类型、导出格式及是否由 `.mxl` 解压。
- 原始导出是否包含本地路径、脱敏状态及具体 metadata 变更。
- MusicXML 乐谱结构是否被修改。
- 来源确认、提交权限、已知限制、验证结果和 Commit/PR。

使用
[`docs/templates/audiveris-source-template.md`](../../../../docs/templates/audiveris-source-template.md)
创建记录。来源、版本或日期未知时必须明确写 `unknown`，不能猜测；不得在记录中复制未
脱敏的本地路径。

## `expected.json` 要求

- 每个 `.musicxml` 必须配套同 basename 的 `.expected.json`。
- expected 内容必须来自对真实导出和 parser 输出的人工核对，不能为迁就错误输出而
  盲目固化。
- 应检查 notes 数量，以及各 note 的 `pitch`、`duration`、`measure`、`beat` 和
  `source`。
- 当前 parser 不支持的结构应如实记录，不得通过伪造或改写真实样本来制造通过结果。

## Metrics 与验证要求

接入新样本后必须：

1. 确认 `scripts/collect-musicxml-fixture-metrics.mjs` 已采集新 fixture。
2. 运行 `npm run musicxml:metrics`。
3. 把文件大小、notes 数量和解析耗时更新到
   `docs/musicxml-fixture-metrics.md`。
4. 运行：

   ```bash
   npm run validate:musicxml
   npm run validate:musicxml-import-ui
   npm run build
   ```

## 禁止事项

- 不得在此目录放置 synthetic、手写、AI 生成或来源不明的 MusicXML 并标记为真实样本。
- 不得把模仿 Audiveris 结构的 fixture 标记为 `audiveris-real`。
- 不得为使验证通过而伪造 MusicXML、来源记录或 expected 结果。
- 来源或提交权限不能确认时，不得接入。

基础定义和详细核对流程见
[`docs/audiveris-sample-intake.md`](../../../../docs/audiveris-sample-intake.md)。
