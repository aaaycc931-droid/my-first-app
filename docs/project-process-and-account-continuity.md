# 项目流程、额度与跨账号连续性方案

文档角色：**Active process contract / 当前开发执行规范**

版本：1.2

最后核验：2026-08-09

入口：`docs/START-HERE.md`

## 1. 目标

本方案同时优化三种有限资源：

- GitHub Actions 分钟、并发与 artifact 存储；
- Codex／ChatGPT 对话额度和跨账号恢复成本；
- 人工审查、等待和重复验证时间。

优化不能降低安全、所有权、数据迁移、音频／录音、核心练习和发布门槛。原则是按风险选择验证，不是取消验证；保留一个稳定、可作为保护规则目标的最终 `quality` 检查。

## 2. 已落地的第一阶段

Quality workflow 已采用保守的改动分类：

| 改动类别 | Web 代码验证 | Android 构建验证 | 依赖审计 | APK 上传 |
| --- | ---: | ---: | ---: | ---: |
| docs-only | 否；只跑文档门禁 | 否 | 否 | 否 |
| Web-only | 是 | 否 | 按依赖变化 | 否 |
| Android-only | 运行通用代码门禁 | 是 | 按依赖变化 | 否 |
| shared | 是 | 是 | 按依赖变化 | 否 |
| dependency／database／infra／unknown | 是 | 是 | 依赖或强制全量时执行 | 否 |
| 手动全量且 `upload_apk=true` | 是 | 是 | 是 | 是 |
| 每周回归 | 是 | 是 | 是 | 否 |

关键防护：

- 不使用 `paths-ignore` 让必需检查从 PR 上消失；
- 分类器或 diff 不可判定时回退全量；
- rename、delete、空 diff、非支持事件都有测试；
- 同一 PR 的旧运行可取消，`main` 运行不互相取消；
- `quality` 通过 `always()` 汇总必须成功／允许跳过的 lane；
- action 使用固定 SHA，权限最小化并设置 timeout；
- Android 仍执行资源同步、版本来源、Gradle unit test、assemble、打包与独立复核；
- 普通 PR 只验证 APK，不上传；手动私测才保存 14 天 artifact。

## 3. PR 与提交策略

- 一个 PR 对应一个有用户价值或维护价值的完整切片，不按按钮、单字段或单文案机械拆分。
- 同一切片的代码、focused tests 和必要状态更新放在同一 PR；不要在合并后再创建低价值“状态同步 PR”。
- 安全、CI 恢复、数据库部署等紧急修复独立成小 PR，避免与产品功能耦合。
- Draft PR 是跨账号持久化检查点，不代表完成；达到门槛后再 Ready 和合并。
- 合并前锁定 expected head SHA，防止检查通过后内容被替换。
- 合并后只验证新的 `main` merge SHA，不沿用 PR preview 或临时 merge SHA 结论。

## 4. 分层验证

### 4.1 本地

1. 先跑与改动直接相关的 focused tests；
2. 再跑静态检查和由分类器决定的必要构建；
3. 没有代码／依赖变化时不重复 `npm ci`、Web build 或 Android build；
4. 同一 head 已通过且文件未变化时不为“确认”重复完整套件；
5. 不安装用户环境中缺失的可选工具，优先使用仓库脚本、Git、GitHub connector 或现有 HTTP API。

### 4.2 PR 远端

合并前至少确认：

- stable `quality` 为 success；
- checks 必须对应当前 head；依赖、lockfile、workflow、数据库或供应链改动的成功结果超过 24 小时时，合并前重跑一次，避免用陈旧绿灯跨过新公告或 runner 变化；docs-only 不因此机械重跑全量；
- 分类与本次 diff 相符；
- 被选择的 `quality-suite`／`android-local` 成功；
- 未选择的 Android lane 是预期 skipped；
- 普通 PR 没有 APK artifact；
- Vercel 到达终态 success；其只证明部署，不等于浏览器手动 QA；
- 没有 queued、in_progress、failure 或 conflict。

Supabase deployment 的 skipped 只能在本次没有明确数据库发布意图时视为正常，不能把 skipped 写成迁移已部署。

### 4.3 合并后

- 核验远端 `main` 已前移到预期 merge SHA；
- 等待该 SHA 的 Quality 终态；
- 对 Web 发布核验该 SHA 的 Vercel production 状态；
- 核验普通 push 没有 APK artifact；
- 如果新公告、runner 或远端环境让 `main` 失败，先做隔离的修复 PR，再继续下一产品切片。

## 5. APK 与 artifact 策略

不为每个 PR 上传 APK。构建验证与上传分发是两件事：

