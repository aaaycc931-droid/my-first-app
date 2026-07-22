# P117e — 三音旋律视唱麦克风验收

日期：2026-07-22

状态：implementation candidate（实现与自动门禁已完成，PR #399 已合并；外部人工证据仍为 `NOT_EXECUTED`）

QA level recommendation：**strict**

## 1. 目标

P117e 为 Android 离线扩展随机练习增加三音旋律视唱。当前题目的五线谱与固定唱名从进入本轮起始终可见；用户按可见目标主动启用麦克风，完成版本化四拍预备后视唱，停止并完整回放检查录音，再二次确认仅在本机执行 P112 解码与 P113 有序对齐。只有当前 attempt、当前可见表示、当前录音与当前真实 analysis run 的可靠证据才能生成逐音、逐句非评分反馈。

完整路径：

```text
选择旋律视唱
→ 查看当前三音五线谱与固定唱名
→ 主动启用麦克风
→ 主动开始并完成四拍预备
→ 按可见谱面录制三音视唱
→ 主动停止 / 到时结束
→ 完整回放检查或丢弃录音
→ 二次确认仅本机分析
→ P112 解码与 P113 有序对齐
→ 提交 melody-sight-singing microphone Activity
→ 查看逐音 / 单句非评分反馈
→ 定位片段复练 / 清除重录 / 下一题
```

## 2. 与 P117d 的语义隔离

- P117e 的目标从本轮开始就可见，不能复用 P117d 的隐藏目标、完整参考旋律播放资格、揭示后显示目标或相应 DOM/ARIA 禁止断言。
- P117e 首版不要求、也不提供完整目标旋律播放；四拍预备只建立视唱录音零点，不是“已经听过答案”的证明。
- 若后续增加起始音或调性感提示，必须作为独立、可停止的提示音事件验收，不能播放完整答案，不能成为 Activity 正确性证据，也不能与预备拍、录音或录音回放重叠。
- P117d 的 `playbackQualificationId` 不得伪装成 P117e 资格。P117e 应使用当前可见表示身份与四拍运行身份绑定提交。
- 可以复用稳定三音题库、音高映射、P112/P113 算法和底层音频资源释放能力，但不能复用 P117d 的产品状态机来宣称视唱成立。

## 3. 入口与首版范围

- 只挂 `expandedLocalCatalog && !initialReviewTarget && !activeCustomPractice`，并作为扩展随机旋律模块中的独占 `melody-sight-singing` 模式。
- 进入视唱模式后，旋律听写、回唱、父层参考播放、答案编辑器、目标揭示与参考钢琴不得同时存在于同一可操作 DOM；切换模式必须卸载并作废旧 attempt。
- review/custom 首版不暴露视唱，避免旧错题 schema、已知复练结论或定制范围与麦克风证据混用。
- 复用当前基础、进阶、挑战三档版本化三音题，支持重复音、F♯4 与 C5。
- 首版只处理高音谱号、单句、三个等时值单音；不评价歌词、咬字、音色、声部、音域适配、呼吸、力度或专业声乐能力。
- 不实现完整课程、移调唱名、首调唱名切换、多声部、自动伴奏、节奏分数、云端识别或持久录音。

## 4. 可见谱面、唱名与 canonical target

### 4.1 单一题目真值

- 五线谱、固定唱名、四拍预备、录音窗口与 P113 targets 必须从同一个版本化 canonical target 派生，禁止在 UI、timer 和 alignment 之间复制三套音高或时长常量。
- canonical target 至少固定 `targetVersion`、`timedTargetId`、question/variant、难度、BPM、4/4、四拍预备、录音零点、三个 position/onset/duration、phrase 范围与总窗口。
- 同 seed/variant/config 必须得到稳定 identity；跨 variant、BPM、target version、谱号/表示上下文或事件内容必须得到不同 identity。
- 缺音、乱序、重叠、非有限时间、无效 canonical note id、phrase 越界、表示目标与分析目标不一致必须失败关闭。

