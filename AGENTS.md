# AGENTS.md

## 项目入口定位

本项目最终定位为：面向中文用户的全能音乐学习与创作系统。视唱练耳是核心教学主轴，但不是唯一功能边界。

主体功能包括：

- 练声、实时音准、录音提交后分析与分段复练；
- 视唱、练耳、节奏、乐理课程、定制练习与学习反馈；
- 专业移动钢琴、MIDI、录音、谱面学习与多音色；
- 乐谱导入、识谱/OMR、制谱、播放、标准格式导入导出；
- 歌曲/伴奏导入、分离、编辑、分析、跟唱与跟弹；
- 本地项目、账号同步、私有云处理、内容分发和教师/作业能力；
- AI 音乐伙伴：以可信证据解释、范唱、发起复练并受控调用各模块；单伙伴先行，长期扩展多伙伴。

最终产品同时建设高质量本地与中国区合规云端能力；当前 Android 离线优先只是阶段性实施约束，不是最终卖点或终局范围。

五线谱识别必须进入“预览 → 检查 → 修改/确认 → 再练习/制谱”的完整链路，不是孤立 OCR 工具。私人歌曲和伴奏处理必须服务于同一份乐谱、练习目标、录音证据与学习画像。

伙伴不能替代底层音乐测量或核心工具。其先天人格、学习风格和关系成长必须与用户音乐能力分层；用户可以隐藏、关闭、重置或删除伙伴数据，且不影响钢琴、练习、制谱、伴奏和项目。

## Codex 必读文件规则

每次涉及 `/practice`、五线谱识别、制谱、伴奏、钢琴、视唱练耳、练习反馈、云端能力、产品路线或功能规划任务时，开始实现前必须先读取：

- `docs/mvp-status.md`
- `docs/final-release-definition-of-done.md`
- `docs/final-release-status-matrix.md`
- `docs/android-apk-release-plan.md`
- `docs/android-offline-professional-product-roadmap.md`
- `docs/professional-competitive-roadmap-perfect-piano-earmaster.md`
- `docs/eight-product-unified-competitive-roadmap-2026-07-18.md`
- `docs/future-development-execution-roadmap-eight-products-2026-07-18.md`
- `docs/unified-development-roadmap-with-ai-music-companion-2026-07-18.md`
- `docs/ai-music-companion-agent-roadmap-2026-07-18.md`
- `docs/ai-music-companion-single-companion-pilot-roadmap-2026-07-18.md`
- `docs/project-handoff-paused-after-p112-eight-product-rebaseline-2026-07-18.md`
- `docs/sight-singing-ear-training-feature-detail-map.md`
- `docs/private-cloud-song-practice-pipeline-plan.md`

如存在，也应读取：

- `docs/future-product-requirements-roadmap.md`
- `docs/final-product-shape-and-feature-map.md`

如果某个文件不存在，必须先说明，不要凭空假设其内容。

截至 2026-07-18，P106–P113 已合并，P113 merge commit 为 `2a786f1b66fee095224214430d12e96f78a5057e`；伙伴总路线与单伙伴细化路线已入库，但没有伙伴运行时实现。产品所有者要求在 P113 合并后暂停运行时开发。若新请求只是询问状态、竞品、复盘、规划或文档，不得自行开始 P114 或伙伴运行时；只有用户明确要求恢复开发时，才从远端最新 `main`、最新状态矩阵和统一路线继续。

凡涉及五线谱、乐谱预览、notation draft、识谱、OCR / OMR、乐谱到练习目标、Stage A–F 的任务，除上述通用必读文档外，还必须读取：

- `docs/sheet-music-to-practice-target-mvp-plan.md`
- 当前阶段对应的 acceptance criteria 文档

如果当前阶段还没有 acceptance criteria 文档，必须明确说明，不能假设其内容。

## 自动结果设计原则

所有自动识别、自动生成、自动分析出来的结果，都不能直接当最终结果。

必须经过：

```text
预览
→ 检查
→ 修改 / 确认
→ 再进入练习
```

适用对象包括：

- 五线谱识别结果；
- 目标音高曲线草稿；
- 私人歌曲分析结果；
- 节奏分析结果；
- 分句分析结果；
- 练习目标生成结果；
- 未来正式评分目标。

## UI 语言规则

项目默认面向中文用户。

所有用户可见 UI 默认必须使用简体中文。

英文只允许用于：

- 代码标识符；
- 类型名；
- 变量名；
- 函数名；
- 测试名；
- npm script；
- 开发者内部说明；
- 必要技术缩写，例如 Hz、BPM、MIDI、WAV、MP3、M4A、Alpha。

后续新增功能不得继续加入英文用户可见 copy，除非用户明确要求。

## 当前运行时边界（P84 之后）

项目已经进入从 browser-local 研究原型向私有正式学习平台迁移的阶段。当前生产运行时已经真实具备：

- Supabase 邮箱 magic-link 登录和私人资料；
- 已发布系统课程与三节基础课程；
- 单音、音程和节奏课程尝试的 owner-bound 持久化；
- Postgres RLS、最小权限 RPC 和生产跨用户隔离 smoke QA；
- 仍以浏览器本地完成的音频播放、录音、音高/节奏诊断和草稿检查能力。

不得继续用“no account / no database”描述当前生产事实。每项能力的实时状态以 `docs/mvp-status.md` 和 `docs/final-release-status-matrix.md` 为准；正式版是否完成只由 `docs/final-release-definition-of-done.md` 判定。

