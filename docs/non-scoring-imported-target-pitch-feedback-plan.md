# P19a Non-scoring Imported Target Pitch Feedback Plan

## 一、Product Decision

选择：**Option A — non-scoring pitch feedback for selected imported segment**。

P19 的产品决策是只规划面向当前选中导入片段的非评分型音高反馈：

1. P19 不做正式评分。
2. P19 不做通过 / 失败。
3. P19 不做正确 / 错误。
4. P19 不做 grade / score。
5. P19 只做练习提示。
6. 反馈对象是 P18 中用户明确选择的 current imported segment。
7. 用户必须明确录音或触发本地估计后，才显示反馈。
8. 不自动写入 attempt history。
9. 不替换 mock melody flow。
10. 不声明正式视唱评测。

## 二、为什么先做非评分反馈

1. P18 已经让用户能选择导入片段，但用户仍不知道自己唱得怎么样。
2. 非评分反馈比正式评分更适合当前阶段。
3. 非评分反馈可以提升真实练习感，但不会过早承诺准确评分。
4. 这是未来正式评分、节奏评估、钢琴辅助练习之前的必要过渡。
5. 用户体验第一优先级要求用户至少能获得清楚、低压力、可理解的练习反馈。

## 三、P19b 推荐 runtime 实现范围

未来 P19b 可以在 `/practice` 的 imported practice lite 区域内实现：

1. 当 `importedPracticeLiteActive` 为 `true` 且 `selectedImportedSegment` 存在时，显示非评分反馈区域。
2. 复用现有本地录音 / pitch estimation 能力，如现有结构允许。
3. 反馈只针对当前 `selectedImportedSegment`。
4. 使用 `selectedImportedSegment` 的目标音高作为 feedback target。
5. 显示用户估计音高，如可用。
6. 显示与目标音高的 cents 偏差，如可安全计算。
7. 根据偏差显示中文反馈：
   - 接近目标音
   - 略偏高
   - 略偏低
   - 未检测到稳定音高
   - 当前片段置信度较低，仅供参考
8. 不写 attempt history。
9. 不改变 mock melody target-aware comparison。
10. 不接入 scoring files。
11. 不上传音频。
12. 不调用 AI。
13. 不调用云端 API。
14. 不写账号或数据库。

## 四、Feedback Categories

以下分类只用于练习提示，不是正式评分。

1. `no-pitch`
   - 条件：没有稳定 user estimated pitch。
   - 文案：「未检测到稳定音高，请重新唱一次。」
2. `close`
   - 条件：用户音高接近目标音高。
   - 文案：「接近目标音。」
3. `slightly-high`
   - 条件：用户音高高于目标音高。
   - 文案：「略偏高，可以稍微放低一点。」
4. `slightly-low`
   - 条件：用户音高低于目标音高。
   - 文案：「略偏低，可以稍微抬高一点。」
5. `low-confidence-target`
   - 条件：selected imported segment `diagnosticConfidence` 为 `low`。
   - 文案：「当前片段诊断置信度较低，反馈仅供参考。」

## 五、Threshold Policy

P19a 不把阈值写成正式评分标准。

1. P19b 可以使用一个保守的 research-only cents threshold。
2. 阈值只用于练习提示，不用于正式评分。
3. 阈值需要写在 `/practice` 局部或小 helper 中，避免变成 formal scoring infrastructure。
4. 不引入 scoring config。
5. 不引入 grade scale。
6. 不引入 pass/fail gate。
7. 所有阈值文案都必须标记为 non-scoring / 练习提示。

建议初始实现可以考虑：

- `close`：绝对偏差在一个保守范围内。
- `high`：高于目标。
- `low`：低于目标。

但不要把它称为 score、correct、pass 或正式标准。

## 六、Input Contract

未来 P19b 必须只使用：

1. P16i parser 验证通过的 imported preview。
2. P18b `selectedImportedSegment`。
3. 现有本地 pitch estimation 的用户估计结果，如可复用。
4. 不直接信任 `sessionStorage` raw JSON。
5. 不绕过 parser。
6. 不修改 `parseResearchTargetCurveHandoffJson`。
7. `high` / `medium` confidence 仍 rejected。
8. invalid imported preview 不能进入 feedback flow。
9. 没有 `selectedImportedSegment` 时不能显示 feedback result。

## 七、UI Copy

未来 P19b 用户可见文案必须中文。

建议文案：

