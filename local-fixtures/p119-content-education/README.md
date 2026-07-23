# P119a 内容与教育审核本地证据

本目录只提供协议示例。它不会证明教师资质、题目音乐正确性、教育有效性或 P119/Q 已完成。

1. 先运行 `npm run verify:p119-content-review-manifest -- --manifest local-fixtures/p119-content-education/review-manifest.bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1.json`，确认冻结清单、source file 摘要和 sidecar 一致。
2. 复制 `evidence.example.json` 为被 Git 忽略的 `evidence.local.json`。
3. schema v2 必须引用同一 source commit、catalog version、manifest 文件和实际 SHA-256；旧 schema v1 不得伪装成已绑定清单的证据。
4. 抽样数量与 ID 只能由责任方在审核开始前批准。自动工具只校验 ID 唯一且存在于同一冻结清单，不会选择样本。
5. 两名独立教师必须审核同一冻结批次；仓库只记录匿名 reviewer token 与汇总，身份、资质、签署和逐题原件保存在产品所有者控制的私有位置。
6. 运行 `npm run validate:p119-content-education-evidence`。

示例保留了 P119b PR run `30001642941` 的真实 synthetic merge SHA `02bb1c330426b5bc36893ef70532a659d4080202`。它与冻结内容的 main source commit `bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1` 不同，因此 same-commit 自动门禁按协议保持 `BLOCKED`；不得把 PR synthetic merge、PR head 或 main squash commit 混为一谈。

`BLOCKED` 表示证据尚缺或内容前置门槛未满足，不是软件崩溃。CI、自动题目测试、Debug APK、`source.reviewState: "confirmed"` 或开发者自查不能替代双教师审核。
