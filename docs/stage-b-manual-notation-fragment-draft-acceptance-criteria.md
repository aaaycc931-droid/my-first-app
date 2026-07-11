# P48 — Stage B Manual Notation Fragment Draft Acceptance Criteria

## 1. Stage B 定位

Stage B 是“手动乐谱片段草稿”验收标准。它定义未来用户如何在乐谱预览功能区内手动建立一个很短、可预览、可检查、可修改的乐谱片段草稿，用于后续 Stage D 小节时值校验和 Stage E session-only 临时练习目标转换的输入准备。

Stage B 当前只定义验收标准，不实现 runtime。未来 runtime 也必须保持 browser-local、session-only、non-scoring，不上传、不保存到云端、不生成正式结果。

Stage B 明确不是：

- 不是 OCR；
- 不是 OMR；
- 不是自动识谱；
- 不是正式转写；
- 不是 final target；
- 不是 practice target；
- 不是评分系统；
- 不是图片内容读取；
- 不是 PDF parser；
- 不是完整 notation editor。

Stage B 的目标是让用户能够手动输入一个小范围乐谱片段草稿，并清楚知道：当前内容只是用户手动草稿，不是图片自动识别结果，不会生成练习目标，也暂时不能进入练习。

## 2. 用户流程验收标准

目标流程：

```text
进入乐谱预览功能区
→ 开始手动草稿
→ 选择拍号
→ 添加音符或休止符
→ 选择基础时值
→ 查看草稿预览
→ 修改或删除事件
→ 检查草稿
→ 清空或重置
→ 未来进入 Stage D 校验
```

验收时必须确认：

1. 用户从乐谱预览功能区进入 Stage B 手动草稿入口。
2. 没有 Stage A 图片时，也能开始纯手动草稿。
3. 有 Stage A 图片时，图片只能作为视觉参考，不得被读取、识别或称为草稿来源的自动结果。
4. 用户开始草稿前看到 empty state、当前阶段说明、未来练习入口 disabled reason。
5. 用户选择拍号后可以添加音符或休止符事件。
6. 用户添加事件时必须选择基础时值；音符事件还必须选择允许范围内的音高。
7. 用户可以看到结构化草稿预览，至少包含拍号、小节数量、事件数量、事件顺序、事件类型、音高、时值、所属小节和草稿状态。
8. 用户可以修改或删除单个事件。
9. 用户可以清空全部事件，也可以重置为初始空状态。
10. 用户可以将当前草稿标记为已检查，或在修改后重新检查。
11. 草稿修改后，checked 状态必须失效；未来 validation 状态和 temporary practice target 也必须 stale 或 cleared。
12. Stage B 当前不能直接进入练习，不能直接生成 practice target。
13. Stage B 完成后只为未来 Stage D validation gate 提供草稿输入；Stage D 尚未通过前不得继续进入 Stage E。

## 3. 与 Stage A 的关系

Stage A 是本地乐谱图片导入与预览。Stage B 是手动乐谱片段草稿。两者关系如下：

- 有 Stage A 图片时，Stage B 可以把该图片作为用户肉眼参考。
- 没有 Stage A 图片时，Stage B 仍可创建纯手动草稿。
- Stage B 不读取图片内容。
- Stage B 不识别图片。
- Stage B 不上传图片。
- Stage B 不调用 `/api/recognize`。
- Stage B 不把草稿称为图片的自动识别结果。
- Stage B 不显示“识别完成”“自动识谱结果”“正式识谱结果”等误导性文案。

如果 Stage A 图片被替换或清除：

1. 如果 Stage B 草稿显式依赖旧图片作为视觉参考，草稿必须进入 stale，或者要求用户明确确认“继续作为独立手动草稿”。
2. stale 草稿不得进入未来 Stage D 校验，除非用户确认它已经脱离旧图片来源并作为独立手动草稿继续。
3. stale 草稿不得进入练习，不得生成 temporary practice target。
4. 如果用户清除 stale 草稿，应恢复 empty / cleared 状态。
5. 如果用户确认继续作为独立手动草稿，应记录当前草稿不再依赖旧图片，并要求重新检查。

## 4. 最小输入范围

Stage B 初始范围建议保持很小，优先验证完整手动草稿 vertical slice，而不是实现完整制谱能力。

推荐初始范围：

| 项目 | 初始范围 |
| --- | --- |
| 拍号 | `2/4`、`3/4`、`4/4` |
| 音高 | C4–C5 |
| 音符时值 | 二分、四分、八分 |
| 休止符 | 至少四分休止符 |
| 小节数量 | 1–2 小节 |
| 最大事件数 | 8 个 |
| 事件类型 | 音符、休止符 |

暂不支持：

- 附点；
- 三连音；
- 连音线；
- 延音线；
- 临时升降号；
- 复杂调号；
- 多声部；
- 和弦；
- 歌词；
- 装饰音；
- 多谱表；
- 跨小节复杂结构；
- 自动小节线推断以外的复杂排版；
- 完整五线谱渲染器要求。

## 5. 草稿预览要求

未来 Stage B 预览至少应展示：

