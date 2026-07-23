# P118e 本机学习总览验收

日期：2026-07-23

状态：**IMPLEMENTATION_CANDIDATE / local gates passed / remote gates pending / external evidence NOT_EXECUTED**

QA level recommendation：**strict**

## 0. 当前证据状态

- P118e 从已合并 P118d 的最新远端 `main` 独立开始；P118d 已通过 PR #411 合并，P118d 状态同步已通过 PR #412 合并。
- 本分支已实现 `localLearningOverview` 与中文 `LocalLearningOverviewPanel`；P118e focused domain、面板挂载 4/4、App 挂载回归 44/44、P118a–P118d focused/面板回归、课程／学习画像／复练存储测试、文档卫生、`npm run check`、生产依赖审计、Android 同步、本地 validator 与 `git diff --check` 均已在本工作区重新执行成功。
- `npm audit --omit=dev --audit-level=high` 报告 0 vulnerabilities。
- GitHub `quality`、`android-local`、Vercel、reviews、requested changes、review threads、工件与合并状态在相应证据产生前均为 `NOT_EXECUTED`。
- 自动测试、CI 和 Debug APK 只证明自动约定、构建与工件校验，不证明外部设备、真人或教育证据。

## 1. 用户目标与唯一真源

P118e 提供一个中文“本机学习总览”，让用户在同一处查看课程、练习事实、复练队列和可解释建议，并继续进入既有课程、统计或精确复练入口。总览只组合 P118a–P118d 的既有本机真源，不创建平行答案、Activity、课程、学习画像、复练、推荐或存储协议。

- 课程区只显示既有三节本机课程中已核对课节数，或明确显示课程进度不可用；“已核对”不等于通过。
- 练习事实区只汇总学习画像当前实际保留的最多 48 条动作事实，显示记录动作、已核对和开始复练等既有中性计数，或明确显示事实不可用。
- 复练区继续复用既有最多 12 项的精确 MRU 队列、题目族分组和手动进入能力。
- 建议区继续复用 P118d 的开关、队列首项、固定规则与精确目标入口，不生成第二套推荐顺序。
- 课程事实与练习事实必须明确独立；总览不得用课程补齐统计，不得用练习、复练或建议推断课程完成。

## 2. 独立失败关闭

四类来源分别校验、分别失败关闭；一个来源异常不得阻塞仍可证明的其他区块。

- 课程存储不可用、读取失败或记录损坏时，只把课程区标记为不可用，不把空进度冒充真实进度。
- 学习画像不可用、读取失败或记录损坏时，只把练习事实区标记为不可用；不得以课程或复练队列补造统计。
- 复练队列无效、重复、未知或超过 12 项时，复练区失败关闭，建议区也不得由部分队列生成目标。
- 建议设置不可用时，建议区失败关闭；明确关闭、空队列与来源不可用必须保持不同状态和原因。
- 总览不得新增“全部清除”或跨来源重置。课程勾选／清除、画像重置、复练队列清除和建议开关继续保持既有独立保存语义。

本切片只读取现有本机状态并派生视图，不新增持久化 key、schema、迁移、账号、云端、数据库、网络请求、上传能力或 Android `INTERNET` 权限。

## 3. 可解释与非评分边界

P118e 不读取 `LearningEvent.outcome`，不跨课程、统计、复练或建议来源生成联合结论。

不得显示或派生总学习进度、正确率、准确率、分数、等级、通过／失败、能力评级、教育诊断、医学结论、趋势、连续天数、黑箱优先级或推荐置信度。不得把当前三节本机课程写成最终课程总量，也不得宣称完整题量、活动族覆盖或正式教学完成。

不得保存答案、用户选择、录音、Blob、PCM、音高帧、原始分析证据、生物特征或云端标识。不得把统计计数、课程勾选、复练队列或建议解释描述成教师结论或目标用户证据。

## 4. 本切片明确不包含

- P119 内容、算法与教育联合验收，或 P120 私测发布；
- 新课程、新 Activity、新题目、新答案或正式能力协议；
- 个性化、自适应、概率、正确率、能力排序或跨来源推荐；
- Web 历史、跨设备同步、教师后台、账号、云端或正式教育结论；
- 合并式清除、跨来源写入或新的后台同步。

P118e 的代码、文档、CI、review、Vercel 与合并全部闭环前，当前下一切片仍是 P118e，不提前进入 P119。

## 5. 自动验收

- `npm run test:local-learning-overview`
- `npm run test:mobile-learning-overview-behavior`
- `npm run test:mobile-practice-review-behavior`
- `npm run test:local-course-path`
- `npm run test:mobile-course-path-behavior`
- `npm run test:local-practice-statistics`
- `npm run test:mobile-practice-statistics-behavior`
- `npm run test:local-weak-point-review-queue`
- `npm run test:mobile-weak-point-review-behavior`
- `npm run test:local-explainable-practice-recommendation`
- `npm run test:mobile-explainable-practice-recommendation-behavior`
- `npm run test:mobile-practice-review-storage`
- `npm run test:mobile-learning-profile-storage`
- `npm run test:documentation-hygiene`
- `npm run check`
- `npm audit --omit=dev --audit-level=high`
- `npm run android:sync`
- `npm run validate:android-local`
- `git diff --check`

以上项目只有在当前分支重新执行成功后才可记录为已通过；旧分支、旧 CI 或交接数字不得复用为 P118e 证据。

## 6. 外部证据

- Android 多档真机：`NOT_EXECUTED`
- 真实麦克风／真实人声：`NOT_EXECUTED`
- 双教师审核：`NOT_EXECUTED`
- 中文目标用户可用性：`NOT_EXECUTED`
- 正式签名、覆盖升级、回滚与私测发布：`NOT_EXECUTED`

CI、Debug APK、DOM/React 挂载测试和模拟输入不得冒充上述证据。
