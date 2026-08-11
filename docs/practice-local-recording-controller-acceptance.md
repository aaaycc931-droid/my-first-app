# 练习页本地录音 controller 验收边界

文档角色：**Active acceptance / 本地录音可靠性与 UI 抽离边界**

状态：**Implementation candidate**

规范来源：`docs/final-ui-refactor-compatibility-contract.md`

QA level recommendation：**strict**

## 1. 范围

本切片把 `/practice` 本地录音原型中的麦克风权限请求、MediaRecorder 生命周期、录音
Blob 所有权和按钮回放编排移入框架无关 controller，并由 React composition hook 注入
浏览器 input、capture 与 Blob playback ports。

用户流程保持“开始录音 → 停止 → 本地播放／分析／音高估计／起音检测 → 清除”。新增的
可靠性行为是：

- 权限请求期间显示明确状态，禁止重复开始，并允许取消；
- 取消、替换、全局停止或卸载后的迟到 resolve／reject 不能启动录音或覆盖新状态；
- 每条过期媒体流都停止自身 tracks，不能停止替代录音；
- recorder 同步启动失败、运行错误、空录音和回放失败均失败关闭并保留可恢复动作；
- 完成录音仍生成新的 attempt key，既有本地分析与非评分练习历史语义不变；
- Blob 按钮回放纳入全局音频停止，预览 URL 在 composition hook 中随 Blob 替换／卸载释放。

## 2. 明确不在本切片

- 不改变音高估计、起音检测、节奏反馈或正式评分边界；
- 不上传、持久化或同步录音；
- 不改变 Android 权限声明、原生 bridge、录音格式或专用签名；
- 不宣称真实浏览器、Android WebView／真机、后台／锁屏、音频焦点或长循环已验证；
- 不代表 `app/practice/page.tsx` 的其余 controller／timer 抽离或最终 UI 重构完成。

## 3. 自动验证

- controller focused tests：权限拒绝、不支持、取消、替换、迟到流 cleanup、录音完成、
  空数据、capture 错误、回放结束／失败／重试、全局停止和卸载；
- source contract：页面不再直接调用 getUserMedia、MediaRecorder、Object URL 创建或
  `new Audio`，composition hook 显式注入现有浏览器 ports；
- lint、typecheck、Web／mobile build、Android local validator 与 Quality 由当前 PR 远端
  checks 给出最终结果。

## 4. 外部 QA

真实 Chrome／Safari／Firefox 权限允许、拒绝、取消与重新允许；Android System WebView
及已安装 APK 的录音、播放、后台／锁屏、音频焦点、三档设备与 20 轮稳定性均为
`NOT_EXECUTED`，自动测试和 Debug APK 构建不能替代这些证据。
