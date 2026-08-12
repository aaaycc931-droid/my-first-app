# 本地旋律参考音频解码 controller 验收

状态：**Active implementation acceptance**

最后核验：2026-08-12

规范来源：`docs/final-ui-refactor-compatibility-contract.md`

## 1. 动机

`/practice` 的本地旋律参考音频导入此前直接在页面中创建 `AudioContext`、读取文件、
调用 `decodeAudioData`、复制首声道并通过 run id 屏蔽迟到结果。既有 guard 能保护多数
快速替换场景，但平台 side effect、来源 identity、React 生命周期和下游草稿失效仍由
大型页面共同编排，难以独立验证。

本切片把浏览器解码放入可替换 port，把选择、清除、latest-wins generation、状态发布和
卸载失效放入框架无关 controller。React hook 只负责订阅和生命周期绑定。

## 2. 必须改变

- 页面不再直接创建 `AudioContext`、读取 `arrayBuffer` 或调用 `decodeAudioData`；
- 新选择同步清除旧 PCM、错误、目标音高曲线草稿、检查选择和临时目标；
- A 解码未完成时选择 B，A 的迟到成功或失败不能覆盖 B；
- pending 时清除、无文件选择或卸载，迟到结果不能重新发布；
- adapter 复制首声道数据，并在成功、读取失败、解码失败和复制失败后尽力关闭 context；
- context cleanup 失败不能覆盖成功结果或原始解码失败；
- 解码失败继续显示简体中文、非技术性的可恢复提示；
- 新 controller 测试进入 Quality 与 runtime lane ownership 清单。

## 3. 必须保留

- 文件入口、`audio/*,.wav,.mp3,.m4a` 接受范围与浏览器 codec 能力边界；
- 来源文件名、类型、大小、时长、采样率、声道数与 `MediaProject` 映射；
- 只把首声道的会话内副本交给既有目标音高曲线草稿算法；
- 本地、当前会话、无上传、无云处理、无账号数据库与非评分边界；
- 重新生成、检查、确认临时目标以及清除／替换来源后的失效语义；
- 不新增持久化、网络、正式转写、正式评分、通过／失败或 AI 调用。

## 4. 验证边界

自动测试必须覆盖 adapter cleanup、稳定首声道副本、latest-wins、clear/detach、错误状态、
StrictMode synthetic unmount 与页面 source contract。

真实 WAV/MP3/M4A codec、Safari／Firefox、Android System WebView／已安装 APK、低内存、
后台／锁屏、长文件性能、真实旋律草稿质量、可访问性和目标用户 QA 均保持
`NOT_EXECUTED`。

QA level recommendation：**strict**。
