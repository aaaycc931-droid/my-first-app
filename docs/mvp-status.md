# MVP / Android 私测当前状态

最后更新：2026-08-01

本文件是当前可验证状态总账，不再作为逐次运行日志无限追加。历史细节保留在 Git 提交记录、PR 与 Actions 中。

## 当前基线

- 最新已合并产品功能基线：S3 MusicXML/MXL 属十三和弦严格 round-trip / PR #506，合并提交 `6631496fadaa113b2aebac43176dd3c8a6b97478`
- 最新已合并 UI 边界切片：本机复练队列 repository 注入 / PR #505，合并提交 `fa037a7395e0d78b22599e22802e428ac067e301`
- 最新已合并可靠性切片：课程库加载最长等待 10 秒后失败关闭并显示既有错误 / PR #507，合并提交 `a43b323bb14678990cdcb4111c3969cf5fc66f76`
- PR #505 Quality run `30695255092`、PR #506 Quality run `30695503131`、PR #507 Quality run `30695628301` 与 PR #508 Quality run `30696194007` 的 `quality`、`android-local` 均成功且 Vercel Ready。这些自动门禁不替代 main provenance、真实浏览器完整矩阵、Android 真机、第三方 MusicXML、可访问性、教师或目标用户证据。
- 最新已合并交换安全加固：MusicXML/MXL note 容器 fail-closed / PR #477，合并提交 `27ae5dff483afa0437b75e1bde0dd091c165bd12`
- 最新已合并证据准备基线：P119c / PR #419，合并提交 `de9ab7f9a6d050a951e70835fbe97cecc693b9f4`
- 最近仓库维护：PR #464 清理 323 个已完全合并的远端工作分支；其余分支因未合并或仅能映射到 squash PR 而保留，不能仅凭祖先关系删除
- 最新本地验证链维护：PR #508 合并为 `4add2a71b566d91723df41e18627d792fff37b88`；本地 `check` 现在先复用 `android:sync` 生成并同步 Android Web assets，再运行 `validate:android-local`，修复 clean worktree 中 validator 可能读取不到已同步资产的缺口。该维护不新增产品能力，也不改变任何外部 QA 结论
- 外部 QA 的统一 `NOT_EXECUTED` 分类、最小证据字段和不可替代边界见 `docs/external-qa-not-executed-matrix-template.md`；2026-08-01 云 Chrome 只形成部分自动化 browser smoke，未关闭 EXT-B，模板与自动门禁入库也不把任何外部项目改写为通过
- 仓库当前提交以 GitHub 默认分支为权威；本文件不硬编码会因自身合并而立即过期的“当前 main SHA”
- P115a–P115i 已合并；当前没有接续中的 P115 PR
- 早期遗留 PR #217、#114、#113、#112、#69、#68 不属于当前路线，本轮不修改、不接续

## 已交付的当前纵向能力

