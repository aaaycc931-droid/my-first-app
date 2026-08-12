# 练习页点击延迟校准 runtime controller 验收

状态：**Active implementation acceptance**

最后核验：2026-08-13

规范来源：`docs/practice-rhythm-runtime-controller-acceptance.md`

## 1. 动机

普通／谱面节奏 runtime 已由共享 controller 承接后，`/practice` 点击延迟校准仍在页面中
重复持有同构的 scheduler、generation、count-in／结束 timeout、60ms interval、拍击 ID 和
五项 runtime state。该重复边界会让 pending start、迟到 timer 与卸载 cleanup 的可靠性继续
依赖页面源码正则。

本切片不创建平行实现，而是为校准建立第二个完全独立的
`PracticeRhythmRuntimeController` 实例，并复用 quarter-pulse run plan；校准统计与
“应用当前会话 offset”仍留在既有 domain／页面边界。

## 2. 必须改变

- 页面不再持有 latency scheduler、generation、timeout、interval 或 tap-id refs；
- latency 与普通 rhythm 各自使用独立 controller 实例，停止／重置一方不能改变另一方；
- 校准 plan 与既有 `createRhythmLatencyCalibrationTargets` 的 target、时刻和时长完全等价；
- pending replacement、false／rejection、迟到 timer、cleanup 异常与卸载统一复用已验证的
  latest-wins controller 协议；
- reset 和每次 start 清除校准 samples、result、error，并关闭“应用当前会话延迟校准”；
- 每次有效拍击同步推进 snapshot clock，保持反馈与校准样本立即使用本次拍击时刻；
- 拍击 ID 规范化为单轮唯一、从 1 递增；该 ID 不展示、不持久且不参与 offset 算法结果。

## 3. 必须保留

- 当前 BPM、拍号、subdivision、count-in、80ms delay、固定 2 小节 quarter pulse；
- 60ms clock refresh、180ms match window、120ms 尾窗与 `count-in → practice → stopped`；
- 只在 practice phase 接收拍击，manual stop 保留 samples 并计算当前结果；
- insufficient／estimated／unstable、median／outlier、stability hint 和 offset 算法；
- Space 键在 calibration practice 时优先，input／select／textarea 与 repeat 过滤不变；
- checkbox 资格、当前会话、不持久、非评分、不代表硬件 round-trip latency 的文案；
- latency 与普通 rhythm 的并行能力暂不改变，不引入全局音频停止或互斥语义；
- 独立节拍器、麦克风起音、UI 布局、网络、持久化与正式评分不属于本切片。

## 4. 验证边界

自动测试必须覆盖 plan 等价、两个实例隔离、phase／tap、stop／reset、应用 offset 失效、
Space 优先、页面不再持有 latency refs/timers，以及共享 controller 的 latest-wins、cleanup 与
StrictMode 生命周期回归。

真实浏览器音频时钟、Android System WebView／已安装 APK、后台／锁屏、长时间 timer drift、
真实触控／键盘节奏、设备输入／输出 round-trip latency、音频焦点、可访问性和目标用户 QA
均保持 `NOT_EXECUTED`。

QA level recommendation：**strict**。