- 拍号；
- 小节数量；
- 事件数量；
- 事件顺序；
- 音符或休止符类型；
- 音高；
- 时值；
- 所属小节；
- 草稿状态；
- 是否已检查；
- 是否可以进入未来校验；
- 是否可以进入练习：否。

首版可以采用结构化列表或简化时间顺序预览，不要求完整五线谱渲染器。预览必须明确标注“当前只是手动草稿”，不能暗示这是自动识谱结果、正式转写、final target、practice target 或评分依据。

## 6. 编辑、删除、清空、重置规则

未来 Stage B runtime 需要支持：

- 添加音符；
- 添加休止符；
- 修改音高；
- 修改时值；
- 音符和休止符之间切换；
- 删除单个事件；
- 清空全部；
- 重置为空状态；
- 修改拍号；
- 重新检查。

编辑规则：

1. 添加音符时必须选择允许范围内的音高和时值。
2. 添加休止符时必须选择允许范围内的休止符时值。
3. 音符切换为休止符后，音高字段不再作为有效事件信息展示。
4. 休止符切换为音符时，必须重新选择音高。
5. 修改拍号后，已检查状态必须失效。
6. 删除事件后，事件顺序和所属小节显示必须重新计算或重新标记为待检查。
7. 清空全部事件后，草稿进入 empty / cleared，不保留旧 checked 或未来 validation。
8. 重置为空状态必须清除拍号以外的草稿事件；如果产品决定重置也清除拍号，必须在 UI 中说明。
9. 草稿修改后 checked 状态失效。
10. 草稿修改后未来 validation 状态失效。
11. 如果未来存在 temporary practice target，草稿修改后该 target 必须 stale 或 cleared。
12. 不允许静默保留旧检查结果、旧 validation 结果或旧 temporary practice target。

## 7. 状态模型

| 状态 | 什么时候出现 | 用户看到什么 | 用户可以执行什么 | Disabled 操作 | Disabled reason | 如何恢复 |
| --- | --- | --- | --- | --- | --- | --- |
| empty | 首次进入、重置为空、没有事件时 | 手动草稿说明、开始入口、无事件提示 | 开始手动草稿、选择拍号、添加第一个事件 | 进入练习、进入校验、标记为已检查 | “请先添加至少一个音符或休止符。” | 添加事件 |
| editing | 用户正在选择拍号、音高、时值或事件类型时 | 当前输入控件、草稿说明、未完成提示 | 完成添加、取消编辑、修改已有事件 | 进入练习、进入校验、使用未完成事件 | “当前事件尚未完成。” | 完成或取消当前编辑 |
| draft | 至少有一个完整事件但尚未检查时 | 草稿预览、事件列表、未检查提示 | 添加、修改、删除、清空、重置、标记为已检查 | 进入练习、生成目标 | “Stage B 只是手动草稿，尚不能进入练习。” | 标记为已检查或继续编辑 |
| invalid | 当前输入超出范围或事件不完整时 | 中文错误提示、问题事件标记 | 修改问题事件、删除问题事件、清空、重置 | 标记为已检查、进入未来校验、进入练习 | “草稿存在未完成或超出范围的事件。” | 修正或删除问题事件 |
| unchecked | 草稿存在完整事件但当前版本未检查时 | “当前草稿尚未检查”提示 | 标记为已检查、继续编辑 | 进入未来校验、进入练习 | “请先检查当前手动草稿。” | 标记为已检查 |
| checked | 用户检查过当前草稿且之后未修改时 | “已检查当前手动草稿”提示、仍不能练习 | 继续编辑、重新检查、清空、重置；未来可进入 Stage D | 进入练习、生成目标、正式评分 | “已检查不代表已通过小节校验，也不代表可进入练习。” | 修改后变为 unchecked；未来进入 Stage D |
| stale | Stage A 来源图片被替换 / 清除，且草稿依赖旧图片参考；或未来 validation / target 依赖旧草稿 | 旧参考已变更提示、需要确认或重新开始 | 确认为独立手动草稿、清空、重置、重新开始 | 进入未来校验、进入练习、使用旧检查结果 | “参考图片已变更，旧草稿需要重新确认。” | 确认独立继续并重新检查，或清空 / 重置 |
| cleared | 用户清空全部或清除 stale 草稿后 | 已清空提示、回到空状态 | 开始新草稿 | 进入练习、进入校验、标记为已检查 | “当前没有可检查的手动草稿。” | 添加事件 |
| future-validation-disabled | Stage D 尚未实现，或当前草稿未 checked / invalid / stale | 未来校验入口禁用及原因 | 编辑草稿、检查草稿 | 进入 Stage D 校验 | “小节时值校验将在后续阶段提供。” | 后续实现 Stage D；或当前版本先完成 checked 且非 stale |
| future-practice-disabled | Stage B 任意状态 | 进入练习入口禁用及原因 | 编辑、预览、检查、清空、重置 | 进入练习、生成练习目标 | “当前只是手动草稿，暂时不能进入练习。” | 后续 Stage E 生成 session-only temporary practice target 后才可能恢复 |

