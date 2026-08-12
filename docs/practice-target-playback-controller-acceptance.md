# 练习目标音播放 controller 验收边界

文档角色：**Active acceptance / 目标音播放可靠性与 UI 抽离边界**

状态：**Implementation candidate**

规范来源：`docs/final-ui-refactor-compatibility-contract.md`

QA level recommendation：**strict**

## 1. 范围与用户价值

本切片把 `/practice` 固定目标旋律和当前目标单音的 Web Audio、oscillator 与完成 timer
编排移入框架无关 controller，并由 React composition hook 注入共享浏览器 audio channel、
timer port 和全局音频停止。

保留既有正弦音色、0.18 峰值、50 ms 启动余量、BPM 派生旋律时长、1 秒当前单音、
活动音符高亮和现有简体中文错误文案。新增的可靠性行为是：

- A 在音频恢复期间被停止或 B 替换后，A 的迟到 resolve／reject 不能发声或覆盖 B；
- A 已清除但已进入事件队列的音符／完成 timer 不能修改 B 的 active note、状态或错误；
- 开始其他共享音频、全局停止、重试、进入录音、切换流程或卸载时停止当前目标音；
- 当前播放的 prepare、tone schedule 或 timer 建立失败时失败关闭并允许重新播放；
- controller 只释放自己 channel 的 sources／timers，不关闭或重置替代请求的状态。

## 2. 保持不变与明确不在范围

- 不改变目标旋律、音高频率表、BPM、目标步骤、练习 attempt 或反馈算法；
- 不改变节拍器、节奏训练、录音、Blob 回放、本地分析或起音检测；
- 不新增正式评分、通过／失败、上传、账号、云端、持久化或 schema；
- 不表示 `/practice` 的录音分析、timer、节奏 runtime 或最终 UI 已完成抽离。

## 3. 自动验证

- browser port：共享 channel 准备、tone 包络、停止时刻、source tracking 与幂等停止；
- controller：sequence／note schedule、活动音符、自然完成、pending A→B、迟到 rejection、
  当前 prepare rejection、已清 timer 的迟到 callback、timer 建立失败、主动／全局停止、
  schedule failure、失败后重试、无效输入和 dispose；
- hook lifecycle：React StrictMode synthetic unmount→remount 不提前 dispose，真实最后卸载只
  dispose 一次；
- source contract：页面不再持有目标音 playback context、oscillator 或 timeout refs，且薄 hook
  显式注入共享 audio port 与全局停止；
- focused tests、lint、typecheck、Web／mobile build、Android local validator 与远端 Quality
  给出最终自动化结果。

## 4. 外部 QA

真实 Chrome／Safari／Firefox 的首次恢复、快速 A→B、音量与静音；Android System WebView／
已安装 APK 的扬声器／耳机、后台／锁屏、音频焦点、三档设备、20 轮稳定性、人工可访问性
和目标用户任务均为 `NOT_EXECUTED`。模拟 AudioContext、自动测试和 Debug APK 构建不能替代
这些证据。
