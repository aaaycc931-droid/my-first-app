# 正式版 V1 状态矩阵

最后更新：2026-07-18
规范来源：`docs/final-release-definition-of-done.md`

本文件只记录可验证的当前状态。`IN_PROGRESS` 不等于失败，也不得对外宣称正式完成；状态必须随合并和生产证据更新。

## 1. 总览

| ID | 领域 | 当前状态 | 已有真实证据 | 距离 PASS 的主要缺口 |
| --- | --- | --- | --- | --- |
| V1-01 | 范围与规范 | PASS | 正式版 DoD、范围分层、退出条件 | 后续变更必须走范围变更记录 |
| V1-02 | 账户与会话 | IN_PROGRESS | Supabase Auth、邮箱 magic link、资料读取/更新、生产浏览器 QA | 密码登录、退出/恢复全矩阵、异常邮件路径 |
| V1-03 | 数据导出与删除 | NOT_STARTED | 数据模型有 deletion request 草案 | 用户入口、导出包、级联删除、24h SLA、端到端演练 |
| V1-04 | 系统课程与题库 | IN_PROGRESS | 基础课程；单音、音程、节奏持久化；Android 四类听辨已有三难度、每档至少 20 个版本化组合 | 基础视唱、课程三难度与进度、教育审核；Android 难度仍待审核校准 |
| V1-05 | 视唱与录音闭环 | IN_PROGRESS | Web 本地录音/回放；Android 实时曲线、录音、本机记录与 P103 观察；P112 独立后分析已合并；P113 独立分段、目标对齐、逐音/逐句证据与片段复练已通过 PR #365 合并 | P113 真机/真实人声；正式课程/云端记录；P104 真机同步/延迟/录音设备矩阵 |
| V1-06 | 节奏练习与反馈 | IN_PROGRESS | 节拍器、tap/onset、延迟校准、DP 对齐、课程节奏听辨 | 真实数据基准、录音闭环、长期记录与复练 |
| V1-07 | 钢琴辅助 | IN_PROGRESS | P106–P110 已合并：统一 note event/provider、三层离线采样与 A0–C8 映射、移动钢琴交互、节拍器/事件录制/循环、多音色/USB MIDI/MusicXML 学习基础 | 三档真机低延迟/听感/10 指/32 音与设备断连证据；对照完美钢琴和来音钢琴的完整任务差距闭环 |
| V1-08 | MusicXML/MXL | IN_PROGRESS | parser、fixture、dev import、草稿与临时目标链路 | 正式用户入口、编辑确认、错误恢复、私有持久化 |
| V1-09 | 图片/PDF OMR | IN_PROGRESS | mock flow、Audiveris fixture/runner 研究基础 | 隔离 worker、私有上传、真实 OMR、草稿编辑、失败恢复 |
| V1-10 | 私有音频素材 | IN_PROGRESS | 浏览器本地导入、decode、音高曲线草稿、检查与临时目标 | 私有上传、worker、保留/删除、任务恢复、版权说明 |
| V1-11 | 私有云任务 | NOT_STARTED | 数据模型和架构蓝图 | Storage、队列 worker、取消/重试、审计、配额和运行手册 |
| V1-12 | 学习历史与复习 | IN_PROGRESS | 私有 practice attempts、课程答案摘要；Android 本机最小错题队列，以及用户主动保存的练声曲线/可选录音记录（均非正式学习历史） | Web 历史 UI、技能画像、解释型跨会话 review queue；Android IndexedDB、跨版本/跨重启和配额真机验证 |
| V1-13 | 音高算法基准 | IN_PROGRESS | P111 共同输入/分层基准基础、P112 多候选连续轨迹已合并；P113 `offline-note-alignment-v1` 独立分段、单调目标对齐、三阶段证据和局部拒答已通过 PR #365 合并；实时生产仍为 `autocorrelation-realtime-v1` | P113 真机/真实人声；200 合成/乐器、100 真实人声/20 位/4 类设备最低证据及专业扩展集、三档性能、量化结果和专家审核 |
| V1-14 | 节奏算法基准 | IN_PROGRESS | DP 对齐回归、tap/onset/latency 测试 | 真实设备/人声/乐器集、量化报告、低置信度校准 |
| V1-15 | RLS 与最小权限 | IN_PROGRESS | P78 最小权限；P84 生产 RPC 和跨用户事务 smoke QA | 覆盖所有 owner tables、Storage、签名 URL、删除后访问 |
| V1-16 | 性能与可靠性 | NOT_STARTED | 生产构建和常规 CI | 14 天窗口、真实用户指标、音频延迟、长循环/内存测试 |
| V1-17 | 可访问性 | NOT_STARTED | 语义化控件的局部实现 | 目标等级全量审计、键盘/屏幕阅读器、对比度与缩放证据 |
| V1-18 | 浏览器与真实设备 | IN_PROGRESS | 多次桌面 Preview QA；历史移动端 magic-link/播放 QA | 固定矩阵、2 台 iOS + 3 台 Android APK、麦克风/录音全流程 |
| V1-19 | 备份、恢复与回滚 | NOT_STARTED | Git/Vercel 可回退；迁移有局部事务验证 | 数据库恢复演练、RPO/RTO、不可逆迁移策略、30 分钟演练 |
| V1-20 | 观测与事故响应 | NOT_STARTED | GitHub Actions、Vercel 状态 | 错误追踪、指标、隐私日志、告警接收人和故障手册 |
| V1-21 | 内容与教学审核 | NOT_STARTED | 中文题目、答案解释和难度草案 | 2 名教育审核者、题量/正确率/难度递进验收 |
| V1-22 | 用户可用性验收 | NOT_STARTED | 开发与所有者 QA | 5 名目标用户、核心任务成功率和误解检查 |
| V1-23 | 发布证据包 | IN_PROGRESS | P103 的 APK/artifact 摘要仍是最后一份在状态文档中逐项核对的下载物；P106–P113 的 PR/merge 状态已核对 | 为 P113 后候选重新冻结 APK/版本/SHA-256/签名证据；P104 真实数据/设备/教育证据；删除/恢复与用户验收证据 |
| V1-24 | Android 本地 APK | IN_PROGRESS | 离线题库、实时曲线/录音/目标/观察、本机记录/复练，以及已合并的 P106–P113 钢琴、录音后分析和逐音/逐句证据基础；P103 APK 仍是状态文档最后逐项核对的下载物 | P113 后新候选工件、P104 三档真机/真实人声、专用签名、升级与前向回滚 |
| V1-25 | 最终生产发布 | BLOCKED | 当前 P84 生产 Web 版本已部署 | V1-02 至 V1-24 的全部 MUST 门槛尚未通过 |

