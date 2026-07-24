# P119d 双教师审核前置包候选

日期：2026-07-24

状态：**SAMPLE PLAN APPROVED / teacher item review NOT_EXECUTED / formal evaluation BLOCKED**

QA level recommendation：**none**

## 1. 范围与硬边界

P119d 只准备双教师审核所需的可复现候选、样本量与分层说明、审核模板、批准记录、修改记录和 fail-closed 命令。它不修改题库、课程、答案、解释、Android/Web 运行时或正式评估逻辑。

`candidate-review-batch.v1.json` 保持不可改写的候选源工件。2026-07-24，产品所有者确认两名独立教师已在仓库外完成资质核验并分别签署，原样批准该文件中的全部 153 个 `sampleItemIds`；无身份批准摘要保存在 `approved-review-plan.v1.json`。因此：

- 抽样计划的 `approvedBeforeReview` 可在真实本地证据中记录为 `true`；
- `teacherReviews` 仍必须保持空，直到两位教师分别完成全部逐题六维审核；
- 当前只允许开始获批批次的教师逐题审核；
- 不得开始正式评估或声明教育通过；
- `npm run validate:p119-formal-stage-gate` 仍应以退出码 2 表示逐题教师证据缺失。

## 2. 候选样本量与分层

候选从 P119c 冻结清单中选择：

- 题目总体：1,855 个 review item；
- 分层：10 个题型 × 3 个难度，共 30 层；
- 每层候选：5 项，共 150 项；
- 课程：冻结的 3 个中文基础课节全部纳入；
- 候选总数：153 项；
- 审核维度：`target-truth`、`answer-rule`、`terminology-solfege`、`difficulty-progression`、`explanation`、`misconception-risk`。

等额分层保证 30 个题型／难度层都有最低人工覆盖，不让 384 项的大层压过 20 项的小层。它是审核可执行性与覆盖面的候选折中，不是统计正确率证明，也不支持“总体准确率 100%”结论。正式 DoD 的抽样正确率 100% 只能描述最终获批样本全部通过；它不能外推为 1,855 项全部正确。

两位教师已在审核开始前共同选择：

1. 原样批准全部 153 项；
2. 接受 5 组跨难度相同 `variantId` 作为配对的难度递进审核项；
3. 不把这 5 组重叠误计为独立统计样本。

后续任何变更都必须先进入批准记录与修改记录，并由两位教师重新批准，再继续审核。

## 3. 可复现选择方法

候选工件：

`local-fixtures/p119-content-education/candidate-review-batch.v1.json`

批准摘要：

`local-fixtures/p119-content-education/approved-review-plan.v1.json`

两位教师分别使用的预填工作表源：

`local-fixtures/p119-content-education/teacher-review-worksheet.v1.csv`

选择方法：

- manifest：`review-manifest.bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1.json`
- manifest SHA-256：`b8430559e1fc3f102f8f9fce1158b473ea199e4c7f8fec9fef607b0ef42da8a1`
- seed：`p119d-candidate-v1|d6d9162a3892a4050f713312c430dd0ea420a114|b8430559e1fc3f102f8f9fce1158b473ea199e4c7f8fec9fef607b0ef42da8a1`
- seed SHA-256：`d37201ccbdfed0359b0a658aa8fff507d18bf2bb86b4e02e1f2556ae4c1ba241`
- 排序键：每层内 `SHA-256(seed + NUL + kind + NUL + difficulty + NUL + reviewItemId)` 升序；
- 摘要并列时按 `reviewItemId` ASCII 升序；
- 每层取前 5 项；
- 3 个课程项全部纳入。

重建与检查：

```bash
npm run generate:p119-teacher-review-candidate
npm run test:p119-teacher-review-candidate
```

seed 绑定生成候选前已存在的 main commit 与冻结 manifest 摘要，减少事后挑选空间。候选文件本身不承载批准；批准摘要以其 SHA-256 精确绑定。若教师之后要求新规则和新 seed，必须先记录理由并产生新版本文件，不能静默覆盖 v1。

## 4. 重复、缺失、偏差与泄漏风险

自动检查必须证明：

- 153 个候选 `reviewItemId` 全局唯一；
- 每个候选都存在于同一冻结 manifest；
- 30 层各有 5 项；
- 3 个课程项全部存在；
- committed candidate 可由当前生成器 byte-identical 重建。

自动检查不能证明：

- 移调、八度变化或同概念变体是教育上独立样本；
- 不同难度共享 `variantId`、音高材料或解释时不存在语义重叠；
- 5 项足以发现某层所有系统性错误；
- 教师之间真正独立；
- 教师资质与签署真实。

因此候选工件单列 `crossStratumVariantIdOverlapCount`，并保留泄漏风险声明。两位教师批准时必须判断相似变体、共享概念、答案暴露与难度递进是否要求扩样。任何 finding 都阻塞该批次；若 finding 可能是系统性的，应扩展到同题型／难度全层或相邻难度，并重新批准修订批次。

当前 v1 候选检测到 5 个跨层 `variantId` 重叠：1 个音程、1 个调制、2 个单音和 1 个七和弦排列。完整 ID 对照保存在候选工件的 `checks.crossStratumVariantIdOverlaps`，不把这些重叠项误计为独立统计证据。

## 5. 审核流程

```text
验证 manifest、候选与批准摘要
→ 分别复制预填工作表到两个私有位置
→ 两位教师独立完成同一获批批次六维审核
→ 汇总 finding，不泄露一方结论给另一方
→ 修复、重建 manifest／候选并重新批准（如适用）
→ 零开放 finding 后核对私有签署原件
→ 运行 formal-stage gate
```

使用模板：

- `local-fixtures/p119-content-education/review-plan-approval.template.md`
- `local-fixtures/p119-content-education/teacher-review.template.md`
- `local-fixtures/p119-content-education/review-change-log.template.md`

填写后的身份、资质、签署和逐题记录必须保存在产品所有者控制的私有位置，不得提交 Git、上传聊天、进入 CI artifact 或打包进 APK。仓库只允许保存匿名 token、无个人信息汇总与经授权的私有证据引用。

## 6. 正式阶段门禁

以下命令是进入正式样本、正式评估或正式发布步骤前的强制门禁：

```bash
npm run validate:p119-formal-stage-gate
```

它复用 P119 schema v2 的 fail-closed validator。只有同一 manifest、获批 sample item ID、两个不同 reviewer token、外部资质核验、同一批次六维完成、零开放 finding 与私有签署引用全部满足时，结构门禁才可能通过。通过后仍须人工核对真实教师身份、资质、签署和逐题原件。

当前批准摘要已经存在，但 `evidence.local.json` 尚无两份完成的逐题教师记录，预期结果仍是 `BLOCKED` / exit 2。

## 7. 明确未执行

- 逐题六维审核；
- 两份独立教师审核的完整性复核与 finding 闭环；
- 教育有效性、总体正确率或发布结论；
- 专业路线每档 40；
- 真实 Android、真实人声、目标用户或完整 P119/Q。
