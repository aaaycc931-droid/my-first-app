# 项目事实入口与文档路由

文档角色：**Canonical entry / 新账号与新任务的唯一文档入口**

最后核验：2026-08-09

适用对象：产品所有者、开发者、Codex 与其他自动化代理

## 1. 先核验事实，再读取计划

任何新任务或跨账号继续都必须先核验 GitHub，不得把交接文字、聊天记录或本文件当作远端事实替代品：

1. 仓库默认分支与 `main` HEAD；
2. 最近提交、最近合并 PR 和全部开放 PR；
3. PR 的 Draft、可合并、落后、冲突与 checks 状态；
4. 远端未合并分支，以及有提交但没有 PR 的分支；
5. 相关 Quality、Vercel、Android、APK、Supabase 和清理任务；
6. 本地工作树、当前分支及未提交／未推送内容。

如果远端与文档不一致，以远端代码和可验证证据为当前事实，并在同一功能 PR 中修正文档中的错误声明。不要先按旧交接继续开发，再事后核验。

## 2. 事实与规范优先级

发生冲突时按以下顺序处理：

1. GitHub 当前 `main`、开放 PR、分支和 Actions 的真实状态；
2. `docs/final-release-definition-of-done.md`：V1 范围与完成门槛；
3. `docs/final-release-status-matrix.md`：各门槛的当前证据状态；
4. `docs/mvp-status.md`：已交付运行时事实总账；
5. 当前功能的 acceptance criteria、contract、测试与代码；
6. 活跃架构／执行路线；
7. 历史路线、暂停交接、研究记录和聊天摘要。

较新的日期本身不自动拥有更高规范权重。历史文件不能推翻 DoD，也不能把 implementation candidate、CI、mock 或计划写成真实设备、教育审核或生产验收。

## 3. 文档类别

### 3.1 每次按需进入的核心文件

| 文件 | 职责 | 何时读取 |
| --- | --- | --- |
| `docs/START-HERE.md` | 事实优先级、任务路由、文档状态 | 每个新任务一次 |
| `docs/final-release-definition-of-done.md` | V1 唯一完成标准 | 改 V1 范围、发布门槛或完成声明 |
| `docs/final-release-status-matrix.md` | V1 实时证据矩阵 | 改状态、证据或发布门槛 |
| `docs/mvp-status.md` | 当前已交付事实总账 | 改产品能力或纠正当前事实 |
| `docs/final-ui-refactor-compatibility-contract.md` | UI 抽离与兼容边界 | UI 架构、组件责任或大规模重构 |
| `docs/project-process-and-account-continuity.md` | 开发、CI、额度与跨账号流程 | 流程、CI、PR、发布或账号切换 |

### 3.2 活跃但只按领域读取的路线

| 领域 | 读取文件 |
| --- | --- |
| Android 私测／离线载体 | `docs/android-apk-release-plan.md`、`docs/android-offline-professional-product-roadmap.md` |
| 专业训练与竞品能力 | `docs/professional-competitive-roadmap-perfect-piano-earmaster.md`、`docs/sight-singing-ear-training-feature-detail-map.md` |
| 八产品长期终局 | `docs/eight-product-unified-competitive-roadmap-2026-07-18.md`、`docs/future-development-execution-roadmap-eight-products-2026-07-18.md` |
| AI 音乐伙伴 | `docs/unified-development-roadmap-with-ai-music-companion-2026-07-18.md`、`docs/ai-music-companion-agent-roadmap-2026-07-18.md`、`docs/ai-music-companion-single-companion-pilot-roadmap-2026-07-18.md` |
| 云端私人歌曲／伴奏 | `docs/private-cloud-song-practice-pipeline-plan.md` |
| 长期产品地图 | `docs/future-product-requirements-roadmap.md`、`docs/final-product-shape-and-feature-map.md` |
| 五线谱到练习 | `docs/sheet-music-to-practice-target-mvp-plan.md` 与当前 Stage acceptance |

上表不是固定必读清单。只选择本次任务涉及的行，再读取具体 acceptance 文档。一个 Web 账号小修不需要读取全部 Android、伙伴、八产品与 OMR 路线。

### 3.3 历史快照

下列文件保留用于追溯，但暂停点和提交状态已经过时：

- `docs/project-handoff-paused-professional-rebaseline-2026-07-16.md`；
- `docs/project-handoff-paused-after-p112-eight-product-rebaseline-2026-07-18.md`。

研究归档遵循 `docs/research-archive/README.md`。不要删除仍能解释历史决策的材料；应通过“历史快照／被什么取代”的标记降级，而不是把旧状态混入当前执行。

## 4. 按任务选择最小读取集

| 任务 | 必须读取 | 通常不需要读取 |
| --- | --- | --- |
| CI、Actions、依赖、分支清理 | 本文件、流程文档、相关 workflow／测试 | 产品路线全集 |
| docs-only 状态修正 | 本文件、被修改文件及其规范来源 | 无关 acceptance |
| 单一 Web／Android 功能 | 本文件、该功能 acceptance、相关代码；必要时载体路线 | 伙伴／云端／OMR 等无关路线 |
| 账号、RLS、私人数据 | 本文件、对应 acceptance、DoD／状态矩阵的相关条目、数据库契约 | Android 离线训练全集 |
| Android APK／原生能力 | 本文件、Android 两份路线、对应 acceptance | Web 云端路线全集 |
| OMR／制谱／notation target | 本文件、五线谱 MVP 路线、当前 Stage acceptance、相关交换契约 | 无关账号或伙伴路线 |
| 产品范围／发布宣称 | DoD、状态矩阵、MVP 状态与涉及领域路线 | 所有历史交接逐字读取 |
| 跨账号继续 | 本文件、`docs/account-handoff-prompt.md`，然后核验 GitHub | 旧账号聊天全文 |

读取过的文件如果与任务无关，不要在回报中复述。若同一会话内文件与远端没有变化，不要重复读取。

## 5. 文档更新规则

- 产品实现改变某项当前事实时，在同一功能 PR 内更新适用的 acceptance／状态条目；不要机械创建“每个 PR 之后再来一个状态同步 PR”。
- 不改变范围或状态的实现，不需要碰 DoD、状态矩阵和 MVP 总账。
- 新路线、交接或重要决策文档应在开头写明：文档角色、状态、最后核验日期、规范来源和取代关系。
- 时间敏感信息必须写明证据日期；当前 `main` SHA 不写入长期入口文档，因为合并该文档时就会过期。
- CI、浏览器、Vercel、APK、真机、真实人声、教育审核和生产验证必须分别陈述，不能相互替代。
- 旧文档有追溯价值时标为历史，不为“整洁”进行大规模删除；重复、无引用且无决策价值的材料才进入单独清理 PR。

## 6. 当前执行方式

项目默认采用一个完整、可运行、可测试的 vertical slice 对应一个 PR。紧急安全／CI 修复与产品或文档改动分开，避免扩大回滚面。

CI 根据改动路径保守选择验证范围，并保留稳定的最终 `quality` 检查；未知、依赖、数据库与 workflow 改动失败关闭到全量验证。普通 PR 不上传 APK，私测包只通过明确的手动请求生成。

完整规则、节省额度策略、跨账号暂停协议和实施阶段见 `docs/project-process-and-account-continuity.md`。
