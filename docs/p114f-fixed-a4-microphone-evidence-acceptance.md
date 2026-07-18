# P114f — 固定 A4 单音麦克风证据接入验收标准

状态：**ACTIVE / implementation candidate（本地共享挂载已形成，远端门禁与真机待完成）**

QA level recommendation：**strict**

## 1. 目标与当前事实

P114f 把一个项目内置、已确认的 A4 单音长音练习接入 `activity-definition-v1`、`activity-session-v1` 与 P113 `analysis-evidence-v1`，形成首个真实 `microphone` 输入 vertical slice。用户先查看目标说明并主动播放 A4 参考音，再主动开启麦克风和本次录音，停止后再次确认只在本机分析，随后查看“接近目标、整体偏高、整体偏低或证据不足”的非评分解释并开始新尝试。

P114f 本地 implementation candidate 已把共享 A4 活动真实挂载到 Android 音高入口和 Web `/practice` 的手动进入入口，并通过 focused adapter 与挂载行为测试；页面打开不会自动请求麦克风。远端 CI、PR、合并、Web 真麦克风手动 QA、APK 真机验收仍未完成，P104/P113 的真实人声、三档 Android、同步/延迟和教育审核缺口也保持独立。

## 2. 固定活动与协议身份

首个切片只允许一个稳定目标：

| 字段 | 冻结值或约束 |
| --- | --- |
| 活动族 | `vocal-training` |
| 用户可见目标 | `A4 单音长音` |
| MIDI / 频率参考 | MIDI 69 / 440 Hz |
| 科学音高内部 id | `a4` |
| 目标数量 | 1 个音、1 组、不得在本切片扩成音程或音型 |
| 活动来源 | 项目内置、已确认的固定 A4 单音目标；会话初始为 `ready` |
| 评估模式 | `non-scoring` |
| 实际接入输入 | `microphone` |

- 活动、内容和目标必须使用版本化稳定标识；目标标识必须与离线对齐结果及 `AnalysisEvidence.targetId` 完全一致。
- `ActivityAnswer` 必须提交 `{ mode: "microphone", analysisEvidenceIds }`，每个 ID 必须属于当前 `attemptId`。
- `analysisEvidenceIds` 是尝试运行时结果，不能伪造为活动定义中的预置 expected evidence ID。
- P114f 的 target 必须使用 `analysis-evidence` check policy，不包含 `expectedAnswer`；`requiredTargetIds` 精确绑定当前固定 A4 练习在 P113 对齐结果中的子目标，且不得为空、重复或指向其他尝试的目标。
- 现有 answer-key target 分支及其 `expectedAnswer` 继续向后兼容，P114f 不得破坏 P114a–P114e 的 `choice`、`tap`、`piano` 或 `solfege` 活动定义。
- P114f 只增加最小、可判别的 evidence target 分支，不顺带重构整个 `ActivityDefinition` schema，也不得把 `piano` canonical workaround 或伪 evidence ID 塞入麦克风活动。

## 3. 证据来源与检查映射

正式接入活动会话的证据只能来自用户停止本次录音并二次确认后的本机 P112/P113 链路：

```text
本次录音
→ offline-pitch-multicandidate-v1
→ offline-note-alignment-v1
→ AnalysisEvidenceV1
→ microphone ActivityAnswer
→ ActivityCheckEvidence
```

- 实时 50 ms 音高帧、当前音名、Hz、cents 和曲线只作即时观察，不得直接冒充本轮稳定 `AnalysisEvidence`。
- 目标只参与对照，不得改写检测频率、voicing、八度修正、音符分段或拒答。
- 必须直接依据原始逐音证据状态生成活动检查结果，不能只从已折叠为 `observed` 的通用证据状态反推：

| P113 逐音状态 | Activity 检查状态 | 用户可见含义 |
| --- | --- | --- |
| `close` | `consistent` | 本次可靠片段接近 A4 |
| `high` / `low` | `different` | 本次可靠片段整体偏高 / 偏低 |
| `missing` / `unreliable` | `insufficient` | 没有足够可靠证据，不能判断 |

- `missing` 或 `unreliable` 证据不得携带检测音、cents 或其他肯定性测量结论。
- 不得产生总分、百分比、等级、排名、通过/失败、声部判断或医学建议。
- 若本机解码或分析失败，不得提交空 `analysisEvidenceIds` 或生成伪检查结果；会话保持可恢复状态并显示简体中文错误。

## 4. 时间锚点与尝试隔离

- A4 目标时间必须锚定本次录音/尝试实际开始时刻，而不是更早的麦克风监听开始时刻。
- 开始录音时冻结目标、活动版本和 `attemptId`；录音过程中修改外部练声配置不得改写本轮目标。
- 分析结果返回时必须再次校验录音身份、活动身份、目标身份与 `attemptId`；迟到结果不得写入新尝试。
- 当前尝试尚无答案或证据时，权限重试不应无意义增加尝试号。
- 已有录音、分析、答案或 checked 证据后重新录制、重置或更换活动，必须停止音频、清除旧结果并开始边界清楚的新尝试。
- 旧 attempt 的 evidence ID 永远不能出现在新 attempt 的 `ActivityAnswer` 中。

## 5. 完整用户流程与边界状态

### 5.1 准备、参考音与权限

- 初始活动展示固定 A4 目标说明且会话处于 `ready`；内置已确认目标不伪装成待审核生成内容。初始状态不自动请求麦克风权限、不自动录音、不自动保存或上传。
- 页面必须明确显示 A4 / 440 Hz、非评分边界和“参考音播放与麦克风采集分开”的提示。
- 播放参考音前必须停止麦克风监听和录音，避免把扬声器声音当作用户演唱；建议耳机但不得强制。
- 权限请求只能来自明确用户操作，并覆盖拒绝、无设备、设备占用、API 不支持和迟到媒体流。
- 权限失败时保留参考音与其他离线练习能力，显示恢复建议，不伪造音名或活动证据。