- 导入片段练习反馈
- 当前目标音高
- 你的估计音高
- 音高偏差
- 接近目标音
- 略偏高，可以稍微放低一点
- 略偏低，可以稍微抬高一点
- 未检测到稳定音高，请重新唱一次
- 当前片段诊断置信度较低，反馈仅供参考
- 这是练习提示，不是正式评分
- 不写入练习历史
- 不判断通过或失败

禁止用户可见文案：

- score
- grade
- pass
- fail
- correct
- wrong
- official score
- formal assessment
- 正式评分
- 通过
- 失败
- 正确
- 错误
- 满分
- 扣分

## 八、Interaction Design

未来 P19b 交互应遵循：

1. 用户先进入「导入练习预览」。
2. 用户选择一个导入片段。
3. 用户录音或触发现有本地音高估计。
4. 系统根据当前 `selectedImportedSegment` 给出非评分反馈。
5. 用户切换片段后，旧反馈应清除或明确不再适用。
6. 用户退出导入练习预览后，feedback state 应清除。
7. 用户清除导入预览后，feedback state 应清除。
8. mock melody flow 的反馈或估计逻辑不能被破坏。
9. local attempt history 不能被写入。
10. 手动 JSON fallback 不能被破坏。

## 九、State Design

规划未来 P19b 可能需要的状态，但 P19a 不写代码。

1. `importedPracticeFeedback`
   - `targetFrequencyHz`
   - `estimatedFrequencyHz`
   - `centsDifference`
   - `category`
   - `message`
   - `targetConfidence`
   - `createdAt` 或 `generatedAt`，如需要
2. `importedPracticeFeedback` should reset when:
   - `selectedImportedSegmentIndex` changes
   - `importedPracticeLiteActive` becomes `false`
   - imported preview is cleared
   - imported preview data changes
   - pitch estimation is restarted

## 十、Piano System Compatibility

因为 P17a 已经把 Piano System 纳入长期核心模块，P19 需要保持兼容：

1. 反馈目标来自 `selectedImportedSegment`。
2. 未来钢琴组件可以读取 `selectedImportedSegment` 的目标音高。
3. 未来钢琴组件可以播放目标音，帮助用户校准。
4. P19 不实现钢琴组件。
5. P19 不新增 `/piano`。
6. P19 不新增音色系统。
7. P19 不新增伴奏系统。
8. P19 只为未来钢琴辅助练习保留清晰边界。

## 十一、Non-goals

P19 明确不做：

1. no formal scoring
2. no grade
3. no pass/fail
4. no correct/wrong
5. no official assessment
6. no rhythm assessment
7. no sight-singing assessment
8. no Song Learning Mode
9. no formal TargetPitchCurve integration
10. no formal Practice Mode audio import
11. no attempt history writes
12. no account/database
13. no upload/cloud/AI/API
14. no piano runtime
15. no `/piano` route
16. no recording management
17. no MIDI
18. no APK-ready claim
19. no user-facing launch / release wording

## 十二、P19b QA Expectations

未来 P19b 必须测试：

1. `/practice` 无导入预览时正常。
2. mock melody flow 正常。
3. imported practice lite 正常进入。
4. segment selection 正常。
5. 没有 selected segment 时不显示 feedback result。
6. selected segment 存在时可以生成非评分反馈。
7. no-pitch case 显示「未检测到稳定音高」。
8. close case 显示「接近目标音」。
9. high case 显示「略偏高」。
10. low case 显示「略偏低」。
11. low diagnostic confidence case 显示「仅供参考」。
12. 切换 segment 后 feedback 被清除或更新。
13. 退出 imported practice lite 后 feedback 被清除。
14. 清除 imported preview 后 feedback 被清除。
15. attempt history 不写入。
16. pitch comparison 不接入 formal scoring。
17. Network panel 无 upload/cloud/AI/API/account/database。
18. 中文文案无明显英文残留。
19. 没有 score / grade / pass / fail / correct / wrong / 正式评分 / 通过 / 失败 / 正确 / 错误。

## 十三、Future Sequence

建议后续路线：

### P19b Non-scoring Imported Target Pitch Feedback Runtime

- 实现当前 selected imported segment 的非评分音高反馈。
- 复用现有本地 pitch estimation，如可行。
- 不写 attempt history。
- 不评分。

### P19c Non-scoring Imported Target Pitch Feedback QA

- source review + manual browser QA + Network panel QA。

### P20a Practice Piano Component Plan

- 规划 `/practice` 内嵌钢琴组件。

### P20b Practice Piano Component Runtime

- 实现最小钢琴组件，但不影响 P19 feedback。
