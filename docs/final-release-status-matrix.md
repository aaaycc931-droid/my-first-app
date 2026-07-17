# 正式版 V1 状态矩阵

最后更新：2026-07-17
规范来源：`docs/final-release-definition-of-done.md`

本文件只记录可验证的当前状态。`IN_PROGRESS` 不等于失败，也不得对外宣称正式完成；状态必须随合并和生产证据更新。

## 1. 总览

| ID | 领域 | 当前状态 | 已有真实证据 | 距离 PASS 的主要缺口 |
| --- | --- | --- | --- | --- |
| V1-01 | 范围与规范 | PASS | 正式版 DoD、范围分层、退出条件 | 后续变更必须走范围变更记录 |
| V1-02 | 账户与会话 | IN_PROGRESS | Supabase Auth、邮箱 magic link、资料读取/更新、生产浏览器 QA | 密码登录、退出/恢复全矩阵、异常邮件路径 |
| V1-03 | 数据导出与删除 | NOT_STARTED | 数据模型有 deletion request 草案 | 用户入口、导出包、级联删除、24h SLA、端到端演练 |
| V1-04 | 系统课程与题库 | IN_PROGRESS | 基础课程；单音、音程、节奏持久化；Android 四类听辨已有三难度、每档至少 20 个版本化组合 | 基础视唱、课程三难度与进度、教育审核；Android 难度仍待审核校准 |
| V1-05 | 视唱与录音闭环 | IN_PROGRESS | Web 本地录音/回放；Android 实时曲线、录音、目标/分段反馈、本机记录与 P103 探索性观察；P103 两个 CI job PASS | 正式课程/自动分句/云端记录、P104 真机同步/延迟/录音设备矩阵 |
| V1-06 | 节奏练习与反馈 | IN_PROGRESS | 节拍器、tap/onset、延迟校准、DP 对齐、课程节奏听辨 | 真实数据基准、录音闭环、长期记录与复练 |
| V1-07 | 钢琴辅助 | IN_PROGRESS | Android 独立页与四类练习内嵌入口；P106 已建立统一音符事件、32 音 voice allocator、版本化采样/兼容音色 provider、有界缓存、许可 manifest 与纯状态/真实挂载测试 | 默认仍是明确标注的 `triangle` 兼容音；缺合法专业采样音色、88 键、运行时 ≥32 复音、完整移动交互、录音/节拍器/循环、多音色、USB MIDI/MusicXML 学习链路和三档真机低延迟证据 |
| V1-08 | MusicXML/MXL | IN_PROGRESS | parser、fixture、dev import、草稿与临时目标链路 | 正式用户入口、编辑确认、错误恢复、私有持久化 |
| V1-09 | 图片/PDF OMR | IN_PROGRESS | mock flow、Audiveris fixture/runner 研究基础 | 隔离 worker、私有上传、真实 OMR、草稿编辑、失败恢复 |
| V1-10 | 私有音频素材 | IN_PROGRESS | 浏览器本地导入、decode、音高曲线草稿、检查与临时目标 | 私有上传、worker、保留/删除、任务恢复、版权说明 |
| V1-11 | 私有云任务 | NOT_STARTED | 数据模型和架构蓝图 | Storage、队列 worker、取消/重试、审计、配额和运行手册 |
| V1-12 | 学习历史与复习 | IN_PROGRESS | 私有 practice attempts、课程答案摘要；Android 本机最小错题队列，以及用户主动保存的练声曲线/可选录音记录（均非正式学习历史） | Web 历史 UI、技能画像、解释型跨会话 review queue；Android IndexedDB、跨版本/跨重启和配额真机验证 |
| V1-13 | 音高算法基准 | IN_PROGRESS | 合成 fixture、真实声音计划、确定性测试、P104 13 项硬门禁评估器；实时生产记录为 `autocorrelation-realtime-v1`，Pitchy/McLeod 仍仅用于 comparison harness | 录音提交后尚无独立高精度重分析；仍缺 200 合成/乐器、100 真实人声/20 位/4 类设备最低证据，以及专业扩展集、多引擎、分段/目标对齐、量化结果和专家审核 |
| V1-14 | 节奏算法基准 | IN_PROGRESS | DP 对齐回归、tap/onset/latency 测试 | 真实设备/人声/乐器集、量化报告、低置信度校准 |
| V1-15 | RLS 与最小权限 | IN_PROGRESS | P78 最小权限；P84 生产 RPC 和跨用户事务 smoke QA | 覆盖所有 owner tables、Storage、签名 URL、删除后访问 |
| V1-16 | 性能与可靠性 | NOT_STARTED | 生产构建和常规 CI | 14 天窗口、真实用户指标、音频延迟、长循环/内存测试 |
| V1-17 | 可访问性 | NOT_STARTED | 语义化控件的局部实现 | 目标等级全量审计、键盘/屏幕阅读器、对比度与缩放证据 |
| V1-18 | 浏览器与真实设备 | IN_PROGRESS | 多次桌面 Preview QA；历史移动端 magic-link/播放 QA | 固定矩阵、2 台 iOS + 3 台 Android APK、麦克风/录音全流程 |
| V1-19 | 备份、恢复与回滚 | NOT_STARTED | Git/Vercel 可回退；迁移有局部事务验证 | 数据库恢复演练、RPO/RTO、不可逆迁移策略、30 分钟演练 |
| V1-20 | 观测与事故响应 | NOT_STARTED | GitHub Actions、Vercel 状态 | 错误追踪、指标、隐私日志、告警接收人和故障手册 |
| V1-21 | 内容与教学审核 | NOT_STARTED | 中文题目、答案解释和难度草案 | 2 名教育审核者、题量/正确率/难度递进验收 |
| V1-22 | 用户可用性验收 | NOT_STARTED | 开发与所有者 QA | 5 名目标用户、核心任务成功率和误解检查 |
| V1-23 | 发布证据包 | IN_PROGRESS | P103 run `29505316896` 两个 job PASS，artifact `8378264201` 的 APK SHA-256 与 ZIP digest 已核对，C1 已 PASS | P104 真实数据/设备/教育证据；删除/恢复与用户验收证据 |
| V1-24 | Android 本地 APK | IN_PROGRESS | 离线三难度题库、实时曲线/录音/目标/观察、本机记录/复练与钢琴；P103 APK SHA-256 为 `389412852bfde6a0628be381f82eb5154b15682cfd8c70b56543a461581f769b`。 | P104 三档真机/真实人声；专用签名、升级与前向回滚 |
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

