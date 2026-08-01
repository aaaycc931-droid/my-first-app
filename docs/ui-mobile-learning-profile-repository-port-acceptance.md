# 本机学习画像 repository port 抽离验收

状态：**UI 重构兼容性实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- 在既有 `mobileLearningProfileStorage` runtime 中增加语义化
  `MobileLearningProfileRepository`，提供 `load`、`save` 和 `clear` command。
- 浏览器 `localStorage` adapter 只由 Android composition root 选择并注入；
  `App` 只消费 repository，不再直接编排学习画像的 storage helper。
- 本切片只改变依赖方向和测试接缝，不改变页面、导航、用户文案、Activity、统计、
  复练、建议或画像行为。
- 不新增账号、网络、数据库、权限、云端协议、持久化 key、schema 或迁移。

## 必须保持的存储与数据契约

- storage key 仍为 `solfeggio.mobile.learning-profile.v1`，学习事件与画像的 canonical
  schema、迁移链和最多 48 条最近事件保持不变。
- 继续只保存既有最小练习事实；不得新增答案内容、录音、Blob、PCM、音高帧、
  `ActivitySession`、正式分数、等级或能力评级。
- 新存储继续使用显式默认建议开关；旧版、畸形或不可用数据继续按既有规则恢复为
  关闭建议的安全空历史，并保留对应 `sourceStatus` 与中文 notice。
- 统计、建议和总览继续只消费既有学习事实，不与课程进度或复练队列建立新的联合
  存储或原子提交协议。

## 失败关闭与 UI 行为

- 答题核对、开始复练和建议开关只有在 repository `save` 成功后才更新画像 state；
  保存失败时不得把未持久化事件或设置显示为已保存。
- “重置画像”继续先建立 `resetLocalLearningHistory` 候选再调用 `save`；只有保存成功
  才发布空历史。不得改用 `clear`，否则会改变“保留建议开关”的既有语义。
- repository provider 不可用或直接抛错时必须降级为既有不可用结果，核心本地练习
  仍可继续。
- 复练队列、课程进度、本机练声记录和本机谱项目保持独立；本切片不清除或重写它们。

## 自动验收

- `test:mobile-learning-profile-storage` 覆盖原始 storage 函数以及 repository 的
  `load`／`save`／`clear`、延迟 storage provider 和 provider 抛错降级。
- `test:mobile-practice-review-behavior` 继续通过真实挂载 `App` 覆盖初始化、答题事实、
  复练开始、建议开关、画像重置和存储失败不更新 UI。
- `validate:android-local` 要求 repository port、factory 和 browser adapter 存在，
  `App` 只调用注入的 repository，并由 `mobile/src/main.tsx` 显式注入 browser adapter。
- focused tests、lint、typecheck、documentation／repository hygiene、Android local
  validator、移动端构建和 `git diff --check` 必须通过。

## 外部证据

真实浏览器 `localStorage` 跨刷新、Android WebView 跨重启／配额／存储禁用、进程重建、
真机答题与画像重置、可访问性人工审查和中文目标用户验收继续为 `NOT_EXECUTED`。
自动 DOM 测试、source contract、CI 与 Debug APK 不替代上述证据。

本切片不表示复练队列 repository、完整 learning controller、App shell 或最终 UI 重构
已经完成。
