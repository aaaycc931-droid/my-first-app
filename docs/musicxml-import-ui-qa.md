# MusicXML 网页导入 UI 手动 QA（Phase A16 / A19）

## 范围

本清单验证 dev-only、experimental MusicXML 导入入口的关键边界。它不替代自动化浏览器
测试，也不验证自动 OMR 图片识别。执行前请确认仓库依赖已安装。

Phase A17 新增了
[`docs/musicxml-import-ui-acceptance.md`](./musicxml-import-ui-acceptance.md)，用于在本地浏览器
中逐项执行场景并记录环境、实际结果、问题和截图。该文件是人工浏览器验收记录模板，
不是自动化测试，也不会新增或运行浏览器自动化框架。

## Phase A20 状态反馈人工验收

Phase A20 的 Vercel Preview 人工验收记录草稿位于
[`docs/acceptance/musicxml-import-ui-status-feedback-2026-06-14.md`](./acceptance/musicxml-import-ui-status-feedback-2026-06-14.md)。

本轮重点验证 Phase A19 新增的 `idle`、`importing`、`success`、`error` 状态反馈，包括
初始提示、按钮禁用与 loading 文案、导入成功的 notes 数量、重新导入文案、错误提示，
以及 `.mxl` 拒绝、Tone.js 播放和原图片上传流程的回归。

该记录用于 Vercel Preview 中的人工浏览器验收，不是自动化测试，也不改变 Production
策略或现有自动化验证范围。

## A. 默认隐藏

1. 确保没有设置 `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED`。
2. 运行 `npm run dev`。
3. 打开首页。
4. 确认页面不显示 `Experimental: Import MusicXML` 区域。

## B. 开启后显示

1. 同时设置两个开发开关并启动应用：

   ```bash
   NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED=true \
   MUSICXML_DEV_API_ENABLED=true \
   npm run dev
   ```

2. 打开首页。
3. 确认页面显示 `Experimental: Import MusicXML` 区域。

## C. `.musicxml` / `.xml` 导入

1. 在两个开关均开启时，选择
   `lib/musicxml/__fixtures__/simple-score.musicxml`。
2. 点击“导入并验证播放”。
3. 确认导入期间显示“正在解析 MusicXML...”，按钮显示“正在导入...”且不可重复点击。
4. 确认成功后显示“导入成功，已解析 5 个音符”，按钮变为“重新导入 MusicXML”。
5. 确认现有“识别结果”区域显示 5 个 notes。
6. 确认 BPM 滑块、BPM 数值输入框和“播放识别结果”按钮仍可用。
7. 可将同一 fixture 复制为 `.xml` 后重复上述步骤，确认 `.xml` 扩展名也可进入导入流程。

## D. `.mxl` 拒绝

1. 在 MusicXML 文件选择器中选择任意 `.mxl` 文件。
2. 确认文件不会进入可上传状态，导入按钮保持不可用。
3. 确认页面显示：

   > 当前网页导入仅支持 .musicxml/.xml，请先将 .mxl 改名为 .zip 并解压出内部 XML 文件。

## E. API 未开启时的错误提示

1. 只开启 UI 开关，不开启服务端 API 开关：

   ```bash
   NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED=true npm run dev
   ```

2. 选择 `lib/musicxml/__fixtures__/simple-score.musicxml` 并尝试导入。
3. 确认页面在 MusicXML 导入区域显示友好错误，页面其余区域仍可操作。
4. 确认错误状态下不显示成功文案，且可重新选择有效文件后再次导入。
5. 再选择一张图片并调用现有图片识别流程，确认 MusicXML 错误不会破坏图片上传 MVP。

## F. 文件大小与空文件限制

1. 选择一个超过 2 MB 的 `.musicxml` 或 `.xml` 文件。
2. 确认页面显示“MusicXML 文件过大，当前最大支持 2 MB。”，文件不会进入可上传状态，
   导入按钮保持不可用。
3. 直接请求 dev API 上传超过 2 MB 的有效扩展名文件，确认返回 `413` 和相同友好错误。
4. 选择或直接上传一个 0 字节的 `.musicxml` / `.xml` 文件，确认显示或返回空文件友好
   错误，不进入解析流程。
5. 确认上述限制不改变 `/api/recognize` 图片上传的 10 MB 限制。

## G. 初始与不支持文件状态

1. 未选择文件时，确认页面提示“请选择 .musicxml 或 .xml 文件。”，导入按钮不可用。
2. 选择 `.mxl` 时，确认显示人工改名为 `.zip` 并解压内部 XML 的提示，不会解压或上传。
3. 选择 `.txt` 等错误扩展名时，确认显示仅支持 `.musicxml` / `.xml` 的友好错误，导入
   按钮保持不可用。
4. 重新选择有效且不超过 2 MB 的 `.musicxml` / `.xml` 文件后，确认旧错误消失且导入
   按钮恢复可用。

## H. 回归确认

- 图片上传仍调用 `POST /api/recognize` 并可正常显示 mock 识别结果。
- `lib/recognition/recognizerFactory.ts` 中的 default provider 仍为 `mock`。
- MusicXML 成功导入和图片识别继续共用现有 notes 展示、BPM 控制与 Tone.js 播放逻辑。
- `npm run validate:musicxml` 不依赖 UI、浏览器或 Next.js server。
- `npm run build` 不依赖浏览器、Audiveris CLI、Java、FastAPI 或 Docker。

## 轻量静态检查

运行：

```bash
npm run validate:musicxml-import-ui
```

该命令只读取源码和文档，检查功能开关、dev API 路径、2 MB 限制、支持扩展名、`.mxl`
提示、notes 状态复用和 QA 文档是否仍然存在；它不会启动浏览器或 Next.js server。
