# P118d 可解释非评分复练推荐验收

日期：2026-07-23

状态：**IMPLEMENTATION_CANDIDATE / remote gates pending / external evidence NOT_EXECUTED**

QA level recommendation：**strict**

## 0. 当前证据状态

- P118d 从最新远端 `main` 的 P118c 收尾提交 `5bd272418a2e9109615d3cf109ef60f9ddf5f911` 创建独立分支。
- 本分支实际通过：focused domain、真实挂载面板 4/4、App 挂载回归 41/41、学习画像与复练队列存储／迁移、UI contract、文档卫生、`npm run check`、生产依赖 audit（0 vulnerabilities）、Android sync／validator 与 `git diff --check`。
- 三次独立只读复核的最终结果均为 High 0 / Medium 0 / Low 0；审查发现的损坏存储跨重启失败关闭和画像重置 clear-first 问题已在本分支修复并重新验证。
- GitHub `quality`、`android-local`、Vercel、reviews、requested changes、review threads、工件与合并状态在 PR 建立前均为 `NOT_EXECUTED`。
- 自动测试、CI 和 Debug APK 只证明自动约定、构建与工件校验，不证明外部设备、真人或教育证据。

## 1. 用户目标与唯一真源

P118d 从既有 `LocalPracticeReviewQueue` 生成一个可解释、非评分的下一题复练建议，不创建新的答案、Activity、学习画像、复练或持久化协议。

- 建议开关关闭时不生成目标。
- 队列为空时说明当前缺少未解决错题事实，不生成建议。
- 队列有效且非空时，精确推荐既有 MRU 队列第 1 项；推荐不发明第二套排序。
- 解释只公开固定规则、队列位置、同题目族待复练数和全部待复练数。
- 从建议开始复练继续调用既有精确目标入口与 `review-started` 最小学习事件。

## 2. 失败关闭与独立控制

- 无效、重复、未知或超过 12 项的队列不得生成部分推荐。
- 学习画像存储不可用或读取失败时，本次建议默认关闭；损坏记录会被合法的空画像覆盖并保持关闭。真正无历史记录的新存储仍保留明确的默认开启行为。
- 建议开关必须先保存成功再更新 UI；保存失败保留原开关和原推荐。
- 复练队列加入、移除或清除失败时继续保留旧队列与旧推荐。
- 学习画像重置以合法空画像覆盖旧记录，保存成功后才更新 UI；保存失败保留旧画像与开关。重置保留建议开关和复练队列，推荐来源不依赖画像计数，因此不会产生“画像为零但引用旧错误次数”的矛盾。

## 3. 隐私、解释与非评分边界

P118d 只接收建议开关与已验证复练队列，不读取 `LearningEvent.outcome`，不消费 P118b 统计、正确／错误次数、课程进度、音频或分析证据。

不得显示或派生正确率、准确率、分数、等级、通过／失败、能力评级、教育诊断、医学结论或黑箱优先级。不得保存答案、用户选择、录音、Blob、PCM、音高帧、原始分析证据、生物特征或云端标识。

本切片不新增依赖、存储 key、schema、账号、云端、数据库、网络请求、上传能力或 Android `INTERNET` 权限。

## 4. 本切片明确不包含

- P118e 课程／统计／复练／推荐整合；
- 个性化、自适应、概率、正确率或能力排序；
- 新 Activity、题目、答案、课程、画像、复练或存储协议；
- Web 历史、跨设备同步、教师后台或正式教育结论。

## 5. 自动验收

- `npm run test:local-explainable-practice-recommendation`
- `npm run test:mobile-explainable-practice-recommendation-behavior`
- `npm run test:mobile-practice-review-behavior`
- `npm run test:learning-event-profile`
- `npm run test:mobile-learning-profile-storage`
- `npm run test:local-practice-review-queue`
- `npm run test:local-weak-point-review-queue`
- `npm run test:mobile-practice-review-storage`
- `npm run test:mobile-practice-review-ui-contract`
- `npm run test:documentation-hygiene`
- `npm run check`
- `npm audit --omit=dev --audit-level=high`
- `npm run android:sync`
- `npm run validate:android-local`
- `git diff --check`

## 6. 外部证据

- Android 多档真机：`NOT_EXECUTED`
- 真实麦克风／真实人声：`NOT_EXECUTED`
- 双教师审核：`NOT_EXECUTED`
- 中文目标用户可用性：`NOT_EXECUTED`
- 正式签名、覆盖升级、回滚与私测发布：`NOT_EXECUTED`

CI、Debug APK、DOM/React 挂载测试和模拟输入不得冒充上述证据。
