# MusicXML 上传限制与错误提示人工验收记录草稿（Phase A23）

## 记录状态

- Status: Draft / Not run
- Phase: A23
- Scope: 在 Vercel Preview 验证 Phase A22 新增的 MusicXML 上传限制、错误提示，以及原图片
  上传流程回归。
- Environment: Vercel Preview（dev-only）
- Test type: 人工浏览器验收（非自动化测试）
- Production policy: Production 保持关闭；本记录不调整 Production 开关。

## 1. 环境信息

| 项目 | 记录 |
| --- | --- |
| Date | 2026-06-14 |
| Vercel Preview URL | 待填写 |
| Browser | 待填写（名称与版本） |
| Commit | 待填写（完整或短 SHA） |
| `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED` | `true`（验收前确认） |
| `MUSICXML_DEV_API_ENABLED` | `true`（验收前确认） |
| MusicXML max file size | 2 MB |

## 2. 场景 A：正常 `.musicxml` 导入

### 操作

1. 上传 `lib/musicxml/__fixtures__/audiveris/audiveris-basic-01.musicxml`。
2. 点击“导入并验证播放”。
3. 等待解析完成并观察识别结果。
4. 点击“播放识别结果”。

### 预期结果

- [ ] 文件成功进入解析流程并完成导入。
- [ ] 页面显示导入成功提示和已解析 notes 数量。
- [ ] “识别结果”区域显示 notes。
- [ ] Tone.js 可以正常播放导入结果。

### 验收记录

- Result: [ ] Passed [ ] Failed [ ] Not run
- Actual:
- Note count:
- Playback result:
- Screenshot:
- Notes:

## 3. 场景 B：正常 `.xml` 导入

### 操作

1. 准备一个有效的 `.xml` MusicXML 文件；可复制有效 `.musicxml` fixture 并将副本扩展名
   改为 `.xml`。
2. 选择该文件并点击“导入并验证播放”。
3. 如文件内容无效或解析器不支持其内容，记录页面错误。

### 预期结果

- [ ] `.xml` 扩展名被允许进入解析流程，不显示文件格式错误。
- [ ] 有效 MusicXML 内容应成功解析并显示 notes。
- [ ] 若解析失败，应显示友好的解析错误，而不是错误扩展名提示。
- [ ] 页面其他区域保持可操作。

### 验收记录

- Tested file:
- Result: [ ] Passed [ ] Failed [ ] Not run
- Entered parsing flow: [ ] Yes [ ] No
- Actual:
- Screenshot:
- Notes:

## 4. 场景 C：空文件

### 操作

1. 创建并选择一个 0 byte 的 `.musicxml` 文件。
2. 观察 MusicXML 导入区域、按钮状态和页面其他区域。
3. 如需验证 API 防线，使用 `multipart/form-data` 直接向
   `POST /api/dev/recognize-musicxml` 上传同一空文件。

### 预期结果

- [ ] UI 显示空文件的友好错误。
- [ ] 文件不进入正常解析成功状态。
- [ ] 导入按钮保持禁用或文件不会进入可上传状态。
- [ ] 直接请求 API 时返回友好的 400 类错误。
- [ ] 页面没有崩溃，其他区域仍可操作。

### 验收记录

- UI result: [ ] Passed [ ] Failed [ ] Not run
- API result: [ ] Passed [ ] Failed [ ] Not run
- API status:
- Actual message:
- Screenshot:
- Notes:

## 5. 场景 D：超过 2 MB 文件

### 操作

1. 准备一个大小严格超过 2 MB 的 `.musicxml` 或 `.xml` 文件。
2. 在页面文件选择器中选择该文件。
3. 使用 `multipart/form-data` 直接向 `POST /api/dev/recognize-musicxml` 上传同一文件，
   验证服务端限制。

### 预期结果