### 5.2 录音、停止与二次确认

- 只有麦克风已进入可用监听状态后，才能开始本次活动录音。
- 录音中应显示明确状态；重复点击开始、参考音播放、保存旧记录和并行分析应禁用或安全拒绝。
- 停止录音后只生成可回放的本次会话 Blob，不自动进入 Activity 检查。
- 用户必须再次点击确认，应用才停止麦克风并在本机解码、分析和对齐最多 30 秒录音。
- 用户可在分析前取消、回放或丢弃；丢弃后 Blob、临时 URL、待确认状态和旧分析必须一起失效。

### 5.3 检查、解释与新尝试

- 用户主动录音并二次确认本机分析后，可靠或可解释拒答结果必须真实驱动 `ready → answering → checked`，不得只显示协议标签。`preview → ready` 仍用于草稿或未确认来源，不强加给本切片的内置已确认 A4 目标。
- 检查区显示目标 A4、检测音（仅有可靠证据时）、cents 中位值/范围、置信与拒答原因，并保持非评分表达。
- checked 后输入锁定；重复回调或重复点击不能产生第二份矛盾答案。
- “重新录制 A4”与“重置本题”必须停止监听、录音、回放和分析，释放资源，清空 Blob、曲线、答案、证据、错误和定位状态，并进入新尝试。
- 页面离开、组件卸载、Android 退到后台、全局停止音频和恢复前台均不得留下媒体轨、AudioContext、MediaRecorder、计时器、对象 URL、残音或复活的旧证据。

## 6. Web、Android、离线与隐私验收

- 同一共享 `RealtimePitchMonitorPanel` 已作为 P114f 活动组件挂载到 Web `/practice` 的手动入口和 Capacitor Android 本地入口；Web 默认不挂载组件，只有用户点击进入后才可能主动请求麦克风。
- Android Manifest 保留 `RECORD_AUDIO`，不得为本切片增加网络权限；核心录音、分析、对齐与检查在断网状态可完成。
- 小屏下参考音、开麦、录音、停止、回放、确认分析、检查、重录和清空均可操作，文案不被截断到不可理解。
- 录音默认只在本次页面会话内存中；P114f 不自动写入 IndexedDB、账号、Supabase 或其他云端存储。
- 若继续提供现有“主动保存本机练声记录”能力，必须与 Activity 提交分离，不修改其 20 条/5 MB 边界，也不得把保存记录冒充正式学习历史。
- 不采集、提交或打包真实人声 fixture；真实录音和参与者证据继续遵守本地、授权、脱敏和不入 Git 的规则。

自动测试、桌面麦克风或模拟媒体流均不能替代 Android 真机权限、录音格式、生命周期、扬声器串音、延迟和真实人声验证。

## 7. 自动测试与质量门禁

P114f implementation candidate 至少需要：

- focused adapter 测试：稳定活动/目标身份、A4 evidence target、无 `expectedAnswer`、唯一 `requiredTargetIds`、当前 attempt evidence ID 与 targetId 一致性，同时覆盖旧 answer-key 分支回归；
- focused evidence/session 测试：`close/high/low/missing/unreliable` 完整映射、`ready → answering → checked`、revision 防护、新尝试和 stale evidence 拒绝；
- 真实共享挂载行为测试：不自动请求权限、权限拒绝、迟到 stream、开始/停止录音、二次确认、可靠/不足/分析错误、checked 锁定、重录、重置、丢弃、卸载和后台；
- 时间锚点回归：监听早于录音时，A4 目标仍从录音零点对齐，不被过滤或错位；
- P112/P113 离线分析、分段、证据 adapter 和片段回放回归；
- P114a–P114e 的 `choice`、`tap`、`piano`、`solfege` 活动协议回归；
- `npm run check`、Android 本地静态边界、GitHub `quality` / `android-local` 与部署门禁。

自动门禁通过后仍需分别记录 Web 浏览器真实麦克风 QA 与至少 Android 真机 QA。没有执行时必须明确写“未执行”。

## 8. 非目标

P114f 不包含：

- 自由练唱、音程、音阶、五声音型、琶音、多句视唱或歌曲跟唱的 Activity 迁移；
- 实时帧正式评分、节奏评分、起音评分、完整演唱评分或音域/声部判定；
- 新音高算法、阈值调优、模型替换、云端分析或生成式 AI；
- 录音自动保存、云同步、课程进度、正式学习历史或数据库迁移；
- 伙伴 UI、自由聊天、自动范唱或伙伴主动操作；
- 五线谱/简谱编辑答案、USB MIDI、BLE MIDI 或正式硬件输入验收；
- P104 真实数据门槛、P113 真机证据、专用签名 APK 或正式发布完成声明。

## 9. 完成判定

当前只能写 **ACTIVE / implementation candidate（本地共享挂载已形成）**。以下事实缺一不可时，不得标为已完成或已合并：

1. 固定 A4 麦克风活动真实挂载 Web 与 Android；
2. 当前 attempt 的 P113 证据真实进入 microphone answer 和 checked 生命周期；
3. focused、完整仓库、远端 CI 与部署门禁真实通过；
4. PR 与 merge commit 可核实；
5. 自动测试、Web 手动 QA、Android 真机 QA 和真实人声/P104 缺口分别诚实记录。

即使代码和 PR 合并，Android 真机、真实人声、三档设备、延迟/同步、教育审核或 P104 基准仍未执行时，也必须继续写为未完成的外部证据缺口，不能用合并事实替代。
