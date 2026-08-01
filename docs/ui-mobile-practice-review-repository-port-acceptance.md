# 本机复练队列 repository port 抽离验收

状态：**UI 重构兼容性实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- 在既有 `mobilePracticeReviewStorage` runtime 中增加语义化
  `MobilePracticeReviewRepository`，提供 `load`、`save` 和 `clear` command。
- 浏览器 `localStorage` adapter 只由 Android composition root 选择并注入；`App` 只
  消费 repository，不再直接编排复练队列的 browser storage helper。
- 本切片只改变依赖方向和测试接缝，不改变页面、导航、用户文案、题序、Activity、
  复练分组、建议或画像行为。
- 不新增账号、网络、数据库、权限、云端协议、持久化 key、schema 或迁移。

## 必须保持的存储与数据契约

- storage key 仍为 `solfeggio.mobile.practice-review-queue.v1`；当前 schema／catalog
  version、旧记录迁移链、最多 12 项和 MRU 顺序保持不变。
- 每项继续只保存复现题目所需的稳定目标，不得新增用户选择、答案内容、录音、Blob、
  PCM、ActivitySession、正式分数、正确率、等级或能力评级。
- 无效或无法迁移的数据继续按既有规则尝试自动清除；清除失败、读取失败和 storage
  不可用继续返回既有安全空队列、`sourceStatus` 与简体中文 notice。
- 旧记录迁移后的回写失败继续保留已恢复队列并显示既有提示，不把回写失败误报为
  数据丢失，也不静默伪造已持久化的新版本。

## 失败关闭与 UI 行为

- 答题核对继续先生成候选队列并调用 repository `save`；只有保存成功才更新 React
  state、来源状态和答对移除／答错加入提示。
- 清空继续保留页面内二次确认；只有 repository `clear` 成功才发布空队列并离开当前
  复练目标。失败时保留原队列、原目标和既有提示。
- repository provider 不可用或直接抛错时必须降级为既有不可用结果，其他本地练习
  仍可继续。
- 课程进度、学习画像、本机练声记录和本机谱项目保持独立；本切片不清除或重写它们。

## 自动验收

- `test:mobile-practice-review-storage` 覆盖原始 storage 函数以及 repository 的
  `load`／`save`／`clear`、延迟 storage provider 和 provider 抛错降级。
- `test:mobile-practice-review-behavior` 继续通过真实挂载 `App` 覆盖答错加入、答对
  移除、清空取消／确认、迁移、损坏数据和存储失败不更新 UI。
- `test:mobile-practice-review-ui-contract` 继续保护 save-first 和清空确认边界。
- `validate:android-local` 要求 repository port、factory 和 browser adapter 存在，
  `App` 只调用注入的 repository，并由 `mobile/src/main.tsx` 显式注入 browser adapter。
- focused tests、lint、typecheck、documentation／repository hygiene、Android local
  validator、移动端构建和 `git diff --check` 必须通过。

## 外部证据

真实浏览器 `localStorage` 跨刷新、Android WebView 跨重启／配额／存储禁用、进程重建、
真机答错加入／答对移除／清空、可访问性人工审查和中文目标用户验收继续为
`NOT_EXECUTED`。自动 DOM 测试、source contract、CI 与 Debug APK 不替代上述证据。

本切片不表示完整 learning controller、App shell、navigation state 或最终 UI 重构已经
完成。