- P114 系列建立 Activity 协议、离线麦克风 `AnalysisEvidence`、复练队列、本地学习画像、Android 生命周期与本地存储边界。
- P115a–P115f 覆盖三和弦、和声进行与终止式、音阶与调式、七和弦性质与转位、七和弦排列、调制听辨。
- P115g 提供统一的本地练习自定义器，覆盖现有 10 类 Android 离线练耳。
- P115h 提供音程大小／方向比较，以及明确标注为非评分的模唱反馈。反馈只表达接近、偏高／偏低或证据不足，不表达等级、通过／失败或专业声乐评价。
- P115i 提供和声进行中的低音运动、共同音与声部进行线索，并把解释限制为题目内可验证的音乐结构信息。
- P116a 提供四四拍可见节奏目标、一小节预备拍、屏幕 tap、八样本当前会话校准和逐拍非评分反馈；外部真实设备与教育证据仍延后到第一版内部测试发布后。
- P116b 提供隐藏目标的本地节奏回模：完整听题后才解锁预备拍与屏幕 tap，结束后揭示逐拍非评分反馈；重听、停止、后台与迟到计时器均 fail closed。
- P116c 提供内置节奏找错：对照可见目标听一处确定性事件变化，完整播放后标记漏掉／拆分／合并／位移及位置；答案只解释题内事件差异。
- P116d 提供本地节奏听写：完整听题后在固定拍内网格编辑草稿，预览并检查结构，明确确认后冻结为 `score-document-v1` 节奏修订，再显示漏记／多记的非评分事件对照；任何修改、重播、停止或生命周期中断都会让旧检查与确认失效。
- P117a 提供三音旋律听写的屏幕钢琴 Activity 答案：只有完整播放隐藏旋律后才允许明确开始接收三个有序 `note-on`，重复音、F♯4 与 C5 身份无损保留，检查后只显示逐位置非评分对照；非屏幕钢琴来源、迟到事件和已作废 attempt 均失败关闭。
- P117b 提供三音旋律听写的受控五线谱答案：完整听题后编辑三个有序谱位，经预览、结构检查、修改／重新检查与明确确认，冻结为会话内 `score-document-v1` 后才提交 Activity `staff-notation` 答案并显示逐位置非评分对照；C4 下加线、F♯4 升号、C5 与重复音身份均保留。
- P117c 提供固定 C 为 1 的受控简谱答案：真实显示 F♯4 左侧升号与 C5 上方高音点，canonical note id 与显示 token 分离；经预览、结构检查、修改失效、明确确认和文档冻结后才提交 Activity `numbered-notation` 并显示逐位置非评分对照。
- P117d 提供隐藏三音旋律回唱：完整听题后主动启用麦克风，以共用版本化时间线完成四拍预备、录音、完整回放与真实 analysis run，再提交 Activity `melody-imitation` 非评分证据；听写／回唱结构互斥，录音零点、生命周期、权限、Recorder、回放和解码错误均失败关闭。
- P117e 提供可见目标三音旋律视唱：五线谱与固定唱名从本轮开始可见，不播放完整答案；用户按四拍预备完成会话内录音、完整回放、二次确认和 P112/P113 离线分析，再提交 Activity `melody-sight-singing` 非评分证据。可见表示、timed target、count-in、录音与 analysis run 严格绑定，且与 P117d 隐藏目标状态机隔离。

## 当前开发边界

