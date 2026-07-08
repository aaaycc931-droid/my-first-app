# P45 — Stage A Sheet Music Import Preview Acceptance Criteria

## 1. Stage A 定位

Stage A 是“本地乐谱导入与预览草稿”验收标准。它只定义后续 runtime 应如何实现 browser-local 的乐谱图片输入入口，本 P45 本身不实现 runtime。

Stage A 明确不是：

- 不是 OCR；
- 不是 OMR；
- 不是识谱；
- 不是 PDF 解析；
- 不是练习目标生成；
- 不是 `/practice` 接入；
- 不是评分；
- 不是正式转写结果。

Stage A 的目标是让用户安全地把本地乐谱图片放入页面查看，并清楚知道：文件只在当前浏览器会话中用于预览，不会上传、不会保存、不会识别、不会生成正式结果或练习目标。

## 2. 用户流程验收标准

目标流程：

```text
进入乐谱导入区
→ 看到空状态
→ 选择本地乐谱图片
→ 浏览器本地生成预览
→ 显示文件名、类型、大小、图片尺寸、导入状态
→ 用户可以清除
→ 用户可以替换文件
→ 替换后旧文件状态失效
→ 当前阶段不能进入练习
→ 当前阶段不能识别音符
→ 当前阶段不能生成练习目标
```

验收时必须确认：

1. 用户进入页面时看到明确的“本地乐谱导入与预览”区块。
2. 选择文件前显示 empty state，不显示任何旧预览、旧 metadata、识别结果或练习目标。
3. 用户只能选择本阶段允许的图片类型。
4. 选择有效图片后，预览由浏览器本地读取生成。
5. 预览就绪后显示基础 metadata 与 local-only 状态。
6. 清除后恢复为空状态，旧图片和旧 metadata 不再可见。
7. 替换文件后旧图片、旧 metadata 和所有依赖旧来源的未来草稿都必须失效。
8. 任何状态下都不能从 Stage A 直接进入 `/practice`。
9. 任何状态下都不能声称已经完成识谱、生成 target、产生评分或得到正式转写。

## 3. UI 状态验收标准

| 状态 | 什么时候出现 | 用户看到什么 | 用户可以点什么 | Disabled 按钮 | Disabled reason | 如何恢复 |
| --- | --- | --- | --- | --- | --- | --- |
| empty | 首次进入、清除后、没有当前文件时 | 空状态说明、本地选择入口、local-only 说明 | 选择文件 | 进入练习、识别乐谱、生成练习目标 | “当前阶段仅支持本地预览，尚未生成可练习目标。” | 选择有效图片 |
| selecting | 文件选择器打开或刚触发选择时 | 原页面保持当前状态，不显示新结果 | 浏览器文件选择器中的确认 / 取消 | 进入练习、识别乐谱、生成练习目标 | “请先选择可预览的本地乐谱图片。” | 选择文件或取消 |
| loading preview | 已选有效文件，正在解码图片尺寸和预览 | 加载提示、文件名可先显示、旧预览不得继续作为当前结果显示 | 清除、重新选择 | 进入练习、识别乐谱、生成练习目标 | “预览尚未完成，且当前阶段不生成练习目标。” | 预览成功、预览失败、清除或替换 |
| preview ready | 图片成功解码并显示 | 谱面预览、metadata、本地导入状态、不会上传 / 不会保存提示 | 清除、替换文件 | 进入练习、识别乐谱、生成练习目标 | “Stage A 仅用于本地预览，不进行识谱或练习目标生成。” | 清除或替换 |
| unsupported file | 用户选择不允许的 MIME type 或扩展名 | 不支持文件提示、允许格式说明 | 重新选择、清除 | 进入练习、识别乐谱、生成练习目标 | “当前文件格式不支持，且没有可用练习目标。” | 选择支持的图片或清除 |
| image decode failed | 文件类型看似允许但浏览器无法解码 | 图片加载失败提示、建议更换图片 | 重新选择、清除 | 进入练习、识别乐谱、生成练习目标 | “图片预览失败，无法确认谱面来源。” | 选择可解码图片或清除 |
| cleared | 用户点击清除后的瞬时或记录状态 | 回到空状态，可短暂显示“已清除当前本地文件” | 选择文件 | 进入练习、识别乐谱、生成练习目标 | “当前没有乐谱来源。” | 选择有效图片 |
| replaced | 用户选择新文件替换旧文件后 | 新文件加载状态或新预览；旧预览不得作为当前结果显示 | 清除、继续等待或再次替换 | 进入练习、识别乐谱、生成练习目标 | “替换后需要重新预览；当前阶段不生成目标。” | 新预览成功、失败或清除 |
| stale | 未来存在依赖旧文件的 draft / review / validation / temporary target 时，来源被替换或清除 | 旧草稿已失效提示，不允许继续使用旧草稿 | 清除失效草稿、重新开始后续阶段 | 进入练习、使用旧目标、继续旧检查 | “来源文件已变更，旧草稿不能继续用于练习。” | 基于新来源重新生成后续草稿；Stage A 只记录原则 |
| local-only warning | 导入区持续显示，尤其在 empty 和 preview ready 状态 | “文件仅在当前浏览器会话中预览，不会上传或保存” | 选择、清除、替换 | 上传、保存到云端、保存到曲库 | “当前 MVP 不支持上传、云端或持久化保存。” | 不需要恢复，持续显示 |
| no-practice-target available | Stage A 任意状态 | 没有可练习目标的说明 | 选择、清除、替换 | 进入练习 | “当前阶段不会生成练习目标。” | 后续 Stage E 才可能生成临时目标 |
| future-stage disabled | 展示未来能力入口或说明时 | 入口保持禁用，并解释后续阶段 | 当前 Stage A 操作 | OCR、PDF 解析、草稿检查、生成目标、进入练习 | “该能力属于后续阶段，当前仅支持本地图片预览。” | 后续阶段单独实现 |

