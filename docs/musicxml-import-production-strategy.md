# MusicXML import UI Production 启用与回退策略（Phase A21）

## 文档目的

本文档定义 experimental MusicXML import UI 从 Vercel Preview 评估到未来可能启用
Production 的前置条件、环境变量配置、主要风险和回退步骤。本文档只制定策略，不改变
当前功能、API、provider、播放器或 Vercel 配置。

## 1. 当前状态

- Phase A20 已在 Vercel Preview 完成人工浏览器验收并记录为 Passed。
- `.musicxml` 导入、Tone.js 播放、`.mxl` 拒绝和原图片上传 mock 流程均已通过本轮
  人工验收。
- MusicXML import UI 与 `POST /api/dev/recognize-musicxml` 当前仍属于
  experimental、dev-only 能力，不是正式产品入口。
- Production 默认不应开启 MusicXML import UI 或 dev MusicXML API。
- 原图片上传 `POST /api/recognize` 仍是主流程，默认 `mock` provider 保持不变。
- 当前环境变量只建议在 Preview 或本地开发环境中使用：

  ```bash
  NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED=true
  MUSICXML_DEV_API_ENABLED=true
  ```

Phase A20 的验收依据见
[`docs/acceptance/musicxml-import-ui-status-feedback-2026-06-14.md`](./acceptance/musicxml-import-ui-status-feedback-2026-06-14.md)。

## 2. Production 启用前置条件

未来只有在以下条件全部满足、结果已记录并经过明确的 Production 发布评审后，才应考虑
开放 Production：

1. 最新目标提交已在 Vercel Preview 完成人工浏览器验收，结果为 Passed，并保留验收
   日期、环境、测试文件和结论。
2. `npm run validate:musicxml` 通过。
3. `npm run validate:musicxml-import-ui` 通过。
4. `npm run build` 通过。
5. `.musicxml` 与 `.xml` 文件均可成功导入，并能进入现有 notes 展示与播放流程。
6. `.mxl` 会被正确拒绝，不会上传，并显示人工解压指引。
7. 原图片上传 `POST /api/recognize` 的 mock 主流程保持正常。
8. 客户端和 API 错误提示经过检查，不会向用户暴露堆栈、内部路径、环境变量、凭据、
   原始异常或其他敏感信息。
9. 已明确评估 `POST /api/dev/recognize-musicxml` 在正式环境的暴露范围，包括访问对象、
   可发现性、上传限制、滥用风险、日志内容和关闭责任人。
10. 已确认可接受的文件大小及请求限制，并验证超限文件会被安全、友好地拒绝。
11. 发布负责人已确认该能力仍是 MusicXML 导入播放，而不是自动图片识别或完整 OMR，
    且用户说明不会造成能力误解。
12. 已在发布前演练环境变量关闭与重新部署流程，确认可以独立隐藏 UI 和关闭 dev API。

任一条件未满足时，应继续保持 Preview-only，不进入 Production。

## 3. 环境变量策略

### `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED`

- 控制前端是否显示 `Experimental: Import MusicXML` UI。
- 该变量会进入前端构建产物；修改后必须重新构建并部署，现有部署不会自动变化。
- 它只隐藏或显示 UI，不能替代服务端 API 的访问控制。

### `MUSICXML_DEV_API_ENABLED`

- 控制服务端 `POST /api/dev/recognize-musicxml` 是否开放。
- 未严格设置为 `true` 时，dev API 应保持关闭并返回 `404`。
- 它只控制服务端 dev API，不负责控制前端 UI 是否显示。

### 当前推荐配置

| 环境 | `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED` | `MUSICXML_DEV_API_ENABLED` | 建议 |
| --- | --- | --- | --- |
| Local development | 按需设为 `true` | 按需设为 `true` | 可用于开发验证 |
| Vercel Preview | 可设为 `true` | 可设为 `true` | 可用于受控人工验收 |
| Production | 不设置或保持非 `true` | 不设置或保持非 `true` | 当前不要开启 |

如果未来批准在 Production 开启，两个变量必须在 Production 环境中同步配置为 `true`，
然后重新部署同一已验收提交。只开启 UI 会产生不可用入口，只开启 API 则会暴露没有页面
入口保护的 dev API；因此不得把单独开启其中一个变量作为正式发布状态。

## 4. 主要风险

### dev API 暴露

`POST /api/dev/recognize-musicxml` 的设计目标是开发和链路验证。将它开放到正式环境会扩大
访问范围和滥用面，必须先确认访问控制、上传限制、日志内容、监控和关闭流程。

### 大文件与性能

用户可能上传体积较大或结构复杂的 MusicXML，导致请求耗时、内存使用、解析时间或响应
体积增加。当前策略不能替代明确的文件大小、请求时长和并发限制。

### MVP 解析范围

当前 MusicXML 解析能力只覆盖 MVP 所需范围。成功导入部分 fixture 不代表支持完整
MusicXML 标准，也不保证复杂声部、记谱法、布局或所有导出器生成的文件都能正确处理。

### 识谱准确率

Audiveris 的导出结果可能包含漏识别或误识别。MusicXML import UI 只导入并播放已有
MusicXML，不能保证 Audiveris 或其他上游 OMR 工具的识谱准确率。

### `.mxl` 不受支持

当前浏览器入口不会直接解压 `.mxl`。用户必须先在本地将其作为 zip 解压，并选择内部的
`.musicxml` 或 `.xml` 文件。Production 用户若不了解该限制，可能误认为导入失败。

### 产品能力误解

当前能力不是自动图片识别。它不会把图片转换成 MusicXML，只会导入并播放用户已有的
MusicXML 文件。原图片上传仍使用 `/api/recognize` 的 mock 主流程。

### 错误信息与原始内容

错误响应、日志和调试字段需要避免泄露内部实现或敏感信息。正式开放前还应确认上传内容
和 API 响应中的原始 MusicXML 是否符合 Production 的隐私、日志和数据保留要求。

## 5. 回退方案

### 关闭前端入口

1. 在目标环境关闭或删除 `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED`。
2. 重新构建并部署。
3. 验证页面不再显示 `Experimental: Import MusicXML`，同时原图片上传仍正常。

### 关闭 dev API

1. 在目标环境关闭或删除 `MUSICXML_DEV_API_ENABLED`。
2. 重新部署应用或对应 API 环境。
3. 验证 `POST /api/dev/recognize-musicxml` 返回 `404`，并确认 `/api/recognize` 不受影响。

### 保留主流程

- 回退 MusicXML import UI 时，不修改或关闭 `/api/recognize`。
- 原图片上传 mock 流程和默认 `mock` provider 应继续作为主流程工作。
- 回退不需要修改 Tone.js 播放逻辑，也不需要接入其他识别 provider。

### 环境隔离

- Preview 出现问题时，关闭 Preview 的两个变量并重新部署即可，不应影响 Production。
- 如果 Production 未来被误开启，应立即同时关闭或删除两个 Production 变量并
  redeploy，然后验证 UI 已隐藏、dev API 已关闭、图片上传主流程正常。
- 如果只能分步操作，优先关闭 `MUSICXML_DEV_API_ENABLED` 以停止 dev API 暴露，随后
  关闭 UI 变量并完成新的前端部署；最终状态必须是两个开关均关闭。

## 6. 推荐结论

- 当前继续保持 Preview-only / dev-only。
- 不建议在本阶段立刻开启 Production。
- Production 环境应继续保持两个变量未设置或不等于 `true`。
- 下一阶段可继续优化错误提示、确认并实现文件大小限制、补充上传限制文档或增加清晰的
  用户能力说明，再依据前置条件重新评估 Production。