- P118a implementation candidate 已通过 PR #403 合并为 `8a31126cfd993ee7f150e0fbe17b1ddaf9b54d5b`；状态同步已通过 PR #405 合并，存储失败关闭修复已通过 PR #406 合并为 `f0c0810acb6e4417329466bcc13decc607589c92`。PR #406 Quality run `29905841378` 的 `quality` 与 `android-local` 均成功。真机、教师和目标用户等外部证据仍为 `NOT_EXECUTED`。
- P118b implementation candidate 已通过 PR #407 合并为 `03a94882d870ed11339efb727558e74be00f876f`；PR Quality run `29927839993` 的 `quality` 与 `android-local` 均成功，Vercel Ready。它只消费学习画像当前保留的最近 48 条事件，提供 7 天、30 天、全部记录窗口并按练习方式／题目族聚合“记录动作、已核对、开始复练”；完全忽略 `outcome`，不新增持久化或网络能力。
- P118c implementation candidate 已通过 PR #409 合并为 `55093e4d1004bc97408f45ef0e2a26a2adee6c0b`；PR Quality run `29970087207` 的 `quality` 与 `android-local` 均成功，Vercel Ready。它复用既有最多 12 项的本机复练目标，按题目族分组并保持原 MRU 顺序；队列保存失败时保留旧 UI，不读取 `outcome`，不生成能力评级或推荐排序。
- P118d implementation candidate 已通过 PR #411 合并为 `ae954bb3cd753304af7095565abaa4974a7e0790`；PR Quality run `29977194615` 的 `quality` 与 `android-local` 均成功，Vercel Ready。它固定复用现有 MRU 复练队列首项并显示来源事实，不读取 `outcome`、画像计数或 P118b 统计；损坏存储跨重启失败关闭，画像重置 save-first。
- P118e implementation candidate 已通过 PR #413 squash 合并为 `88667e0ad05d4672915008f7cf0e3eb63c2fce76`；PR Quality run `29984984760` 的 `quality` 与 `android-local` 均成功，Vercel Ready。它以中文“本机学习总览”分别读取 P118a 课程进度、P118b 当前保留的最多 48 条练习动作事实、P118c 精确复练队列和 P118d 可解释建议；各来源独立失败关闭，不跨来源推导或新增协议。
- P119a 已通过 PR #415 合并：它盘点当前 10 类本机生成题型的三档稳定变体，冻结同 commit 自动门禁与双教师六维审核协议，并保持教师身份、资质、签署与逐题记录不入 Git。
- P119b 已通过 PR #417 合并：`chord-inversion / 基础` 与 `harmony-progression / 基础` 均从 8 个 append-only 扩到 20 个稳定移调组合，原前 8 个 ID、基础答案概念与进阶／挑战题库保持冻结；catalog/review queue 已升至 v10 并无损迁移真实 v9 目标。
- P119c 已通过 PR #419 合并为 `de9ab7f9a6d050a951e70835fbe97cecc693b9f4`：它冻结 P119b source commit `bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1` 的 catalog v10 清单，包含 30 个盘点组、1,855 个题目 review item、1,924 个 representation、3 个课节及 18 个真源文件摘要；canonical manifest SHA-256 为 `b8430559e1fc3f102f8f9fce1158b473ea199e4c7f8fec9fef607b0ef42da8a1`。
- 当前 30 个自动盘点组达到 V1 每档至少 20 的数量前置，审核清单也已可复核。产品所有者已确认两名独立教师在仓库外完成资质核验并分别签署，原样批准 P119d 的 30 层各 5 项、全部 3 个课程项和共 153 个 item ID；5 组跨难度相同 variant 保留为难度递进配对审核项，不视为独立统计样本。获批批次继续冻结，逐题六维双教师审核延期到正式推广测试启动时；finding 闭环、专业 40 目标、教育有效性与完整 P119/Q 仍为 `NOT_EXECUTED / BLOCKED`。
- P118a 只消费现有 Activity、复练队列和学习画像协议，不创建平行答案或能力协议；旧数据必须安全迁移或 fail closed。
- P118a 不生成正式能力评级，不上传课程数据，不新增账户、云端、数据库、网络依赖或 `INTERNET` 权限。P118e 只整合 P118a–P118d 已有视图与入口，不把课程、统计、复练或推荐合并为新的评分、画像或存储协议。
- P117e 已形成合并后的 implementation candidate。QA level recommendation 为 strict；P117d 与 P117e 的 Browser 真麦克风、Android 三档真机、真实人声、双教师和目标用户证据仍为 `NOT_EXECUTED`，不能由模拟录音、DOM、CI 或 APK 替代。

## 最近权威验证

