# P44 — Sheet Music to Practice Target MVP Staged Plan

## 1. 产品定位

五线谱识别是面向中文用户的视唱练耳系统中的练习内容输入能力，不是孤立 OCR 工具。

它的产品目标不是“识别完成即结束”，而是把乐谱图片 / PDF 逐步转换成可被用户理解和确认的练习目标草稿。任何自动识别、自动生成或自动分析结果都必须经过：

```text
预览
→ 检查
→ 修改 / 确认
→ 再进入练习
```

乐谱输入系统最终应服务于：

- 视唱练习；
- 节奏练习；
- 音高练习；
- 练习目标检查与修正；
- 非评分练习反馈；
- 未来正式评分前的目标准备。

因此，乐谱图片 / PDF 的输出必须是：

- 可预览的谱面来源；
- 可检查的识别或手动标注草稿；
- 可修改的音高、时值、休止符、拍号、调号信息；
- 可确认的临时练习目标；
- 可用于视唱练习的目标；
- 可用于节奏练习的目标；
- 可用于未来音高目标生成的草稿来源。

当前 P44 只做 docs-only 分阶段计划，不实现 runtime、UI、上传、OCR、PDF parser、账号、数据库、云端、评分或 final target。

## 2. 完整未来流程

未来完整流程应是：

```text
上传乐谱图片 / PDF
→ 谱面预览
→ 页码选择
→ 缩放 / 拖动 / 旋转 / 裁剪
→ 选择识别范围
→ 识别音符 / 休止符 / 节奏 / 小节线 / 拍号 / 调号
→ 生成识别草稿
→ 标出不确定区域
→ 原谱与识别结果对照
→ 用户手动修改音高 / 时值 / 休止符 / 拍号 / 调号
→ 小节时值校验
→ 生成视唱练习目标或节奏练习目标
→ 进入 /practice 非评分练习
→ 未来正式评分
```

早期只实现其中很小的一部分，不能一次性做完整链路。尤其是上传、真实 OCR、PDF 解析、云端识谱、正式 correction editor、final target 和正式评分都不属于当前 MVP 默认能力。

## 3. MVP 分阶段路线总览

| Stage | 名称 | 核心目标 | 是否接入 /practice | QA level |
| --- | --- | --- | --- | --- |
| Stage A | 本地乐谱导入与预览草稿 | browser-local 选择图片并显示谱面预览，不做 OCR | 否 | standard |
| Stage B | 手动乐谱片段标注草稿 | 手动输入简单音符 / 节奏片段，形成练习目标草稿 | 可先不接入，后续可受控接入 | strict when connected |
| Stage C | 识别结果占位 / Mock Recognition Draft | 用 mock draft 验证识别草稿结构、不确定提示和检查状态 | 可灰度接入检查入口 | standard / strict when target creation exists |
| Stage D | 草稿检查与小节校验 | 检查小节时值、缺失、不完整、不确定并允许确认或重置 | 不直接进入；为进入练习做 gate | standard |
| Stage E | 转换为临时视唱 / 节奏练习目标 | 用户确认后生成 session-only 临时目标并接入 /practice | 是 | strict |
| Stage F | 真实 OCR / 识谱能力接入 | 未来接入真实识别，结果仍必须是草稿 | 通过既有检查链路接入 | strict |

## 4. Stage A — 本地乐谱导入与预览草稿

### 用户能做什么

- 在浏览器本地选择一张乐谱图片。
- 查看谱面预览。
- 查看 basic file metadata，例如文件名、类型、大小、选择时间。
- 清除当前选择，回到空状态。
- 替换文件；替换后旧预览和旧状态失效。

### 系统生成什么

- `imported sheet source` 的 session-only 引用。
- `preview state`，包括是否有文件、是否能预览、预览错误、文件元信息。

### 哪些是草稿

- 当前只存在“乐谱输入来源草稿”和“谱面预览草稿”。
- 不生成识别结果。
- 不生成练习目标。

### 用户如何检查

- 通过预览确认是否选对文件。
- 通过文件元信息确认来源是否正确。
- 若预览失败，用户只能更换或清除文件。

### 用户如何清除 / 重置

- 提供清除入口，移除本 session 内的文件引用、预览状态和错误信息。
- 替换文件必须重置之后所有依赖旧文件的草稿状态。

### 是否接入 /practice

否。Stage A 只建立乐谱输入入口，不进入 `/practice`。

### 是否允许进入练习

不允许。没有识别、没有手动标注、没有目标草稿。

### 当前边界

- browser-local。
- session-only。
- no upload。
- no OCR。
- no PDF parser runtime。
- no target creation。

### 禁止事项

