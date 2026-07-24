# P119a 内容与教育审核本地证据

本目录只提供协议示例。它不会证明教师资质、题目音乐正确性、教育有效性或 P119/Q 已完成。

1. 先运行 `npm run verify:p119-content-review-manifest -- --manifest local-fixtures/p119-content-education/review-manifest.bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1.json`，确认冻结清单、source file 摘要和 sidecar 一致。
2. 复制 `evidence.example.json` 为被 Git 忽略的 `evidence.local.json`。
3. schema v2 必须引用同一 source commit、catalog version、manifest 文件和实际 SHA-256；旧 schema v1 不得伪装成已绑定清单的证据。
4. `candidate-review-batch.v1.json` 是按固定 seed 对 30 个 `kind × difficulty` 层各选 5 项并纳入全部 3 个课程项的可复现候选；运行 `npm run test:p119-teacher-review-candidate` 可检查重建、重复、缺失与分层。它不是获批样本。
5. 两名真实教师必须在任何正式审核前批准样本量、分层和最终 item ID。若修改候选，必须保存新版本、选择规则、seed 与修改记录，不得静默覆盖。
6. 两名独立教师必须审核同一冻结批次；仓库只记录匿名 reviewer token 与汇总，身份、资质、签署和逐题原件保存在产品所有者控制的私有位置。
7. 正式样本、正式评估或正式发布步骤前运行 `npm run validate:p119-formal-stage-gate`。没有真实批准与双教师证据时，预期为 `BLOCKED` / exit 2。

示例记录冻结内容 main source commit `bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1` 自身的成功 Quality run `30002067536`，因此 same-commit 自动结构门禁为 `PASS`。P119b PR run `30001642941` 的真实 synthetic merge SHA 是 `02bb1c330426b5bc36893ef70532a659d4080202`，不能用于该门禁；不得把 PR synthetic merge、PR head、main squash commit 或 Android artifact provenance 混为一谈。

`BLOCKED` 表示证据尚缺或内容前置门槛未满足，不是软件崩溃。CI、自动题目测试、Debug APK、`source.reviewState: "confirmed"` 或开发者自查不能替代双教师审核。