| 切片 | PR | 合并提交 | Actions 运行 | Android 工件 | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| P115h | #387 | `4078b8e5d9fe0d3253b3b0f4feba16ede28eae2d` | `29735449550` | `8458140032` | `393ea982bd80fe2e34ca7e66b52ecc7a3e142d66c6e856fcb59c7efe2f890a12` |
| P115i | #388 | `397d2ecfb8d1180100b5e1e1e1820ae25ce2b8d7` | `29736262953` | `8458458938` | `b665ad4de31175a8f288ce0442a6610d31fff1778c1366cff077d4a9af751013` |
| 状态清理 | #389 | `cd2c883d12030a1b1440e968e235d44f55d3a50b` | `29740400363` | `8460154570` | `4c0bb0beb440fcb60c9542c97c8ebc8a17a10856b6ee0a4ee0bbddd8314973a8` |
| P116a | #391 | `64fa9c51814d038a27ac143d997cd2034e5e51cc` | `29750272218` | `8464262134` | `c1e49add8ad111e2a2753772d65eef96f7c8df6440f601251540c496b2bde06f` |
| P116b | #392 | `8eabaf81a4716aee81bf83127edd601af094270d` | `29751993875` | `8465008540` | `61c2dbe3917fec5a4ba7675eaf8e2f48c50ab6e77521ef2101ae45454bbea90a` |
| P116c | #393 | `952663f32f654a15d68ed68fd21ecac1f6cc46c6` | `29753124523` | `8465498909` | `5852c436d4ca93f7a4871111d24612a81e6aa7ae48866b50c8393ea3b8b7074e` |
| P116d | #394 | `4260fafc420e913b4df73d48b7f0b7f0bc1d3d6f` | `29801843536` | `8484048509` | `c379244f6e9ee393d088528457f20b5487048ed2182a39a50d5e48f00abb078b` |
| P117a | #395 | `9bcba3c533503d8cf50d6105471ba67f1f6d3f43` | `29809682809` | `8486945545` | `ee9cb33b41fcd6dba075ccc3548b86948f1328a5837b2d7a4beb8352da8b025b` |
| P117b | #396 | `3455052a65a42841cbab76e83fc0abe5ad7b74e9` | `29830492176` | `8495101348` | `587780402d5a339f968dc58c20f27adac23ef67f4ffdef8e2c35dda77955b477` |
| P117c | #397 | `046da82f7a7ec1fe670e11c77c851c13caf6e7c0` | `29887214619` | `8516958894` | `41221b560e6af280e4167aee276d8bfaf39a4a5d26702f2d6b473b09ef27a501` |
| P117d | #398 | `37bd4c6aa2f094611abe661168188b4b921465de` | `29894710668` | `8519558587` | `29bb8cad6858ffeee304d0634a1ac682e9e6259e5419f99ff08e8deab34c5aa9` |
| P117e | #399 | `c2fc6a8943c9c432c850f3d0c89455b378c2cdd5` | `29896738992` | `8520299089` | `f769801fda8b9667bb150092bf6f70cfad571ed694bde42197300b738d1b6345` |
| P118b | #407 | `03a94882d870ed11339efb727558e74be00f876f` | `29927839993` | `8532782097` | `fb7d196eb38331202424f9a978e5cdceb5e449b5c731b3135ab3870215977e26` |
| P118c | #409 | `55093e4d1004bc97408f45ef0e2a26a2adee6c0b` | `29970087207` | `8549340247` | `af8c36ddebe4f9df6ab7131aacdbeec1a4ec96b7b5b65f9517ff8bfd487d9d72` |
| P118d | #411 | `ae954bb3cd753304af7095565abaa4974a7e0790` | `29977194615` | `8551900883` | `91c9d27f72ebd1338c773e3d30b7e01be1aa8d8bc930c46f77cbd46c4f6369f1` |
| P118e | #413 | `88667e0ad05d4672915008f7cf0e3eb63c2fce76` | `29984984760` | `8554678659` | `27c3e420f85623b1159e59d016873132b70317ff0d6962a48ecafca0e5b1622a` |
| P119a | #415 | `28a448faf1f387a1c7f394f5baac6a2a7dbc4eac` | `29999854528` | `8560553741` | `c5f87c7f4c238bb7337aebbfdc3478515125768424495ce1c697d09845fe9ec3` |
| P119b | #417 | `bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1` | `30001642941` | `8561272610` | `37e2f318ebf8330c11faeeaf4bb0fa9d401cc2a14307a8a3ebb7fd6f30f22efb` |
| P119c | #419 | `de9ab7f9a6d050a951e70835fbe97cecc693b9f4` | `30006334599`（main push） | `8563190826` | `e282b857aff76ecdcf580d29283f2a490e08c0c1b346a88ba9c705a03ec28103` |
| S3 挂二和弦 | #485 | `d53f0f0e2d534666203d36fc1ef5b9e04db8594e` | `30608800398`（main push） | `8784653291` | `cf305c5a0df0215802924ebaf7773c8d394a951c0b17424fda4ff93bdb7821b7` |
| S3 强力和弦 | #487 | `b07f2ff6ec340bbe883863c5f3e7207afb664631` | `30613766987`（main push） | `8786540817` | `2aed797842661680dd6cc788efbabb9c17cd332f08ad15002052846ae3e9f2a1` |

