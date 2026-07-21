# P117b — 旋律听写五线谱答案输入验收

日期：2026-07-21

状态：implementation candidate

QA level recommendation：**strict**

## 1. 目标

P117b 在现有版本化三音旋律听写中增加受控五线谱答案输入。用户必须完整听完当前隐藏旋律，使用真实五线、谱号和有序谱位编辑三个音高，检查草稿结构，必要时修改并重新检查，再明确确认当前修订。只有确认后的会话内谱面文档才能提交给 `melody-dictation` Activity；提交后才揭示逐位置非评分对照并进入复练。

完整路径：

```text
选择五线谱答案
→ 完整播放隐藏三音旋律
→ 编辑三个有序谱位
→ 预览五线谱草稿
→ 检查草稿结构
→ 修改后重新检查 / 明确确认
→ 冻结 score-document-v1 会话文档
→ 提交 staff-notation Activity 答案
→ 主动检查并揭示逐位置非评分对照
→ 重新听题复练 / 下一题
```

## 2. 入口与范围

- 只挂入 Android 离线扩展随机旋律听写入口：`expandedLocalCatalog && !initialReviewTarget && !activeCustomPractice`。
- 复练与自定义入口继续只提供既有音名和固定唱名，不新增答案方式持久化语义。
- 当前只编辑三个有序音高，音域限定为 C4–C5，并支持 F♯4 与重复音。
- 五线谱必须显示五条线、高音谱号、三个有序音位、C4 下加线、F♯4 升号和 C5 谱位。
- 当前音符图形只是固定四分音符式的音高位置占位；P117b 不输入、不比较、不评价节奏。
- 不扩展到完整制谱、MusicXML 编辑、OMR、自动转写、歌词、和弦、多声部、多谱表或出版级排版。

## 3. 草稿、文档与 Activity

### 3.1 草稿

专用 `melody-notation-draft-v1` 至少绑定：

- 当前 `questionId` 与 `questionVariantId`；
- 当前 Activity `attemptId`；
- 当前完整播放资格 `playbackQualificationId`；
- 三个有序 canonical note id；
- 当前 revision、review state 与 `checkedFingerprint`。

结构检查只能判断草稿是否恰好包含三个受支持、有序且可表示的音高，不能读取隐藏标准答案。任一音高修改必须增加 revision，并清除旧 `checkedFingerprint` 与确认状态。

### 3.2 确认文档

只有当前草稿指纹与检查指纹一致时，才可冻结为不可变 `score-document-v1`：

- `documentKind: "melody-dictation-answer"`；
- `reviewState: "confirmed"`；
- `localOnly: true`；
- `sessionOnly: true`；
- 稳定 `documentId` 与整数 revision；
- source 保留当前题目、变体、attempt、播放资格和草稿指纹；
- 事件保留三个 canonical note id、顺序、重复音和 F♯4 / C5 身份。

跨题、跨变体、跨 attempt、跨播放资格、旧 revision、伪造指纹或非法事件必须失败关闭。

### 3.3 Activity

- `family: "melody-dictation"`；
- `allowedInputModes` 含 `staff-notation`；
- 答案为 `{ mode: "staff-notation", documentId, revision }`；
- 只有确认文档才能提交；编辑阶段不得提前写入 Activity answer；
- 专用适配器必须校验文档引用、来源和内容，不能只比较 document id / revision；
- 合法当前文档与目标逐位完全一致时返回 `consistent`；
- 合法当前文档内容不同返回 `different`；
- 缺失、非法、过期或来源不一致返回 `insufficient`；
- 所有结果固定为 `assessmentMode: "non-scoring"`，不得产生分数、准确率、等级、通过或失败结论；
- P117b 不生成 `AnalysisEvidence`，因为这是确定性用户文档答案，不是麦克风或算法测量结果。

## 4. 播放资格与 fail-closed

播放资格必须绑定当前题目变体、Activity attempt、播放 run 和完整音频时间线。只有 AudioContext 在终点仍为 `running`，且 `currentTime` 到达预期终点，才允许编辑。

