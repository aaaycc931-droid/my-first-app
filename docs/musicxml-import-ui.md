# MusicXML 网页导入 UI（Phase A15 / A16 / A19）

## 用途与边界

`Experimental: Import MusicXML` 是一个 dev-only、experimental 的网页入口，用于把
Audiveris GUI 手动导出的 MusicXML 接入现有音符展示和 Tone.js 播放能力。

它只验证以下链路：

```text
Audiveris GUI 手动导出
  ↓
.musicxml / .xml 文件
  ↓
POST /api/dev/recognize-musicxml
  ↓
现有识别结果展示和播放
```

这不代表系统已经可以自动识别上传的五线谱图片。图片上传仍调用
`POST /api/recognize`，默认 provider 仍然是 `mock`。

换言之，这个入口是已有 MusicXML 文件的开发验证工具，不是自动 OMR 图片识别功能，
也不会把图片转换成 MusicXML。

## 开启方式

页面入口和服务端 API 使用两个独立开关，并且都默认关闭：

```bash
NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED=true
MUSICXML_DEV_API_ENABLED=true
```

本地可以在启动命令中同时开启：

```bash
NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED=true \
MUSICXML_DEV_API_ENABLED=true \
npm run dev
```

也可以把两个值写入仅用于本地开发的 `.env.local` 后重启开发服务器。

- 未设置 `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED=true` 时，页面不会显示实验导入区域。
- 未设置 `MUSICXML_DEV_API_ENABLED=true` 时，dev API 返回 `404`；即使页面入口开启，也
  无法完成导入。
- `NEXT_PUBLIC_MUSICXML_IMPORT_ENABLED` 只控制浏览器页面入口，
  `MUSICXML_DEV_API_ENABLED` 只控制服务端 dev API；两者互不替代。

## 从 Audiveris GUI 准备文件

1. 在本地 Audiveris GUI 中打开并处理有权使用的乐谱图片或 PDF。
2. 使用 Audiveris GUI 的导出功能生成 `.mxl`。具体菜单名称可能随 Audiveris 版本
   不同，请以本机 GUI 为准。
3. 当前网页不支持直接读取 `.mxl`，也不会在浏览器中解压它。
4. 将 `.mxl` 文件扩展名改为 `.zip`，再使用操作系统或常规解压工具解压。
5. 在解压目录中找到实际乐谱 XML 文件，并保留为 `.musicxml` 或 `.xml`。通常应选择
   容器清单指向的乐谱 XML，而不是 `META-INF` 中的容器描述文件。

仓库没有新增 zip 依赖，也不会自动调用 Audiveris CLI 或 Java。

## 在网页中导入

1. 使用上面的两个环境变量启动 Next.js 开发服务器。
2. 打开首页，找到 `Experimental: Import MusicXML` 区域。
3. 选择 `.musicxml` 或 `.xml` 文件。
4. 点击“导入并验证播放”。
5. 导入期间，页面显示“正在解析 MusicXML...”，导入按钮显示“正在导入...”并保持
   禁用，避免重复提交。
6. 导入成功后，页面显示“导入成功，已解析 X 个音符”，按钮变为“重新导入
   MusicXML”。音符会进入页面已有的“识别结果”区域，可以继续调整 BPM 并使用已有
   Tone.js 播放按钮。

如果选择 `.mxl`，页面会明确提示先将其改名为 `.zip` 并解压出内部 XML 文件，不会
尝试上传或解压该文件。`.mxl` 仍然不受支持，解压必须由用户人工完成，其他扩展名也会
被拒绝。未选择文件、正在导入或选择了不支持的文件时，导入按钮不可用；解析或 API
调用失败时，错误会显示在 MusicXML 导入区域，不影响原图片上传流程。

## QA 与静态验证

Phase A16 的完整手动验证步骤见
[`docs/musicxml-import-ui-qa.md`](./musicxml-import-ui-qa.md)，覆盖默认隐藏、开关开启、
`.musicxml` / `.xml` 导入、`.mxl` 拒绝、API 未开启错误和图片上传回归。

Production 启用前置条件、环境变量范围、主要风险和回退步骤见
[`docs/musicxml-import-production-strategy.md`](./musicxml-import-production-strategy.md)。
当前仍建议只在本地开发和 Vercel Preview 中按需开启两个开关，Production 保持关闭。

无需浏览器的轻量静态检查可通过以下命令运行：

```bash
npm run validate:musicxml-import-ui
```

该检查不会启动 Next.js server，也不会让 `validate:musicxml` 依赖 UI 或浏览器。

## 保持不变的行为

- `/api/recognize` 没有被 MusicXML 导入 UI 替换或修改。
- 默认图片上传和 mock 图片识别流程保持不变。
- `MockRecognizer` 和默认 `mock` provider 保持不变。
- Tone.js 加载、音符时值换算和播放流程保持不变。
- build、测试和网页运行不依赖 Audiveris、Java、FastAPI 或 Docker。