上述列出的运行其 `quality` 与 `android-local` 均通过；P117e 合并后的 main Quality 运行 `29897075998` 也通过。P119c PR head `a6e3a655197795cdbd03badbebd5dbf82370c5fe`、PR synthetic merge `af16593bd2c2d67bec46677fe571621f14066595`、main squash commit `de9ab7f9a6d050a951e70835fbe97cecc693b9f4` 与 manifest source commit `bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1` 是不同 provenance。表中 SHA-256 是 GitHub artifact ZIP digest，不是 manifest 摘要或 ZIP 内 APK 摘要；Android 工件是 CI 构建并独立校验的 API 36 Debug APK，它只证明自动构建与校验通过。

## 产品与证据边界

- 本地优先、离线、隐私最小化；练习录音不上传，不增加账户、云端或数据库依赖。
- 麦克风权限拒绝、陈旧 attempt、迟到分析、清除／重录和生命周期变化必须 fail closed。
- 自动测试、模拟音频、挂载行为测试与 CI 不得宣称为 Android 真机、真实人声、教师审核或教育有效性证据。
- 当前非评分反馈不是诊断、等级、通过／失败判断，也不是专业声乐评估。

## 尚未闭环的发布阻塞项

- 双教师校准与教育审核尚无真实签署证据。
- Android 真机、真实人声、权限与生命周期场景仍需受控实测证据。
- 目标用户可用性与私测反馈尚未形成完整证据包。
- 正式签名、私测分发、回滚与发布批准尚未闭环。

这些项目不能由 CI 或模拟测试替代；在真实证据入库前必须保持未完成状态。

## 维护规则

- 每个 PR 边界清晰、可验证、可回滚。
- 小改动先运行 focused tests；合并前运行完整 `check`、Android sync／validator，并以 GitHub `android-local` 为 APK 权威门禁。
- 状态更新只记录已验证事实，并附 PR、提交、运行与工件标识；不得粘贴被截断的工具输出。

## S2 本机谱项目接续（GitHub 权威状态）

- PR #448 已合并：`score-document-v10` 与 `local-score-project-storage-v11` 的 canonical 力度记号切片，事件起点 `dynamicMark` 支持 `pp`、`p`、`mp`、`mf`、`f`、`ff` 或 `null`，note/rest 均可承载。
- 旧 storage v1–v10、document v1–v9 及 undo／redo 历史只读迁移为 `dynamicMark: null`；当前版本严格拒绝缺失或非法字段。
- 五线谱与固定 C 简谱读取同一字段；当前仅显示，不改变 velocity、gate、duration、timbre、timeline、span、warning 或真实播放效果。
- 专项测试、受影响的存储／恢复／容量／播放／移动端预览与 transport 回归、lint、typecheck 和 Quality 注册已通过；PR #448 的 Quality 与 android-local 也已通过。浏览器手测、Android 真机、真实力度播放和教师审核仍未执行。

### 制音踏板切片

- PR #449 已合并：`score-document-v11` 与 `local-score-project-storage-v12` 的事件起点 `damperPedalMark` 支持 `down`、`up` 或 `null`，note/rest 均可承载。
- 旧 storage v1–v11、document v1–v10 及 undo/redo 历史只读迁移为 `null`；当前严格校验。
- 当前分支已接入 domain、迁移、复制粘贴、两种谱面显示、Mobile 编辑、playback/transport 类型兼容和专项测试；后续 S3 严格子集已补 note/rest 事件起点 `down/up` 与紧邻 pedal `start/stop` direction 的仓库内部 MusicXML/MXL 双向 round-trip。真实踏板播放、MIDI CC64、真机、教师审核和第三方阅读器验证仍为 `NOT_EXECUTED`。

### 延长记号切片

- PR #451 已合并：`score-document-v12` 与 `local-score-project-storage-v13` 的事件起点 `fermataMark` 支持 `fermata` 或 `null`，note/rest 均可承载。
- 旧 storage/document 与 undo/redo 历史只读迁移为 `null`；五线谱与固定 C 简谱一致显示；playback/transport 只补兼容字段，不延长真实播放。
- PR #451 Quality run `30234487273` 的 `quality` 与 `android-local` 均成功；后续 S3 严格子集已补 note/rest fermata 的仓库内部 MusicXML/MXL 双向 round-trip。真机、教师审核、真实 fermata 播放、第三方阅读器和 MIDI round-trip 仍为 `NOT_EXECUTED`。

