# 真实 Audiveris MusicXML 样本扩展计划（Phase A25）

## 1. 目标与边界

当前仓库只有一份真实 Audiveris 导出样本
`audiveris-basic-01.musicxml`。它可以证明现有 MVP 解析器能够处理这一份具体导出，但样本
数量、复杂度和长度都不足以代表 Audiveris 的真实输出分布，也不足以支持 Production
判断。

本计划用于在后续收到真实 Audiveris 导出的 MusicXML 后，以一致、可追溯、可重复验证的
方式逐步扩展 fixture 集。Phase A25 只准备文档、模板和流程：

- 不新增或伪造 MusicXML fixture。
- 不修改 parser、API、页面、播放器、provider 或 Production 开关。
- 不接入 Audiveris CLI、FastAPI 或 Docker。
- 不因为单个样本通过就扩大当前 MVP 支持范围。

## 2. 为什么需要更多真实样本

一份真实样本无法覆盖不同乐谱长度、谱面密度、行数、记谱结构及 Audiveris 导出差异。
扩展样本集主要用于：

- 观察真实导出文件的大小分布，继续评估当前 2 MB 限制，而不是把现有约 90 KB 样本外推
  到 Production。
- 验证不同复杂度样本能否被当前 parser 稳定读取，并识别尚未支持的结构边界。
- 记录 notes 数量与轻量解析耗时，为后续评估提供可复查的数据。
- 确保兼容性改动由真实结构触发，而不是依据手写或推测的 MusicXML。
- 为 Production 评审积累证据；样本扩展本身不等于批准开启 Production。

## 3. 建议收集的样本类型

优先按从简单到复杂、一次一个样本的顺序收集：

| 类型 | 建议内容 | 主要观察点 | 命名示例 |
| --- | --- | --- | --- |
| simple / basic | 短小、结构清晰、接近当前 MVP 能力的单谱表乐谱 | 基础导出结构、回归稳定性 | `audiveris-basic-02.musicxml` |
| medium | 中等长度或音符密度，包含更多小节及常见节奏组合 | notes 数量、拍点、解析耗时 | `audiveris-medium-01.musicxml` |
| complex | 含较复杂真实记谱结构；允许暴露当前未支持范围 | parser 边界、失败方式、待办记录 | `audiveris-complex-01.musicxml` |
| multi-line | 页面上包含多个谱表行/系统的乐谱 | 跨行导出后的 measure 与 notes 连续性 | `audiveris-multi-line-01.musicxml` |
| longer score | 明显长于当前样本的多页或多小节乐谱 | 文件大小、notes 数量、解析耗时、2 MB 余量 | `audiveris-longer-01.musicxml` |

类型名称描述评估用途，不宣称 parser 已完整支持该类乐谱。若同一文件同时属于多个类别，
选择最主要的验证目标作为文件名，并在 `source.md` 的 Notes 中记录其他特征。

## 4. 命名规范

真实样本统一放在：

```text
lib/musicxml/__fixtures__/audiveris/
```

basename 使用 `audiveris-<type>-<two-digit-sequence>`，采用小写英文、数字和连字符。序号
在同一类型内递增，不复用已提交编号。例如：

```text
audiveris-basic-02.musicxml
audiveris-medium-01.musicxml
audiveris-complex-01.musicxml
```

每份样本应使用同一 basename 配套三个文件：

```text
audiveris-medium-01.musicxml
audiveris-medium-01.expected.json
audiveris-medium-01.source.md
```

文件名不得包含曲名、用户名、本地路径、客户名称或其他敏感来源信息。`.xml` 输入在接入时
统一使用 `.musicxml` 扩展名；如果收到的是 `.mxl`，应在仓库外解压并记录解压情况，不能
直接把压缩包作为当前 fixture。

## 5. 每个样本的必需记录

每份真实样本必须在同 basename 的 `source.md` 及 metrics 记录中保存以下信息：

