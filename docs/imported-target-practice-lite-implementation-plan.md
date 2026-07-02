# P18a Imported Target Practice Lite Detailed Implementation Plan

## 1. Product Decision

P18 selects **Option A — Explicit imported practice lite mode**.

This means:

1. 本地导入目标不能自动替换原 mock melody flow。
2. 用户必须明确点击「使用导入预览练习」才进入 imported practice lite。
3. imported practice lite 是独立临时练习模式。
4. 退出后回到原 Practice Mode mock melody flow。
5. P18 只做“选择导入片段并作为临时目标”，不做评分。
6. P18 不做录音反馈。
7. P18 不写 attempt history。
8. P18 不接入正式 `TargetPitchCurve` runtime。
9. P18 不声明正式 Practice Mode audio import。
10. P18 只是让用户能真正选择导入片段开始练习的第一步。

## 2. 为什么先做 Imported Target Practice Lite

1. 当前 read-only preview 对普通用户吸引力不足。
2. 用户真正需要的是“能练”，不是只看诊断。
3. 在钢琴组件、评分、伴奏之前，应先让导入目标能成为临时练习目标。
4. 这是后续非评分反馈、钢琴辅助、伴奏、录音管理的基础。
5. 不做这一步，后续钢琴系统会缺少与练习目标连接的对象。

## 3. P18b 推荐 runtime 实现范围

未来 P18b 可以修改 `/practice`，实现：

1. 在「本地导入的练习目标预览」区域增加按钮：「使用导入预览练习」。
2. 点击后进入 imported practice lite 状态。
3. 显示标题：「导入练习预览」。
4. 显示导入片段列表。
5. 每个片段显示：
   - 片段编号
   - 目标音高 Hz
   - 目标音名，如可从现有 helper 推导
   - 开始时间
   - 结束时间
   - 持续时间
   - 诊断置信度：普通诊断置信度 / 低诊断置信度
6. 用户可以选择一个导入片段作为当前临时练习目标。
7. 显示当前导入片段详情。
8. 提供「退出导入练习预览」按钮。
9. 退出后回到原 mock melody flow。
10. 清除导入预览后也退出 imported practice lite。
11. 原 mock melody previous / next / restart / target playback 不受影响。
12. 不写 attempt history。
13. 不进行 pitch comparison。
14. 不进行 scoring。
15. 不上传、不调用 API、不写账号或数据库。

## 4. State Design

未来 P18b 可以使用以下状态；P18a 不写代码：

1. `importedPracticeLiteActive: boolean`
2. `selectedImportedSegmentIndex: number | null`

状态规则：

1. `importedPracticeLiteActive` 默认 `false`。
2. 只有点击「使用导入预览练习」后，`importedPracticeLiteActive` 才变为 `true`。
3. 如果 imported preview 不存在，不能进入 imported practice lite。
4. 如果 parser validation 失败，不能进入 imported practice lite。
5. 如果清除导入预览，必须退出 imported practice lite。
6. 如果导入数据变化，应重置 `selectedImportedSegmentIndex`。
7. `selectedImportedSegmentIndex` 默认可以选第一个片段，但这是实现选择，不是自动替换正式练习目标。
8. `importedPracticeLiteActive` 不应改变 `currentMelodyStepIndex`。
9. `importedPracticeLiteActive` 不应写入 attempt history。

## 5. UI Copy

未来 P18b 用户可见文案必须中文，建议使用：

- 使用导入预览练习
- 导入练习预览
- 当前导入片段
- 选择片段
- 目标音高
- 目标音名
- 开始时间
- 结束时间
- 持续时间
- 普通诊断置信度
- 低诊断置信度
- 退出导入练习预览
- 这是研究练习预览，不是正式评分。
- 不写入练习历史。
- 不替换当前练习旋律。
- 当前阶段不会判断对错。

禁止用户可见文案：

- score
- grade
- pass
- fail
- correct
- wrong
- formal assessment
- official score
- 正式评分
- 通过
- 失败
- 正确
- 错误

## 6. Input Contract

Imported practice lite 只能使用 P16i parser 验证通过的数据。

必须保持：

1. `source` 必须是 `local-audio-decode-note-like-segments`。
2. `diagnosticConfidence` 只允许 `normal | low`。
3. `high` / `medium` 仍然 rejected。
4. `summary` strict validation 仍保持。
5. invalid JSON 不 throw 给调用方。
6. invalid imported preview 不能进入练习模式。
7. 不绕过 parser。
8. 不直接信任 `sessionStorage` raw JSON。

## 7. Piano System Compatibility

因为 P17a 已经把 Piano System 纳入长期核心模块，P18b 设计必须为未来钢琴组件留下空间：

1. imported practice lite 的当前片段应能被未来钢琴组件读取为目标音。
2. 不要把钢琴逻辑直接写死进 P18b。
3. 不要在 P18b 实现钢琴组件。
4. 不要新增 `/piano`。
5. P18b 只需要保持清晰的数据边界，方便未来 P20/P21 接入练习页钢琴组件。
6. 未来钢琴组件可以基于 selected imported segment 播放目标音或辅助找音。

## 8. Non-goals

P18 明确不做：

1. no scoring
2. no grade
3. no pass/fail
4. no correct/wrong
5. no formal sight-singing assessment
6. no rhythm assessment
7. no Song Learning Mode
8. no formal Practice Mode audio import
9. no formal TargetPitchCurve integration
10. no attempt history writes
11. no account/database
12. no upload/cloud/AI/API
13. no piano runtime
14. no standalone `/piano` page
15. no recording management
16. no MIDI
17. no APK-ready claim
18. no user-facing launch / release wording

## 9. P18b QA Expectations

未来 P18b 必须测试：

1. `/practice` loads normally without imported preview。
2. 原 mock melody flow 正常。
3. 有 imported preview 时显示「使用导入预览练习」。
4. 点击后进入「导入练习预览」。
5. 片段列表显示正常。
6. 可以选择片段。
7. 当前片段详情显示正常。
8. 「退出导入练习预览」正常。
9. 「清除导入预览」会退出 imported practice lite。
10. previous / next / restart mock melody controls 不被破坏。
11. target playback 不被破坏。
12. attempt history 不被写入。
13. pitch comparison 不被触发。
14. 没有 scoring 文案。
15. Network panel 无 upload/cloud/AI/API/account/database。
16. 中文文案无明显英文残留。

## 10. Future Sequence

### P18b Imported Target Practice Lite Runtime

- 实现显式进入 imported practice lite。
- 实现导入片段列表和当前片段选择。
- 不做录音反馈。
- 不评分。

### P18c Imported Target Practice Lite QA

- source review + manual browser QA + Network panel QA。

### P19a Non-scoring Pitch Feedback Plan

- 规划用户录音与当前导入片段目标之间的非评分反馈。

### P19b Non-scoring Pitch Feedback Runtime

- 实现接近目标音 / 略偏高 / 略偏低 / 未检测到稳定音高。

### P20a Practice Piano Component Plan

- 规划 `/practice` 内嵌钢琴组件。
