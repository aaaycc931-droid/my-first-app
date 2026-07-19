# P114l MediaProject / ResourcePackage / CapabilityResolver 验收标准

日期：2026-07-19

状态：implementation candidate

QA level recommendation：**strict**

## 1. 目标

P114l 为 P114 共享层补齐三个此前只有路线名称、没有真实运行时使用者的版本化对象：

- 本地旋律参考音频成为会话内、非破坏的 `media-project-v1`；
- 已随 APK/Web bundle 固定的 36 个 Splendid Grand Piano OGG 采样成为 `resource-package-v1`；
- 本地钢琴用 `capability-resolution-v1` 明确选择采样、兼容合成音降级或不可用状态。

## 2. MediaProject

- 只从用户主动选择的本地旋律参考音频元数据创建；不读取、复制或上传 PCM/Blob。
- 必须包含稳定 session project id、revision、状态、只读 original asset 和空的非破坏编辑图。
- selected/decoding 映射为 draft，decoded 映射为 ready，decode error 映射为 error。
- 文件名、MIME 和大小只保留在当前页面内存；清除来源或刷新页面后项目消失。
- UI 只显示项目状态和修订，不宣称正式歌曲项目、stems、云端保存或分析完成。

## 3. ResourcePackage

- 固定 package id、版本、来源、Public Domain 许可、36 文件、1,940,745 bytes、设备要求与删除方式。
- package SHA-256 为 `4a5e9ed5617dea1a329d0c85573ea76e0e81a81089d4dfda65a32ee50ea33cbc`。
- 摘要算法：按 OGG basename 字典序生成 GNU `sha256sum` 行，再对完整行序列计算 SHA-256。
- Android 本地校验必须重新读取 36 个实际文件计算摘要和大小，并与 manifest、TypeScript 运行时声明交叉核对。
- 资源包随应用提供，不静默下载或后台更新；随卸载或清除应用数据移除。

## 4. CapabilityResolver

| 条件 | 结果 |
| --- | --- |
| 无 Web Audio | unavailable，不选择伪 provider |
| Web Audio 可用但采样未启用 | fallback，使用兼容合成音 |
| Web Audio、采样和有效资源包均可用 | available，选择本地采样并保留兼容合成音降级 |
| 资源包元数据无效 | 失败关闭为 fallback，不引用无效 package id |

解析结果只陈述当前本地能力。单个 OGG 是否实际解码成功仍由既有 provider 在用户发声时验证；失败后必须继续使用兼容合成音，不能把静态 manifest 冒充已解码音频。

## 5. 自动门禁与边界

- focused tests 覆盖项目状态、稳定身份、只读原始资产、资源包正反校验和全部能力分支。
- Android validator 重新计算真实资产摘要与大小。
- 既有钢琴挂载行为、音频降级、移动构建、Next build、Lint 和 TypeScript 必须保持通过。
- 不新增依赖、权限、网络、上传、数据库、持久化、后台下载或正式评分。
- 自动测试和摘要一致不等于 Android 真机首次解码、扬声器听感、发声延迟或长期缓存稳定性。
