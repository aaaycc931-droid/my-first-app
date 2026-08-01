# 本机课程进度 repository port 抽离验收

状态：**UI 重构兼容性实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- 在既有 `mobileCourseProgressStorage` runtime 中增加语义化
  `MobileCourseProgressRepository`，提供 `load`、`save` 和 `clear` command。
- 浏览器 `localStorage` 只由 Android composition root 选择的 adapter 访问；
  `LocalCoursePathPanel` 与 `LocalLearningOverviewPanel` 必须由 `App` 显式注入
  repository，不得直接访问 `window.localStorage`。
- 本切片只改变依赖方向和测试接缝，不改变页面、导航、用户文案、课程、题目、
  Activity、统计、复练或建议行为。
- 不新增账号、网络、数据库、权限、云端协议、持久化 key、schema 或迁移。

## 必须保持的存储与数据契约

- storage key 仍为 `solfeggio.mobile.course-progress.v1`；课程 schema 仍为
  `local-course-path-v1`，内容版本仍为 `zh-foundation-2026.1`。
- 序列化内容继续只包含课程／课节标识、内容版本、完成指纹和 revision；不得保存
  答案、正确性、录音、Blob、PCM、音高帧、原始分析证据或 ActivitySession。
- 未知 schema、不同内容版本、未知课节、指纹不一致、重复课节与畸形数据继续
  fail closed，不得猜测迁移或把安全空值冒充真实空进度。
- `LocalLearningOverviewPanel` 的课程来源失败只关闭课程摘要，练习事实、复练和建议
  仍按各自来源独立工作。

## 失败关闭与 UI 行为

- 完成课节必须先由 repository `save` 成功，再更新当前课程进度与解锁状态；保存失败
  时不得在本次会话冒充已完成。
- 重置必须保留页面内二次确认，并先由 repository `clear` 成功，再发布空进度；清除
  返回失败或直接抛出异常时必须保留原进度、原存储和既有失败提示。
- storage 不可用、读取失败或数据损坏时继续使用既有简体中文原因；核心本地练习仍
  可继续，不新增联合清除或跨来源写入。

## 自动验收

- `test:local-course-path` 覆盖原始 storage 函数及 repository 的 load／save／clear、
  延迟 storage provider 和不可用路径。
- `test:mobile-course-path-behavior` 使用注入的内存／失败 repository，覆盖保存成功、
  保存失败不更新 UI，以及清除失败保留原 UI 与原数据。
- `test:mobile-learning-overview-behavior` 使用注入 repository，继续覆盖课程来源损坏时
  其他三个来源不受影响。
- `validate:android-local` 的 source contract 要求两个组件都不含
  `window.localStorage`，并要求 `App` 在课程页和学习总览两处显式注入 browser
  repository。
- focused tests、lint、typecheck、documentation／repository hygiene、Android local
  validator 和 `git diff --check` 必须在当前提交重新通过。

## 外部证据

Android WebView 跨重启持久化、配额／存储禁用、进程重建、真机课程完成与重置、
可访问性人工审查和中文目标用户验收继续为 `NOT_EXECUTED`。自动 DOM 测试、source
contract、CI 与 Debug APK 不替代上述证据。

本切片不表示课程 controller、其他学习存储、App shell 或最终 UI 重构已经完成。
