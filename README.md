# 视唱练耳学习平台

面向中文学习者的视唱练耳平台。当前最高优先级是可私下分发、无需访问生产网站即可运行的 Android 本地 APK；Web 入口及其 Supabase 账户、课程和私人记录能力继续保留，但不作为 APK 启动依赖。

正式版 V1 的唯一范围与完成标准见 [`docs/final-release-definition-of-done.md`](docs/final-release-definition-of-done.md)，实时状态见 [`docs/final-release-status-matrix.md`](docs/final-release-status-matrix.md)，Android 路线见 [`docs/android-apk-release-plan.md`](docs/android-apk-release-plan.md)，已经真实交付的阶段事实见 [`docs/mvp-status.md`](docs/mvp-status.md)。

AI 音乐小伙伴与智能体已经纳入未来产品方向，详细路线见 [`docs/ai-music-companion-agent-roadmap-2026-07-18.md`](docs/ai-music-companion-agent-roadmap-2026-07-18.md)；单伙伴先行测试、未来多伙伴以及“伙伴人格 × 学习风格”的细化路线见 [`docs/ai-music-companion-single-companion-pilot-roadmap-2026-07-18.md`](docs/ai-music-companion-single-companion-pilot-roadmap-2026-07-18.md)。该方向当前只进入产品与架构规划，不改变项目暂停点，也不代表已经启动运行时开发。

下方“五线谱识别 MVP”章节保留早期项目背景；其中对“当前能力”的描述不应替代上述实时状态文件。

## Android 本地私测包

Android 客户端使用 Vite + Capacitor，将本地首页、单音、音程、节奏和旋律听写练习直接打入 APK。移动构建不配置远程服务器、不包含生产 Supabase 配置，Android 清单不声明网络权限。

开发构建要求 Node.js 22.12+、JDK 21、Android SDK 36 和 Build Tools 35：

```bash
npm run mobile:build
npm run validate:android-local
npm run android:sync
npm run android:build:debug
```

调试 APK 默认位于 `android/app/build/outputs/apk/debug/app-debug.apk`。私测和最终私下正式包的验收边界见 [`docs/android-apk-release-plan.md`](docs/android-apk-release-plan.md)。

## 早期 OMR MVP 背景（历史）

项目使用 Next.js、TypeScript 和 Tailwind CSS。最早从“上传乐谱图片 → 调用识别接口 → 展示并试听音符结果”的五线谱识别 MVP 起步，现已扩展为以听辨、视唱、节奏、反馈和钢琴辅助为主体的学习平台。

当前图片上传识别流程仍使用 mock provider：用户上传图片后，接口会返回模拟音符数据，用于验证前端上传、状态提示、结果展示和播放链路。真实五线谱图片识别 / OMR 尚未完成。

## 早期 OMR 能力记录（历史）

当前 MVP 已实现以下核心功能：

- 支持上传五线谱图片。
- 支持在页面中预览已上传的图片。
- 支持调用识别接口发起五线谱识别流程。
- 识别接口当前通过 mock provider 返回模拟音符数据，用于验证前端流程。
- 支持展示每个音符的音高、时值、置信度、小节和拍点。
- 支持按节奏播放钢琴音，便于试听识别结果。
- 支持 BPM 控制，用于调整播放速度。
- 已存在 MusicXML parser，可将受支持的 MusicXML 内容转换为当前识别结果使用的音符结构。
- 已存在 dev-only MusicXML 导入 UI 和 dev API，用于上传 `.musicxml` / `.xml` 文件并验证解析链路。
- 已存在 Audiveris 相关 dry-run / fixture 验证基础，但尚未成为默认识别链路。

## 早期 OMR 边界记录（历史）

以下能力尚未在当前 MVP 中完成，避免误解为已支持的正式功能：

- 图片上传识别仍是 mock provider，不代表已经支持真实图片 OMR。
- MusicXML 导入只是开发验证入口，用于验证 MusicXML parser 和识别结果展示链路；它不代表已经支持自动图片 OMR。
- 真实五线谱图片识别 / OMR 还没有完成。
- MIDI 导出还没有完成。
- Audiveris 自动接入还没有成为默认识别链路。
- 手机拍照优化还没有完成。

## 下一阶段计划

下一阶段将继续围绕最小可用产品迭代，优先补齐真实识别、验证链路与结果导出能力：

1. 实现真实 OMR 流程，逐步替换当前 mock provider 返回的模拟音符数据。
2. 增加 MIDI 导出能力，让识别结果可以导出为可播放文件。
3. 完善 MusicXML 验证链路，用真实和合成样本持续校验 parser 与 UI 展示结果。
4. 评估 Audiveris 接入方式，明确是否以及如何将其纳入默认识别链路。
5. 优化手机拍照上传体验，提升移动端拍摄、裁剪和识别前处理的可用性。

## 依赖说明

`package.json` 已按 Next.js 项目的常规方式整理依赖：

- `dependencies`：生产运行时需要的 `next`、`react`、`react-dom`。
- `devDependencies`：TypeScript、ESLint、Tailwind CSS、PostCSS、Autoprefixer 和类型声明等构建/开发工具。

当前环境访问 npm registry 会返回 `403 Forbidden`，因此无法在本地生成 `package-lock.json`。依赖声明本身是有效的；请在能访问 npm registry 的网络环境中运行 `npm install`，生成并提交 `package-lock.json` 后再部署。

## 本地运行

1. 安装依赖：

   ```bash
   npm install
   ```

2. 启动开发服务器：

   ```bash
   npm run dev
   ```

3. 在浏览器中打开：

   ```text
   http://localhost:3000
   ```

## 常用命令

```bash
npm run dev    # 启动本地开发环境
npm run build  # 构建生产版本
npm run start  # 启动生产服务器
npm run lint   # 运行 Next.js lint 检查
```


## 本地验证

未来 PR 推荐先运行统一的本地验证入口：

```bash
npm run validate:local
```

`validate:local` 只是 validation ergonomics 聚合入口，会按顺序串联现有 synthetic pitch benchmark、dev OMR API boundary、repository hygiene、recognition boundary、MusicXML/MXL validation 和 `npm run build`。它不改变任何现有 validation command 的行为，不改变 UI、API、pitch algorithm、scoring、rhythm、AI、upload、providers、Audiveris 行为，也不新增依赖。

`git diff --check` 不是 npm command，因此没有放进 `validate:local`；提交 PR 前仍应单独运行：

```bash
git diff --check
```

## 部署到 Vercel

1. 在可访问 npm registry 的环境中运行 `npm install`，确认生成 `package-lock.json`。
2. 提交 `package-lock.json` 到当前 Git 仓库。
3. 将仓库推送到 GitHub、GitLab 或 Bitbucket。
4. 在 Vercel 中选择 **Add New... → Project** 并导入该仓库。
5. 保持默认 Next.js 配置即可：Install Command 为 `npm install`，Build Command 为 `npm run build`，Output Directory 留空。
6. 点击 **Deploy**。如项目后续需要环境变量，请在 Vercel Project Settings 的 **Environment Variables** 中添加后重新部署。

Current MVP status: see docs/mvp-status.md

Real OMR production architecture plan: see docs/real-omr-architecture-plan.md

OMR sample and fixture strategy: see docs/omr-sample-fixture-strategy.md

Public demo checklist: see docs/public-demo-checklist.md

Practice learning system plan: see docs/practice-learning-system-plan.md

Practice Mode manual QA checklist: see docs/practice-mode-manual-qa-checklist.md

Pitch evaluation benchmark plan: see docs/pitch-evaluation-benchmark-plan.md
