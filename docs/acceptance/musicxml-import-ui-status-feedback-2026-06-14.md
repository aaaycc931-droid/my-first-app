# MusicXML import UI 状态反馈人工验收记录草稿（Phase A20）

## 记录状态

- Status: Draft / Not run
- Phase: A20
- Scope: 验证 Phase A19 新增的 MusicXML import UI `idle`、`importing`、`success`、`error`
  状态反馈。
- Environment: Vercel Preview（dev-only）
- Test type: 人工浏览器验收（非自动化测试）
- Production policy: 本阶段不调整 Production 开关或启用策略。

## 1. 环境信息

| 项目 | 记录 |
| --- | --- |
| Date | 2026-06-14 |
| Vercel Preview URL | 待填写 |
| Browser | 待填写（名称与版本） |
| Commit | 待填写 |
| `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED` | 待确认（预期为 `true`） |
| `MUSICXML_DEV_API_ENABLED` | 待确认（正常导入场景预期为 `true`） |

## 2. 场景 A：初始未选择文件状态

### 操作

1. 打开本次提交对应的 Vercel Preview URL。
2. 找到 `Experimental: Import MusicXML` 区域。
3. 不选择任何文件。

### 预期结果

- [ ] 页面显示 `Import MusicXML` 区域。
- [ ] 未选择文件时显示“请选择 .musicxml 或 .xml 文件。”
- [ ] “导入并验证播放”按钮处于禁用状态。

### 验收记录

- Result: [ ] Passed [ ] Failed [ ] Not run
- Actual: 待填写
- Screenshot: 待填写
- Notes: 待填写

## 3. 场景 B：选择有效 `.musicxml`

### 操作

1. 选择 `lib/musicxml/__fixtures__/audiveris/audiveris-basic-01.musicxml`，或选择
   `lib/musicxml/__fixtures__/simple-score.musicxml`。
2. 暂不点击导入按钮。

### 预期结果

- [ ] 导入按钮恢复为可点击状态。
- [ ] 页面显示的已选文件名与实际文件名一致。
- [ ] 选择有效文件后不显示旧的文件类型错误。

### 验收记录

- Tested fixture: 待填写
- Result: [ ] Passed [ ] Failed [ ] Not run
- Actual: 待填写
- Screenshot: 待填写
- Notes: 待填写

## 4. 场景 C：导入中状态

### 操作

1. 选择有效 `.musicxml` 文件。
2. 点击“导入并验证播放”。
3. 在请求完成前观察 MusicXML 导入区域和按钮。

### 预期结果

- [ ] 点击导入后显示“正在解析 MusicXML...”
- [ ] 按钮文案变为“正在导入...”
- [ ] 按钮在导入期间保持禁用，不能重复提交。

### 验收记录

- Result: [ ] Passed [ ] Failed [ ] Not run
- Actual: 待填写
- Screenshot: 待填写；若状态持续时间较短，可使用浏览器网络限速辅助人工观察
- Notes: 待填写

## 5. 场景 D：导入成功状态

### 操作

1. 分别导入以下 fixture，并记录成功状态中的音符数量：
   - `lib/musicxml/__fixtures__/audiveris/audiveris-basic-01.musicxml`
   - `lib/musicxml/__fixtures__/simple-score.musicxml`
2. 观察成功提示、识别结果和导入按钮。

### 预期结果

- [ ] 成功后显示“导入成功，已解析 X 个音符”。
- [ ] `audiveris-basic-01.musicxml` 显示较多 notes，并与识别结果列表数量一致。
- [ ] `simple-score.musicxml` 显示 5 个 notes。
- [ ] 按钮文案变为“重新导入 MusicXML”。

### 验收记录

- `audiveris-basic-01.musicxml` note count: 待填写
- `simple-score.musicxml` note count: 待填写（预期为 5）
- Result: [ ] Passed [ ] Failed [ ] Not run
- Actual: 待填写
- Screenshot: 待填写
- Notes: 待填写

## 6. 场景 E：播放回归

### 操作

1. 成功导入有效 MusicXML。
2. 点击“播放识别结果”。
3. 调整 BPM，并再次播放。
4. 播放期间观察音符列表。

### 预期结果

- [ ] Tone.js 播放正常。
- [ ] BPM 滑块和 BPM 数值控制正常影响播放速度。
- [ ] 播放期间当前音符高亮正常推进。

### 验收记录

- BPM tested: 待填写
- Playback result: 待填写
- Highlight result: 待填写
- Result: [ ] Passed [ ] Failed [ ] Not run
- Screenshot: 待填写
- Notes: 待填写

## 7. 场景 F：`.mxl` 拒绝

### 操作

1. 在 MusicXML 文件选择器中选择任意 `.mxl` 文件。
2. 观察文件状态、提示和导入按钮。

### 预期结果

- [ ] `.mxl` 文件不上传，也不会进入可导入状态。
- [ ] 页面提示需要先将 `.mxl` 改名为 `.zip`，并解压出内部 XML 文件。
- [ ] 导入按钮保持禁用。

### 验收记录

- Upload attempted: [ ] Yes [ ] No
- Actual message: 待填写
- Result: [ ] Passed [ ] Failed [ ] Not run
- Screenshot: 待填写
- Notes: 待填写

## 8. 场景 G：错误状态

### 操作

至少执行以下一种错误路径；如 Preview 环境允许，建议两种均执行：

1. 只开启 `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED`，关闭
   `MUSICXML_DEV_API_ENABLED`，然后尝试导入有效 MusicXML。
2. 在 UI 与 API 都开启时，上传扩展名有效但内容无效的 XML 文件。
3. 错误出现后，再操作原有图片上传流程。

### 预期结果

- [ ] API 未开启或 XML 无效时，MusicXML 导入区域显示友好错误。
- [ ] 错误状态不显示成功文案。
- [ ] 页面其他区域仍可操作。
- [ ] 错误不会破坏原图片上传 mock 流程。

### 验收记录

- Error path tested: 待填写
- Actual error: 待填写
- Image upload regression result: 待填写
- Result: [ ] Passed [ ] Failed [ ] Not run
- Screenshot: 待填写
- Notes: 待填写

## 9. 场景 H：原图片上传回归

### 操作

1. 选择一张受支持的图片。
2. 点击原有“开始识别”按钮。
3. 在浏览器 Network 面板确认请求目标。
4. 观察 mock 识别结果。

### 预期结果

- [ ] 原有图片上传仍可点击“开始识别”。
- [ ] 图片识别请求仍发送至 `POST /api/recognize`。
- [ ] mock 识别结果正常展示。
- [ ] MusicXML import UI 不替换或阻塞原图片上传流程。

### 验收记录

- Request path: 待填写
- Mock result: 待填写
- Result: [ ] Passed [ ] Failed [ ] Not run
- Screenshot: 待填写
- Notes: 待填写

## 10. 结论

- Final result: [ ] Passed [ ] Failed [ ] Not run
- Issues found:
  - 待填写；如无问题，填写 `None`。
- Screenshots collected:
  - 待填写截图名称或链接；如未收集，填写 `None`。
- Follow-up tasks:
  - 待填写；如无后续任务，填写 `None`。

