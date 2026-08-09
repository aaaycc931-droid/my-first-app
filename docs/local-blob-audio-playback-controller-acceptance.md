# 本机 Blob 音频回放 controller 验收

状态：**Implementation candidate；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 用户价值与范围

- 当前会话录音、已保存练声录音与录音后逐音片段回放统一通过平台无关的
  Blob playback port 和 latest-wins controller 执行。
- 用户快速从录音 A 切换到录音 B 时，A 的迟到 `play()` resolve／reject、
  `ended`／`error` 回调或片段 timer 不得停止 B、覆盖 B 的状态或显示陈旧错误。
- 主动停止、全局停止、来源替换、删除／清空、开始分析和组件卸载只清理当前回放；
  浏览器 object URL 必须恰好释放一次。

## 回放与失败关闭契约

- controller 状态为 `idle`、`starting`、`playing` 或 `error`，并携带当前请求 key；
  JSX 只订阅状态并转发播放／停止意图。
- 每次新播放先使旧 generation 失效，再停止旧 handle；旧 handle 的任何异步结果均被忽略。
- 当前请求的播放失败继续显示既有简体中文恢复提示，且不得删除或改变录音 Blob、曲线、
  已保存记录、目标信息或分析证据。
- 逐音片段保持既有起点和最短 100 ms 播放窗口；自然结束和 duration timer 均回到
  `idle`，但旧 timer 不得影响后续回放。
- 当前会话录音只有同一 Blob 的完整自然播放结束后才满足既有
  `hasCompletedRecordingPlayback` 门禁；主动停止、错误或被新请求替换均不算完成。

## 保持不变的边界

- 不修改 MediaRecorder、麦克风权限、录音开始／停止／丢弃、IndexedDB、schema、
  保存介质选择、JSON 导出、音高分析算法或 Activity 语义。
- 不新增网络、上传、账号、云端、评分、等级或通过／失败判断。
- 本切片只抽离浏览器 Blob 回放 side effect 与陈旧异步编排，不宣称最终 UI 重构完成。

## 自动验收

- browser port 测试覆盖 URL 创建／单次释放、起点、duration timer、自然结束、错误、
  `play()` rejection 与幂等停止。
- controller 测试覆盖 A→B 快速切换后的 stale resolve／reject／ended／error／timer，
  以及主动 stop 和 dispose。
- mounted behavior 覆盖当前会话录音、已保存记录和逐音片段的播放、停止与失败恢复；
  source contract 阻止三个共享编排文件重新直接使用 `new Audio` 或 object URL。
- focused tests、typecheck、lint、移动构建、Android local validator、文档卫生和
  `git diff --check` 必须通过。

## 外部证据

真实浏览器媒体策略、Android WebView、后台／锁屏、三档 Android 真机、真实录音、
长循环、人工可访问性和目标用户验收仍为 `NOT_EXECUTED`。自动测试和 Debug APK 构建
不能替代这些证据，也不关闭 V1-05、V1-18 或 V1-24。