### 圆滑线切片

- PR #452 已合并：`score-document-v13` 与 `local-score-project-storage-v14` 的 canonical 圆滑线切片，音符以 `slurToNext` 表达到同声部相邻音符的圆滑线；休止符不得携带该字段。
- 旧 storage/document 与 undo/redo 历史只读迁移为 `false`；复制单个事件清除跨事件关系；删除、移动或修改不得制造悬空圆滑线。
- 五线谱与固定 C 简谱读取同一字段；playback/transport 仅兼容新版本，不改变真实 gate、duration 或连奏效果。main Quality run `30239260106` 的 `quality` 与 `android-local` 均成功；后续 S3 严格子集已补同声部相邻且时间连续 note 的 MusicXML/MXL 圆滑线 start／stop、跨小节和链式仓库内部 round-trip。浏览器手测、Android 真机、教师审核、真实连奏播放及 MIDI round-trip 仍为 `NOT_EXECUTED`。

## S3 标准格式接续

- S3 首个独立切片增加 MusicXML／MXL 到 canonical 本机谱项目的受控导入：本机内存候选 → 逐项 blocking ledger → 用户明确确认 → `persistNewLocalScoreProject` 原子保存 → 重开、双谱面与播放。
- 本切片只接受当前明确支持且可无损映射的元素；所有不支持、会被忽略或会改变音乐语义的元素一律 blocking，不允许静默丢失。
- `.musicxml`／`.xml`／`.mxl` 输入、2 MiB 输入限制，以及 MXL 既有的 100 entries／4 MiB 解压保护必须保持 fail-closed；容量、quota、事务和迁移失败必须保留全部既有项目。
- canonical 本机谱项目到 `.musicxml`／`.mxl` 的受控导出候选已经完成：只覆盖当前可无损重新导入的严格单 part／staff／voice 子集，先显示 blocking ledger 和摘要，用户明确确认后才触发一次本机下载。
- 当前导出 round-trip 接受全局整数 `30–240 BPM`、未分配或 GM1 program
  `0–127` 的 instrument，以及 canonical
  scoreCredits 的 title、subtitle、按数组顺序的 composer／lyricist／arranger creators
  和 rightsNotice；这些 credits 按独立 acceptance 以确定性根级顺序往返。速度确定性
  写为第一小节直接 `<attributes>` 之后唯一、空的 `<sound tempo="N"/>`，包括默认
  `90 BPM` 在内均显式输出。输入完全没有 `<sound>` 时导入默认 `90 BPM`；任何尚未
  映射的 canonical 记谱语义必须阻断，不能为了生成文件而静默丢弃。
- 谱面主标题已纳入 strict round-trip：导出总是把 `scoreCredits.title` 写为唯一 root-level
  `<work><work-title>…</work-title></work>` 并 XML escape；导入 exact 恢复该 title。为兼容
  既有受控文件，完全缺省 work-title 的导入仍使用既有确定性 fallback；仅该缺省情形可
  fallback，其他 work／credit／movement title 变体继续 blocking。
- 当前严格子集已把 canonical GM1 program `0–127` 精确双向映射为
  `score-part` 中固定相邻的 `score-instrument` 与一基 `midi-program 1–128`；
  instrument-name 必须与 part name 一致，其他 MIDI／音色语义继续 blocking。全局整数
  速度、单附点、力度、踏板、自然／单升降根音二十二类、462 个和弦组合（含
  major-sixth／minor-sixth／suspended-second／suspended-fourth／power／
  dominant-ninth／major-ninth／minor-ninth／dominant-11th／major-11th／minor-11th／augmented／diminished／augmented-seventh／
  diminished-seventh／half-diminished／dominant-13th）、
  lyric、fingering、
  articulations、fermata、slur 和 tie 的既有严格双向映射继续保留；附点真实时值、
  首事件顺序、同小节／跨小节／链式及共存语义均保持确定。其他未列出的语义继续
  blocking。
- 当前 part identity 硬化切片要求 `part-list`、`score-part`、`part-name` 与内容
  `part` 大小写精确且无 namespace；part ID 不做 trim 并 exact 配对，part-name 不做
  trim、截断或节点拼接。额外属性、comment、CDATA、processing instruction、非法 ID
  或非规范文本均在 event ID 分配前 blocking；该切片不改 schema、storage 或迁移链。