## 3. 当前最高优先级

产品所有者已于 2026-07-17 明确恢复项目。当前依赖顺序如下：

1. P106 专业音频/采样 provider 基础正在执行；完成合并后进入 P107。P111 专业音准数据/基准协议可独立启动；P104 最低真实证据继续保留，不能用路线文档替代。
2. P107–P110 完成 88 键专业采样钢琴、移动交互、录制/节拍器/循环、多音色、USB MIDI 与 MusicXML 学习链路。
3. P112–P113 完成录音提交后的本地高精度分析、音符分段、目标对齐和可解释非评分反馈。
4. P114–P118 完成统一活动协议、EarMaster 能力域对应题型、中文课程、定制、统计和可解释自适应。
5. P119 汇合算法、内容、教育和目标用户验收；P120 才能重新进入稳定签名 Android 私测候选。
6. V1-03 / V1-02 / V1-15 Web 数据生命周期继续是正式 Web 责任，但不阻断本地 APK 的离线专业实现。

完整路线与竞品边界见 `docs/professional-competitive-roadmap-perfect-piano-earmaster.md`；最新暂停点和新对话习惯见 `docs/project-handoff-paused-professional-rebaseline-2026-07-16.md`。

每次状态更新必须附真实证据链接或仓库文件；不能用“代码看起来支持”“计划完成”替代执行结果。
