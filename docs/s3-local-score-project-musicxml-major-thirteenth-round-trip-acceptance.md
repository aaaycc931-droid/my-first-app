# S3 本机谱项目 MusicXML/MXL 大十三和弦 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 本切片唯一语义

- canonical `Cmaj13` 与 MusicXML 4.0 `<kind>major-13th</kind>` exact 双向映射；
  `C` 可替换为 `A–G`、`A#–G#` 或 `Ab–Gb`。
- MusicXML 4.0 将 `major-13th` 定义为 major-11th 加 major 13th；本切片只交换
  kind 标识，不推断和弦音、voicing、持续区间、播放或伴奏。
- 不修改 canonical schema、storage version、事件 ID、编辑器、谱面显示或用户行为。
- 受控和弦矩阵因此从二十二种扩为二十三种 kind；21 个根音拼写保持不变，共
  483 个组合。

规范参考：

- <https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/kind-value/>
- <https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/harmony/>

## 严格结构与失败关闭

- 仅接受无属性、无 namespace、直接位于 measure 下并紧邻目标 note/rest 的
  `<harmony><root>…</root><kind>major-13th</kind><staff>1</staff></harmony>`；
  root 仍只允许自然音或 exact `root-alter` `1`／`-1`。
- `<kind>` 的属性、大小写变体、自由文本、别名、额外内容，以及 harmony 的 bass、
  inversion、degree、错误顺序、错误 staff、错误层级或非空间隔继续 blocking。
- `Cmajor13`、`Cmaj131`、`Cmaj11add13`、`Cmaj13/E`、`Cmaj13#5`、`Cmaj13b5`、
  `CΔ13` 均不归一化，导出以 `unsupported-chord-symbol` 阻断。
- `Cm13`／`minor-13th`、add13、add11、degree、别名、转位和 altered 13th 是不同
  语义，仍保持 fail closed，不属于本切片。
- 任一 blocking import 输入必须在分配 canonical event ID 前停止。

## 自动验收

- canonical parser/renderer 覆盖二十三种 kind × 21 个根音拼写 = 483 个组合。
- `C#maj13` 与 `Dbmaj13` 在 `.musicxml` 和 `.mxl` 的 note/rest round-trip 中 exact
  保留，重复生成字节确定，并与既有受控记号及 legacy parser 投影保持兼容。
- 上述 unsupported canonical 与非法 MusicXML 结构均有失败关闭回归；invalid import
  的 canonical event ID 调用数保持为零。
- focused import/export、typecheck、documentation hygiene、完整 `check` 与
  `git diff --check` 必须通过后才可合并。

## 外部 QA

真实桌面浏览器下载与重开、Android WebView／真机、MuseScore／Dorico／Sibelius 等
第三方独立阅读器中的显示、布局和重新打开均为 `NOT_EXECUTED`。教师、目标用户、
可访问性、真实和弦播放与教育有效性 QA 也为 `NOT_EXECUTED`；仓库测试不得替代这些证据。
