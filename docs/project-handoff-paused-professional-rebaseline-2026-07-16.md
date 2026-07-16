# 视唱练耳项目交接：专业竞争力重定标后暂停

交接日期：2026-07-16

状态：**PAUSED / 用户明确要求不继续开发**

项目：`aaaycc931-droid/my-first-app`

当前载体优先级：面向中国用户、可私下传递、断网可用的 Android APK

## 1. 新对话先知道的结论

项目没有完成最终版，也没有停止维护。当前主动暂停在“专业竞争力路线已经重新规划、下一轮运行时开发尚未开始”的位置。

最新功能截止点是：

- P95–P103 已完成开发、测试、PR、CI 与合并；
- P104a Android 算法与真机证据硬门禁已合并到远端 `main@bd5f7a372cca4d45f487f160f58af6d51ddedcbf`，PR #355；
- P104 真实人声、三档 Android 和双教育审核证据仍未完成；
- 本次只增加专业对标路线、状态和交接文档，没有实现 P106，没有修改运行时、UI、算法、题库、依赖、Android 工程或版本；
- 原 P105“第一代最终候选”已暂停，恢复后先执行新的 P106–P120 专业竞争力路线。

最新已核对的 CI 下载物来自 Quality run `29506289574`、artifact `8378704101`：

- APK：`solfeggio-local-test-v0.2.0-debug.apk`
- versionName / versionCode：`0.2.0` / `2`
- APK SHA-256：`ecb9801dc6b5b4cf566e80f60efa4bd8cdf6acefa4dc70db332fa3f2f073a9a1`
- ZIP SHA-256：`0ef5e7ed59f95337ed113142a0761625c30dbfc9e05c8a99462522c4d6bf163f`
- 签名：Android Debug，不是稳定 release 签名；真实手机安装/音频/延迟不因 CI 成功而自动通过。

## 2. 最新产品决策

1. 钢琴不能停留在三角波参考音，功能性与专业性至少对标 Perfect Piano 一类成熟移动钢琴的核心演奏能力。
2. 录音停止/提交后必须在本机执行比实时监听更严格的高精度分析；当前保存的 `autocorrelation-realtime-v1` 曲线不是专业后处理。
3. 视唱、练耳、节奏、声乐练习、课程、定制、统计和自适应的能力域与专业闭环以 EarMaster 一类完整训练系统作为参照。
4. 对标只参考能力与质量门槛；不得复制竞品 UI、音色、曲库、题目、课程文案、图标或品牌。
5. 社区、公开分享、排行榜、聊天室、公会、公开曲库、支付和应用商店准备仍不属于当前路线。
6. Android 核心必须离线，不依赖 Vercel、Supabase、生产域名或远程 `server.url`。
7. 未通过数据集、置信度校准和教育审核的能力继续显示非评分反馈，不得冒充正式成绩。

完整路线见 `docs/professional-competitive-roadmap-perfect-piano-earmaster.md`。

## 3. 当前真实能力，不要误报

### 3.1 钢琴

已经有独立页和四类练习内嵌入口、三个 13 键音域、最多 8 音、音量、延音、全停、错误重试和行为测试。声音仍由 Web Audio `triangle` 振荡器生成，不是真实钢琴采样；没有完整 88 键、力度层、多音色、录音、节拍器联动、USB MIDI、MusicXML 学习或专业真机低延迟证据。

### 3.2 音准与录音

已经有用户主动开启的实时音高、曲线、目标音块、录音/停止/回放/丢弃、本机保存/删除/导出和探索性音域/波动/周期/尾音观察。生产记录算法版本为 `autocorrelation-realtime-v1`。现有 Pitchy/McLeod 只在 comparison harness 使用，没有进入生产录音后处理。录音停止后没有独立高精度 PCM 重分析、音符分段、目标对齐或专业误差报告。

### 3.3 练习系统

Android 有单音、上/下行音程、四拍节奏和三音旋律听写的三难度本地题库、错题复练，以及单音/音程/大调音阶/五声音型/主和弦音型练声。它仍缺少 EarMaster 级的和弦/转位/进行、音阶/调式听辨、节奏视读/回模/找错/听写、旋律谱面听写/回唱/视唱、统一定制、完整课程、详细统计和可解释自适应。

## 4. 恢复开发后的第一步

不得重新开始，不得直接制作 P105 最终包。恢复后按以下顺序：

1. 从远端最新 `main` 建立新分支；先确认本交接文档已合并。
2. 读取全部必读文档，核对正式 DoD 与状态矩阵。
3. 建立滚动计划，优先并行启动：P106 专业音频/采样 provider、P111 专业音准数据与基准协议；接口冻结后启动 P114 统一活动模型。
4. 钢琴、音准、教学和发布工程可以多代理并行，但每个 PR 必须是一个完整切片；任务结束立即释放槽位。
5. 每个切片执行“实现 → focused tests → 完整检查 → 提交 → 推送 → PR → CI → 审查 → 安全合并 → 下一优先级”。

## 5. 用户的固定开发习惯与授权边界

以下要求应作为新对话默认工作方式：

