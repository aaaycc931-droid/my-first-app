# 本机练声记录保存介质选择验收

状态：**Implementation candidate；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 用户价值与范围

- 用户结束本次练声后，可以明确选择“仅保存当前曲线”或“保存当前曲线和录音”。
- “仅保存当前曲线”是隐私最小化动作；即使当前会话仍有录音，也必须向 record factory
  传入 `recording: null`，且不得丢弃或改变尚在当前会话中的录音。
- “保存当前曲线和录音”是一次即时、明确的用户动作，只能保存点击当下的当前会话录音，
  不保留可在录音被替换后继续生效的旧选择状态。
- 既有“丢弃本次录音”继续只清除当前会话录音；本切片不新增自动保存或后台保存。

## 失败关闭与交互契约

- 两个保存动作都要求至少一帧曲线；没有曲线时禁用并显示中文原因。
- “保存当前曲线和录音”还要求存在已完成的当前会话录音；没有录音时禁用并显示中文原因。
- 录音超过 5 MiB 时只阻止包含录音的保存；用户仍可仅保存曲线。
- 保存期间同时锁定两个动作并拒绝重复提交；record 使用点击时取得的曲线、录音和介质选择。
- repository resolve 前不得新增列表、改变选中记录、清空备注或显示成功。
- repository reject 时保留既有列表、选中记录、备注、当前曲线和当前录音，并显示可重试错误。
- 成功提示必须区分“已仅保存曲线”和“已保存曲线和录音”，记录列表继续以
  “仅曲线／含录音”显示实际持久化结果。

## 保持不变的边界

- IndexedDB database、store、version、key path 和 `schemaVersion: 1` 不变。
- 最多 20 条、最近 600 帧、备注 200 字、目标快照和单条录音 5 MiB 上限不变。
- JSON 导出仍不含录音二进制；录音只存在应用私有 IndexedDB，不上传、不写账号或云端。
- 不修改麦克风权限、录音／停止／回放／丢弃生命周期、A4 Activity、本地分析、
  实时音高算法、练声目标、网络权限或 Android 原生配置。

## 自动验收

- behavior test 覆盖初始无曲线、已有曲线但无录音、两种保存动作、当前录音不因仅保存曲线
  而被丢弃，以及 repository reject 不提前改变 UI。
- storage/UI source contract 同时要求两个中文动作和显式 `recording` 选择边界。
- Android local validator 要求移动 bundle 包含两个动作，不再接受旧的含糊保存文案。
- focused behavior、storage/UI contract、typecheck、移动构建、Android local validator、
  repository/documentation hygiene 与 `git diff --check` 必须通过。

## 外部证据

真实浏览器 IndexedDB 跨刷新、Android WebView 跨重启／配额、真实录音保存与回放、
人工可访问性、Android 真机和目标用户验收仍为 `NOT_EXECUTED`。本切片不表示 P104、
正式签名／升级、V1-05、V1-24、录音 controller 抽离或正式版本已经完成。Android 相关
普通 PR 的 CI 会生成并验证临时 Debug APK，但不上传 APK 工件；只有显式手动请求才上传
可下载的私测包。
