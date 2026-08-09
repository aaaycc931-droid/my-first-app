# 本机会话录音 MediaRecorder capture port 验收

状态：**Implementation candidate；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 用户价值与范围

- Android／共享实时音高组件的会话录音继续由用户主动开始和停止，但浏览器
  `MediaRecorder` 构造、codec 选择、事件绑定、chunk 汇集与底层清理统一进入可替换的
  capture port。
- React hook 只持有 capture handle、录音 generation 和用户状态；它不再直接构造
  `MediaRecorder`、绑定 `ondataavailable` 或管理 chunk 数组。
- 本切片只改变依赖方向和可测试接缝，不改变界面、录音数据、分析、保存、回放或活动语义。

## 保持不变的录音契约

- codec 优先级仍为 `audio/webm;codecs=opus` → `audio/webm` → `audio/mp4`；全部不支持时
  继续使用浏览器默认构造参数。
- recorder 仍以 250 ms timeslice 启动，只汇集非空 chunk，并使用 recorder 实际
  `mimeType`（缺失时 `audio/webm`）生成单一 Blob。
- 无 recorder、构造／启动失败、运行期 error 和空录音继续显示既有简体中文恢复提示；
  实时曲线仍可使用，不上传、不自动保存，也不生成分数。
- 正常停止交付当前 Blob；丢弃、清空、替换、全局停止所触发的作废和组件卸载继续释放
  handle、麦克风轨与计时器，且被 dispose 的 recorder 不得交付最终 Blob 或错误。
- hook 的 recording generation 继续拒绝旧 recorder 的迟到 stop／error；旧回调不得覆盖
  新录音、恢复已丢弃录音或改变新尝试状态。

## 重入与清理

- handle 必须先进入 hook 所有权，再执行 `start()`；即使测试 adapter 在 start 内同步
  触发 stop／error，最终状态也不得被迟到写回“正在录音”。
- `stop()` 与 `dispose()` 必须失败关闭；底层 stop 抛错不得中断 React 清理、组件卸载或
  后续丢弃。dispose 后的 data／stop／error 回调全部无效。
- 本切片不修改 getUserMedia、AudioContext、录音起点、Blob 回放 controller、IndexedDB、
  schema、P112/P113 分析、Activity、网络或云端边界。

## 自动验收

- focused port 测试覆盖能力检测、codec 优先级、默认构造、250 ms timeslice、非空 chunk、
  Blob 类型、空录音、运行期错误、同步 stop、start/stop 抛错与幂等 dispose。
- mounted behavior 覆盖开始／停止／丢弃／卸载／全局停止、无 recorder、同步 stop／error、
  stop 抛错以及既有分析与回放回归。
- source contract 阻止共享实时音高 hook 重新直接构造 `MediaRecorder`、绑定
  `ondataavailable` 或持有 chunk 数组，并要求 browser adapter 保留上述契约。
- focused tests、typecheck、lint、移动构建、Android local validator、文档卫生和
  `git diff --check` 必须通过。

## 外部证据

真实浏览器 codec／权限策略、Android WebView、后台／锁屏／来电、三档 Android 真机、
真实录音、20 轮稳定性、人工可访问性和目标用户验收仍为 `NOT_EXECUTED`。模拟 recorder、
自动测试和 Debug APK 构建不能替代这些证据，也不关闭 V1-05、V1-18 或 V1-24。
