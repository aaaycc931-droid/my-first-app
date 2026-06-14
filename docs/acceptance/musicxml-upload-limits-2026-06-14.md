# MusicXML 上传限制与错误提示人工验收记录（Phase A23）

## 记录状态

- Status: Passed
- Phase: A23
- Scope: 在 Vercel Preview 验证 Phase A22 新增的 MusicXML 上传限制、错误提示，以及原图片上传流程回归。
- Environment: Vercel Preview（dev-only）
- Test type: 人工浏览器验收（不是自动化测试）
- Production policy: Production 保持关闭；本记录不调整 Production 开关。

## 1. 环境信息

| 项目 | 实际记录 |
| --- | --- |
| Date | 2026-06-14 |
| Environment | Vercel Preview |
| `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED` | `true` |
| `MUSICXML_DEV_API_ENABLED` | `true` |
| MusicXML max file size | 2 MB |
| Execution method | 人工浏览器验收（非自动化测试） |

## 2. 场景 A：正常 `.musicxml` 导入

### 验收结果

- Result: **Passed**
- Tested file: `audiveris-basic-01.musicxml`
- Actual:
  - 文件正常进入解析流程并成功导入。
  - 识别结果正常展示。
  - Tone.js 可以正常播放导入结果。

## 3. 场景 B：正常 `.xml` 导入

### 验收结果

- Result: **Passed**
- Tested file: `simple-score.xml`
- Actual:
  - `.xml` 文件被允许进入解析流程。
  - 文件正常导入并显示 5 个 notes。
  - 页面保持正常可操作。

## 4. 场景 C：空文件

### 验收结果

- Result: **Passed**
- Tested file: 0 byte `.musicxml` 文件
- Actual:
  - 空文件被拒绝。
  - 页面显示友好错误。
  - 页面没有崩溃。

## 5. 场景 D：超过 2 MB 文件

### 验收结果

- Result: **Passed**
- Tested file: 严格超过 2 MB 的 `.musicxml` 文件
- Actual:
  - 文件被拒绝。
  - 页面显示文件过大的友好错误。
  - 文件没有成功导入。

## 6. 场景 E：错误扩展名

### 验收结果

- Result: **Passed**
- Extensions tested: `.txt`、`.pdf`、`.png`
- Actual:
  - 错误扩展名文件均被拒绝。
  - 页面提示仅支持 `.musicxml` 或 `.xml`。
  - 文件没有进入成功上传或解析状态。

## 7. 场景 F：`.mxl` 拒绝

### 验收结果

- Result: **Passed**
- Actual:
  - `.mxl` 文件被正确拒绝。
  - 文件没有被解压，也没有上传成功。
  - 页面提示需要将文件改名为 `.zip`，再人工解压内部 XML。

## 8. 场景 G：API 错误展示

### 验收结果

- Result: **Passed**
- Failure method: 上传扩展名有效但内容为无效 XML 的文件
- Actual:
  - 页面显示友好错误。
  - 页面没有崩溃。
  - 错误信息没有暴露 stack trace、内部路径或环境变量。

## 9. 场景 H：原图片上传回归

### 验收结果

- Result: **Passed**
- Actual:
  - 原图片上传入口仍然正常。
  - 可以点击“开始识别”。
  - mock 识别结果正常展示。
  - Tone.js 播放正常。

## 10. 结论

- Final result: **Passed**
- Issues found: **None / No blocking issues found**
- Test classification: 本次结果来自 Vercel Preview 上的人工浏览器验收，不是自动化测试结果。
- Follow-up tasks:
  - Phase A24 可统计真实 Audiveris 样本的文件大小分布。
  - 记录真实样本的解析耗时，为后续限制和性能判断提供依据。
  - 进一步评估启用 Production 前所需的安全性、稳定性、监控和部署前置条件。
