# 全能音乐学习与创作系统

面向中文学习者，覆盖练声/音准、视唱练耳、乐理、专业钢琴、制谱/识谱、伴奏/歌曲工作台、学习系统与 AI 音乐伙伴。当前最高优先级是可私下分发、无需访问生产网站即可运行的 Android 本地 APK；Web 入口及其 Supabase 账户、课程和私人记录能力继续保留，但不作为 APK 启动依赖。离线优先是当前实施边界，不是最终产品终局。

正式版 V1 的唯一范围与完成标准见 [`docs/final-release-definition-of-done.md`](docs/final-release-definition-of-done.md)，实时状态见 [`docs/final-release-status-matrix.md`](docs/final-release-status-matrix.md)，P113 之后包含伙伴系统的统一开发顺序见 [`docs/unified-development-roadmap-with-ai-music-companion-2026-07-18.md`](docs/unified-development-roadmap-with-ai-music-companion-2026-07-18.md)，Android 路线见 [`docs/android-apk-release-plan.md`](docs/android-apk-release-plan.md)，已经真实交付的阶段事实见 [`docs/mvp-status.md`](docs/mvp-status.md)。

AI 音乐小伙伴与智能体已经纳入长期产品终局；能力、安全与智能体原则见 [`docs/ai-music-companion-agent-roadmap-2026-07-18.md`](docs/ai-music-companion-agent-roadmap-2026-07-18.md)，单伙伴先行、未来多伙伴以及“伙伴人格 × 学习风格”见 [`docs/ai-music-companion-single-companion-pilot-roadmap-2026-07-18.md`](docs/ai-music-companion-single-companion-pilot-roadmap-2026-07-18.md)。当前已完成 S1 本机谱项目闭环及多项 S2 记谱能力，正在沿 S3 推进严格子集的标准格式导入、导出和仓库内部语义 round-trip；这不表示完整格式往返、第三方独立阅读器、OMR 或伙伴运行时已经完成。

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
- 已存在 dev-only MusicXML 导入 UI 和 dev API，用于上传 `.musicxml` / `.xml` / `.mxl` 文件并验证解析链路。
- 本机谱项目已有首个正式受控导入入口：支持明确的单声部 MusicXML／MXL 子集，先生成内存候选和 blocking ledger，用户确认后才原子新增保存。
- 本机谱项目已具备同一严格子集的 MusicXML／MXL 受控导出：先生成内存候选和 blocking ledger，用户明确确认后才下载；当前严格子集已覆盖 note/rest 单附点、延长记号和 `pp`–`ff` 受控力度记号，pitched note 的规范化单段歌词、`1–5` 单指法和 accent／staccato／tenuto 单音演奏法、同声部相邻且时间连续 note 的圆滑线，以及同音高 note 的延音线 start／stop、跨小节和链式关系的仓库内部双向 round-trip。re-import 与 legacy parser 交叉检查不等于第三方独立阅读器验收。
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

下一阶段继续围绕最小可用产品迭代，先完成标准格式的受控确认链，再进入更广格式和 OMR：

1. 在真实浏览器、Android WebView／真机和 MuseScore 等外部独立阅读器中验证下载与重开；未执行前保持 `NOT_EXECUTED`。
2. 继续以 fail-closed 小切片扩大经无损验证的 MusicXML 子集；当前单附点、单段歌词、单指法、单音演奏法、单事件力度记号、延长记号、严格圆滑线和严格延音线支持不代表完整 MusicXML。
3. 在 MusicXML 严格子集继续稳定后，再实现 MIDI 导入导出。
4. 实现真实 OMR 流程，逐步替换当前 mock provider 返回的模拟音符数据。
5. 评估 Audiveris 接入方式并优化手机拍照、裁剪和识别前处理体验。

浏览器真实下载、Android WebView／真机、第三方独立阅读器、真实音频、教师审核、
MIDI、OMR、完整 MusicXML、S3 与正式版 V1 均仍为 `NOT_EXECUTED` 或未完成。

## 依赖说明

`package.json` 已按 Next.js 项目的常规方式整理依赖：

- `dependencies`：生产运行时需要的 `next`、`react`、`react-dom`。
- `devDependencies`：TypeScript、ESLint、Tailwind CSS、PostCSS、Autoprefixer 和类型声明等构建/开发工具。

仓库已提交 `package-lock.json`；CI 和本地验证均使用 `npm ci` 保持依赖解析一致。

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
