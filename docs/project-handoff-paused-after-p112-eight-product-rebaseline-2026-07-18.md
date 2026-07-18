# 视唱练耳项目交接：P112 合并后八产品全能路线重定标并暂停

交接日期：2026-07-18
状态：**PAUSED / 只完成规划，不继续运行时开发**
项目：`aaaycc931-droid/my-first-app`
当前载体：Android 本地 APK 与 Web 私有学习平台并存；最终产品同时包含高质量本地与中国区合规云端能力

## 1. 新对话先知道的结论

项目没有完成最终版，也没有停止维护。当前暂停在“P106–P112 已合并，八产品长期竞争范围与未来执行路线已冻结，P113 尚未开始”的位置。

本次是 docs-only 产品重定标：

- 不修改运行时、UI、算法、题库、依赖、Android 工程、数据库、版本或 APK；
- 不开始 P113 或 F/S/A/C/Q 任一未来切片；
- 不把规划文档写成已实现能力；
- QA level recommendation：`none`。

## 2. 已核对的远端里程碑

| 切片 | PR | merge commit | 远端状态 |
| --- | ---: | --- | --- |
| P106 | #357 | `889e60d2b273446fb167f6acfa1bd8cb7195d706` | merged |
| P107 | #358 | `eb530417894292fb5e20522c01be03cc7cc056eb` | merged |
| P108 | #359 | `17e247888cc23b7c5d88a366f0338f76effb7591` | merged |
| P109 | #360 | `65ea05428c3118acbfd1d9bc582bc9db9359ed3a` | merged |
| P110 | #361 | `a81bed90987cf327a311f4f1b15ed61a36885915` | merged |
| P111 | #362 | `c849d901da8ae89c9b5fab6f27324342adb200cd` | merged |
| P112 | #363 | `a38d7be42b57e2bde4030e78d03a41f644897ee8` | squash merged |

“merged”只证明代码与当时仓库门禁进入 main，不自动证明三档 Android 真机、真实人声数据、教育审核、用户体验或竞品对标门槛通过。P104 的真实人声、设备与双教育审核证据仍是独立缺口。

## 3. 最新产品决策

最终产品不是单一离线视唱练耳工具，而是面向中文用户的全能音乐学习与创作系统。正式对标对象为：

1. 《开嗓练声》；
2. 《知唱音域音调仪》；
3. EarMaster；
4. 《来音乐理》；
5. 《来音钢琴》；
6. 《来音伴奏》；
7. 《来音制谱》；
8. 《完美钢琴》（Perfect Piano）。

《练耳大师》明确不属于目标，只保留为历史算法/交互基线。

必须同时满足：

- 钢琴、视唱练耳、练声/音准、乐理、伴奏和制谱各自达到优秀单项产品的核心使用体验；
- 同一份乐谱、音频、练习目标、错误证据、项目历史和学习画像能跨模块复用；
- 本地与云端都是最终范围，当前离线优先只是阶段性约束；
- 安装包体积不是删减专业功能的理由，但资源仍要按许可、更新、设备能力和内存管理进行版本化；
- 自动识别、生成和分析结果始终执行“预览 → 检查 → 修改/确认 → 再进入练习”；
- 未完成数据、重复性、公平性和教育审核前，只提供可解释的非评分反馈；
- 不复制竞品代码、模型、音色、谱库、曲库、题库、课程、UI、图标或品牌表达。

完整范围见：

- `docs/eight-product-unified-competitive-roadmap-2026-07-18.md`
- `docs/future-development-execution-roadmap-eight-products-2026-07-18.md`

## 4. 现有 P 编号与新增泳道

P113–P120 的原含义保持不变：

- P113：音符分段、目标对齐与逐音/逐句反馈；
- P114：统一练习活动协议与答案界面；
- P115：音程、和弦、转位、进行与音阶；
- P116：节奏专业套件；
- P117：旋律听写、回唱与视唱；
- P118：中文课程、统计与可解释自适应；
- P119：内容、算法与教育联合验收；
- P120：Android 专业私测候选。

八产品范围新增稳定规划泳道，不抢占历史 P 编号：

- `F`：共享音乐数据、项目、provider 与本地/云端契约；
- `S`：制谱、识谱/OMR、导入导出与钢琴学习集成；
- `A`：歌曲导入、分离、伴奏编辑、歌曲分析与演唱工作台；
- `C`：账号同步、内容分发、教师/作业与中国区云端增强；
- `Q`：钢琴、音准、OMR、伴奏、内容、云服务和跨模块联合验收。

P120 仍只是范围明确的专业私测里程碑，不是八产品公开最终版。它必须等待 P115–P118、钢琴缺口、S/A 与必要 C 切片在 P119/Q 汇合。

