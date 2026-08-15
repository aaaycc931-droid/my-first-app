# Local vocal reference playback controller acceptance

状态：**Active implementation acceptance**

最后核验：2026-08-15

## 1. Root cause / scope

`LocalVocalExercisePanel` 此前直接拥有 `AudioContext` 准备、oscillator/gain 调度和完成
timer。共享音频引擎只有在 source 被 track 后才把 channel 标为 active，因此
`prepareForUserGesture()` 尚未完成时，实时监听、录音、录音回放或生命周期触发的全局停止
无法取消该请求；迟到的准备结果仍可能排程整段练声参考音并串入新的麦克风会话。

本切片只把完整音型与所选音三次复练移入 framework-free latest-wins controller、共享
browser audio port 与 StrictMode-safe hook。音型生成、目标、实时曲线、录音、分析、保存、
布局与非评分边界保持不变。

## 2. 必须改变

- `preparing` 必须成为明确 UI 状态，准备期间允许用户停止；
- 每次 replacement、全局停止、手停、配置／片段变化和最终卸载都使旧 pending prepare、
  generation、完成 timer 与 sources 失效；
- 迟到的 prepare resolve/reject 和旧完成 callback 不得排程音频、覆盖新请求或改变新 UI；
- timer id 被替换请求复用时，旧 callback 不得清除或停止新 run；
- prepare、schedule、timer 或 cleanup 抛错时 fail closed，并保留既有中文恢复提示与重试；
- StrictMode synthetic unmount/remount 不提前 dispose，最终卸载只释放一次。

## 3. 必须保留

- 播放从共享 context `currentTime + 0.04s` 开始；
- oscillator 为 triangle，frequency 保持事件 Hz；gain 包络保持
  `0.0001 → 0.09`（+0.015s），在 `max(noteStart + 0.016s, noteEnd - 0.04s)`
  保持 0.09，再于 noteEnd 回落到 0.0001；source 在 noteEnd +0.01s 停止；
- 自然完成 timer 保持 `ceil(last event end * 1000) + 150ms`；
- 完整音型仍使用生成器的 `playbackEvents`；片段复练仍以 0.25s 间隔重复所选音三次；
- 音型、根音、方向、八度、BPM、循环、目标音程和参考模式配置不变；
- 目标预览、按钮含义、本机合成、无网络、非声部／正式等级和既有错误文案不变。

## 4. 自动证据与 QA 边界

`test:local-vocal-reference-playback-controller` 覆盖时间线、包络、pending stop/replacement、
stale completion、timer id 复用、失败重试、dispose 与 StrictMode 生命周期；
`test:mobile-vocal-exercise-behavior` 覆盖 preparing UI、全局停止和迟到准备结果。

真实浏览器、Safari、Android WebView／真机、媒体焦点、后台／锁屏、真实音量／音色、
麦克风串音、人工可访问性和目标用户 QA 均为 `NOT_EXECUTED`。

QA level recommendation：**strict**。