以下操作必须撤销资格、作废当前 Activity attempt，并清除草稿、检查指纹、确认文档、Activity answer / evidence 与目标揭示：

- 重播、手动停止、全局停止、页面后台或 AudioContext 中断；
- 清空、重置、切换答案方式、切换难度、换题；
- 复练重启或组件卸载。

旧 timer、旧 revision、旧文档或迟到异步回调不得恢复资格或结果。

普通谱位编辑可以保留当前完整听题资格，但必须立即使旧检查和确认失效；确认后答案锁定，需重置或复练才能再次编辑。

## 5. UI 与隐藏目标

- 用户可见文案使用简体中文。
- 完整播放前，编辑、检查与确认入口禁用，并说明原因。
- 预览仅显示用户当前草稿，不得在确认并完成 Activity 检查前把目标音符放入 DOM、可访问名称或提示。
- 空草稿、未满三个音、检查失效、确认锁定、清空、音频失败和过期来源都有明确状态。
- 检查草稿后仍允许修改；修改后必须提示旧检查失效。
- 确认后先提交文档答案，再由用户主动检查本轮答案。
- 结果显示每个位置的目标音、填写音以及“一致 / 不同”，并明确这是非评分反馈。
- 提供重新播放并复练本题、重置本题和下一题。

## 6. 存储与隐私

- 草稿、确认文档、ActivitySession、播放资格和逐位对照只存在于当前页面内存。
- 不写入 localStorage、IndexedDB、账号、数据库或私人曲库，不上传文档或音频。
- 错题复练只沿用既有题型、难度、种子、序号与 `variantId`。
- 学习画像只可记录已经确认并检查后的 `consistent / different` 最小练习事实和建议原因。
- 不保存用户音符序列、ScoreDocument events、attempt、播放资格、ActivitySession、目标对照或声音事件。

## 7. 自动门禁

- focused domain：草稿指纹、revision、编辑失效、恰好三音、有序、重复音、C4、F♯4、C5、非法音和非法数量。
- score document：稳定 document id、不可变复制、当前题目 / attempt / 播放资格绑定、伪造与旧 revision 拒绝。
- Activity adapter：`staff-notation` 答案、内容逐位比较、`consistent / different / insufficient`、始终非评分。
- mounted React：目标隐藏、完整播放 gate、真实五线语义、编辑、预览、检查、修改失效、确认、主动检查、锁定、清空重听和生命周期作废。
- App 集成：只在扩展随机入口显示；复练 / 自定义不显示；复练队列与学习画像只写最小事实。
- 回归：音名、固定唱名、屏幕钢琴、P114k notation、P116d 节奏听写、题库调度与全局音频停止。
- `npm run check`、Android sync / validator、GitHub `quality` 与 `android-local` 必须通过。

## 8. 手动与外部证据

以下证据必须独立记录，不能由源码审查、模拟音频、DOM 测试、CI 或 APK 工件替代：

- Browser 手动 QA：五线视觉、C4 加线、F♯4 升号、C5、窄屏、键盘、屏幕阅读器、编辑失效与无网络请求。
- Android 真机：至少三档设备，检查触控命中、误触、扬声器、重播、返回、后台、音频焦点、进程重建、飞行模式冷启动与 20 轮稳定性。
- 双教师审核：逐题真值、谱位 / 谱号 / 升号 / 八度映射、重复音、三难度递进、解释与误解风险。
- 目标用户验收：至少 5 名中文用户完成“听题 → 写三音 → 检查 → 确认 → 理解对照 → 复练”；正式 V1 采用至少 80% 核心任务成功阈值并记录误触、误解与复测。

当前 Browser 手动、Android 真机、教师和目标用户证据均为 `NOT_EXECUTED / INCOMPLETE`。

## 9. 后续边界

- P117c 简谱输入不包含在 P117b 中，必须另行验收。
- 旋律回唱、旋律视唱、预备拍、实时音高曲线、提交后分析、逐句反馈和分段复练仍是后续独立切片。
- P117b 自动门禁通过不代表 P117 整体完成，也不代表最终产品 DoD 完成。
