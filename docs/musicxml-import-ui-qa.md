# MusicXML 网页导入 UI 手动 QA（Phase A16 / A19）

## 范围

本清单验证 dev-only、experimental MusicXML 导入入口的关键边界。它不替代自动化浏览器
测试，也不验证自动 OMR 图片识别。执行前请确认仓库依赖已安装。

Phase A17 新增了
[`docs/musicxml-import-ui-acceptance.md`](./musicxml-import-ui-acceptance.md)，用于在本地浏览器
中逐项执行场景并记录环境、实际结果、问题和截图。该文件是人工浏览器验收记录模板，
不是自动化测试，也不会新增或运行浏览器自动化框架。

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

## F. 初始与不支持文件状态

1. 未选择文件时，确认页面提示“请选择 .musicxml 或 .xml 文件。”，导入按钮不可用。
2. 选择 `.mxl` 或其他不支持的扩展名时，确认显示对应友好错误，导入按钮保持不可用。
3. 重新选择有效的 `.musicxml` / `.xml` 文件后，确认旧错误消失且导入按钮恢复可用。

## G. 回归确认

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

该命令只读取源码和文档，检查功能开关、dev API 路径、`.mxl` 提示、notes 状态复用和 QA
文档是否仍然存在；它不会启动浏览器或 Next.js server。
