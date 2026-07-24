# MVP / Android 私测当前状态

最后更新：2026-07-23

本文件是当前可验证状态总账，不再作为逐次运行日志无限追加。历史细节保留在 Git 提交记录、PR 与 Actions 中。

## 当前基线

- 最新已合并产品功能基线：P119b / PR #417，合并提交 `bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1`
- 最新已合并证据准备基线：P119c / PR #419，合并提交 `de9ab7f9a6d050a951e70835fbe97cecc693b9f4`
- 最近仓库维护：PR #406，P118a 本机进度保存／清除失败关闭修复，main 提交 `f0c0810acb6e4417329466bcc13decc607589c92`
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
