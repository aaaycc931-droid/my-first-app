# P119a 教学内容盘点与双教师审核证据准备

日期：2026-07-23

状态：**MERGED EVIDENCE_PREPARATION_CANDIDATE / automated gates passed / external evidence NOT_EXECUTED**

QA level recommendation：**none**

P119a 已通过 PR #415 squash 合并为 `28a448faf1f387a1c7f394f5baac6a2a7dbc4eac`。PR head 为 `7af3d2004b87fdb4385fb5d3ad16e4a0814c455b`，PR synthetic merge SHA 为 `8ff547cf37b75096550bd6a695cdeb151c0548c5`。Quality run `29999854528` 的 `quality` 与 `android-local` 均成功，Vercel Ready；Android artifact `8560553741` 的 GitHub ZIP digest 为 `sha256:c5f87c7f4c238bb7337aebbfdc3478515125768424495ce1c697d09845fe9ec3`。该工件仍是自动构建并校验的 Debug APK，不是教师、真机使用、正式签名或发布证据。

## 1. 切片目标

P119a 是 P119/Q 的第一个独立证据准备切片，只承接 canonical Q3“内容与教育”中的当前教学候选盘点和双教师审核协议。它不新增课程、题目、Activity、答案、算法、评分、伙伴、云端或 Android 运行时能力，也不宣称完整 P119/Q 已经进入执行或通过。

本切片复用：

- `local-practice-catalog-v9` 的十类本机生成题型与基础／进阶／挑战三档；
- `activity-definition-v1` 的 14 类活动协议；
- 已有 expanded catalog、customizer、legacy adapter 和 local course path 自动回归；
- 正式 DoD 每个核心题型每档至少 20 个版本化题目或等价稳定组合的最低门槛；
- 专业路线每档至少 40 个经验证稳定题目或等价组合的目标；
- 至少两名独立视唱练耳教师对同一冻结抽样批次的审核要求。

## 2. 当前真实盘点边界

自动盘点只证明代码中可生成的稳定组合数量，不证明音乐正确性、难度递进、中文术语、唱名、解释或教育有效性。

当前至少存在以下明确阻塞：

- `chord-inversion / 基础`：8 个变体；
- `harmony-progression / 基础`：8 个变体。

二者低于正式 DoD 的每档 20 个最低门槛。其他题型即使达到 20 或 40，也仍须教师审核，不能从结构测试直接得到“题目正确率 100%”结论。

`ACTIVITY_FAMILIES` 有 14 个协议枚举不等于 14 个活动族内容已经完整；`source.reviewState: "confirmed"` 也只表示当前活动来源流程状态，不是双教师签署证据。

## 3. 证据协议

真实审核开始前必须冻结：

- 40 位 source commit SHA；
- catalog version；
- 审核清单 SHA-256；
- 抽样 item ID；
- `target-truth`、`answer-rule`、`terminology-solfege`、`difficulty-progression`、`explanation`、`misconception-risk` 六个审核维度。

两名审核者必须：

- 使用不同匿名 reviewer token；
- 独立完成同一冻结批次；
- 在仓库外完成身份、教学资质和签署核验；
- 覆盖全部抽样 item 与全部审核维度；
- 对任何问题建立 finding；存在开放问题时批次保持阻塞。

教师身份、资质原件、签署、逐题批注和任何个人信息不得提交 Git、进入 CI artifact、上传聊天或打包进 APK。仓库只允许保存不含身份信息的最终汇总与经产品所有者授权的证据引用。

## 4. 自动门禁与诚实输出

新增 evaluator 只输出：

- `inventoryReadyForHumanReview`：内容数量、同 commit 自动门禁与审核清单前置是否足以开始本批次人工审核；
- `teacherReviewBatchApproved`：本地记录的结构是否显示两名独立审核者对同一批次完成六维审核且无开放问题。

它不输出 `p119Ready`、正式教育结论、能力评级、评分阈值批准或发布结论。即使 `teacherReviewBatchApproved=true`，仍必须人工核对审核者资质、签署原件和逐题记录。

示例文件故意保持 `NOT_EXECUTED` 和阻塞状态。真实记录只放入被 Git 忽略的 `local-fixtures/p119-content-education/evidence.local.json`；该显式本地 validator 不进入常规 CI。

## 5. 验证

- `npm run test:p119-content-education-evidence`
- `npm run test:expanded-local-practice-catalog`
- `npm run test:local-practice-customizer`
- `npm run test:legacy-activity-adapters`
- `npm run test:local-course-path`
- `npm run test:documentation-hygiene`
- `npm run check`
- `npm audit --omit=dev --audit-level=high`
- `npm run android:sync`
- `npm run validate:android-local`
- `git diff --check`

## 6. 明确不包含

- 教师招募、资质判断、代签、真实逐题审核或教育有效性结论；
- 真实人声、盲测数据、Android 真机、目标用户或八竞品同机任务；
- P104/P111 算法证据的重复实现；
- OMR、伴奏、云端、伙伴或跨模块黄金闭环的验收；
- 正式签名、覆盖升级、回滚、私测分发或 P120；
- 基于当前两个 8 题基础档自动扩题。

完整 P119/Q 仍须等待钢琴缺口、S/A/必要 C 泳道与其他 Q1–Q5 证据汇合。当前外部证据继续保持 `NOT_EXECUTED`。