尚未正式完成的私有上传、对象存储、worker、数据导出/删除、正式评分和生产 OMR，必须先满足最终 DoD 对所有权、隐私、删除、版本化、安全和验收的门槛，不能因为已有数据模型或 mock 就宣称上线。

Android 本地 APK 已由产品所有者提升为当前最高优先级，并只用于私下分发测试；应用商店、AAB 和上架材料暂缓。APK 使用 Capacitor 打包本地静态资源，不得配置远程 `server.url`，核心练习不得依赖生产网站、Supabase 或网络。所有导航、音频、录音、文件选择、权限和生命周期任务必须同时判断已安装 Android APK 行为；桌面浏览器或普通 Android Chrome 通过不能单独证明 APK 就绪。当前路线和验收分层见 `docs/android-apk-release-plan.md`。

## 当前阶段禁止事项

当前阶段禁止：

- 把 service role、数据库密码或第三方密钥放进客户端、日志或仓库；
- 让浏览器直接写敏感练习、评测、任务或私有资产表；
- 在没有 RLS、保留期、删除链路和失败恢复时接入私有上传或云端处理；
- 在没有真实基准、置信度校准和教育审核时提供正式分数、等级或通过/失败；
- 把自动识别草稿冒充 final target、official transcription 或正式评测目标；
- 未经迁移验证和回滚设计执行破坏性生产数据变更；
- 未经单独产品与安全决策实现支付或会员；
- 社区、公开主页、用户互相关注、评论、私信、公开上传、公开音乐分享、公开资源库或用户间资源交换。

账号、数据库、私有云、上传和正式目标不再被一概禁止；它们必须作为 `docs/final-release-definition-of-done.md` 中边界明确、可测试、可回滚的正式能力推进。

## QA 分级规则

Codex 每次回报必须包含：QA level recommendation。

QA 分级：

- none：docs-only / test-only / no runtime change；
- light：copy / display / layout 小改，不改变 runtime semantics；
- standard：新增 UI 交互、导航状态、显示路径或按钮；
- strict：音频 runtime、录音、播放、reset / clear、practice target creation、scoring-like behavior、上传、云端、账号或核心练习流程变更。

不要每一步都要求 strict QA，但 strict 场景不能偷懒。

## Fast Track + Strict Complete Mode

项目开发默认采用 Fast Track + Strict Complete Mode：

- 每个阶段优先完成一个有实际产品价值、可运行、可测试的完整 vertical slice。
- 不要把一个功能拆成大量低价值的小阶段；“每次只实现一个功能”应理解为每次实现一个边界清楚的完整功能切片，而不是每次只增加一个按钮、一个字段或一小段文案。
- 不要连续进行不必要的 docs-only 阶段。只有涉及产品定位、架构、账号、云端、隐私、上传、评分、正式目标或重大边界时，才优先单独做 docs-only 决策。
- Fast Track 不等于粗糙；“优先保证可运行”不能作为忽略错误状态、清除、重置、disabled reason、测试或用户流程的理由。
- 避免为了安全而无限规划、不落地；同时避免一次性进行无边界的大规模重构。

## 通用功能完整性检查清单

每个新增或修改的用户功能都应根据适用性检查以下项目。不要求每个功能强行拥有所有状态，但 Codex 必须判断哪些项目适用，并在回报中说明。

- 用户为什么使用该功能；
- 用户第一步应该做什么；
- empty state；
- loading / processing state；
- invalid / error / warning state；
- disabled reason；
- 结果预览；
- 自动结果的检查、修改与确认；
- 清除；
- 重置；
- 替换来源后的 stale 行为；
- 修改后旧 checked / validation / temporary target 是否失效；
- 是否有误导用户为正式结果、正式转写、最终目标或评分的文案；
- 简体中文用户可见 UI；
- focused tests；
- build 是否需要；
- QA level recommendation；
- 是否需要浏览器手动 QA。

## 远端状态与 QA 诚实回报规则

- 没有可用浏览器时，不得声称完成 browser QA。
- 没有 GitHub 远端访问能力时，不得声称检查了 PR、远端分支或合并状态。
- 无法访问 Vercel 时，不得声称 Vercel deployment 或 checks 已通过。
- 本地测试通过不等于远端 checks 已通过。
- source-level review 不等于浏览器手动 QA。
- 无法执行的检查必须明确写为“未执行”并说明原因。
- 不得用推测代替实际检查结果。
- Codex 应清楚区分：
  - 已执行的本地测试；
  - 已执行的浏览器 QA；
  - 已确认的 GitHub / Vercel 远端状态；
  - 尚未执行、需要用户手动确认的事项。

## 开发原则

- 每个阶段先做边界明确的可验证候选，不用“小步 MVP”削减已经冻结的最终专业能力范围。
- 每次实现一个边界清楚、可运行、可测试的完整功能切片。
- 优先保证可运行，但不能省略适用的错误状态、清除、重置、disabled reason、测试或用户流程。
- 所有改动必须可解释。
- 逐步开发，小步提交，避免大规模重构，也避免无必要地长期停留在规划而不落地。

## UI 原则

- 简洁优先。
- 不要过度设计。
- 先功能后美观。
- 用户可见 UI 默认使用简体中文。

## 技术栈

- Next.js
- TypeScript
- TailwindCSS
