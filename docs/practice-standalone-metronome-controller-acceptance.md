# Practice standalone metronome controller acceptance

状态：**Active implementation acceptance**

最后核验：2026-08-13

## 1. Root cause / scope

`/practice` 的独立基础节拍器此前由页面直接持有 `BrowserMetronomeScheduler` 与 generation。
#539 已保护 pending start 的迟到结果，但节拍器没有加入共享全局音频停止和页面生命周期：切换
出节奏功能区后控制 UI 消失而 click 可继续无限播放，后台／失焦也不停；随后启动本地录音时，
扬声器 click 可能进入麦克风并污染当前会话 level、pitch、onset 与 attempt 诊断。pending resume
期间也没有 starting UI，用户无法手停而可重复创建 replacement。

本切片只把 standalone metronome consumer ownership 移入 framework-free controller、browser
port 与 StrictMode-safe hook。共享 scheduler 本身、节奏练习和延迟校准 runtime 保持不变。

## 2. 必须改变

- controller 统一拥有 idle/starting/running、beat、error、scheduler identity 与 latest-wins
  generation；
- starting 期间禁用重复开始和 config 修改，但停止按钮可用；迟到 true/false/rejection/beat
  不得复活或覆盖终止状态；
- start 前调用全局停止；外部 `stopAllBrowserAudio()`、切换出 rhythm、blur、hidden、手停与
  最终卸载都同步终止 scheduler、清 beat 和 busy UI；
- 本地录音／目标播放等既有全局停止入口会先停掉 click，避免串入新麦克风会话；
- factory/start/stop 异常 fail closed，失败后保留既有中文错误并可重试；
- StrictMode synthetic unmount/remount 不提前 dispose，最终卸载只释放一次。

## 3. 必须保留

- `BrowserMetronomeScheduler` 的 60ms 首拍、25ms lookahead、0.1s schedule-ahead、强拍
  1320Hz/.28、弱拍 880Hz/.16 与既有 envelope；
- BPM sanitize 30–240、2/4/3/4/4/4、0/1/2 小节 count-in、subdivision 只作元数据；
- 当次 start 冻结 config，beat phase/bar/beat/strong metadata 不变；
- 既有中文错误、按钮和控制项、非评分说明与页面布局不变；
- 普通／谱面 rhythm、latency calibration、feedback、Activity、storage/schema 均不改变。

## 4. 自动证据与 QA 边界

`test:practice-standalone-metronome-controller` 覆盖 starting/running、同步 beat、config snapshot、
重复 start、pending stop、迟到 resolve/reject/beat、current false/reject、异常、retry、dispose、
StrictMode 与页面 ownership；既有 metronome foundation、rhythm controller 和 latency tests
保持 required。

真实浏览器、Safari、Android WebView／真机、真实 click／麦克风串音、后台／锁屏、音频焦点、
人工可访问性和目标用户 QA 均为 `NOT_EXECUTED`。

QA level recommendation：**strict**。
