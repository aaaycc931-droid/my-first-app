# S3 本机谱项目 MusicXML/MXL XML 1.0 文本安全验收

状态：**导出 fail-closed 加固候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 问题与范围

当前 canonical 谱面标题和 part 名称可能包含孤立 UTF-16 surrogate、`U+FFFE` 或
`U+FFFF`。这些值不属于 XML 1.0 `Char` 范围；仅做 `& < > " '` escaping 不能使其
合法，`TextEncoder` 还可能把孤立 surrogate 静默替换为 `U+FFFD`。

本切片只加固当前已经输出的文本边界：

- `scoreCredits.title`／`project.title`（后者也是文件名来源）；
- 单一 part 的 `name`；
- 由项目标题生成的 `.musicxml`／`.mxl` 文件名。

不修改 canonical schema、storage、编辑器、导入语义或已支持的 MusicXML 音乐字段。

规范参考：

- <https://www.w3.org/TR/xml/#charsets>

## 严格规则

- 输出文本的每个 Unicode code point 必须属于 XML 1.0 Fifth Edition `Char`：
  `#x9`、`#xA`、`#xD`、`#x20–#xD7FF`、`#xE000–#xFFFD` 或
  `#x10000–#x10FFFF`。
- 项目名称、谱面标题或 part 名称中的孤立 high／low surrogate、`U+FFFE` 与
  `U+FFFF` 必须形成稳定 blocking issue；
  不得删除、替换、归一化或生成 XML/MXL 候选。
- XML 1.0 允许的 supplementary-plane code point 必须原样保留。
- canonical 项目名称既有的 80 UTF-16 code unit 上限保持不变；在该边界内合法的
  supplementary-plane code point 必须在文件名中原样保留。
- 已有 canonical 单行、长度、控制字符和项目标题／谱面标题一致性规则保持不变；
  本切片不放宽这些更窄的产品约束。

## 自动验收

- 项目名称、谱面标题与 part 名称分别覆盖孤立 high surrogate、孤立 low
  surrogate、`U+FFFE` 和 `U+FFFF`，并验证 `status=blocked`、稳定 issue code、
  XML／文件名／字节数为空及 `.musicxml`／`.mxl` 确认下载失败。
- 覆盖合法 supplementary-plane code point 的 XML 文本、文件名与解包后的 MXL
  XML 原样保留，并由严格导入器重开核对。
- 覆盖在 canonical 80 UTF-16 code unit 边界内以 astral code point 结尾的文件名，
  验证不会产生孤立 surrogate 或替换字符。
- focused export tests、documentation hygiene、lint、typecheck、完整 `check`、
  Android 本地校验／构建和 `git diff --check` 必须通过。

## 证据边界

本切片只证明仓库内部导出在受控文本边界上不生成已知非法或被静默替换的 XML 1.0
文本。真实浏览器下载、Android WebView／真机文件处理、MuseScore 等第三方阅读器、
完整 MusicXML/MXL、完整 S3 与正式版 V1 仍为 `NOT_EXECUTED` 或未完成。
