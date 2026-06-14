# MusicXML 网页导入 UI 人工浏览器验收记录（Phase A17）

## 用途

本模板用于在本地浏览器中逐项验证 dev-only、experimental MusicXML 导入功能并记录结果。
它是人工验收记录，不是自动化测试，也不会替代 Phase A16 的静态验证脚本。

建议每次验收复制一份本模板，填写实际环境、结果、问题和截图位置。每个场景可填写
`Passed`、`Failed` 或 `Not run`，并在备注中记录实际观察。

## 1. 环境信息

| 项目 | 记录 |
| --- | --- |
| Date |  |
| OS |  |
| Browser |  |
| Node version |  |
| Branch / commit |  |
| URL | `http://localhost:3000` |
| `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED` |  |
| `MUSICXML_DEV_API_ENABLED` |  |

## 2. 场景 A：默认隐藏

### 操作步骤

1. 确保没有设置 `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED`。
2. 运行 `npm run dev`。
3. 在浏览器中打开首页。

### 预期结果

- 页面不显示 `Experimental: Import MusicXML`。

### 验收记录

- Result: [ ] Passed [ ] Failed [ ] Not run
- Actual:
- Notes:
- Screenshot:

## 3. 场景 B：只开 UI，不开 API

### 操作步骤

1. 确保没有设置 `MUSICXML_DEV_API_ENABLED`。
2. 只开启 UI 并启动应用：

   ```bash
   NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED=true npm run dev
   ```

3. 在浏览器中打开首页。
4. 上传 `lib/musicxml/__fixtures__/simple-score.musicxml` 并尝试导入。
5. 再通过原有图片上传入口执行一次图片识别。

### 预期结果

- MusicXML 导入区域显示友好错误。
- 页面其他区域仍可操作。
- 图片上传 MVP 不受影响。

### 验收记录

- Result: [ ] Passed [ ] Failed [ ] Not run
- Actual:
- Error message:
- Image upload regression result:
- Notes:
- Screenshot:

## 4. 场景 C：UI 和 API 都开启

### 操作步骤

1. 同时开启 UI 和 dev API 并启动应用：

   ```bash
   NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED=true \
   MUSICXML_DEV_API_ENABLED=true \
   npm run dev
   ```

2. 在浏览器中打开首页。
3. 上传 `lib/musicxml/__fixtures__/simple-score.musicxml`。
4. 点击“导入并验证播放”。

### 预期结果

- 导入成功。
- 现有识别结果区域显示 5 个 notes。

### 验收记录

- Result: [ ] Passed [ ] Failed [ ] Not run
- Actual note count:
- Notes:
- Screenshot:

## 5. 场景 D：播放验证

### 前置条件

- 已按场景 C 成功导入 `simple-score.musicxml`。

### 操作步骤

1. 调整 BPM 滑块或 BPM 数值输入框。
2. 点击“播放识别结果”。
3. 观察播放过程中的音符列表。

### 预期结果

- Tone.js 能播放导入的 notes。
- 当前播放音符的高亮仍正常工作。
- 调整后的 BPM 会影响播放速度。

### 验收记录

- Result: [ ] Passed [ ] Failed [ ] Not run
- BPM tested:
- Playback result:
- Highlight result:
- Notes:
- Screenshot:

## 6. 场景 E：`.xml` 扩展名验证

### 操作步骤

1. 复制 fixture：

   ```bash
   cp lib/musicxml/__fixtures__/simple-score.musicxml /tmp/simple-score.xml
   ```

2. 保持 UI 和 dev API 均开启。
3. 上传 `/tmp/simple-score.xml` 并点击“导入并验证播放”。

### 预期结果

- `.xml` 文件可以导入。
- 现有识别结果区域显示 notes。

### 验收记录

- Result: [ ] Passed [ ] Failed [ ] Not run
- Actual note count:
- Notes:
- Screenshot:

## 7. 场景 F：`.mxl` 拒绝

### 操作步骤

1. 在 MusicXML 文件选择器中选择任意 `.mxl` 文件。

### 预期结果

- 文件不会上传。
- 页面提示需要把 `.mxl` 改名为 `.zip`，并解压出内部 XML 文件。

### 验收记录

- Result: [ ] Passed [ ] Failed [ ] Not run
- Upload attempted: [ ] Yes [ ] No
- Actual message:
- Notes:
- Screenshot:

## 8. 场景 G：图片上传回归

### 操作步骤

1. 使用页面原有图片上传入口选择一张支持的图片。
2. 点击原有图片识别按钮。
3. 在浏览器开发者工具的 Network 面板中检查请求。
4. 检查页面返回和展示结果。

### 预期结果

- 图片识别仍请求 `POST /api/recognize`。
- 默认 mock 识别流程正常。
- MusicXML 导入入口没有替换或破坏图片上传 MVP。

### 验收记录

- Result: [ ] Passed [ ] Failed [ ] Not run
- Request URL / method:
- Mock result:
- Notes:
- Screenshot:

## 9. 结论

- Overall: [ ] Passed [ ] Failed
- Issues found:
  -
- Screenshots collected:
  -
- Follow-up tasks:
  -