## 5. 恢复开发后的第一步

只有产品所有者明确要求“恢复开发”时才继续：

1. 从远端最新 `main` 建立新分支并确认本交接已合并；
2. 依次读取 `AGENTS.md`、正式 DoD、状态矩阵、mvp-status、Android 路线、专业竞争路线、八产品路线、本执行路线和本交接；
3. 核对 P112 merge commit、P106–P112 证据层级以及是否存在后来新增 PR；
4. 先完成 P113 可信音准闭环，再冻结 P114 与 `NoteEvent`、`ScoreDocument`、`PracticeTarget`、`MediaProject`、`AnalysisEvidence` 及 provider 契约；
5. 随后按教学、乐谱、伴奏、云端泳道滚动推进；共享 schema 和数据库迁移保持单 owner；
6. 每个 PR 必须是完整、可运行、可测试的 vertical slice，遵循“实现 → focused tests → 完整检查 → 提交 → 推送 → PR → CI → 审查 → 安全合并”。

如果用户只是询问状态、竞品、规划或文档，不得自行开始 P113。

## 6. 当前诚实边界

- P106–P112 已合并，但真实人声、三档 Android、双教育审核和竞品同机任务仍需独立证据；
- P112 提供录音提交后的本地离线分析基础，不等于 P113 的音符分段、目标对齐和逐句反馈已完成；
- P106–P110 的钢琴基础不等于已经达到《完美钢琴》或《来音钢琴》的完整体验；
- 制谱、OMR、伴奏分离/编辑、歌曲工作台和完整中国区云端泳道仍是未来规划，不得宣称已交付；
- 自动化、CI、浏览器、本地构建、真机、数据集、教育审核和用户可用性必须分别记录；
- 社区、公开谱库、公开上传、排行榜、多人竞技、评论、私信和陌生人资源交换仍不在当前授权范围内。

## 7. 必读顺序

1. `AGENTS.md`
2. `docs/final-release-definition-of-done.md`
3. `docs/final-release-status-matrix.md`
4. `docs/mvp-status.md`
5. `docs/android-apk-release-plan.md`
6. `docs/android-offline-professional-product-roadmap.md`
7. `docs/professional-competitive-roadmap-perfect-piano-earmaster.md`
8. `docs/eight-product-unified-competitive-roadmap-2026-07-18.md`
9. `docs/future-development-execution-roadmap-eight-products-2026-07-18.md`
10. 本交接文档
11. `docs/sight-singing-ear-training-feature-detail-map.md`
12. `docs/private-cloud-song-practice-pipeline-plan.md`

涉及五线谱/OMR 时额外读取 `docs/sheet-music-to-practice-target-mvp-plan.md` 和当前阶段 acceptance criteria。2026-07-18 的只读检索未找到独立 acceptance criteria 文件；恢复相关切片时必须再次核对，仍不存在则先建立对应验收标准，不能凭空假设。

## 8. 可直接发送给新对话的接续指令

```text
全面接管我的全能音乐学习项目，但先读取状态，不要重新开始，也不要自动恢复开发。

从远端最新 main 和 docs/project-handoff-paused-after-p112-eight-product-rebaseline-2026-07-18.md 继续。开始前依次读取 AGENTS.md、正式 DoD、状态矩阵、mvp-status、Android 路线、专业竞争路线、八产品竞争路线、未来开发执行路线及全部必读文档；如文件或远端状态不一致，先如实报告。

当前 P106–P112 已合并，暂停于 P113 开始前。最终产品集成开嗓练声、知唱音域音调仪、EarMaster、来音乐理、来音钢琴、来音伴奏、来音制谱和完美钢琴的核心强项，但不得复制任何竞品资产。练耳大师不是目标。本地与云端都是最终范围，当前离线优先不是最终定位。

只有我明确要求恢复开发时，才从 P113 开始，并按 P114/P115–P118、F/S/A/C/Q 泳道和 P119/P120 汇合路线推进。保持简体中文、自动结果先检查确认、低置信拒答、非评分诚实边界、许可/隐私/数据所有权、真实 QA 分层和仓库安全。
```

## 9. 本次 docs-only 验证边界

- 已核对远端 PR #357–#363 的合并状态和 merge commit；
- 已读取项目强制产品/发布/Android/专业竞争/视唱练耳/私人歌曲/识谱文档；
- `docs/future-product-requirements-roadmap.md` 在远端不存在，未凭空推断；
- 未执行运行时构建、浏览器 QA、Android 构建、真机、音频、数据集或教育审核；
- 不得把本次文档 PR 或 Markdown 检查写成任何运行时功能通过。