- [ ] UI 显示“MusicXML 文件过大，当前最大支持 2 MB。”或等效友好错误。
- [ ] 文件不会进入可上传状态，导入按钮保持禁用。
- [ ] API 返回 HTTP `413` 或等效的请求过大错误。
- [ ] API 返回友好错误，不暴露内部实现。
- [ ] 文件不进入 MusicXML 解析流程。

### 验收记录

- File name:
- File size:
- UI result: [ ] Passed [ ] Failed [ ] Not run
- API result: [ ] Passed [ ] Failed [ ] Not run
- API status:
- Actual message:
- Parsing attempted: [ ] Yes [ ] No
- Screenshot:
- Notes:

## 6. 场景 E：错误扩展名

### 操作

1. 分别选择 `.txt`、`.pdf`、`.png` 等非 MusicXML 文件中的至少一个。
2. 观察错误提示和导入按钮状态。

### 预期结果

- [ ] 页面显示仅支持 `.musicxml` 或 `.xml` 的友好提示。
- [ ] 错误文件不会进入可上传状态。
- [ ] 导入按钮保持禁用，不进入上传或解析流程。
- [ ] 重新选择有效文件后，旧错误可以清除。

### 验收记录

- Extensions tested:
- Result: [ ] Passed [ ] Failed [ ] Not run
- Actual message:
- Upload attempted: [ ] Yes [ ] No
- Screenshot:
- Notes:

## 7. 场景 F：`.mxl` 拒绝

### 操作

1. 选择任意 `.mxl` 文件。
2. 观察提示、文件状态和导入按钮。

### 预期结果

- [ ] 页面提示需要将 `.mxl` 改名为 `.zip`，并人工解压出内部 XML。
- [ ] 页面不会尝试解压 `.mxl`。
- [ ] 不出现或要求任何新增 zip 行为。
- [ ] `.mxl` 不进入上传流程，导入按钮保持禁用。

### 验收记录

- Result: [ ] Passed [ ] Failed [ ] Not run
- Actual message:
- Upload attempted: [ ] Yes [ ] No
- Decompression attempted: [ ] Yes [ ] No
- Screenshot:
- Notes:

## 8. 场景 G：API 错误展示

### 操作

1. 准备一个扩展名为 `.musicxml` 或 `.xml`、大小不超过 2 MB，但内容为无效 XML 或无法
   被当前 MVP 解析器处理的文件。
2. 上传并触发解析失败。
3. 检查页面提示和浏览器 Network 面板中的响应。

### 预期结果

- [ ] UI 在 MusicXML 导入区域显示友好错误。
- [ ] 错误状态不显示导入成功文案。
- [ ] UI 与 API 响应不暴露 stack trace、服务器文件路径、环境变量或其他敏感信息。
- [ ] 页面没有崩溃，用户可以重新选择有效文件重试。

### 验收记录

- Tested file / failure method:
- Result: [ ] Passed [ ] Failed [ ] Not run
- HTTP status:
- Actual UI message:
- Sensitive details exposed: [ ] Yes [ ] No
- Retry result:
- Screenshot:
- Notes:

## 9. 场景 H：原图片上传回归

### 操作

1. 选择一张受支持的五线谱图片。
2. 点击原有“开始识别”按钮。
3. 在浏览器 Network 面板确认请求路径。
4. 观察 mock 识别结果并点击“播放识别结果”。

### 预期结果

- [ ] 原图片上传仍可点击“开始识别”。
- [ ] 图片识别请求仍发送至 `POST /api/recognize`。
- [ ] 默认 mock 识别结果正常展示。
- [ ] Tone.js 播放正常。
- [ ] MusicXML 的限制或错误状态不破坏原图片上传流程。

### 验收记录

- Result: [ ] Passed [ ] Failed [ ] Not run
- Request path:
- Mock result:
- Playback result:
- Screenshot:
- Notes:

## 10. 结论

- Final result: [ ] Passed [ ] Failed [ ] Not run
- Issues found:
  -
- Screenshots collected:
  -
- Follow-up tasks:
  -

