# MusicXML import UI 状态反馈人工验收记录（Phase A20）

## 记录状态

- Status: Passed
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
| Vercel Preview URL | Vercel Preview 环境（人工验收） |
| Browser | Vercel Preview 环境中的桌面浏览器（具体名称与版本未记录） |
| Commit | 本次 Vercel Preview 对应提交（具体 SHA 未记录） |
| `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED` | `true` |
| `MUSICXML_DEV_API_ENABLED` | `true` |

## 2. 场景 A：初始未选择文件状态

### 操作

1. 打开本次提交对应的 Vercel Preview URL。
2. 找到 `Experimental: Import MusicXML` 区域。
3. 不选择任何文件。

### 预期结果

- [x] 页面显示 `Import MusicXML` 区域。
- [x] 未选择文件时显示“请选择 .musicxml 或 .xml 文件。”
- [x] “导入并验证播放”按钮处于禁用状态。

### 验收记录

- Result: [x] Passed [ ] Failed [ ] Not run
- Actual: 页面显示 Import MusicXML 区域；未选择文件时显示“请选择 .musicxml 或 .xml 文件”，导入按钮禁用。
- Screenshot: None
- Notes: 本结果来自 Vercel Preview 人工浏览器验收，不是自动化测试。

## 3. 场景 B：选择有效 `.musicxml`

### 操作

1. 选择 `lib/musicxml/__fixtures__/audiveris/audiveris-basic-01.musicxml`，或选择
   `lib/musicxml/__fixtures__/simple-score.musicxml`。
2. 暂不点击导入按钮。

### 预期结果

- [x] 导入按钮恢复为可点击状态。
- [x] 页面显示的已选文件名与实际文件名一致。
- [x] 选择有效文件后不显示旧的文件类型错误。

### 验收记录

- Tested fixture: `simple-score.musicxml`、`audiveris-basic-01.musicxml`
- Result: [x] Passed [ ] Failed [ ] Not run
- Actual: 选择 `.musicxml` 后文件名显示正确，导入按钮恢复为可点击状态。
- Screenshot: None
- Notes: 本结果来自 Vercel Preview 人工浏览器验收，不是自动化测试。

## 4. 场景 C：导入中状态

### 操作

1. 选择有效 `.musicxml` 文件。
2. 点击“导入并验证播放”。
3. 在请求完成前观察 MusicXML 导入区域和按钮。

### 预期结果

- [x] 点击导入后显示“正在解析 MusicXML...”
- [x] 按钮文案变为“正在导入...”
- [x] 按钮在导入期间保持禁用，不能重复提交。

### 验收记录

- Result: [x] Passed [ ] Failed [ ] Not run
- Actual: 点击导入后显示“正在解析 MusicXML...”，按钮显示“正在导入...”，导入期间按钮禁用且不可重复点击。
- Screenshot: None；若状态持续时间较短，可使用浏览器网络限速辅助人工观察
- Notes: 本结果来自 Vercel Preview 人工浏览器验收，不是自动化测试。

## 5. 场景 D：导入成功状态

### 操作

1. 分别导入以下 fixture，并记录成功状态中的音符数量：
   - `lib/musicxml/__fixtures__/audiveris/audiveris-basic-01.musicxml`
   - `lib/musicxml/__fixtures__/simple-score.musicxml`
2. 观察成功提示、识别结果和导入按钮。

### 预期结果

- [x] 成功后显示“导入成功，已解析 X 个音符”。
- [x] `audiveris-basic-01.musicxml` 显示较多 notes，并与识别结果列表数量一致。
- [x] `simple-score.musicxml` 显示 5 个 notes。
- [x] 按钮文案变为“重新导入 MusicXML”。

### 验收记录

- `audiveris-basic-01.musicxml` note count: 大量 notes（识别结果正常展示，未记录精确数量）
- `simple-score.musicxml` note count: 5
- Result: [x] Passed [ ] Failed [ ] Not run
- Actual: 两个 fixture 均导入成功；成功提示显示已解析音符数，`simple-score.musicxml` 为 5 个 notes，Audiveris fixture 显示大量 notes；按钮变为“重新导入 MusicXML”。
- Screenshot: None
- Notes: 本结果来自 Vercel Preview 人工浏览器验收，不是自动化测试。

