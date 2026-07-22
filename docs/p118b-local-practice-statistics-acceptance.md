# P118b 本机详细练习统计验收

日期：2026-07-22

状态：**MERGED IMPLEMENTATION_CANDIDATE / automated gates passed / external evidence NOT_EXECUTED**

QA level recommendation：**standard**

## 0. 合并与自动门禁事实

- P118b 已通过 PR #407 squash 合并，main 提交为 `03a94882d870ed11339efb727558e74be00f876f`。
- PR Quality run `29927839993` 已完成且成功，`quality` 与 `android-local` 两个 job 均通过；Vercel PR 预览状态为 Ready。
- Android artifact `8532782097` 已由 PR 的 synthetic merge commit `5a8bc634b0119f68bb359230496a4c5d1182b07f` 构建并独立校验；GitHub artifact ZIP digest 为 `sha256:fb7d196eb38331202424f9a978e5cdceb5e449b5c731b3135ab3870215977e26`。它不是 main 真机证据。
- PR 合并前复核 reviews、requested changes 与 review threads 均为空；独立只读审查在修复两项 Medium 后为 High 0 / Medium 0。
- 本地验证实际通过：focused domain、面板挂载 3/3、App 挂载回归 37/37、学习事件与存储／迁移、文档卫生、`npm run check`、生产依赖 audit（0 vulnerabilities）、Android sync／validator 与 `git diff --check`。
- 上述事实只证明代码、自动约定、构建与工件校验通过，不证明任何外部设备、真人或教育证据。

## 1. 目标与事实来源

P118b 从既有 `LocalLearningHistory.recentEvents` 生成可解释的本机详细练习统计，不创建新的答案、Activity、画像或存储协议。

- 支持最近 7 天、最近 30 天和全部记录三个窗口；前两个是相对当前设备时间的滚动窗口。
- 按既有 `practiceMode` 汇总随机练习、本机复练和定制练习；按既有 `skillKind` 汇总 11 个当前已接入学习事件的题目族。
- 只读取 `occurredAt`、`kind`、`practiceMode`、`skillKind`。展示记录动作、已核对和开始复练等中性事实。
- `recentEvents` 最多保留 48 条，因此“全部记录”只表示当前保留的最近事件，不表示终身历史，也不覆盖未接入该事件流的 P116/P117 麦克风／tap Activity 或 P118a 课程进度。
- 统计不读取 `outcome`，不读取画像中的 correct/incorrect 汇总，不生成正确率、分数、等级、能力评级、通过／失败或医学、教育、专业能力诊断。

## 2. UI 与失败关闭

- Android 中文首页提供独立“练习统计”入口；统计页显示三个时间窗口、按练习方式和按题目族的汇总、空态及来源边界。
- 同一复练可能产生“开始复练”和“已核对”两条事实；总数明确称为“记录动作”，不能冒充独立练习次数。
- 空窗口显示 0 和空态，不补造历史。
- 无效时间、未知事件类型／练习方式／题目族或未来事件使本次统计整体不可用，不输出部分猜测值。
- 既有学习画像存储解析继续负责超长、畸形 JSON、未知 schema 和迁移失败的 fail-closed 恢复；P118b 不新增存储版本或迁移。
- 学习事件读取／保存失败提示继续可见；当前会话中尚未持久化的事件只能描述为“当前已载入”，不得冒充已保存历史。

## 3. 隐私与范围边界

- 不保存、读取或派生录音、Blob、PCM、音高帧、原始分析证据、生物特征、答案或 ActivitySession。
- 不新增 localStorage／IndexedDB key、账号、云端、数据库、网络请求、上传能力、依赖或 Android `INTERNET` 权限。
- 不读取 P118a 课程进度或复练队列来补统计，不顺带实现 P118c 薄弱点队列、P118d 推荐或 P118e 整合。
- 不把自动测试、DOM 挂载、CI、Debug APK 或模拟输入描述为真机、真实人声、教师或目标用户证据。

## 4. 自动门禁

该切片的自动门禁包括：

- `npm run test:local-practice-statistics`
- `npm run test:mobile-practice-statistics-behavior`（3 个真实挂载行为测试）
- `npm run test:mobile-practice-review-behavior`（App 挂载回归）
- `npm run test:learning-event-profile`
- `npm run test:mobile-learning-profile-storage`
- `npm run test:documentation-hygiene`
- `npm run check`
- `npm audit --omit=dev --audit-level=high`
- `npm run android:sync`
- `npm run validate:android-local`
- `git diff --check`
- GitHub Quality 的 `quality`、`android-local` 与 Vercel 状态
- review comments、requested changes 和未解决 review threads 检查

focused domain 与挂载测试必须证明：7／30／全部窗口边界、两维聚合、空态、异常失败关闭，以及相反 `outcome` 不改变统计结果。

## 5. 外部证据

以下全部为 **NOT_EXECUTED**：

- Android 多档真机；
- 真实麦克风；
- 真实人声；
- 教师审核；
- 中文目标用户可用性；
- 正式签名与私测发布。

自动门禁通过不能改变这些状态。