- 不要把选择文件描述为上传。
- 不要声称已经识别乐谱。
- 不要自动进入练习。
- 不要保存私人乐谱。

### QA level

standard。虽然不涉及音频 runtime，但涉及新 UI 入口、文件状态、预览状态和 reset 行为。

### 推荐测试

- `git diff --check`。
- 手动浏览器检查：空状态、选择图片、预览失败、清除、替换文件。
- 确认 Network 面板没有上传请求。

## 5. Stage B — 手动乐谱片段标注草稿

### 用户能做什么

- 手动输入或选择简单音符片段。
- 手动输入或选择简单节奏片段。
- 为片段选择基础拍号或默认练习上下文。
- 预览手动标注片段。
- 清除或重置当前手动片段。

### 系统生成什么

- `recognition draft` 的早期替代物：manual notation draft。
- 草稿可包含音高、时值、休止符、小节位置、来源说明和创建时间。

### 哪些是草稿

- 所有手动标注结果都是练习目标草稿。
- 它不是 OCR 结果。
- 它不是 final target。
- 它不是 official transcription。

### 用户如何检查

- 在进入任何练习前查看片段列表、音高、节奏和小节结构。
- 显示“这是手动草稿，需要确认后才能用于练习”。

### 用户如何清除 / 重置

- 清除手动片段会删除当前 session 内草稿。
- 修改任何关键字段后，已确认状态应变为 stale，需要重新确认。

### 是否接入 /practice

早期可先不接入；当接入时必须通过 Stage D / Stage E 的检查与确认链路。

### 是否允许进入练习

只有在草稿被检查并明确确认后，才允许进入非评分练习。

### 当前边界

- browser-local。
- session-only。
- non-scoring。
- 手动草稿优先，不依赖真实 OCR。

### 禁止事项

- 不做自动识别。
- 不做正式 correction editor。
- 不做正式评分。
- 不自动保存为私人曲库。

### QA level

如果只做草稿输入 UI：standard。如果生成临时练习目标或改变 `/practice` 练习目标创建：strict。

### 推荐测试

- `git diff --check`。
- 手动检查输入、清除、重置、修改后 stale、确认 gate。
- 若接入 `/practice`，额外检查进入练习、清除目标、重置后不可进入。

## 6. Stage C — 识别结果占位 / Mock Recognition Draft

### 用户能做什么

- 查看 mock recognition draft。
- 查看哪些音符、休止符、小节或拍号是低可信或不确定。
- 切换检查状态，例如未检查、检查中、已检查。
- 清除 mock 草稿。

### 系统生成什么

- 固定或可控的 mock recognition draft。
- 不确定区域提示。
- draft source 标记为 mock / 示例，不是实际 OCR。
- review state 初稿。

### 哪些是草稿

- mock recognition draft 全部是草稿。
- 不确定区域只是识别可靠性提示，不是分数。
- confidence / coverage 不能称为 score。

### 用户如何检查

- 原谱预览与 mock 识别结果对照。
- 明确显示待检查、不确定、缺失或不可用区域。
- 用户必须主动确认检查状态。

### 用户如何清除 / 重置

- 清除 mock draft 后，review state、validation state 和任何临时目标都必须失效。
- 替换源文件后，旧 mock draft 必须变为 stale 或被清除。

### 是否接入 /practice

可先只接入检查 UI；若产生练习目标，必须进入 Stage E 的临时目标创建链路。

### 是否允许进入练习

默认不允许。只有通过检查和确认后，才允许转换为临时练习目标。

### 当前边界

- 不调用真实 OCR。
- 不调用 Audiveris production。
- 不解析 PDF。
- 不上传文件。

### 禁止事项

- 不要让用户误以为 mock 是真实识别。
- 不要自动将 mock 草稿送入 `/practice`。
- 不要把不确定提示包装成正式评分。

### QA level

standard；若同阶段加入 target creation 或 `/practice` 行为则为 strict。

### 推荐测试

- `git diff --check`。
- 检查 mock 标识、低可信提示、review state、清除、替换文件 stale。

## 7. Stage D — 草稿检查与小节校验

### 用户能做什么

- 查看草稿是否完整。
- 查看小节时值是否匹配拍号。
- 查看缺失、不完整、不确定区域。
- 确认草稿可以进入下一步，或重置检查状态。

### 系统生成什么

- `review state`：未检查、检查中、已确认、需修改、已重置。
- `validation state`：valid、invalid、stale、unchecked、warning。
- 小节时值校验结果和 disabled reason。

### 哪些是草稿

- recognition draft 仍是草稿。
- validation 只说明当前草稿是否适合进入非评分练习，不代表正式正确。

### 用户如何检查