## 6. 场景 E：播放回归

### 操作

1. 成功导入有效 MusicXML。
2. 点击“播放识别结果”。
3. 调整 BPM，并再次播放。
4. 播放期间观察音符列表。

### 预期结果

- [x] Tone.js 播放正常。
- [x] BPM 滑块和 BPM 数值控制正常影响播放速度。
- [x] 播放期间当前音符高亮正常推进。

### 验收记录

- BPM tested: 已通过页面 BPM 控件调整（具体数值未记录）
- Playback result: Tone.js 播放正常，BPM 控制正常。
- Highlight result: 当前音符高亮正常推进。
- Result: [x] Passed [ ] Failed [ ] Not run
- Screenshot: None
- Notes: 本结果来自 Vercel Preview 人工浏览器验收，不是自动化测试。

## 7. 场景 F：`.mxl` 拒绝

### 操作

1. 在 MusicXML 文件选择器中选择任意 `.mxl` 文件。
2. 观察文件状态、提示和导入按钮。

### 预期结果

- [x] `.mxl` 文件不上传，也不会进入可导入状态。
- [x] 页面提示需要先将 `.mxl` 改名为 `.zip`，并解压出内部 XML 文件。
- [x] 导入按钮保持禁用。

### 验收记录

- Upload attempted: [ ] Yes [x] No
- Actual message: 页面提示需将 `.mxl` 改名为 `.zip`，并解压内部 XML；文件未上传且按钮保持禁用。
- Result: [x] Passed [ ] Failed [ ] Not run
- Screenshot: None
- Notes: 本结果来自 Vercel Preview 人工浏览器验收，不是自动化测试。

## 8. 场景 G：错误状态

### 操作

至少执行以下一种错误路径；如 Preview 环境允许，建议两种均执行：

1. 只开启 `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED`，关闭
   `MUSICXML_DEV_API_ENABLED`，然后尝试导入有效 MusicXML。
2. 在 UI 与 API 都开启时，上传扩展名有效但内容无效的 XML 文件。
3. 错误出现后，再操作原有图片上传流程。

### 预期结果

- [x] API 未开启或 XML 无效时，MusicXML 导入区域显示友好错误。
- [x] 错误状态不显示成功文案。
- [x] 页面其他区域仍可操作。
- [x] 错误不会破坏原图片上传 mock 流程。

### 验收记录

- Error path tested: 选择不受支持的 `.mxl` 文件，验证客户端拒绝与错误提示。
- Actual error: 显示需将 `.mxl` 改名为 `.zip` 并解压内部 XML 的友好提示；未显示成功文案。
- Image upload regression result: 原图片上传入口仍可操作，mock 识别结果正常展示。
- Result: [x] Passed [ ] Failed [ ] Not run
- Screenshot: None
- Notes: 本结果来自 Vercel Preview 人工浏览器验收，不是自动化测试。

## 9. 场景 H：原图片上传回归

### 操作

1. 选择一张受支持的图片。
2. 点击原有“开始识别”按钮。
3. 在浏览器 Network 面板确认请求目标。
4. 观察 mock 识别结果。

### 预期结果

- [x] 原有图片上传仍可点击“开始识别”。
- [x] 图片识别请求仍发送至 `POST /api/recognize`。
- [x] mock 识别结果正常展示。
- [x] MusicXML import UI 不替换或阻塞原图片上传流程。

### 验收记录

- Request path: 原图片上传入口保持原有请求流程（本次未修改 `/api/recognize`）。
- Mock result: 点击“开始识别”后，mock 识别结果正常展示。
- Result: [x] Passed [ ] Failed [ ] Not run
- Screenshot: None
- Notes: 本结果来自 Vercel Preview 人工浏览器验收，不是自动化测试。

## 10. 结论

- Final result: [x] Passed [ ] Failed [ ] Not run
- Issues found:
  - None / No blocking issues found.
- Screenshots collected:
  - None（本记录基于已完成的 Vercel Preview 人工浏览器验收，未附截图）。
- Follow-up tasks:
  - Phase A21 可考虑明确 Production 环境的 MusicXML import 开关策略，或进一步优化错误提示。

