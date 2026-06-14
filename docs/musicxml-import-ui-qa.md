# MusicXML 网页导入 UI 手动 QA（Phase A16）

## 范围

本清单验证 dev-only、experimental MusicXML 导入入口的关键边界。它不替代自动化浏览器
测试，也不验证自动 OMR 图片识别。执行前请确认仓库依赖已安装。

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
3. 确认现有“识别结果”区域显示 5 个 notes。
4. 确认 BPM 滑块、BPM 数值输入框和“播放识别结果”按钮仍可用。
5. 可将同一 fixture 复制为 `.xml` 后重复上述步骤，确认 `.xml` 扩展名也可进入导入流程。

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
4. 再选择一张图片并调用现有图片识别流程，确认 MusicXML 错误不会破坏图片上传 MVP。

## F. 回归确认

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
