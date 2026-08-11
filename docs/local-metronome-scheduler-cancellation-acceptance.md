# 本机共享节拍器启动取消验收

状态：**Implementation candidate；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 用户价值与适用范围

- 共享 `BrowserMetronomeScheduler` 同时服务 Web `/practice` 的独立节拍器、节奏练习、
  临时记谱节奏目标与延迟校准，Android／Web 参考钢琴节拍器，以及本机谱项目节拍器。
- 用户在浏览器恢复 AudioContext 的等待期间主动停止、全局停止、切换运行、离开页面或
  卸载组件后，旧启动不得复活界面、发出 click、触发拍点、遗留 timer 或干扰新实例。
- 本切片只补齐共享启动／取消生命周期，不改变 BPM、拍号、预备拍、细分、节奏反馈、
  非评分边界、中文文案、存储、schema、账号或网络能力。
- 本机谱项目的功能边界继续以 `docs/s1-local-score-project-metronome-acceptance.md` 与
  `docs/s1-local-score-project-transport-acceptance.md` 为准，本文件只收紧跨消费者的 runtime
  取消语义。

## 共享 scheduler 契约

- `start()` 返回 `Promise<boolean>`：只有当前实例仍拥有 AudioContext、完成首轮调度并安装
  timer 时返回 `true`；被 `stop()`、替换或生命周期清理取消时返回 `false`；当前实例真实的
  AudioContext 创建、恢复或调度失败仍抛错。
- 同一实例的并发 `start()` 共享进行中的启动结果；`stop()` 幂等并立即失效 pending start，
  清 timer、调度状态与 context，使后续 start 成为独立新运行。
- pending A 被停止后，无论 A 的 `resume()` 迟到成功或失败，都不得触发 beat、安装 interval、
  覆盖 B 的 timer/context 或让调用方显示旧错误；B 必须能独立启动和停止。
- `onBeat` 可同步触发 stop／全局停止；首轮 tick 返回后必须复核所有权，不得在重入停止后
  补装 interval。当前实例启动失败必须释放自身资源并允许重试。

## 调用方与页面生命周期

- 六个直接调用点都必须消费 boolean，并同时校验自己的 scheduler identity／generation；
  `false` 只表示已取消，不显示启动失败，不设置 running。
- `/practice` 的节奏练习、临时记谱节奏目标、延迟校准和独立节拍器中，A 的迟到成功／失败
  不得停止 B、清除 B 的运行状态或覆盖 B 的提示；页面卸载同时停止延迟校准 runtime。
- 参考钢琴与本机谱项目在主动停止、全局音频停止、失焦、后台和卸载后保持 idle；迟到拍点
  不更新 UI，取消后可以再次启动。

## 自动验收

- scheduler focused 测试覆盖 pending resolve／reject 后 stop、stop→restart 的 A／B 隔离、
  当前失败、single-flight、失败后重试、幂等 stop，以及 `onBeat` 重入停止不泄漏 interval。
- mounted 回归覆盖本机谱项目显式停止／全局停止／卸载、旧失败不停止新实例、取消结果不显示
  错误；transport、参考钢琴和 `/practice` 调用边界保持兼容。
- `test:metronome-foundation`、本机谱项目 metronome／transport、移动钢琴、节奏 tap／延迟校准／
  临时记谱节奏回归、typecheck、lint、移动构建、Android local validator、完整 `npm run check`
  与 `git diff --check` 必须通过。

## 外部证据

真实 Chrome／Edge／Firefox／Safari 的快速启停、切页与后台，Android System WebView／已安装
APK 的扬声器／耳机、锁屏、音频焦点、三档设备和 20 轮稳定性仍为 `NOT_EXECUTED`。模拟
AudioContext、自动测试和 Debug APK 构建不能替代这些证据，也不关闭既有正式发布门槛。
