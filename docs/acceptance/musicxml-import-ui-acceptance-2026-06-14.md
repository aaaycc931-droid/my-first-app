# MusicXML 网页导入 UI 人工浏览器验收记录（2026-06-14）

## 记录状态

- Status: Draft
- 本记录基于 `docs/musicxml-import-ui-acceptance.md` 创建。
- 这是人工浏览器验收记录，不是自动化测试。
- 实际测试后填写各场景的 `Passed` / `Failed`、备注和截图链接。

## 1. 环境信息

| 项目 | 记录 |
| --- | --- |
| Date | 2026-06-14 |
| OS | 待填写 |
| Browser | 待填写 |
| Node version | 待填写 |
| Commit | 待填写 |
| URL | `http://localhost:3000` |
| `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED` | 待按场景填写 |
| `MUSICXML_DEV_API_ENABLED` | 待按场景填写 |

## 2. 场景 A：默认隐藏

### 操作步骤

1. 确保没有设置 `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED`。
2. 运行 `npm run dev`。
3. 在浏览器中打开首页。

### 预期结果

- 页面不显示 `Experimental: Import MusicXML`。

### 验收记录

- Passed: [ ]
- Failed: [ ]
- Notes: 待填写
- Screenshot: 待填写

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

- Passed: [ ]
- Failed: [ ]
- Notes: 待填写（包括实际错误信息和图片上传回归结果）
- Screenshot: 待填写

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

- Passed: [ ]
- Failed: [ ]
- Notes: 待填写（包括实际 note 数量）
- Screenshot: 待填写

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

- Passed: [ ]
- Failed: [ ]
- Notes: 待填写（包括测试 BPM、播放结果和高亮结果）
- Screenshot: 待填写

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

- Passed: [ ]
- Failed: [ ]
- Notes: 待填写（包括实际 note 数量）
- Screenshot: 待填写

## 7. 场景 F：`.mxl` 拒绝

### 操作步骤

1. 在 MusicXML 文件选择器中选择任意 `.mxl` 文件。

### 预期结果

- 文件不会上传。
- 页面提示需要把 `.mxl` 改名为 `.zip`，并解压出内部 XML 文件。

### 验收记录

- Passed: [ ]
- Failed: [ ]
- Notes: 待填写（包括是否尝试上传和实际提示信息）
- Screenshot: 待填写

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

- Passed: [ ]
- Failed: [ ]
- Notes: 待填写（包括请求 URL、方法和 mock 结果）
- Screenshot: 待填写

## 9. 最终结果

- Final result: [ ] Passed [ ] Failed [ ] Not run

## 10. Issues found

- 待填写

## 11. Follow-up tasks

- 待填写