### 4.2 五线谱与固定唱名

- 从进入本轮起显示五条谱线、高音谱号和三个有序音位；C4 下加线、F♯4 升号、C5 谱位与重复音必须正确。
- 每个谱面音位必须有等价的简体中文可访问名称，并显示固定唱名；例如 F♯4 的唱名与升号语义不能只依赖颜色或视觉位置。
- 谱面、固定唱名、canonical `EarTrainingMelodyNoteId` 与 P113 MIDI 必须逐位置一一对应，不得由显示文本反解析目标。
- 录制中可以按 canonical timeline 高亮当前位置，但高亮只表示预期时间位置，不证明用户已经唱出该音，也不能直接生成 evidence。
- 目标从开始可见，因此 checked 前隐藏的是检测结果、cents 与比较结论，而不是目标本身。

## 5. 四拍、录音与完整回放

- 不自动请求麦克风、不自动开始预备拍、不自动录音、不自动分析；每一步都由用户动作触发。
- 四拍预备与 canonical BPM/录音零点共用单一 AudioContext 时钟。录音开始必须校验实际音频时钟位于明确的双边容差内；不能只凭 JavaScript timer 到点开始。
- 点击声若可能进入采集，必须在结构上与录音窗口分离，或按版本化录音零点可靠裁除；点击声不得成为 P113 检测片段。
- 预备拍、录音、录音完整回放、结果片段回放以及任何可选提示音必须互斥。
- 用户可以主动提前停止；自动到时必须停止 recorder 并等待有效非空 Blob。录音失败、空 Blob 或迟到 recorder 事件不能恢复本轮。
- 正式分析前必须完整回放当前 Blob 并自然结束；手动中止、播放拒绝、媒体 error、Blob 改变或 Object URL 失效都不授予分析资格。
- 完整回放资格必须绑定当前 Blob/recordingId；重录或丢弃后旧回放资格立即失效。

## 6. Activity、analysis run 与证据

- Activity `family: "melody-sight-singing"`，唯一输入方式为 `microphone`，target 来源为当前内置版本化可见旋律目标。
- answer/evidence 至少绑定 definition、question/variant、attemptId、visiblePresentationId、timedTargetId、countInRunId、recordingId、analysisRunId 与 algorithmVersion。
- `visiblePresentationId` 必须冻结谱面/唱名表示上下文与 target identity；`countInRunId` 必须对应实际到达录音零点的当前四拍运行。两者都不能用空字符串、当前时间或未验证 timer 临时冒充。
- `analysisRunId` 只能在用户二次确认实际启动本机 decode/alignment 时生成。started、ready 与 failed 回调必须携带相同 recording 引用和 run id；父层同步冻结 binding，并拒绝 stale、重复或跨录音回调。
- 当前 run processing/ready/answering/checked 时不得再次确认分析；重跑必须先作废当前 run，并按产品动作创建新 attempt 或明确的新 run。
- 实时曲线、高亮位置、麦克风监听帧和录音回放状态不能成为 Activity answer 或 P113 evidence。
- 正式证据只能来自停止后的当前录音、完整回放资格、用户二次确认后的 P112 重新解码以及 P113 有序对齐。
- P113 必须保持目标顺序、segment 唯一占位、单调时间与 aligned/missing/unreliable/rejected/extra 守恒；禁止用可见目标先验吸附唱错音、错八度或额外音。
- 合法 missing、unreliable 或 extra 保留当前三个目标的可解释 evidence，但整体为 `insufficient`；目标身份、timeline、attempt、recording、analysis run、算法版本或内部 summary 不一致时 answer 为 `null` 且 evidence 为空。
- 全部三个位置可靠且 `close` 才返回 `consistent`；全部可解释且至少一处可靠 `high/low` 返回 `different`；任一位置或整体无法可靠解释返回 `insufficient`。
- 所有定义、answer、evidence、逐音与单句反馈始终 `assessmentMode: "non-scoring"`，不得输出正式正确/错误、分数、准确率、等级、通过/失败或能力结论。