- 当前 note 容器硬化要求每个 pitched note/rest 的外层 `<note>` 大小写精确、无
  namespace 且无属性；显示、播放、时间、布局、未知或 namespace 属性及身份变体均在
  event ID 分配前 blocking。该切片同样不改 schema、storage 或迁移链。
- 自动证据由当前 importer re-import 与 legacy parser 音符交叉检查组成，均属于仓库内部验证。浏览器下载、Android WebView／真机及 MuseScore 等外部独立阅读器仍为 `NOT_EXECUTED`，不得宣称第三方兼容已经通过。
- 小六和弦独立边界见 `docs/s3-local-score-project-musicxml-minor-sixth-round-trip-acceptance.md`；该切片不改变 schema、storage version 或迁移链。
- 挂四和弦独立边界见 `docs/s3-local-score-project-musicxml-suspended-fourth-round-trip-acceptance.md`；该切片不改变 schema、storage version 或迁移链。
- 挂二和弦独立边界见 `docs/s3-local-score-project-musicxml-suspended-second-round-trip-acceptance.md`；该切片不改变 schema、storage version 或迁移链。
- 强力和弦独立边界见 `docs/s3-local-score-project-musicxml-power-chord-round-trip-acceptance.md`；该切片不改变 schema、storage version 或迁移链。
- 属九和弦独立边界见 `docs/s3-local-score-project-musicxml-dominant-ninth-round-trip-acceptance.md`；该切片不改变 schema、storage version、迁移链、UI、谱面显示或播放语义。
- 大九和弦独立边界见 `docs/s3-local-score-project-musicxml-major-ninth-round-trip-acceptance.md`；该切片不改变 schema、storage version、迁移链、UI、谱面显示或播放语义。
- 小九和弦独立边界见 `docs/s3-local-score-project-musicxml-minor-ninth-round-trip-acceptance.md`；该切片不改变 schema、storage version、迁移链、UI、谱面显示或播放语义。
- 属十一和弦独立边界见 `docs/s3-local-score-project-musicxml-dominant-eleventh-round-trip-acceptance.md`；该切片不改变 schema、storage version、迁移链、UI、谱面显示或播放语义。
- 大十一和弦独立边界见 `docs/s3-local-score-project-musicxml-major-eleventh-round-trip-acceptance.md`；该切片不改变 schema、storage version、迁移链、UI、谱面显示或播放语义。
- 小十一和弦独立边界见 `docs/s3-local-score-project-musicxml-minor-eleventh-round-trip-acceptance.md`；该切片通过 PR #502 合并。
- 属十三和弦独立边界见 `docs/s3-local-score-project-musicxml-dominant-thirteenth-round-trip-acceptance.md`；该切片通过 PR #506 合并，矩阵现为 22 类 × 21 个根音 = 462。下一交换语义仍为 `NEXT EXCHANGE SLICE UNDER REVIEW`；小十三、大十三、add11、MusicXML degree、别名、转位、改变音及其他不同语义继续失败关闭。
- 本机课程进度 repository 注入边界已通过 PR #499 合并；课程 key、schema、失败关闭、
  save-first／clear-first 与界面行为不变。浏览器 storage adapter 仍由 Android
  composition root 注入；真机跨重启、storage disabled、进程重建、可访问性和目标用户
  QA 仍为 `NOT_EXECUTED`。
- 本机学习画像 repository 注入边界已通过 PR #503 合并；既有 key、schema、storage
  version、最多 48 条事件、建议开关、save-first 与重置行为保持不变，浏览器 adapter
  由 Android composition root 注入。真实浏览器跨刷新、Android WebView／真机跨重启、
  配额／存储禁用／进程重建、可访问性和目标用户 QA 仍为 `NOT_EXECUTED`。
