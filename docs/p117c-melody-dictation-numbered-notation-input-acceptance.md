# P117c — 旋律听写简谱答案输入验收

日期：2026-07-21

状态：implementation candidate

QA level recommendation：**strict**

## 1. 目标

P117c 在版本化三音旋律听写中增加受控简谱答案输入。当前语义明确冻结为“固定 C 为 1”的音高简谱，不推断调性，也不输入或比较节奏。

完整路径：

```text
选择简谱答案
→ 完整播放隐藏三音旋律
→ 编辑三个有序简谱音位
→ 预览真实简谱草稿
→ 检查草稿结构
→ 修改后重新检查 / 明确确认
→ 冻结 score-document-v1 会话文档
→ 提交 numbered-notation Activity 答案
→ 主动检查并揭示逐位置非评分对照
→ 重新听题复练 / 下一题
```

结构检查只验证答案是否恰好包含三个受支持、有序且来源合法的音高，不得读取隐藏目标。

## 2. 入口与范围

- 只挂入 Android 离线扩展随机旋律听写入口：`expandedLocalCatalog && !initialReviewTarget && !activeCustomPractice`。
- 复练与自定义入口继续只提供既有音名和固定唱名，不新增持久化语义。
- 当前音域为 C4–C5，支持 F♯4 与重复音。
- 固定映射为：C4=1、D4=2、E4=3、F4=4、F♯4=左侧升号+4、G4=5、A4=6、B4=7、C5=上方八度点+1。
- 当前只编辑音高顺序，文档保持 `meter: "unmetered"`；不输入、比较或评价节奏。
- 不扩展到完整制谱、首调推断、调号、MusicXML、OMR、自动转写、歌词、和弦、多声部或出版级排版。

## 3. 简谱真实性与 canonical 边界

- 预览至少包含三个独立有序数字音位、数字主体、位于数字左侧的临时升号和真实位于数字上方的高八度点；不得用科学音高名选择框或尾随字符串 `1·` 冒充简谱预览。
- C4 与 C5 必须以结构化 octave 身份区分；F4 与 F♯4 必须以结构化 accidental 身份区分。
- 草稿和文档 canonical 值始终是 `EarTrainingMelodyNoteId`。数字、升号、八度点坐标和可见标签只能从 canonical note id 单向派生，禁止由显示 token 或自由文本反推音高。
- 输入控件可使用每位置受控选项，但主要名称须表达简谱身份，并同时提供 canonical 音高用于消歧，例如“高音 1（C5）”与“升 4（F♯4）”。
- 触控目标至少 44px；使用简体中文 `aria-label` 与状态播报。
- 预览只显示用户草稿。确认并完成 Activity 检查前，目标音符、目标 canonical note id 和目标解释不得进入 DOM、SVG 可访问名称、禁用原因或提示。

## 4. 草稿、文档与 Activity

### 4.1 草稿

新增专用 `melody-numbered-notation-draft-v1`，至少绑定：

- 表示上下文 `numbered-notation-fixed-c-v1`；
- 当前 `questionId` 与 `questionVariantId`；
- 当前 Activity `attemptId`；
- 当前完整播放资格 `playbackQualificationId`；
- 三个有序 canonical note id；
- revision、review state 与 `checkedFingerprint`。

任一位置编辑必须增加 revision，并清除旧检查指纹和确认状态。缺音、多音、非法音、非法映射或来源过期必须失败关闭。

### 4.2 确认文档

只有当前草稿指纹与检查指纹一致时，才可冻结为独立的 `MelodyDictationNumberedAnswerScoreDocumentV1`：

- `documentKind: "melody-dictation-numbered-answer"`；
- `source.kind: "confirmed-melody-numbered-notation-draft"`；
- `reviewState: "confirmed"`、`localOnly: true`、`sessionOnly: true`；
- 稳定 document id 与整数 revision；
- source 保留表示上下文、题目、变体、attempt、播放资格和草稿指纹；
- 三个事件只保存 position 与 canonical note id，不保存显示 token 或时值。

五线谱草稿或文档不得转换或提交为简谱答案，反向亦然。跨题、跨变体、跨 attempt、跨播放资格、旧 revision、伪造上下文/指纹或非法事件必须失败关闭。