- Android／shared／高风险改动仍在 CI 内构建并独立验证 APK；
- 普通 PR、重复 push、docs-only、Web-only 和 post-merge `main` 不上传；
- 只有准备在真实手机私测、发布候选取证或排查包内问题时，手动运行并选择 `upload_apk=true`；
- artifact 默认保留 14 天，正式证据需要摘要、版本来源和对应 commit；
- 真实安装、音频、麦克风、延迟和升级测试不能由 CI APK 替代。

## 6. 对话额度与代理策略

- 默认由一个主代理维护事实模型和最终决策；只有任务边界独立、结果可合并且确实节省时间时才并行。
- 不让多个代理重复查询同一 PR、重复读取同一组文档或同时运行相同全量测试。
- 并行任务应按 GitHub 状态、代码审查、测试／CI 等互斥证据面划分，并由主代理统一去重。
- 每个工具调用优先批量获取相关状态；轮询间隔与预期任务时长匹配，避免数秒级重复轮询长构建。
- 回报只保留结论、证据、阻塞和下一动作，不复制大段日志；失败日志截取根因附近。
- 已在当前会话读取且没有变化的文档不重复读取。新任务从 `START-HERE` 路由，不固定读取 17 份路线。
- 不用复杂图表或额外制品重复表达短列表；只有关系复杂时才使用可视化。

## 7. 跨账号连续性

GitHub Draft PR 是首选的持久化暂停点。账号额度不足前：

1. 收紧当前切片范围；
2. 保存 focused checks；
3. 提交并推送远端分支；
4. 建立／更新 Draft PR；
5. 写入 `docs/account-handoff-prompt.md` 规定的最小检查点；
6. 标记未执行的 browser、Vercel、真机、生产或外部 QA。

新账号无需接收旧聊天全文。发送可复用的最小提示后，新账号先核验 GitHub，再继续当前 Draft PR。未推送本地文件不是可靠交接；如果因硬阻塞无法推送，必须明确列出它们并停止声称可以无缝恢复。

## 8. 文档治理

- `START-HERE` 负责路由，不承载容易过期的 HEAD、当前 PR 或长状态快照；
- DoD、状态矩阵、MVP 状态各司其职，不相互复制全文；
- acceptance 文档说明单一切片的边界与证据；
- 路线图说明顺序和依赖，不声明实时完成；
- 历史交接与研究归档保留追溯价值，但必须标记历史身份；
- 不一次性重写或删除 260 份文档。先修入口和明显误导的旧交接，再在触及领域时渐进治理；
- 文档卫生门禁继续检查截断输出、重复标题等机械污染。

## 9. 第二阶段已落地

- PR #530 已真实验证 docs-only 路径：stable `quality` 保留并成功，依赖安装、审计、lint、typecheck、runtime tests、Web build、Android job 与 APK 上传均按策略跳过；
- 合并分支清理不再随每次 `main` push 运行，改为手动或每月一次；开放 PR、非白名单前缀、fork 和含合并后新增提交的分支继续受保护，并可识别 exact squash-merged head；
- Supabase 生产迁移只接受显式手动 workflow dispatch，不再为每个 `agent/**` push 创建 skipped run；秘密检查、SQL、RLS smoke 和最小权限验证没有删除；
- 统一 PR 模板已覆盖范围、风险分类、验证、未执行 QA、APK／数据库意图和回滚；PR 模板属于非执行文档，workflow 文件仍为 infra/full；
- dependency-free 供应链与 workflow 策略测试已移到无条件轻量步骤，因此未来 docs-only PR 模板改动仍受门禁约束，且该测试仍恰好执行一次。

## 10. 仍待执行的流程优化

1. 对当前串行的 mobile runtime scripts 做耗时与领域归属盘点；main run #448 的初始观测为该 step 内 160 个脚本约 553 秒，仍需建立“每个测试恰好属于一个 lane”、shared／unknown 回退 full、每周全量和 shadow 对比，之后才允许按 Web／Android／领域进一步分片；
2. 观察两周的 Actions 运行时间、平均 PR 等待时间、取消的重复运行、APK artifact 数量和误分类；
3. 若发现漏检，立即将相关路径回退到 full，并补分类器测试后再优化。

## 11. 变更与回滚

流程优化先 shadow 验证再扩大：分类器必须可从实际 diff 重放，weekly／manual full 提供兜底。任何 required gate 缺失、误跳过、主分支失败或安全边界变弱时：

1. 暂停合并受影响类别；
2. 把该类别或未知路径回退到 full；
3. 修复测试与 workflow；
4. 用 PR 和合并后 `main` 两层重新验证；
5. 记录问题，但不通过关闭审计、允许失败或取消稳定 `quality` 来“恢复绿色”。

QA level recommendation：**none**（本文件定义流程，不改变产品运行时）。
