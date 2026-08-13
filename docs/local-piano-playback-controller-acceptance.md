# Local piano playback controller acceptance

状态：**Active implementation acceptance**

最后核验：2026-08-13

## 1. Root cause / scope

`LocalPianoPanel` 的本机演奏记录回放与已确认学习谱面回放曾共用一个页面 timeout 数组，
但 timer callback 没有 run/cycle identity。被 clear 但已进入任务队列的旧 note、pedal 或
completion callback 可以在替换播放后继续发声、停止新播放、重建旧循环并丢失新 timer
所有权；若用户随后开始录制，旧机器回放事件还可能经现有 audio callback 写入新的用户演奏
记录。

本切片只把这两类 timer-driven keyboard commands 移入 framework-free latest-wins
controller 与 StrictMode-safe hook。演奏/学习纯 schedule、音频 voice、录制和存储仍在既有
边界。

## 2. 必须改变

- 每个 play replacement 和每个 loop cycle 都建立新的 generation；
- 所有 callback 在 press/release/pedal/stop、timer ownership 或 UI state 副作用之前检查
  generation；
- forced stale event/completion 不得影响 replacement，不得重新建立旧 loop；
- stop 在创建 recorder 之前同步失效当前 generation，所以旧 playback event 不得写入新
  recorder；
- timer ID 被后续 cycle/run 复用时，旧 callback 也不得删除新 handle；
- clearTimer、setTimer 或 keyboard action 抛错时仍 best-effort 清理并回到 idle；
- dispose 与最终卸载清 timer、停声且不再发布。

## 3. 必须保留

- 演奏记录的 A–B 校验、rate、upper/lower voice filter、pedal、velocity、
  `playback-${keyId}` pointer，以及 loop 启动时 snapshot；
- 需要切 transpose 时首 cycle 延迟 60ms，后续 cycle 不重复该延迟；cycle finish 仍为最后
  schedule event +30ms；
- 学习谱面 BPM 30–240、0.88 note gate、同时间 note-off-first、固定 velocity 0.68、score
  pointer identity、末尾 all-notes-off 与 +30ms finish；
- 两类播放共享 isPlaying/stop，播放中仍可“重新开始/重新播放”；
- 开始录制、压力测试、键盘配置变更、删除/选择记录、学习草稿替换、全局停止与卸载继续
  停止回放；volume/label 等既有非停止动作不变；
- storage/schema、最多 12 条/2000 events、finalize/export/delete、MusicXML、Activity、
  MIDI、metronome、voice provider、布局与中文文案不变。

## 4. 自动证据与 QA 边界

`test:piano-playback-controller` 覆盖两类 command mapping、0/60ms 初始延迟、finish、
loop cycle generation、四种 A→B replacement、forced stale event/completion、旧 loop 不复活、
timer ID 复用、stop 后 recorder 隔离、异常清理、retry、dispose、StrictMode 与页面 ownership。
既有 piano performance、learning score、mobile behavior、audio、interaction、MIDI 与 Android
验证保持 required。

真实浏览器/Android WebView/真机音色、踏板、A–B 长循环、后台/音频焦点、MIDI 硬件、
可访问性和目标用户 QA 均为 `NOT_EXECUTED`。

QA level recommendation：**strict**。