## 2. 已确认不阻塞 V1 的能力

| 能力 | 状态 | V1 决策 |
| --- | --- | --- |
| 正式考试评分 | DEFERRED | 继续使用可解释非评分反馈，达到独立评分门槛后再启用 |
| 第三方登录 | DEFERRED | 邮箱登录足以完成 V1 私有账户闭环 |
| MIDI 硬件输入 | DEFERRED | 钢琴触控和参考音为 V1 必须；MIDI 作为条件增强 |
| 原生 iOS App | OUT_OF_SCOPE | V1 保留 iOS Web 支持，但优先交付 Android APK |
| 支付与会员 | OUT_OF_SCOPE | V1 不以商业化作为完成条件 |
| 社区与公开分享 | OUT_OF_SCOPE | 与私有学习平台边界冲突，明确不做 |
| AI 音乐伙伴与智能体 | DEFERRED / GATED | 长期路线必须纳入；首个 V1 仍是条件能力。未通过证据忠实度、教学、安全、隐私、性能和用户门槛时必须关闭，不阻塞核心专业功能 |

## 3. 当前最高优先级

产品所有者已再次解除暂停，当前正在交付 P114a 统一活动协议的首个真实 vertical slice。当前依赖顺序如下：

1. P106–P113 已合并；P104 最低真实证据、三档 Android、教育审核和竞品同机任务继续保留，不能用 PR 或路线文档替代。
2. P113 已通过 PR #365 squash merge，merge commit 为 `2a786f1b66fee095224214430d12e96f78a5057e`；真机和真实人声证据继续单列，不因合并或自动测试通过而冒充完成。
3. P114a 已在本地实现 `ActivityDefinition` / `ActivitySession` / `AnalysisEvidence`、单音听辨真实迁移和 M0 脱敏只读/受控动作接入点，当前仍待完整检查、PR 与 CI；这不是完整 P114，也没有伙伴 UI。其余活动、乐谱、歌曲和 provider 契约按后续完整切片继续汇合。
4. P115–P118 教学泳道与 S（制谱/OMR）、A（伴奏/歌曲）、必要 C（云端/内容/教师）泳道按依赖滚动；钢琴 P106–P110 只补真实体验和证据缺口。
5. P119/Q 必须汇合算法、钢琴、教学、制谱、伴奏、云服务、教育和目标用户验收；P120 只是八产品范围明确的专业私测候选，不是公开最终版。
6. V1-03 / V1-02 / V1-15 Web 数据生命周期继续是正式 Web 责任；最终产品同时建设本地与中国区合规云端能力，当前离线优先不是终局。

完整长期范围见 `docs/eight-product-unified-competitive-roadmap-2026-07-18.md`，P113 之后包含伙伴系统的滚动执行顺序见 `docs/unified-development-roadmap-with-ai-music-companion-2026-07-18.md`；旧执行路线与 P112 后暂停交接保留为历史依据，当前执行事实以本矩阵和 `docs/mvp-status.md` 为准。

每次状态更新必须附真实证据链接或仓库文件；不能用“代码看起来支持”“计划完成”替代执行结果。
