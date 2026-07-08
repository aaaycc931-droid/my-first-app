# AGENTS.md

## 项目入口定位

本项目最终定位为：面向中文用户的视唱练耳练习系统。

主体功能包括：

- 音高练习；
- 节奏练习；
- 听辨练习；
- 视唱练习；
- 练习反馈。

五线谱识别是练习内容生成的重要输入能力，不是孤立 OCR 工具。

私人歌曲练习是未来补全功能和个性化练习素材来源，不是当前最大主体。

练习反馈是视唱练耳训练闭环的关键支撑。

## Codex 必读文件规则

每次涉及 `/practice`、五线谱识别、视唱练耳、练习反馈、产品路线或功能规划任务时，开始实现前必须先读取：

- `docs/mvp-status.md`
- `docs/sight-singing-ear-training-feature-detail-map.md`
- `docs/private-cloud-song-practice-pipeline-plan.md`

如存在，也应读取：

- `docs/future-product-requirements-roadmap.md`
- `docs/final-product-shape-and-feature-map.md`

如果某个文件不存在，必须先说明，不要凭空假设其内容。

## 自动结果设计原则

所有自动识别、自动生成、自动分析出来的结果，都不能直接当最终结果。

必须经过：

```text
预览
→ 检查
→ 修改 / 确认
→ 再进入练习
```

适用对象包括：

- 五线谱识别结果；
- 目标音高曲线草稿；
- 私人歌曲分析结果；
- 节奏分析结果；
- 分句分析结果；
- 练习目标生成结果；
- 未来正式评分目标。

## UI 语言规则

项目默认面向中文用户。

所有用户可见 UI 默认必须使用简体中文。

英文只允许用于：

- 代码标识符；
- 类型名；
- 变量名；
- 函数名；
- 测试名；
- npm script；
- 开发者内部说明；
- 必要技术缩写，例如 Hz、BPM、MIDI、WAV、MP3、M4A、Alpha。

后续新增功能不得继续加入英文用户可见 copy，除非用户明确要求。

## 当前 MVP 边界

当前 MVP 仍保持：

- browser-local；
- session-only；
- non-scoring；
- diagnostic；
- no account；
- no database；
- no cloud；
- no upload；
- no persistent private library；
- no final target；
- no official transcription；
- no source separation；
- no full-song extraction；
- no formal scoring；
- no public sharing；
- no community。

未来允许账号、私有云、私人曲库，不代表现在可以实现。

## 当前阶段禁止事项

当前阶段禁止越界实现：

- 登录；
- 账号系统；
- 数据库；
- 云端；
- 上传；
- 支付；
- 会员；
- 正式评分；
- final target；
- official transcription；
- source separation；
- full-song vocal extraction；
- 社区；
- 公开主页；
- 用户互相关注；
- 评论区；
- 私信；
- 公开上传；
- 公开音乐分享；
- 公开资源库。

不要默认当前可以实现账号、数据库、云端、上传、正式评分或 final target。若未来任务涉及这些方向，必须先确认它属于单独设计阶段，而不是当前 MVP 默认能力。

## QA 分级规则

Codex 每次回报必须包含：QA level recommendation。

QA 分级：

- none：docs-only / test-only / no runtime change；
- light：copy / display / layout 小改，不改变 runtime semantics；
- standard：新增 UI 交互、导航状态、显示路径或按钮；
- strict：音频 runtime、录音、播放、reset / clear、practice target creation、scoring-like behavior、上传、云端、账号或核心练习流程变更。

不要每一步都要求 strict QA，但 strict 场景不能偷懒。

## 开发原则

- 只做 MVP，不做复杂优化。
- 每次只实现一个功能。
- 优先保证可运行，而不是完美。
- 所有改动必须可解释。
- 逐步开发，小步提交，避免大规模重构。

## UI 原则

- 简洁优先。
- 不要过度设计。
- 先功能后美观。
- 用户可见 UI 默认使用简体中文。

## 技术栈

- Next.js
- TypeScript
- TailwindCSS
