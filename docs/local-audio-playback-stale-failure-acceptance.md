# Shared local audio playback stale failure acceptance

状态：**Active implementation acceptance**

最后核验：2026-08-17

## 1. Root cause / scope

共享 `useLocalAudioPlayback` 已在音频准备成功后用 request identity 阻止旧请求排程声音，
但旧 `prepareForUserGesture()` 在 replacement、显式停止或卸载后才拒绝时，catch 路径仍会
返回当前中文播放错误。基础单音、音程、节奏、和弦、和声、调式等调用者会把该旧错误写回
已经替换的题目或播放状态。

本切片只收紧共享 hook 的失败结果 ownership，不改变音频引擎、题目、音色、包络、时长、
答案、Activity、复练、课程持久化、布局或文案。

## 2. 必须改变

- replacement、显式停止或最终卸载使 pending request 失效后，旧准备 rejection 必须解析为
  `null`，不得发布错误或停止当前请求；
- 只有仍挂载且 request identity 仍为当前值的 rejection 才返回既有中文播放错误；
- 当前请求失败后必须回到空闲，并允许用户重新播放；
- 旧 rejection 不得执行 schedule callback、改变新请求的“准备中／播放中”状态或覆盖新 UI。

## 3. 必须保留

- 共享播放仍先全局停止其他 browser audio，再进入“准备中”；
- 成功准备后仍由调用者调度 oscillator/source，并按调用者返回的时长自然停止；
- 无效时长、当前准备失败和当前调度失败继续失败关闭；
- 当前失败继续使用“当前手机暂时无法播放本地声音。请确认媒体音量已开启后重试。”；
- 所有现有调用者 API 与正常成功、手动停止、全局停止和 StrictMode 行为保持不变。

## 4. 自动证据与 QA 边界

`test:browser-audio-engine` 中的 focused mounted behavior test 真实挂载共享 hook，覆盖：

- replacement 后旧准备 rejection 返回 `null`，新请求仍可进入播放；
- 显式停止后旧 rejection 返回 `null` 且保持空闲；
- 最终卸载后旧 rejection 返回 `null`，不执行调度；
- 当前 rejection 返回既有中文错误、回到空闲并允许成功重试。

测试命令注册到 `audio-rhythm` runtime lane 和 Quality workflow。真实浏览器、Safari、
Android WebView／真机、系统音频焦点、后台／锁屏、扬声器／耳机、人工可访问性和目标用户
QA 均为 `NOT_EXECUTED`。

QA level recommendation：**strict**。
