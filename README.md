# my-first-app

五线谱识别 MVP / sheet music recognition MVP。

## 项目简介

这是一个使用 Next.js、TypeScript 和 Tailwind CSS 构建的五线谱识别 MVP。当前目标是先验证“上传乐谱图片 → 调用识别接口 → 展示并试听音符结果”的最小流程，而不是完整的个人作品集网站。

当前图片上传识别流程仍使用 mock provider：用户上传图片后，接口会返回模拟音符数据，用于验证前端上传、状态提示、结果展示和播放链路。真实五线谱图片识别 / OMR 尚未完成。

## 当前功能

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

## 当前边界

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