- 本机复练队列 repository 注入边界已通过 PR #505 合并；既有 key、schema／catalog
  version、迁移、MRU、最多 12 项、答题更新、清空确认和用户行为保持不变，浏览器
  adapter 由 Android composition root 注入。真实浏览器 storage 异常、Android
  WebView／真机跨重启、配额／存储禁用／进程重建、可访问性和目标用户 QA 仍为
  `NOT_EXECUTED`。
- 课程库加载可靠性切片已通过 PR #507 合并；加载成功和 rejection 行为保持不变，
  永不 settle 的请求最多等待 10 秒后退出 loading 并显示既有错误
  `课程库暂时无法加载，请稍后重试。`。2026-08-01 云 Chrome 部分 smoke 观察到 PR #504
  baseline `/learn` 在 2.5 秒仍加载，而 PR #507 Preview 在 11 秒显示该错误；首页键盘／
  点击模式切换及刷新保持通过，`/practice`、`/recognize`、`/account` 路由可渲染。
  这只是 `PARTIAL automated/browser smoke`，没有覆盖完整 EXT-B 固定矩阵、音频／麦克风、
  辅助技术或真实设备，EXT-B 仍为 `NOT_EXECUTED`。
- 当前和未来路线冻结能力、行为、数据兼容与证据门槛，不冻结当前页面、导航、组件树
  或视觉表达；最终 UI 重构及已知渐进抽离热点见
  `docs/final-ui-refactor-compatibility-contract.md`。该 docs-only 契约不表示 UI 重构或
  外部 QA 已执行。
- 共享实时音高组件的本机练声记录和 JSON 下载已分别改由平台无关 repository port
  与浏览器文件下载 port 注入，Web 与 Android composition root 继续使用相同
  IndexedDB 与下载 adapter；数据库／store／version、
  `schemaVersion: 1`、20 条／5 MiB／600 帧、transaction 完成语义、录音 Blob 与
  JSON 不含录音的既有契约不变。该依赖抽离边界见
  `docs/ui-realtime-pitch-local-record-storage-port-acceptance.md`；PR #496 只抽离 JSON
  下载 side effect，录音／回放编排、真实浏览器、Android WebView／真机和最终 UI
  重构仍为 `NOT_EXECUTED` 或未完成。
- 导入边界见 `docs/s3-local-score-project-musicxml-import-acceptance.md`，导出边界见 `docs/s3-local-score-project-musicxml-export-acceptance.md`，part identity 硬化见 `docs/s3-local-score-project-musicxml-part-identity-hardening-acceptance.md`，note 容器硬化见 `docs/s3-local-score-project-musicxml-note-container-hardening-acceptance.md`，谱面标题、署名与版权双向边界见 `docs/s3-local-score-project-musicxml-score-credits-round-trip-acceptance.md`；全局整数速度边界见 `docs/s3-local-score-project-musicxml-tempo-round-trip-acceptance.md`，单附点、单段歌词、单指法、单音演奏法、单事件力度记号、单事件制音踏板记号、受控和弦标记、fermata、圆滑线和延音线双向边界分别见对应的 S3 round-trip acceptance 文档，其中和弦切片见 `docs/s3-local-score-project-musicxml-chord-symbol-round-trip-acceptance.md`，增三／减三边界见 `docs/s3-local-score-project-musicxml-augmented-diminished-triad-round-trip-acceptance.md`，减七边界见 `docs/s3-local-score-project-musicxml-diminished-seventh-round-trip-acceptance.md`，半减七边界见 `docs/s3-local-score-project-musicxml-half-diminished-seventh-round-trip-acceptance.md`，增七边界见 `docs/s3-local-score-project-musicxml-augmented-seventh-round-trip-acceptance.md`，大六边界见 `docs/s3-local-score-project-musicxml-major-sixth-round-trip-acceptance.md`。浏览器真实导入／下载／重开、Android WebView／真机、第三方独立阅读器、速度／和弦／踏板／力度／演奏法／指法／标题与署名显示及真实播放、tempo map／中途变速、双升降／Unicode 升降号／转位／其他和弦类别、左右手／替代指法、歌词排版／多 verse／melisma、真实音频与歌唱对齐、教师审核、MIDI、OMR、完整 MusicXML、完整 S3 与正式版 V1 均仍为 `NOT_EXECUTED` 或未完成。
