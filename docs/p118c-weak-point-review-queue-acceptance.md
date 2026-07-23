# P118c 本机薄弱点复练队列验收

日期：2026-07-23

状态：**MERGED IMPLEMENTATION_CANDIDATE / automated gates passed / external evidence NOT_EXECUTED**

QA level recommendation：**strict**

## 0. 合并与自动门禁事实

- P118c 已通过 PR #409 squash 合并，main 提交为 `55093e4d1004bc97408f45ef0e2a26a2adee6c0b`。
- PR Quality run `29970087207` 已完成且成功，`quality` 与 `android-local` 两个 job 均通过；Vercel PR 预览状态为 Ready。
- Android artifact `8549340247` 已由 PR synthetic merge commit `e706e4dc782eb221e34d187b44d81f835522f4be` 构建并独立校验；GitHub artifact ZIP digest 为 `sha256:af8c36ddebe4f9df6ab7131aacdbeec1a4ec96b7b5b65f9517ff8bfd487d9d72`。它不是 main 真机证据。
- PR 合并前 reviews、requested changes 与 review threads 均为空；独立只读审查最终为 High 0 / Medium 0 / Low 0。
- 本地验证实际通过：focused domain、面板挂载 4/4、App 挂载回归 38/38、复练队列与画像存储／迁移、文档卫生、`npm run check`、生产依赖 audit（0 vulnerabilities）、Android sync／validator 与 `git diff --check`。
- 为清除实时 audit high，同一 PR 将既有 Next.js 从 16.2.10 补丁升级至 16.2.11；没有新增依赖或运行时能力。
- 上述事实只证明代码、自动约定、构建与工件校验通过，不证明任何外部设备、真人或教育证据。

## 1. 用户目标与真源

P118c 把既有 Android 本机复练队列整理为可解释、可操作的“当前待复练题”视图。唯一真源仍是 `LocalPracticeReviewQueue`：最多 12 个、能够精确复现内置题目的未解决错题目标。

- 按 `target.kind` 分组；组与组内目标均保持既有 MRU 首次出现顺序。
- 用户可从每个精确目标进入原有 Activity 复练路径。
- “薄弱点”只表示当前尚未解决的错题事实，不是能力评级、严重度或推荐结果。
- 答错加入或置顶、答对移除、稳定题目标识、去重、容量、清除与 v1–v9 迁移继续由既有队列协议负责。

## 2. 失败关闭与独立控制

- 队列写入成功后才更新内存 UI；加入或移除保存失败时保留旧队列并显示中文提示。
- 无效、重复、超容量或未知目标不得生成部分分组结果。
- 清除全部复练必须二次确认；清除失败保留旧队列。
- 复练队列清除与学习画像重置相互独立。画像为空但队列非空是合法状态。
- 共享 Web `/practice`、课程练习和 P117d/P117e 会话内活动继续不读写该队列。

## 3. 隐私与非评分边界

P118c 不新增存储 key、schema、依赖、账号、云端、数据库、网络请求、上传或 Android `INTERNET` 权限；不保存答案、用户选择、音频、Blob、PCM、音高帧、原始分析证据、生物特征、完整历史或云端标识。

不得显示或派生正确率、准确率、分数、等级、通过／失败、能力评级、教育诊断或医学结论。不得读取 `LearningEvent.outcome`，不得用 P118b 统计或最多 48 条学习事件重建、修正或排序队列。

## 4. 本切片明确不包含

- P118d 可解释非评分推荐或自适应排序；
- P118e 课程／统计／复练／推荐整合；
- 新 Activity、答案、画像、复练或持久化协议；
- 全部 14 活动族覆盖声明。当前队列只覆盖既有 11 类可持久复练目标。

## 5. 自动验收

- `npm run test:local-weak-point-review-queue`
- `npm run test:mobile-weak-point-review-behavior`（4 个真实挂载面板行为测试）
- `npm run test:mobile-practice-review-behavior`（App 真实挂载回归）
- `npm run test:local-practice-review-queue`
- `npm run test:mobile-practice-review-storage`
- `npm run test:mobile-learning-profile-storage`
- `npm run test:documentation-hygiene`
- `npm run check`
- `npm audit --omit=dev --audit-level=high`
- `npm run android:sync`
- `npm run validate:android-local`
- `git diff --check`

上述 GitHub `quality`、`android-local`、Vercel、reviews、requested changes、review threads、工件与合并事实均已核实；后续回归仍须重新执行，不得沿用为未来切片证据。

## 6. 外部证据

- Android 多档真机：`NOT_EXECUTED`
- 真实麦克风／真实人声：`NOT_EXECUTED`
- 双教师审核：`NOT_EXECUTED`
- 中文目标用户可用性：`NOT_EXECUTED`
- 正式签名、覆盖升级、回滚与私测发布：`NOT_EXECUTED`

CI、Debug APK、DOM/React 挂载测试和模拟输入不得冒充上述证据。
