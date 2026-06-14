# Audiveris CLI 本地手动验证 Runbook（Phase A14）

## 1. 目标与边界

本 Runbook 只用于开发者在自己的本地机器上手动验证 Audiveris CLI。它：

- 不用于 Vercel。
- 不用于生产环境。
- 不接入 `/api/recognize`。
- 不影响当前默认的 `mock` provider。
- 不让 build、测试或 MusicXML fixture 验证依赖 Java 或 Audiveris。

Phase A14 只准备手动操作步骤和结果记录模板，仓库中的代码及脚本仍不会执行真实
Audiveris CLI。

## 2. Windows 本地准备

先在 Windows 本地确认 Audiveris 的实际安装目录和命令行入口。根据安装方式和版本，
可能需要查看以下位置：

- `C:\Program Files\Audiveris\`
- `C:\Program Files\Audiveris\bin\`
- Windows 开始菜单中 Audiveris 快捷方式对应的目标路径

这些只是可能路径，不代表本机一定使用这些目录。用户必须自行确认真实入口是
`.bat`、`.exe` 还是其他启动文件，并记录本机 Audiveris 版本；不要把示例路径当成
已经验证的事实。

## 3. 设置环境变量并检查配置

在 Windows PowerShell 中可以按以下形式临时设置 `AUDIVERIS_PATH`：

```powershell
$env:AUDIVERIS_PATH="C:\Program Files\Audiveris\Audiveris.bat"
npm run audiveris:check-local
```

`Audiveris.bat` 只是示例。如果本机实际入口的名称或位置不同，必须替换为用户确认过的
真实路径。`audiveris:check-local` 只读取环境变量并输出 JSON；它不检查文件是否存在，
也不会执行 Audiveris 或 Java。

## 4. dry-run 验证

在仓库根目录运行：

```bash
npm run audiveris:dry-run -- sample-input.png ./tmp/audiveris-output
```

该命令只输出草案命令数组，不访问输入文件、不创建输出目录，也不会执行 Audiveris。
输出中的 command shape 是 provisional，尚未通过真实 Audiveris CLI 验证。

## 5. 真实 CLI 手动验证步骤模板

> **待本地验证：** 以下 command shape is provisional and not yet verified。用户必须
> 根据本机安装版本的 CLI 帮助，自行确认真实 Audiveris CLI 语法后再手动运行。

1. 选择一份有权使用的本地图片或 PDF，并准备独立的输出目录。
2. 查看本机 Audiveris 版本提供的 CLI 帮助，确认 batch、export、output 和 input 的
   实际参数名称、前缀、顺序及路径引用方式。
3. 根据确认结果，把 dry-run 草案替换为本机真实命令。仅用于记录的未验证模板为：

   ```text
   "<AUDIVERIS_PATH>" -batch -export -output "<OUTPUT_DIRECTORY>" "<INPUT_FILE>"
   ```

4. 由用户在自己的 Windows 终端中手动运行确认后的命令。本仓库没有自动执行该命令的
   脚本。
5. 把实际命令、退出状态、stdout/stderr 摘要和生成文件记录到
   `docs/audiveris-cli-verification-template.md` 的副本中。

在完成并记录本地验证前，不得把上述参数描述为已经验证或可用于生产的命令。

## 6. 输出文件检查

本地手动调用结束后，检查并记录：

- 是否生成 `.mxl` 文件。
- 是否生成 `.musicxml` 或 `.xml` 文件。
- 每个目标输出文件的大小是否大于 0。
- 解压或取得的 MusicXML 是否能通过现有 dev-only MusicXML API 上传并解析。
- 脱敏后的输出是否适合加入 Audiveris fixture 验证流程。

如果只生成 `.mxl`，应记录是否能从中取得 MusicXML；不要为了本地验证改变当前
`/api/recognize` 图片上传行为。

## 7. 隐私与提交前脱敏

Audiveris 输出文件、压缩包内容、日志和 metadata 可能包含输入文件路径、输出目录、
Windows 用户名或其他本地路径。提交任何真实验证产物前必须：

1. 检查输出和日志中是否存在本地路径或其他敏感信息。
2. 对准备提交的 fixture 和记录进行脱敏。
3. 在对应 fixture 的 `source.md` 中明确记录脱敏内容和范围。
4. 不提交原始私人路径、未授权输入文件或包含敏感信息的完整日志。