- 使用 Fast Track + Strict Complete Mode；优先可运行、可测试、有用户价值的完整 vertical slice，避免大量低价值 docs-only 或只加一个按钮的小阶段。
- 普通技术选择、模块拆分、算法候选、依赖更新、测试修复、提交、PR 和安全合并由 Codex 自主决定，不反复询问用户。
- 用户明确要求时使用多线程/多代理；并行拆分必须边界清楚，共享仓库时避免冲突，子任务结束立即释放槽位并接下一任务。
- 不在一个小功能、提交、PR、CI 或阶段检查后虚假声称“仍在继续”然后结束；若任务要求持续执行，应保持实现/测试/合并/下一优先级循环，直到完成条件或真正外部硬阻塞。
- 只有真实手机操作、用户登录授权、密钥所有权、教育专家审核、合法样本/数据或其他无法由 Codex 替代的事项才算外部硬阻塞；暂停时一次性给小白可执行的最少步骤。
- 所有用户可见 UI 默认使用简体中文；英文仅用于代码、测试、内部说明和 Hz/BPM/MIDI/WAV/OMR 等必要缩写。
- 所有自动识别、生成和分析结果必须经过“预览 → 检查 → 修改/确认 → 再进入练习”。
- 未校准能力不得叫正式评分、准确率、等级、通过/失败、专业识别或最终目标；低置信度必须拒答。
- 明确区分本地测试、源码审查、浏览器 QA、GitHub CI、Android 构建、真机 APK QA、数据集基准和教育审核，不得声称执行了未执行的检查。
- 音频、录音、回放、清除/重置、练习目标、评分样行为、账号/上传/云端和核心流程变更使用 strict QA；docs-only 为 none。
- 变更前保护用户已有工作和仓库安全，不做破坏性 reset，不提交密钥、数据库密码、私人录音、身份信息或本地证据文件。
- 项目面向中文视唱练耳学习；五线谱识别是练习输入，不是孤立 OCR；私人歌曲是未来补全，不扩展为社区。

## 6. 新对话必读顺序

1. `AGENTS.md`
2. `docs/final-release-definition-of-done.md`
3. `docs/final-release-status-matrix.md`
4. `docs/mvp-status.md`
5. `docs/android-apk-release-plan.md`
6. `docs/android-offline-professional-product-roadmap.md`
7. `docs/professional-competitive-roadmap-perfect-piano-earmaster.md`
8. 本交接文档
9. `docs/sight-singing-ear-training-feature-detail-map.md`
10. `docs/private-cloud-song-practice-pipeline-plan.md`

涉及五线谱/OMR 时额外读取 `docs/sheet-music-to-practice-target-mvp-plan.md` 和当前阶段 acceptance criteria。文件不存在时必须明确说明，不得凭空推断。

## 7. 可直接发送给新对话的接续指令

```text
全面接管我的视唱练耳项目，但当前先读取状态，不要重新开始。

从远端最新 main 和 docs/project-handoff-paused-professional-rebaseline-2026-07-16.md 记录的截止点继续。开始前依次读取 AGENTS.md、正式版 DoD、状态矩阵、mvp-status、Android APK 路线、专业竞争力路线及全部项目必读文档；如文件或远端状态不一致，先如实报告。

项目当前暂停于 P104 证据门禁已合并、P106 尚未开始。恢复开发后采用 Fast Track + Strict Complete Mode 和多代理滚动计划，优先并行 P106 专业音频/采样钢琴基础与 P111 专业音准数据/基准协议，接口冻结后推进 P114 统一练习活动模型。钢琴核心能力对标 Perfect Piano 一类成熟移动钢琴，录音提交后的本地音准分析和视唱练耳活动/课程/反馈对标 EarMaster 一类专业系统，但不得复制任何竞品资产、界面、课程或曲库。

保持简体中文、Android 核心离线、非评分诚实边界、自动结果先检查确认、真实 QA 分层和仓库安全。普通技术选择自主决定。按“实现 → 测试 → 提交 → 推送 → PR → CI → 审查 → 安全合并 → 下一优先级”持续推进；只在最终交付完成或必须由我处理的真实外部硬阻塞时结束。
```

如果用户只是询问状态而未明确要求“恢复开发”，新对话不得自行开始 P106。

## 8. 本次规划文档验证记录

- `git diff --cached --check`：PASS；
- `npm run check`：PASS（ESLint、TypeScript、Android 版本来源、移动构建、本地 Android bundle 校验与 Next.js 生产构建全部通过）；
- 本次范围：8 个文档/入口文件，未修改 runtime、测试、依赖或 Android 资源；
- `npm run validate:local`：音高 synthetic gate 与 Dev OMR boundary 通过，随后在既有 `validate:repository-hygiene` 失败。失败项全部是本次未修改且已被当前 Android 工程正式跟踪的 Manifest、资源 XML、应用图标和启动图，以及移动端图标；这是校验器尚未适配 Android 正式资源的既有冲突，不是本次文档引入的新文件；
- 不得把上一条记录写成完整 `validate:local` 通过，也不得在本次 docs-only 任务中顺手修改校验器；恢复运行时开发后应单独建立边界清楚的维护切片修复该规则。
