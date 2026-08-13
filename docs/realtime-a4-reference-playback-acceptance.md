# 实时音高 A4 参考音播放生命周期验收

状态：**Active implementation acceptance**

最后核验：2026-08-13

## 1. Root cause / scope

`RealtimePitchMonitorPanel` 的固定 A4 参考音此前在组件内直接等待共享 `AudioContext`
恢复。prepare pending 时还没有可由全局停止追踪的 source；若用户随后开始实时监听、会话
录音或 A4 Activity 录音，迟到的 prepare 仍会创建 440 Hz oscillator，可能把参考音串入
当前会话曲线、Blob、逐音 alignment 与 Activity evidence。重复点击或最终卸载也缺少统一的
pending owner。

本切片只让 A4 参考音复用现有 latest-wins reference playback controller／hook 的独立实例。
实时音高 controller、录音、离线分析、Activity、保存与界面保持既有边界。

## 2. 必须改变

- 开始监听／录音、其它全局音频、重复播放与最终卸载会同步使旧 A4 prepare/source/timer 失效；
- 旧 prepare 的迟到 resolve／reject 不得创建 oscillator、写入错误或覆盖新播放；
- 被取消后可以由新的用户手势正常重试；
- `RealtimePitchMonitorPanel` 不再直接创建 browser audio channel、oscillator 或 gain。

## 3. 必须保留

- sine 440 Hz，start `currentTime + 0.03s`，时长 0.9s；
- gain `0.0001 → 0.16`（+0.02s）`→ 0.0001`（+0.85s），oscillator stop +0.9s；
- “播放 A4 参考音”按钮、既有中文失败文案、主动播放与麦克风分离说明；
- 固定目标、录音零点、attempt、evidence、分析、保存、上传、schema、评分与布局不变；
- 临时乐谱短参考音继续使用 +0.81s release，不受 A4 override 影响。

## 4. 自动证据与 QA 边界

notation reference focused tests 冻结默认 +0.81s 与 A4 +0.85s 包络；实时音高 mounted suite
模拟 A4 prepare pending 后开始监听／录音，再强制迟到 resume，验证不创建 oscillator、无旧错误
且可重试。source contract 阻止 raw browser audio ownership 回到 panel。

真实浏览器、Safari、Android WebView／真机、真实扬声器／麦克风串音、后台／锁屏、音频焦点、
人工可访问性和目标用户 QA 均为 `NOT_EXECUTED`。

QA level recommendation：**strict**。
