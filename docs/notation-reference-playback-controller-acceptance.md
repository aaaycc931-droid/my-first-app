# Notation reference playback controller acceptance

状态：**Active implementation acceptance**

最后核验：2026-08-13

## 1. Root cause / scope

`NotationTemporaryPracticePanel` 的短参考音和参考旋律此前直接拥有 raw `AudioContext`、
oscillators 与 melody completion timeout。被 clear 但已进入任务队列的旧旋律完成 callback
可以停止替换后的新播放、清掉新 timer/context 并把 UI 错误切回 idle；该 raw context 也不受
项目共享全局音频停止协议管理。同一 target id 从 active 变为 stale 时，旧播放同样不会停止。

本切片只把这两类参考播放移入专用 framework-free latest-wins controller、共享 browser
audio channel port 与 StrictMode-safe hook。临时目标、练习进度、纯旋律 plan、反馈、录音与
布局保持既有边界。

## 2. 必须改变

- 每次 tone/melody replacement 都使旧 pending prepare、generation、完成 timer 和 sources 失效；
- 所有完成 callback 在 timer ownership、stop 或 UI state 副作用之前检查 generation；
- timer id 被 replacement 复用时，旧 callback 不得删除或停止新 run；
- `stopAllBrowserAudio()`、目标替换、同 id 目标失效、手停与最终卸载同步清 source、timer 和
  playing UI；
- schedule/timer/platform cleanup 抛错时 fail closed，错误后可以重试；
- StrictMode synthetic unmount/remount 不提前 dispose，最终卸载只释放一次。
- 被后台生命周期 suspend 的共享 context 必须由下一次用户播放手势恢复；恢复失败显示既有错误，
  不得出现 UI 播放中但实际无声。

## 3. 必须保留

- 短音：sine、`currentTime + 0.03s`、0.9s、gain `0.0001 → 0.16`（+0.02s）
  `→ 0.0001`（+0.81s）、oscillator stop +0.9s、自然完成 1050ms；
- 固定 A4 参考音可显式复用同一 tone 能力并保留其历史 +0.85s release；未传 override 的
  临时乐谱短音继续严格使用 +0.81s；
- 旋律：sine、`currentTime + 0.05s`、gain `0.0001 → 0.13`（+0.02s），release 为
  `max(noteStart + 0.03s, noteEnd - 0.03s)`，oscillator 在 noteEnd 停止；
- rest 不创建 oscillator 但保留 offset；完成仍为纯 plan 总时长 +200ms；
- full/current-measure scope、0.75/1 rate、当前小节过滤后从零开始的 offset；
- 两条既有中文失败文案、按钮、disabled 规则、说明、非自动播放、非评分和非自动麦克风；
- target/progress/schema/storage、节奏 tap、音高反馈、MusicXML、Activity 与 UI 布局不变。

## 4. 自动证据与 QA 边界

`test:notation-reference-playback-controller` 覆盖 browser envelope/source tracking、tone/
melody/rest 时间线、replacement stale completion、timer id 复用、手停、异常、retry、dispose、
StrictMode 与页面 ownership；既有 `test:notation-reference-melody-playback` 继续验证纯 plan。

真实浏览器、Safari、Android WebView／真机、真实音量／音色、后台／锁屏、音频焦点、人工
可访问性和目标用户 QA 均为 `NOT_EXECUTED`。

QA level recommendation：**strict**。