- 查看每小节时值对比。
- 查看低可信或缺失项。
- 查看“为什么不能进入练习”的 disabled reason。
- 主动点击确认。

### 用户如何清除 / 重置

- 重置检查会把 review state 回到未检查。
- 清除草稿会同步清除 validation state 和临时目标。
- 修改草稿后 validation state 必须变为 stale。

### 是否接入 /practice

Stage D 本身不直接接入 `/practice`，只作为 Stage E 的 gate。

### 是否允许进入练习

不直接允许。只有通过 Stage E 转换为临时目标后进入。

### 当前边界

- 不做正式 correction editor。
- 不做复杂谱面编辑器。
- 不做 final approval。

### 禁止事项

- 不自动修正草稿。
- 不把 validation 说成 score。
- 不跳过用户确认。

### QA level

standard。若校验结果直接控制 `/practice` 临时目标创建，则相关集成测试按 strict 处理。

### 推荐测试

- `git diff --check`。
- 检查 valid、invalid、stale、unchecked、warning 状态。
- 检查 disabled reason 是否为简体中文。

## 8. Stage E — 转换为临时视唱 / 节奏练习目标

### 用户能做什么

- 在草稿已检查且 validation 允许后，明确点击生成临时练习目标。
- 选择生成视唱练习目标或节奏练习目标。
- 进入 `/practice` 做非评分练习。
- 清除临时目标并回到草稿检查状态。

### 系统生成什么

- `temporary practice target`。
- 来源说明：来自乐谱草稿 / 手动草稿 / mock 草稿。
- 当前 session 内的临时目标状态。

### 哪些是草稿

- 源 recognition draft 仍是草稿。
- temporary practice target 是临时练习目标，不是 final target。
- 练习反馈是 non-scoring diagnostic feedback，不是正式评分。

### 用户如何检查

- 创建前显示确认摘要。
- 显示目标类型、来源、范围、已检查状态、仍存在的 warning。
- 用户必须主动确认。

### 用户如何清除 / 重置

- 提供清除临时目标入口。
- 源文件替换、草稿修改、review reset 或 validation invalid 后，临时目标必须清除或标记 stale。

### 是否接入 /practice

是。该阶段完成最小“乐谱到练习目标”闭环。

### 是否允许进入练习

允许，但仅限 non-scoring、session-only、browser-local 临时目标。

### 当前边界

- 不保存。
- 不持久化。
- 不上传。
- 不评分。
- 不生成 final target。

### 禁止事项

- 不自动进入练习。
- 不把临时目标称为最终目标。
- 不把练习反馈称为正式成绩。
- 不写入账号、数据库或云端。

### QA level

strict。该阶段涉及 practice target creation、reset / clear 和核心练习流程。

### 推荐测试

- `git diff --check`。
- 手动检查确认 gate、生成临时目标、进入 `/practice`、清除目标、替换文件后目标失效。
- 检查 non-scoring copy 和 no final target copy。

## 9. Stage F — 真实 OCR / 识谱能力接入

### 用户能做什么

- 在未来从乐谱图片 / PDF 触发真实识别。
- 查看识别草稿和不确定区域。
- 对照原谱检查结果。
- 修改或确认后再进入练习。

### 系统生成什么

- 真实 recognition draft。
- confidence / uncertainty diagnostics。
- 小节、拍号、调号、音符、休止符、节奏结构。
- validation state 和 review state。

### 哪些是草稿

- 真实 OCR / OMR 输出仍然是草稿。
- 识别结果不是 official transcription。
- 识别结果不是 final target。

### 用户如何检查

- 原谱与识别结果对照。
- 不确定区域高亮。
- 手动修改音高 / 时值 / 休止符 / 拍号 / 调号。
- 小节时值校验。

### 用户如何清除 / 重置

- 清除识别草稿会清除 review、validation 和 temporary practice target。
- 重新识别会使旧草稿 stale。
- 替换文件会使旧识别全部失效。

### 是否接入 /practice

只能通过 Stage D / Stage E 的检查、确认和临时目标转换链路接入。

### 是否允许进入练习

允许，但前提是用户已检查并确认，且只进入非评分练习；正式评分另需未来阶段。

### 当前边界

- Stage F 是未来阶段，不属于当前 P44 runtime。
- 真实识别能力必须在产品闭环成熟后再接入。

### 禁止事项

- 不允许真实 OCR 输出绕过用户检查。
- 不允许直接生成 final target。
- 不允许直接正式评分。
- 不允许自动保存私人乐谱。

### QA level

strict。真实识别、目标生成、练习接入和 reset / stale 状态都影响核心流程。

### 推荐测试