特别说明：checked 只表示用户检查过当前草稿，不代表：

- 已通过小节校验；
- 已成为正式转写；
- 已成为练习目标；
- 可以评分；
- 可以进入练习。

## 8. 简体中文 UI 建议文案

所有用户可见 UI 必须使用简体中文。英文只允许用于必要技术缩写或代码内部标识。

建议操作文案：

| 位置 | 建议文案 |
| --- | --- |
| 区块标题 | “手动乐谱片段草稿” |
| 开始按钮 | “开始手动草稿” |
| 添加音符按钮 | “添加音符” |
| 添加休止符按钮 | “添加休止符” |
| 修改事件按钮 | “修改事件” |
| 删除事件按钮 | “删除事件” |
| 清空按钮 | “清空草稿” |
| 重置按钮 | “重置草稿” |
| 检查按钮 | “标记为已检查” |
| 重新检查按钮 | “重新检查” |
| 拍号 label | “拍号” |
| 音高 label | “音高” |
| 时值 label | “时值” |
| 所属小节 label | “所属小节” |
| 草稿状态 label | “草稿状态” |

建议说明文案：

- “当前只是手动草稿。”
- “当前不会自动识别图片内容。”
- “当前内容不是正式识谱结果。”
- “当前不会生成练习目标。”
- “当前暂时不能进入练习。”
- “小节时值校验将在后续阶段提供。”
- “有本地乐谱图片时，你可以把图片作为肉眼参考；系统不会读取或识别图片内容。”
- “修改草稿后，需要重新检查。”

必要状态文案：

| 状态 | 建议文案 |
| --- | --- |
| empty | “还没有手动草稿。请选择拍号，然后添加音符或休止符。” |
| invalid | “草稿中有未完成或超出范围的事件，请修改后再检查。” |
| stale | “参考图片已被替换或清除。请确认继续作为独立手动草稿，或重新开始。” |
| future validation disabled | “小节时值校验将在后续阶段提供。” |
| future practice disabled | “当前只是手动草稿，尚未生成练习目标，暂时不能进入练习。” |
| checked clarification | “已检查只表示你看过当前草稿，不代表已通过校验或可以练习。” |

禁止使用会误导用户的文案，包括但不限于：

- “识别完成”；
- “正式识谱结果”；
- “official transcription”；
- “final target”；
- “target ready”；
- “可评分”；
- “已上传”；
- “已保存到云端”；
- “已生成练习目标”；
- “可以进入练习”。

## 9. 后续阶段边界

Stage B 与后续阶段边界如下：

- Stage B：手动草稿。用户手动创建短小乐谱片段草稿，支持预览、修改、删除、清空、重置、检查状态，但不校验小节总时值，不生成 practice target，不进入练习。
- Stage C：mock recognition draft。使用 mock 数据演示识别草稿形态，仍不是真实 OCR / OMR，也不是正式转写。
- Stage D：小节时值校验和 validation gate。检查 checked draft 是否满足基础小节时值规则，并阻止 invalid draft 继续流转。
- Stage E：checked + valid draft 转为 session-only temporary practice target。仅在用户确认后生成临时练习目标，仍不是 final target 或正式评分目标。
- Stage F：未来真实 OCR / OMR。必须继续遵守预览、检查、修改 / 确认、再进入练习原则，不得自动把识别结果当最终结果。

Stage B 不得提前实现 Stage C、D、E、F。

## 10. Stage B 明确非目标

P48 / Stage B acceptance criteria 明确不做：

- runtime 实现；
- UI 实现；
- `/practice` 修改；
- app、components、lib 修改；
- 新增测试文件；
- notation editor 实现；
- OCR；
- OMR；
- PDF parser；
- 图片读取或图片识别；
- 上传；
- 云端；
- 账号；
- 数据库；
- 持久化；
- validation gate；
- practice target；
- scoring；
- formal scoring；
- final target；
- official transcription；
- `/api/recognize` 修改；
- parser / converter 修改；
- piano runtime 修改；
- package 或 dependency 修改。

## 11. 未来 P49 runtime alpha 建议

如果没有新的重大产品边界冲突，P48 之后建议进入：

**P49 — Stage B Manual Notation Fragment Draft Runtime Alpha**

P49 可考虑实现一个小而完整的 browser-local vertical slice：

- `ManualNotationFragmentDraftPanel`；
- session-only 草稿 state；
- 选择 `2/4`、`3/4`、`4/4`；
- 添加、修改、删除、清空和重置音符 / 休止符事件；
- 结构化草稿预览；
- checked / stale 基础状态；
- Stage A 图片仅作为视觉参考；
- 未来校验与练习入口 disabled reason；
- focused tests；
- 简体中文 UI。

P49 仍不得实现 Stage C mock recognition、Stage D validation gate、Stage E temporary practice target、Stage F 真实 OCR / OMR、上传、云端、账号、数据库、正式评分或 final target。

## 12. QA level recommendation

QA level recommendation：none。

原因：P48 是 docs-only acceptance criteria，不修改 runtime、UI、packages、dependencies、测试文件或可运行流程。