| 字段 | 记录位置与要求 |
| --- | --- |
| 文件名 | `source.md`；写完整 fixture 文件名 |
| Audiveris version | `source.md`；准确版本，无法确认时明确写 `unknown` |
| 导出格式 | `source.md`；例如 `.musicxml`、`.xml` 或收到的 `.mxl` |
| 是否由 `.mxl` 解压 | `source.md`；`yes` / `no` |
| 是否包含本地路径 | `source.md`；记录原始导出中是否出现，不复制敏感路径 |
| 是否已脱敏 | `source.md`；记录状态和仅限 metadata 的变更 |
| 文件大小 | metrics 文档；以 bytes 和 KB 记录脚本输出 |
| notes count | metrics 文档；记录当前 parser 输出的 notes 数量 |
| parse duration | metrics 文档；记录同一次 metrics 运行的毫秒数及日期/环境 |
| 是否通过 validate | `source.md` 或接入 PR；记录相关验证命令结果 |

创建来源记录时复制
[`docs/templates/audiveris-source-template.md`](./templates/audiveris-source-template.md)，
不要修改模板来代替为具体样本建立记录。

## 6. 来源真实性与修改边界

只有能够确认由 Audiveris 实际导出、并且具有提交权限的文件，才能标记为
`audiveris-real` 并进入该目录。

以下文件明确禁止标记为 `audiveris-real`：

- 手写 MusicXML。
- AI 生成或 AI 补全的 MusicXML。
- 为使 parser 通过而人工拼装的 MusicXML。
- 来源不明、无法确认导出工具的 MusicXML。
- 仅模仿 Audiveris 结构的 synthetic / omr-like fixture。

允许为隐私目的对 metadata 做最小脱敏，但必须在 `source.md` 中逐项说明。不得修改音符、
小节、时值、声部或其他 MusicXML 乐谱结构后仍宣称它是未经修改的真实导出。若结构确需
修改，应将 `MusicXML structure modified` 标为 `yes`，解释原因，并单独评估它是否仍
适合作为真实导出兼容性证据。

## 7. 单个样本接入清单

每次只接入一个样本，并按以下顺序执行：

1. 确认文件确由 Audiveris 导出，记录 Audiveris 版本、导出日期和原始输入类型。
2. 确认提交授权、隐私状态及原始导出中是否存在本地路径。
3. 如收到 `.mxl`，在仓库外解压，选择内部 `.musicxml` / `.xml`，并记录
   `Was .mxl extracted: yes`。
4. 只对必要 metadata 做脱敏；不得为迁就 parser 改写乐谱结构。
5. 按命名规范加入 `.musicxml` 与同 basename 的 `.source.md`。
6. 运行 `npm run musicxml:metrics`，确认脚本已纳入该样本；如脚本仍使用显式路径列表，
   以最小改动加入新路径。
7. 人工核对 parser 输出后建立 `.expected.json`；不得把明显错误的输出盲目固化为预期。
8. 将该次 metrics 输出的文件大小、notes 数量和解析耗时更新到
   `docs/musicxml-fixture-metrics.md`。
9. 运行全部必需验证并在接入 PR 中记录结果：

   ```bash
   npm run musicxml:metrics
   npm run validate:musicxml
   npm run validate:musicxml-import-ui
   npm run build
   ```

10. 检查提交差异，确认没有原始本地路径、个人信息、未授权内容或无关功能改动。

某个复杂样本解析失败时，应如实记录失败及当前支持边界。是否进行 parser 兼容增强应作为
后续独立、最小范围的功能阶段，不在样本接入时伪造成功结果。

## 8. Production 结论

当前只有一份真实 Audiveris 样本，数据不足以证明当前 2 MB 限制、解析范围或运行表现
适合 Production。后续新增样本并完成上述验证，只是补充评估证据；在 Production 策略的
全部前置条件和明确发布评审完成前，MusicXML import UI 与 dev API 仍应保持
Preview-only / dev-only。