## 4. 中文 copy 要求

所有用户可见 copy 必须使用简体中文。英文只允许用于必要技术缩写或文件类型标识，例如 PNG、JPEG、WEBP、PDF、MIME、BPM、Hz。

建议文案：

| 位置 | 建议文案 |
| --- | --- |
| 区块标题 | “本地乐谱导入与预览” |
| 区块副标题 | “先选择一张本地乐谱图片进行预览。当前阶段不识谱、不生成练习目标。” |
| empty state | “还没有选择乐谱图片。请选择本地 PNG、JPEG 或 WEBP 图片进行预览。” |
| 选择文件按钮 | “选择本地乐谱图片” |
| local-only 说明 | “文件只在当前浏览器会话中用于预览，不会上传到服务器，也不会保存到曲库。” |
| preview ready 说明 | “已生成本地预览。请确认这是否是要处理的乐谱图片。” |
| 文件名 label | “文件名” |
| MIME type label | “文件类型” |
| 文件大小 label | “文件大小” |
| 图片宽度 label | “图片宽度” |
| 图片高度 label | “图片高度” |
| 本地导入状态 label | “本地导入状态” |
| local-only label | “是否仅本地处理” |
| ready for recognition label | “是否可识谱” |
| ready for practice label | “是否可进入练习” |
| unsupported file warning | “当前文件格式暂不支持。请使用 PNG、JPEG 或 WEBP 乐谱图片；PDF 暂不支持。” |
| image decode failed warning | “图片预览失败。请确认文件没有损坏，或更换一张清晰的乐谱图片。” |
| clear 按钮 | “清除当前文件” |
| replace 行为说明 | “重新选择文件会替换当前预览，并使旧文件状态失效。” |
| 当前阶段不进行识别 | “当前阶段只显示本地预览，不识别音符、节奏、小节线、拍号或调号。” |
| 当前阶段不会生成练习目标 | “当前阶段不会生成视唱或节奏练习目标，因此不能进入练习。” |
| 当前阶段不会上传或保存文件 | “当前文件不会上传、不会保存，刷新页面后不会保留。” |
| future-stage disabled reason | “该能力属于后续阶段，当前仅开放本地图片预览。” |

文案必须避免让用户误以为：已经完成识谱、已经生成目标、已经可以评分、文件被上传、文件被保存、这是正式转写结果。

## 5. 文件规则

Stage A 初期建议只支持：

- `image/png`；
- `image/jpeg`；
- `image/webp`，前提是项目现有浏览器环境可正常预览。

文件限制验收标准：

- 文件选择器 accept 建议限制为 `.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp`。
- runtime 必须再次检查 MIME type，不能只依赖文件选择器。
- 建议文件大小上限先采用保守限制，例如 10 MB；超限时提示用户换用更小或更清晰的图片。
- PDF 在 Stage A 暂不支持，即使未来路线包含 PDF。
- Stage A 不新增 PDF parser。
- Stage A 不新增 OCR / OMR dependency。
- 不支持文件时不生成 preview、不保留 metadata 为当前有效状态、不生成任何 target。

## 6. Metadata 要求

preview ready 后建议显示：