- `git diff --check`。
- 真实样本识别回归测试。
- 手动浏览器 QA：预览、识别、低可信提示、修改、校验、确认、进入练习、清除、替换文件。
- 网络与存储检查：确认当前阶段没有未授权上传或持久化。

## 10. 数据和状态原则

以下是高层状态原则，不是 runtime TypeScript 实现。

### imported sheet source

- 表示用户在当前浏览器 session 中选择的乐谱来源。
- 只保存本地引用和 basic metadata。
- 不上传、不持久化、不写入数据库。
- 替换文件会使依赖旧 source 的 preview、draft、review、validation 和 temporary target 失效。

### preview state

- 表示谱面是否可预览、预览错误、页码或图片显示状态。
- 未来可包含页码选择、缩放、拖动、旋转、裁剪和识别范围。
- 当前早期阶段不要求 PDF runtime 解析。

### recognition draft

- 表示来自手动标注、mock recognition 或未来真实识别的乐谱结构草稿。
- 包括音符、休止符、节奏、小节线、拍号、调号、不确定提示和来源类型。
- 永远不能直接当最终结果。

### review state

- 表示用户是否已经检查草稿。
- 可包含 unchecked、reviewing、needs_change、confirmed、reset。
- 任何草稿修改或源文件替换都应使已确认状态变为 stale 或 reset。

### validation state

- 表示草稿是否通过进入练习前的基本校验。
- 可包含 valid、invalid、warning、stale、unchecked。
- validation 不是 score，只是安全进入非评分练习的 gate。

### temporary practice target

- 表示用户确认后生成的当前 session 临时练习目标。
- 可用于视唱练习或节奏练习。
- non-scoring、session-only、可清除、不保存。
- 不是 final target。

### cleared / stale / invalid 状态

- cleared：用户明确清除后，相关 source、draft、review、validation、temporary target 不再可用。
- stale：上游 source 或 draft 改变后，下游 review、validation 或 temporary target 不再可信。
- invalid：校验发现缺失、时值不匹配、不完整或无法进入练习的问题。

当前阶段必须保持：

- 不使用数据库；
- 不上传；
- 不保存私人乐谱；
- 不持久化；
- 当前 session-only；
- 不引入账号。

## 11. 用户体验细节要求

- Empty state：没有选择乐谱时，应说明“请选择本地乐谱图片后预览”，不要暗示已上传或已识别。
- Loading state：预览、mock draft 或未来识别生成时需要显示等待状态，但不能称为正式转写。
- Disabled reason：按钮不可用时必须说明原因，例如“请先检查草稿”“小节时值不匹配”“当前草稿已失效”。
- Warning：低可信、不完整、缺失、预览失败、校验 warning 都应明确显示。
- Stale state：源文件替换、草稿修改、重新识别后必须提示旧检查结果或旧临时目标已失效。
- Invalid draft state：无拍号、时值不匹配、缺少音符、缺少小节信息或不确定区域过多时，不应允许直接进入练习。
- Clear / reset：每个阶段都需要清除或重置路径，且要说明会清除哪些 session-only 状态。
- Replace file behavior：替换文件必须清除或标记旧 preview、draft、review、validation、temporary target 为 stale。
- Confirm before use：进入练习前必须有用户明确确认，不自动进入 `/practice`。
- User-facing copy：用户可见文案默认使用简体中文。
- 草稿命名：不要把草稿说成正式识别结果。
- 临时目标命名：不要把 temporary practice target 说成 final target。
- 指标命名：不要把 coverage / confidence 说成 score。

## 12. 当前不做

当前 P44 和后续早期 MVP 不做：

- 真实 OCR；
- PDF 解析 runtime；
- Audiveris production；
- 云端识谱；
- 上传；
- 账号；
- 数据库；
- correction editor；
- final target；
- official transcription；
- formal scoring；
- 自动进入练习；
- 自动保存乐谱；
- 公开分享；
- 支付；
- 会员；
- 社区；
- 公开资源库。

## 13. 如何避免做成孤立 OCR 工具

- 每个识谱入口都必须以“生成练习目标草稿”为目标，而不是以“输出 OCR 文本”为目标。
- 每个识别结果都必须显示来源、草稿状态、检查状态、校验状态和可进入练习的条件。
- 识别输出必须能连接到视唱练习、节奏练习和未来音高目标生成。
- 识别 UI 必须包含原谱对照、用户检查、修改 / 确认和清除 / 重置路径。
- `/practice` 接入必须保持 non-scoring、session-only 和明确确认。
- 未来真实 OCR 只是替换草稿来源，不改变“预览 → 检查 → 修改 / 确认 → 再进入练习”的产品原则。
