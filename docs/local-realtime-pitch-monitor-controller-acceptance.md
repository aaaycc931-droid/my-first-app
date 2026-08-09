# 本机实时音高练习 controller 验收

状态：**Implementation candidate；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 用户价值与范围

- 四个共享实时练习入口继续使用同一组状态与命令，但麦克风申请、实时采样、曲线更新、
  会话录音、当前录音回放和全局停止编排统一进入框架无关 controller。
- 浏览器 `getUserMedia`、`AudioContext`、analyser 和采样 timer 进入可替换的 realtime input
  port；React hook 只创建 controller、订阅 snapshot、转发命令并绑定组件／全局音频生命周期。
- 本切片只改变依赖方向和可测试接缝，不改变界面、中文提示、分析算法、曲线、录音 Blob、
  回放完成资格、保存、Activity 或练习判定。

## 保持不变的输入与状态契约

- 麦克风仍关闭 `echoCancellation`、`noiseSuppression` 和 `autoGainControl`；AudioContext 仍用
  `interactive` latency hint，analyser 保持 FFT 4096、无 smoothing，并每 50 ms 取样。
- monitor 状态仍为 `idle`／`requesting`／`listening`／`error`，录音状态仍为
  `empty`／`recording`／`ready`／`playing`／`error`；四个调用组件的 hook API 不变。
- `start` 清当前 frame／错误但保留既有曲线与录音；`stop` 结束录音并释放输入但保留已完成
  录音；`clear` 同时清曲线与录音。权限、启动、轨道中断和 AudioContext 中断继续失败关闭并
  显示既有简体中文提示。
- 当前会话录音继续复用 MediaRecorder capture port 的 codec、250 ms timeslice、非空 chunk、
  空录音和错误语义；回放继续复用 Blob playback controller，只有同一 Blob 自然完整结束才
  满足 analysis 的 completed-playback 门禁。
- 全局音频停止继续先停止当前回放；明确 suppress 的下一次全局停止只消费一次，不得停止
  正在建立的麦克风会话。组件卸载必须释放 input、capture 与 playback。

## 陈旧结果、重入与清理

- A→B 输入申请、录音或回放切换后，A 的迟到 permission／prepare／sample／stop／error／ended
  均不得覆盖 B；adapter 先 detach 底层资源，controller generation 再拒绝旧回调。
- input `prepare()` 单次共享进行中的 promise，`start()` 幂等；`onSamples` 同步触发 dispose 时
  不得再排一个无法清除的 timer。dispose、capture stop 或底层 close 抛错不得中断剩余清理。
- hook 不得重新直接访问 `navigator`、构造 AudioContext／MediaRecorder／Audio、管理 object
  URL、媒体 chunk、analyser、timer 或 generation。

## 明确不进入 controller 的职责

- 固定 A4 参考音、本机练声保存／下载、IndexedDB repository、P112/P113
  `OfflinePitchAnalysis`、旋律回唱／视唱 attempt、count-in 和 Activity 提交仍由既有边界负责。
- 不新增网络、上传、账号、schema、评分、等级、通过／失败或专业声乐判断；不宣称最终 UI
  重构完成。

## 自动验收

- realtime input focused test 覆盖约束、prepare single-flight、start 幂等、50 ms 采样、轨道／
  context 中断、幂等清理，以及 `onSamples` 内 dispose 不遗留 timer。
- controller focused test 覆盖 start／frame／curve、录音、自然完整回放资格、全局 stop suppress、
  输入中断、clear／detach、能力缺失和 generation 失败关闭。
- 既有 realtime monitor／offline analysis mounted suite 保持 27 项；旋律回唱／视唱行为套件与
  最小音程模唱 mounted 回归验证四个调用方 API 不漂移。
- source contract、typecheck、lint、移动构建、Android local validator、文档卫生、完整
  `npm run check` 和 `git diff --check` 必须通过。

## 外部证据

真实浏览器权限／媒体策略、Android WebView、后台／锁屏／来电、三档 Android 真机、真实
人声、20 轮稳定性、人工可访问性和目标用户验收仍为 `NOT_EXECUTED`。模拟 ports、自动测试
和 Debug APK 构建不能替代这些证据，也不关闭 V1-05、V1-18 或 V1-24。
