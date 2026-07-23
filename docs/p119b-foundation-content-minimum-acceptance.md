# P119b 基础档内容数量最低门槛候选

日期：2026-07-23

状态：**IMPLEMENTATION_CANDIDATE / local gates pending / external evidence NOT_EXECUTED**

QA level recommendation：**strict**

## 1. 唯一范围

P119b 只关闭 P119a 自动盘点暴露的两个 V1 数量阻塞：

- `chord-inversion / 基础`：8 → 20 个稳定变体；
- `harmony-progression / 基础`：8 → 20 个稳定变体。

本切片不追求专业路线每档 40 个目标，不修改进阶或挑战题库，不增加基础答案概念，也不宣称音乐正确性、难度递进、教师审核、Q3 或完整 P119/Q 已通过。

## 2. 内容边界

和弦基础仍只有：

- 大三和弦 · 原位；
- 小三和弦 · 原位。

和声进行基础仍只有：

- 正格收束 · I–V–I；
- 变格收束 · I–IV–I。

新增内容只是在受控音区内追加现有概念的移调／移八度组合。原前 8 个 `variantId`、顺序、答案、频率关系和解释语义保持不变；新组合从索引 8 起 append-only。进阶／挑战的根音、调性、数量与顺序保持冻结。

## 3. 版本与迁移

- 本机题库从 catalog v9 升至 v10；
- 本机复练队列 envelope 从 schema/catalog 9 升至 10；
- v9 中真实存在的显式 `variantId` 必须无损迁移并 save-first 写回 v10；
- v9 envelope 不得伪装承载 P119b 新增 ID；
- 学习画像 schema 不变，因为本切片没有改变事件或画像数据形状；
- Activity `activityId`、`targetId`、答案协议与既有 family content version 不变，catalog v10 单独标识题库集合扩容。

会话内随机题序会随题库长度变化；它不是持久身份。复练使用显式 `variantId`，旧复练目标不得漂移。

## 4. 自动验收

- 两个基础档精确为 20，且均达到 V1 每档至少 20；
- 对应进阶／挑战数量继续为 48/72 与 24/42；
- 原前 8 个 ID 顺序不变，新 12 个 ID 精确追加、唯一、确定性且可显式重放；
- 所有频率为有限正值，和弦内频率严格递增；
- 基础答案选项仍各为 2 个，customizer 每个选项各覆盖 10 个变体；
- 新 ID 可经 Activity adapter 与 v10 复练队列往返；
- v9 队列迁移保留旧目标，同时拒绝伪造的新 ID；
- P119 自动盘点的 V1 数量检查可通过，但专业 40 目标和双教师审核仍阻塞。

相关命令：

- `npm run test:local-ear-training-chords`
- `npm run test:local-harmony-progressions`
- `npm run test:expanded-local-practice-catalog`
- `npm run test:local-practice-customizer`
- `npm run test:local-practice-review-queue`
- `npm run test:mobile-practice-review-storage`
- `npm run test:legacy-activity-adapters`
- `npm run test:p119-content-education-evidence`
- `npm run test:learning-event-profile`
- `npm run test:mobile-learning-profile-storage`
- `npm run test:mobile-practice-review-behavior`
- `npm run check`
- `npm audit --omit=dev --audit-level=high`
- `npm run android:sync`
- `npm run validate:android-local`
- `git diff --check`

## 5. 证据边界

自动测试、合成播放、CI 与 Debug APK 只能证明数量、确定性、兼容和构建约定。以下项目继续保持 `NOT_EXECUTED / BLOCKED`：

- 两名独立教师对目标、答案、术语、唱名、难度、解释和误解风险的真实签署审核；
- 新音区在真实 Android 扬声器／耳机上的听感、响度与可辨识性；
- 目标用户理解和教育有效性；
- 专业每档 40 个内容目标；
- 正式评分、公平性、阈值、能力评级或通过／失败结论；
- 正式签名、覆盖升级、回滚、私下发布或 P120。

P119b 合并后最多只能把当前 30 个自动盘点组推进到 V1 数量前置满足；`teacherReviewBatchApproved` 必须继续为 false，直至真实双教师证据按 P119a 协议完成。