## 7. 结果、锁定与用户控制

- 分析 ready 后仍不自动完成 Activity 检查；用户主动查看反馈后才进入 checked。
- checked 结果显示每个位置的可见目标、仅在可靠时显示检测音、cents 中位/范围、音头/稳定段/尾音、时间偏移、拒答原因和建议复练片段。
- 单句汇总不得掩盖逐音 missing/unreliable/extra，也不得越过逐音证据生成总体音准评价。
- checked 后当前 attempt 和当前录音锁定；不能重播录音、重启分析或修改证据。清除重录、重置、切换难度/模式或下一题必须创建新 attempt。
- 用户始终可以在分析前丢弃录音并重新开始；任何错误都使用简体中文说明恢复动作，并保留旋律听写、回唱等非当前入口。

## 8. fail-closed 与生命周期

以下操作必须停止提示音/预备拍/recorder/录音回放/片段回放，释放 media tracks、AudioContext、Object URL、timer 与 listener，并作废旧 recording、回放资格、analysis、answer/evidence 和检查结果：

- 预备拍中断、录音零点过早或过迟、手停、全局停止、页面后台、锁屏或组件卸载；
- 麦克风权限拒绝、无设备、占用、迟到 stream、媒体轨 ended、麦克风 AudioContext 中断；
- MediaRecorder/codec/decode 不支持、录音错误、空 Blob、录音回放 reject/error；
- 重录、丢弃、清空、重置、换题、换难度、切换听写/回唱/视唱模式；
- 进入 review/custom、当前可见表示改变或父组件独占状态改变；
- presentation、count-in、recording、attempt、timed target、analysis run 或 algorithm 任一 provenance 不一致。

旧 timer、迟到权限、旧 MediaRecorder 最终事件、旧播放 ended、旧 decode/alignment ready/failed 回调不得恢复新 attempt。作废时即使异步任务最终成功，也必须静默丢弃结果而不能重新挂载反馈。

## 9. 存储与隐私

- 默认 session-only；不上传，不写 localStorage、IndexedDB、账号、数据库、私人曲库或练声记录。
- Blob、PCM、Object URL、实时帧/曲线、谱面高亮、逐音 evidence、ActivitySession、attempt 与所有资格/provenance 均不持久化。
- 首版不把 `consistent` 当作错题系统 correct，也不把 `different/insufficient` 写入复练队列、能力弱点或学习画像。
- 既有用户主动保存练声记录的能力与本 Activity 完全隔离，不能自动复用、保存或导出本轮录音及证据。

## 10. 自动门禁

### 10.1 已核实的合并与自动证据

- P117e 已通过 PR #399 合并；`main` 合并提交为 `c2fc6a8943c9c432c850f3d0c89455b378c2cdd5`。
- PR Actions run `29896738992` 的 `quality` 与 `android-local` 均为 `success`。这是合并前的 PR merge-test 门禁；runner 检出的 SHA 为 `d5e76acd1d1ce7f004bc463b68de8e9cf031533d`，不得把它写成 `main` 合并提交，也不得声称合并后另有一轮 GitHub Actions 运行。
- `android-local` 上传工件 `8520299089`（`solfeggio-local-debug-apk-d5e76acd1d1ce7f004bc463b68de8e9cf031533d`）；GitHub artifact ZIP SHA-256 为 `f769801fda8b9667bb150092bf6f70cfad571ed694bde42197300b738d1b6345`，独立 verifier 记录的内部 Debug APK SHA-256 为 `57edf80614fcd9abb519e444e7a0a4896c88192ca12f8cc14ed1e8879637cb05`。
- `main` 合并提交的 Vercel 状态为 `success`；该状态不等于 GitHub `quality`、`android-local` 或真机验证。
- 上述自动证据只形成 implementation candidate，不形成真实设备、真实麦克风、真实人声、教师审核、目标用户验收、正式签名或发布批准。

