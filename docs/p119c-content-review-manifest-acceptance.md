# P119c 内容与课程审核清单冻结候选

日期：2026-07-23

状态：**EVIDENCE_PREPARATION_CANDIDATE / local gates pending / external evidence NOT_EXECUTED**

QA level recommendation：**none**

## 1. 唯一范围

P119c 只关闭 P119a 协议中“实际审核清单尚未与 source commit、内容版本和 SHA-256 绑定”的证据准备缺口：

- 从 P119b main 内容基线 `bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1` 确定性导出 catalog v10 的 10 类本机生成题型、基础／进阶／挑战 30 个盘点组；
- 每个稳定 catalog variant 只计一个 review item；音程的上行／下行作为同一 item 的两个 representation，不膨胀盘点数量；
- 同时冻结当前 `zh-foundation-2026.1` 中文基础路径的 3 个课节、先修顺序、目标和 Activity binding；
- 保存 canonical UTF-8 JSON、源文件逐项 SHA-256 与清单精确字节 SHA-256 sidecar；
- 让 P119 教育证据 schema v2 只接受清单中真实存在的预批准 sample item ID。

本切片不新增或修改题目、课程、答案、解释、Activity、Android/Web 运行时或用户界面。

## 2. 冻结工件

- 清单：
  `local-fixtures/p119-content-education/review-manifest.bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1.json`
- SHA-256：
  `b8430559e1fc3f102f8f9fce1158b473ea199e4c7f8fec9fef607b0ef42da8a1`
- sidecar 使用精确 GNU 双空格格式，并绑定上述文件名。

清单包含：

- 30 个题型／难度组；
- 1,855 个稳定 catalog review item；
- 1,924 个 representation，其中音程 item 各保留上行／下行两种实际 Activity 表示；
- 3 个当前中文基础课节；
- 18 个内容真源文件的相对路径和逐文件 SHA-256。

清单不包含生成时间、随机 seed 调度结果、CI synthetic merge SHA、PR head、教师身份、教师资质、签署、逐题私有批注或审核结论。后续内容变化必须生成新的 commit-qualified 文件，不得静默覆盖本批次。

## 3. 确定性与可复核性

canonical 序列化固定为：

- 对象 key 按 ASCII 码序递归排序；
- 数组保持协议规定顺序；
- 有限非整数统一为 14 位有效数字，消除不同 Node/V8 数学函数的 1 ULP 表示差异；
- 2 空格缩进；
- UTF-8、无 BOM、无 CRLF；
- 文件末尾精确一个 LF。

题目顺序固定为显式 kind 顺序、`基础 → 进阶 → 挑战`、组内 ASCII `variantId`。`reviewItemId` 同时包含 kind、difficulty 与 variantId，避免跨难度重复 variant ID 产生歧义。

verifier 必须：

- 重算清单精确字节 SHA-256；
- 精确核对 sidecar；
- 拒绝符号链接；
- 重算 18 个 source file 摘要；
- 使用当前 factories、adapters 和 course path 重建完整清单并逐字节比较。

这些门禁只证明当前仓库内容与冻结清单一致，不证明音乐或教育结论正确。

## 4. 抽样计划与证据 schema v2

P119 教育证据 schema v2 新增实际 manifest 文件绑定。只有以下条件同时成立时，清单前置才有效：

- manifest 文件名与 40 位 source commit 一致；
- catalog version 与 manifest 一致；
- evidence、review plan 与实际重算 digest 一致；
- manifest canonical bytes 可复核；
- sample item ID 唯一且全部存在于该清单；
- 既有同 commit 自动门禁和 V1 数量前置满足。

工具不会决定样本量、随机抽样、自动填入 sample item，也不会批准抽样计划。示例继续保持：

- `reviewPlan.status = NOT_EXECUTED`；
- `approvedBeforeReview = false`；
- `sampleItemIds = []`；
- `teacherReviews = []`。

缺真实教师证据时，显式本地 validator 继续以退出码 2 表示 `BLOCKED`，不把外部证据缺失伪装成软件成功或失败。

P119b PR run `30001642941` 的真实 CI commit 是 synthetic merge `02bb1c330426b5bc36893ef70532a659d4080202`，不是本清单冻结的 main source commit `bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1`。示例按两种 provenance 分开记录，因此 same-commit 自动证据门禁继续为 `BLOCKED`；不能把 PR synthetic merge、PR head、main squash commit 或 Android artifact provenance 混为一谈。

## 5. 自动验收

- 相同 source commit 和 source files 在 Node 22／24 下重复构建得到 byte-identical JSON 与相同 SHA-256；
- source file 输入顺序不影响输出，任一 source digest 变化会改变 manifest digest；
- 30 组数量与 P119 inventory 精确一致，总 item 数为 1,855，所有 review item ID 全局唯一；
- 每个 item 包含稳定 factory input、去除会话 ID／sequence 的 question snapshot、完整 Activity target／expected answer／解释与 content version；
- 音程同一 variant 只计一次，并保留上行／下行两个 representation；
- 3 个当前课节及先修顺序完整；
- 清单不包含 score、grade、pass/fail、accuracy 或教师通过字段；
- digest、source commit、catalog 或 sample item 引用不一致时 fail closed。

相关命令：

- `npm run test:p119-content-review-manifest`
- `npm run verify:p119-content-review-manifest -- --manifest local-fixtures/p119-content-education/review-manifest.bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1.json`
- `npm run test:p119-content-education-evidence`
- `npm run test:expanded-local-practice-catalog`
- `npm run test:local-practice-customizer`
- `npm run test:legacy-activity-adapters`
- `npm run test:local-course-path`
- `npm run check`
- `npm audit --omit=dev --audit-level=high`
- `npm run android:sync`
- `npm run validate:android-local`
- `git diff --check`

## 6. 明确未执行

以下项目继续保持 `NOT_EXECUTED / BLOCKED`：

- 抽样数量、分层和 item ID 的责任方预批准；
- 两名独立教师的身份／资质核验、签署与逐题六维审核；
- 题目正确率、术语／唱名、难度递进、解释质量、误解风险和教育有效性结论；
- 专业路线每档 40 个经验证稳定题目目标；
- 14 类 Activity 的完整内容覆盖；
- 真实 Android 扬声器／耳机听感、真实人声、目标用户和八竞品同机任务；
- 正式评分、阈值、公平性、签名、覆盖升级、回滚、私下发布、P119/Q 或 P120。

自动清单、测试、CI 和 Debug APK 均不得替代上述外部证据。
