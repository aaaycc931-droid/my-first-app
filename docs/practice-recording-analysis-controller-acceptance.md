# 练习页录音解码与分析 controller 验收边界

文档角色：**Active acceptance / 本地录音解码、分析与迟到结果边界**

状态：**Implementation candidate；外部 QA NOT_EXECUTED**

规范来源：`docs/final-ui-refactor-compatibility-contract.md`

QA level recommendation：**strict**

## 1. 用户价值与范围

本切片把 `/practice` 最新本地录音的浏览器解码、录音质量分析、实验性音高估计和起音
候选检测移入框架无关 controller。React composition hook 只注入浏览器 decode port、
既有分析函数并把语义化 snapshot 与 commands 提供给页面。

用户流程保持“开始录音 → 停止 → 主动选择质量分析／音高估计／起音检测 → 查看本机
非评分结果 → 清除或重新录制”。新增的可靠性行为是：

- 每种分析独立 latest-wins；同类请求 A 被 B 替换后，A 的迟到成功、失败或 cleanup
  不得覆盖 B 的 loading、结果或错误；
- 三种分析可以按既有界面并行运行，互不清除或覆盖；
- 新录音、清除、来源替换或组件卸载会同时失效旧解码与分析 generation；底层解码即使
  无法物理中断，迟到结果也不能复活旧录音证据；
- 音高估计冻结发起时的录音 attempt 与旋律步骤，供既有当前会话历史记录保持原尝试归属；
  导入片段与临时记谱目标 identity 继续用于既有 stale 标记。旧结果不能写入新 attempt；
  主音高对比仍按既有行为把最新估计与用户当前选择的旋律目标重新计算；
- 起音检测冻结发起时的灵敏度预设；等待期间修改选择只影响下一次主动检测；
- 浏览器 AudioContext 在成功、读取失败、解码失败、结果复制失败和卸载后的迟到完成中
  都必须 best-effort 关闭，关闭自身失败不得掩盖原始结果或错误。

## 2. 保持不变的行为

- 录音质量分析继续按全部声道计算 peak 与 RMS：peak 大于等于 `0.98` 提示可能削波，
  peak 小于 `0.08` 或 RMS 小于 `0.015` 提示可能太轻，其余提示电平可用；
- 音高估计继续复用既有 `estimateLocalPitch` 算法、置信帧含义、中文恢复提示、当前旋律
  步骤比较，以及导入片段／临时记谱目标的 stale 标记；
- 起音检测继续只使用第一声道、既有 balanced／sensitive／conservative 预设和
  `detectAudioOnsets`，结果仍只是候选与诊断置信度；
- 页面只在 controller 返回的录音 attempt 与历史 generation 仍为当前时写入既有当前会话
  practice attempt；同一录音最多一条，失败、取消、迟到或重复结果不得追加第二条。该历史
  归属仍是页面职责，不进入 controller；既有历史上限、字段和重新练习行为不变；
- 三条入口继续要求用户主动点击，不自动解码或分析；loading、disabled reason、清除动作、
  简体中文错误和结果显示保持可恢复；
- 音频不上传、不持久化、不调用 AI，不新增账号、数据库、Storage、网络、schema、分数、
  等级、准确率或通过／失败判断。

## 3. 自动验收

- decode port focused tests 覆盖多声道数据复制、duration／sample rate，以及 Blob 读取、
  AudioContext 创建、decode、channel copy 和 close 的成功／失败清理；
- controller focused tests 覆盖三种分析成功和既有错误映射、无录音入口、同类 A→B 迟到
  resolve／reject／finally、跨分析并行、source replacement、clear、detach、冻结 preset／
  target context 和 stale-result 拒绝；practice attempt 的单次写入仍由既有页面历史契约负责；
- lifecycle test 覆盖 React StrictMode 合成 unmount→remount 不提前 detach，以及最后一次
  真实卸载只 detach 一次；
- source contract 要求页面通过 `usePracticeRecordingAnalysisController` 取得状态和命令，
  不再持有三组 analysis run ID，也不在这三条录音路径中直接创建 AudioContext、解码 Blob、
  循环计算电平或直接调用音高／起音算法；本地旋律导入的独立 decode 流程不在本切片；
- 新 focused test 必须在 `package.json`、Quality runtime step 和 reviewed runtime lane manifest
  中恰好注册一次并归入 `audio-rhythm`；完整 lint、typecheck、Web build、Android local
  validator、Gradle unit／assemble 与 APK 独立验证保持通过。

## 4. 外部 QA 与不宣称

真实 Chrome／Safari／Firefox 的 codec 与 decode 行为、Android System WebView／已安装 APK
从录音到三种分析的完整流程、真实人声与多声道素材、后台／锁屏／来电／音频焦点、三档
设备、20 轮稳定性、人工可访问性和目标用户验收均为 `NOT_EXECUTED`。自动测试、模拟
AudioContext 和 Debug APK 构建不能替代这些证据，也不关闭 V1-05、V1-16、V1-18 或
V1-24。