- focused target：三难度 identity、BPM、4/4、四拍、双边录音零点、三个 onset/duration、phrase、谱面/唱名/P113 映射、非法与不一致目标拒绝。
- focused Activity/evidence：当前 presentation/count-in/attempt/target/recording/run/algorithm 的 close/high/low/missing/unreliable/extra、部分可靠、全不足、重复 segment、矛盾 summary 与跨 provenance；恒定 non-scoring。
- 表示回归：五条谱线、高音谱号、C4 下加线、F♯4 升号、C5、重复音、三个有序可访问名称与固定唱名；初始即可见，禁止继承隐藏 gate。
- alignment 回归：ordered/monotonic、segment 唯一、miss/extra 守恒、错八度、首尾缺音、额外音、短录音、复音、噪声、无声与确定性。
- mounted microphone：不自动请求权限；不要求完整答案播放；可见目标；四拍 AudioContext 双边锚点；开始/停止/自动到时；完整录音回放 gate；二次确认前不解码；真实 analysis run started/ready/failed；可靠/局部不足/失败；checked 锁定；重录/丢弃/重置/换题/换难度/换模式/全停/后台/unmount；旧 timer/stream/recorder/playback/decode/alignment 不复活。
- parent 独占：听写、回唱、视唱三种模式 DOM 与音频所有权互斥；视唱期间父答案、完整答案播放与参考钢琴不可操作；reset/next/跨难度强制 remount。
- App：只在 expanded random 显示；review/custom 隐藏；不写 Blob/PCM/note evidence/attempt/provenance，不写复练或学习画像。
- 回归：P112、P113、P114f、P117a–d、P117b 五线谱表示、全局音频、Android lifecycle、录音回放与片段定位。
- `npm audit --omit=dev --audit-level=high`、`npm run check`、Android sync/validator、GitHub `quality` 与 `android-local` 必须通过。

## 11. 手动与外部证据

以下证据必须独立记录，不能由合成音、模拟 MediaRecorder、DOM、源码审查、CI 或 APK 工件替代：

- Browser 真实麦克风：Chrome/Edge/Firefox/Safari 权限、codec、录音/完整回放、串音、键盘、屏幕阅读器、五线谱与唱名可访问性。
- 三档 Android 真机：System WebView、拒绝/允许权限、扬声器与耳机、四拍/录音同步、前后台/锁屏/来电/音频焦点/进程重建、窄屏触控、20 轮、RTF/温度/内存。
- 真实人声：三难度、重复音、F♯4、C5、错八度、缺音、额外音、噪声与复音场景；冻结授权、设备分层、盲测和标注版本。
- 双教师：题目真值、谱位/谱号/升号/八度、固定唱名、三难度、四拍语义、反馈解释与拒答边界。
- 至少 5 名中文用户独立完成“看谱/唱名 → 四拍 → 视唱 → 停止 → 完整回放 → 确认分析 → 理解反馈 → 片段复练”；正式 V1 核心任务成功率至少 80%，记录误触、误解与修复后复测。

当前 Browser、三档 Android 真机、真实人声、教师与目标用户证据均为 `NOT_EXECUTED`。正式签名、私测分发、已知问题清单、回滚方案与发布批准证据包也均未执行或未闭环。

## 12. 后续边界

- P117e 已实现、通过自动门禁并合并；这些事实只形成三音可见目标视唱 implementation candidate，不代表真实人声准确率、教学有效性、无障碍、正式验证完成、正式发布完成或正式 V1 完成。
- 起始音提示、移调/首调唱名、节奏评分、更长旋律、歌词、多声部、课程、自适应与持久化画像必须另行验收，不能由本切片外推。
- P117d 回唱继续保留隐藏目标与完整参考播放资格；P117e 不得反向放宽该边界。