- 文件名；
- MIME type；
- 文件大小；
- 图片宽度；
- 图片高度；
- 本地导入状态，例如“已在当前浏览器会话中载入”；
- 是否 local-only：是；
- 是否 ready for recognition：否；
- 是否 ready for practice：否。

不要显示：

- score；
- accuracy；
- final result；
- official transcription；
- target ready；
- 识别完成；
- 可评分；
- 已保存；
- 已上传。

## 7. Clear / Replace / Stale 规则

### 清除文件

清除文件时必须满足：

- preview 清空；
- metadata 清空；
- source state 变为 empty / cleared；
- 不保留旧图片；
- 不保留旧草稿；
- 不生成任何 target；
- 任何“进入练习 / 识别 / 生成目标”入口保持 disabled；
- 如果使用 object URL，必须释放旧 object URL；
- 刷新页面后仍不应恢复旧文件。

### 替换文件

替换文件时必须满足：

- 旧 preview 立即失效，不能继续作为当前来源展示；
- 旧 metadata 失效，不能与新预览混用；
- 新文件进入 loading preview 后再显示新 metadata；
- 如果新文件失败，不能回退显示旧文件作为当前有效来源；
- 如果未来存在 recognition draft、review state、validation state、temporary target，来源替换后它们必须 stale 或 cleared；
- 当前 Stage A 只需要记录上述原则，不实现后续目标清理。

### stale 原则

stale 表示某个结果依赖的来源文件已经不是当前文件。stale 结果不得用于：

- 进入练习；
- 继续检查；
- 生成目标；
- 展示为最新识别结果；
- 展示为正式转写。

## 8. No-upload QA checklist

后续 Stage A runtime 手动 QA 必须确认 no-upload：

1. 打开浏览器 DevTools。
2. 进入 Network 面板并清空已有请求。
3. 选择一张本地乐谱图片。
4. 确认没有向服务器发送图片内容。
5. 确认没有调用 upload API。
6. 确认没有调用 `/api/recognize` 或其他识谱 API。
7. 确认没有创建 remote URL；预览只能使用浏览器本地机制，例如 object URL 或 data URL。
8. 确认没有云端保存、账号请求、数据库写入或对象存储请求。
9. 刷新页面后确认文件不保留。
10. 检查 localStorage，确认没有保存图片内容或 metadata。
11. 检查 IndexedDB，确认没有持久化图片内容或 metadata。
12. 如未来明确允许 sessionStorage，也必须只保存非敏感临时 UI 状态；Stage A 默认不需要保存文件信息。

P45 只写验收标准，不实现 runtime。

## 9. Stage A 禁止事项

Stage A 禁止：

- OCR；
- OMR；
- PDF parser runtime；
- Audiveris production；
- 上传；
- 云端识谱；
- 账号；
- 数据库；
- 保存私人乐谱；
- localStorage 持久化；
- IndexedDB 持久化；
- 生成 recognition draft；
- 生成 practice target；
- 接入 `/practice`；
- 评分；
- final target；
- official transcription；
- correction editor；
- source separation；
- full-song extraction；
- 新增 dependency；
- 修改 `/api/recognize`；
- 修改 parser / converter；
- 修改 piano runtime。

## 10. 后续阶段衔接

- Stage B 才开始 manual notation draft。
- Stage C 才开始 mock recognition draft。
- Stage D 才开始 validation / measure check。
- Stage E 才允许 checked draft 转 session-only temporary practice target。
- Stage F 才考虑真实 OCR / OMR 接入。

Stage A 不得提前实现这些内容。Stage A 输出最多是“本地图片来源 + 谱面预览 + metadata + 明确不可进入练习的状态”。

## 11. 未来 runtime 实现建议

未来 Stage A runtime 可以考虑修改或新增：

- `/practice` 中的受控入口，或未来单独的 sheet music input area；
- `SheetMusicImportPreviewPanel` 组件；
- browser-local source state helper；
- 针对 empty、preview ready、unsupported、decode failed、clear、replace 的 focused tests。

实现建议边界：

- 不要在 Stage A 创建识别数据结构；
- 不要在 Stage A 创建练习目标结构；
- 不要在 Stage A 接入 `/practice` 练习流程；
- 不要新增 OCR、PDF parser、上传、账号、数据库、云端或评分依赖。

## 12. QA level recommendation

P45 本身是 docs-only / source-review 级别：QA level recommendation 为 `none`。

未来真正实现 Stage A runtime 时，因为会新增 UI 入口、文件选择、预览状态、清除和替换行为，建议 QA level 至少为 `standard`；如涉及练习目标创建、上传、账号、云端或评分，则必须提升为 `strict`，但这些都不属于 Stage A。