### 4.3 Activity

- `family: "melody-dictation"`；
- `allowedInputModes` 含 `numbered-notation`；
- 答案为 `{ mode: "numbered-notation", documentId, revision }`；
- 专用适配器校验 mode、上下文、来源、题目、attempt、播放资格、document id、revision、指纹和事件内容；
- 合法当前文档与目标逐位一致返回 `consistent`，合法但内容不同返回 `different`，缺失、非法、过期或来源不一致返回 `insufficient`；
- 始终 `assessmentMode: "non-scoring"`，不得生成分数、等级、通过/失败或 `AnalysisEvidence`。

## 5. 播放资格与 fail-closed

播放资格绑定当前题目变体、Activity attempt、播放 run 和完整音频时间线。只有 AudioContext 在终点仍为 `running` 且 `currentTime` 到达预期终点，才创建可编辑草稿。

以下操作必须撤销资格、作废当前 attempt，并清除草稿、检查指纹、确认文档、Activity answer/evidence 与目标揭示：

- 重播、手动停止、全局停止、页面后台或 AudioContext 中断；
- 清空、重置、切换答案方式（包括五线谱↔简谱）、切换难度、换题；
- 复练重启或组件卸载。

旧 timer、旧 revision、旧文档或迟到异步回调不得恢复资格或结果。普通音位编辑可保留本轮完整听题资格，但必须立即使旧检查和确认失效；确认后输入锁定，需重置或复练才能再次编辑。

## 6. 存储与隐私

- 草稿、结构化简谱、确认文档、ActivitySession、播放资格和逐位对照只存在于当前页面内存。
- 不写入 localStorage、IndexedDB、账号、数据库或私人曲库，不上传文档或音频。
- 错题复练只沿用既有稳定目标字段。
- 学习画像只可记录确认并检查后的 `consistent / different` 最小事实和建议原因。
- 不保存显示 token、note ids、ScoreDocument events、attempt、播放资格、ActivitySession、目标对照或声音事件。

## 7. 自动门禁

- focused mapping/domain：九个音高映射、C4/C5 octave、F4/F♯4 accidental、重复音、顺序、三音约束、revision、fingerprint、编辑失效，且显示 token 不参与 canonical identity。
- score document / adapter：稳定 id、不可变复制、题目/attempt/播放资格绑定、跨表示文档拒绝、伪造/旧 revision/fingerprint/event 拒绝、`consistent / different / insufficient` 与恒定非评分。
- mounted React：完整播放 gate、三个真实简谱位、上方八度点、左侧升号、隐藏目标、预览、检查、编辑失效、确认、主动揭示、锁定、清空以及音频生命周期作废。
- App：只在扩展随机入口显示；复练/自定义隐藏；错题队列和学习画像只写最小事实；`insufficient` 不写入。
- 回归：音名、固定唱名、屏幕钢琴、P117b 五线谱、P114k、P116d、调度器与全局停止。
- `npm run check`、Android sync/validator、GitHub `quality` 与 `android-local` 必须通过。

## 8. 手动与外部证据

以下证据必须独立记录，不能由源码、DOM 测试、CI 或 APK 工件替代：

- Browser：上方高音点、左侧升号、字体 fallback、200% 缩放、窄屏/高对比、键盘/屏幕阅读器、隐藏目标和无网络请求。
- Android 真机：至少三档设备，检查不同密度/System WebView 的点与升号、44px 触控、横竖屏、扬声器、返回/后台/音频焦点/进程重建、飞行模式冷启动和 20 轮稳定性。
- 双教师：固定 C 简谱约定、C4/C5、F4/F♯4、重复音、逐题真值、难度递进和误解风险。
- 至少 5 名中文目标用户独立完成“听题→写简谱→检查→确认→理解对照→复练”，正式 V1 采用至少 80% 核心任务成功阈值，修复问题后复测。

当前 Browser 手动、Android 真机、教师和目标用户证据均为 `NOT_EXECUTED / INCOMPLETE`。

## 9. 后续边界

- 旋律回唱、旋律视唱、预备拍、实时音高曲线、提交后分析、逐句反馈和分段复练仍是后续独立切片。
- P117c 自动门禁通过不代表 P117 整体完成，也不代表最终产品 DoD 完成。
