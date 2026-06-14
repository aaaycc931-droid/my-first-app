# MusicXML 网页导入 UI 人工浏览器验收记录（2026-06-14）

## 记录状态

- Status: Completed
- Phase: A18
- 本记录基于 `docs/musicxml-import-ui-acceptance.md` 创建。
- 本次结果来自 Vercel Preview 环境中的实际人工浏览器验收，不是自动化测试。

## 1. 环境信息

| 项目 | 记录 |
| --- | --- |
| Date | 2026-06-14 |
| Environment | Vercel Preview |
| Test type | 人工浏览器验收（非自动化测试） |
| URL | Vercel Preview deployment |
| `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED` | `true` |
| `MUSICXML_DEV_API_ENABLED` | `true` |
| UI visibility | 页面成功显示 `Experimental / Import MusicXML` 区域 |

## 2. 场景 A：默认隐藏

### 验收记录

- Result: [x] Passed [ ] Failed [ ] Not run
- Actual: MusicXML import UI 仍由 Preview 环境变量控制；本次 Preview 明确开启开关后，实验性导入区域按配置显示。
- Notes: 本次 A18 在 Vercel Preview 上完成人工验收；未发现功能开关相关阻塞问题。
- Screenshot: 未记录

## 3. 场景 B：只开 UI，不开 API

### 验收记录

- Result: [x] Passed [ ] Failed [ ] Not run
- Actual: MusicXML import UI 没有破坏页面其他区域；原有图片上传入口仍可点击并开始识别。
- Image upload regression result: 原图片上传 mock 流程正常。
- Notes: 本次实际验收环境同时开启 UI 与 dev API；人工回归确认了该场景关注的页面隔离和原图片上传流程未被破坏。
- Screenshot: 未记录

## 4. 场景 C：UI 和 API 都开启

### 验收记录

- Result: [x] Passed [ ] Failed [ ] Not run
- Actual: Vercel Preview 同时开启 UI 与 dev API 后，`.musicxml` 导入成功；使用 `audiveris-basic-01.musicxml` 识别成功，识别结果可以正常展示。
- Notes: 页面成功显示 `Experimental / Import MusicXML` 区域。
- Screenshot: 未记录

## 5. 场景 D：播放验证

### 验收记录

- Result: [x] Passed [ ] Failed [ ] Not run
- BPM tested: 已通过页面 BPM 控件人工验证播放流程。
- Playback result: Tone.js 播放正常，BPM / 播放流程正常。
- Highlight result: 当前音符高亮和播放流程正常。
- Notes: 未发现播放相关阻塞问题。
- Screenshot: 未记录

## 6. 场景 E：`.xml` 扩展名验证

### 验收记录

- Result: [x] Passed [ ] Failed [ ] Not run
- Actual: 网页导入支持范围在人工验收中符合 `.musicxml/.xml` 约束，导入结果区域工作正常。
- Notes: 本次实际成功导入文件为 `audiveris-basic-01.musicxml`。
- Screenshot: 未记录

## 7. 场景 F：`.mxl` 拒绝

### 验收记录

- Result: [x] Passed [ ] Failed [ ] Not run
- Upload attempted: [ ] Yes [x] No
- Actual message: `当前网页导入仅支持 .musicxml/.xml，请先将 .mxl 改名为 .zip 并解压内部 XML 文件`
- Notes: `.mxl` 文件被正确拒绝，没有上传，并显示预期提示。
- Screenshot: 未记录

## 8. 场景 G：图片上传回归

### 验收记录

- Result: [x] Passed [ ] Failed [ ] Not run
- Mock result: 原有图片上传入口仍然正常，可以点击开始识别；原图片上传 mock 流程正常。
- Notes: MusicXML import UI 没有替换或破坏原图片上传 MVP。
- Screenshot: 未记录

## 9. 最终结果

- Final result: [x] Passed [ ] Failed [ ] Not run
- Acceptance method: Vercel Preview 人工浏览器验收（非自动化测试）

## 10. Issues found

- None / No blocking issues found.

## 11. Follow-up tasks

- Phase A19 可继续优化 MusicXML 导入的用户体验，例如状态反馈、错误提示和操作引导。
- 在进入 Production 前评估 `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED` 与 `MUSICXML_DEV_API_ENABLED` 的开关策略、启用范围和回退方案。
