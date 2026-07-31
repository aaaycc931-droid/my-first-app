# 实时音高本机记录 storage port 抽离验收

状态：**UI 重构兼容性实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- 将本机练声记录的数据类型、纯创建／序列化函数和 repository port 放入平台无关的
  `lib/` 边界。
- IndexedDB 只作为该 port 的 browser adapter；Web 与 Android composition root
  必须显式注入同一 adapter，共享 `RealtimePitchMonitorPanel` 不得反向导入
  `mobile/src/runtime`。
- 本切片只改变依赖方向和可测试接缝，不改变页面布局、用户文案、录音／回放、
  JSON 下载、A4 Activity、实时音高算法或本机记录能力。
- 不修改 canonical schema、storage version、迁移链、账号、网络、权限或云端协议。

## 必须保持的存储与数据契约

- IndexedDB 数据库名仍为 `solfeggio-local-vocal-practice`，store 仍为 `sessions`，
  database version 仍为 `1`，keyPath 仍为 `id`。
- 记录继续使用 `schemaVersion: 1` 和
  `algorithmVersion: "autocorrelation-realtime-v1"`。
- 单条录音上限仍为 5 MiB；最多保存 20 条记录，同一 ID 仍可更新。
- note trim 后最多 200 字，target label 最多 80 字，target MIDI 仍限制在 `48–84`。
- 曲线仍只保留最近 600 帧，并复制帧对象；不得把调用者的可变数组或帧引用直接存入记录。
- 列表继续过滤损坏记录并按 `createdAt` 倒序。
- JSON 继续使用两空格格式，包含 `recordingIncluded`，不得包含录音二进制；
  录音 `Blob` 仍只保存在 IndexedDB。

## 失败关闭与 UI 行为

- `save`、`remove` 和 `clear` 只能在 IndexedDB transaction `oncomplete` 后成功；
  request `onsuccess` 不得提前发布成功。
- transaction abort／error 时，repository 必须 reject，UI 不得提前改变列表、选择项或
  清空确认状态。
- 初始读取失败只显示“本机记录暂时不可用”，实时练习继续可用。
- 保存、删除和清空只在 repository 成功后更新 React state；清空仍要求二次确认。
- 删除／清空／卸载仍停止已保存录音回放并回收 object URL。
- 每次事务结束后关闭 database；version change 继续关闭连接。
- adapter 不可用、损坏记录、容量超限和写入失败均不得静默伪造成功或改写既有记录。

## 自动验收

- 纯 record 测试覆盖 600 帧裁剪与复制、长度／范围／容量边界，以及 JSON 不含录音。
- IndexedDB adapter 测试覆盖保存、更新、20 条容量、倒序、损坏记录过滤、
  transaction abort 不提交、删除和清空。
- 组件行为测试使用内存 repository，覆盖 load/save/remove/clear 成功与失败关闭；
  取消清空不得调用 repository。
- source contract 要求共享组件不包含 `mobile/src/runtime`，port 精确包含
  `list/save/remove/clear`，Web 与 Android root 均显式注入 adapter。
- focused 测试、完整 Quality 注册门禁、production dependency audit、
  documentation/repository hygiene、lint、typecheck、Android version provenance、
  Android sync／local validation、移动端与 Next.js production build 及
  `git diff --check` 必须通过。

## 外部证据

真实 Web 浏览器 IndexedDB 跨刷新、Android WebView 跨重启／配额、JSON 下载、
录音回放、Android 真机、可访问性人工审查和目标用户验收继续为 `NOT_EXECUTED`。
自动 DOM、fake IndexedDB、CI 与 Debug APK 不替代这些证据。

本切片不表示实时音高整体 controller、音频／录音 adapter 或最终 UI 重构已经完成。
