# S3 本机谱项目 MusicXML／MXL 受控导出验收

QA level recommendation：**strict**

## 交付范围

本切片在既有 canonical 本机谱项目和受控 MusicXML／MXL 导入闭环上，增加第一个
用户可见的标准格式导出入口：

```text
打开已保存的 canonical 本机谱项目
→ 选择 .musicxml 或 .mxl
→ 在内存生成导出候选和 blocking 问题清单
→ 用户检查摘要并明确确认
→ 下载一个文件
→ 仓库内部重新导入并核对受支持语义
```

导出候选不是新的项目版本，也不表示完整 MusicXML、第三方阅读器兼容或正式 S3
完成。候选生成、检查和下载均在本机进行，不上传、不调用 dev API、不依赖账号、
生产网站或网络。

## 当前严格无损子集

本切片只导出当前导入器能够无损重新建立的明确子集：

- 输入必须通过当前 `local-score-project-storage-v14`／`score-document-v13`
  canonical 严格校验。
- 只支持一个 part、一个 pitched staff 和一个 voice；小节编号必须严格递增。
- 拍号只支持 `2/4`、`3/4`、`4/4`，调号 fifths 只支持 `-1`、`0`、`1`，谱号只支持
  G2 高音谱号或 F4 低音谱号。
- 音符只支持自然音 C4–C5，以及二分、四分、八分时值；休止符只支持四分休止符。
- canonical 全局 `tempoBpm` 只接受整数 `30–240`，并确定性写为第一小节直接
  `<attributes>` 之后唯一、空的 `<sound tempo="N"/>`；包括默认 `90 BPM` 在内均
  显式输出。当前 importer 重新导入后必须 exact 恢复相同速度。
- part instrument 可以为 `unassigned` 或 canonical `gm1-program: 0–127`。
  `unassigned` 不生成乐器声明；GM1 program 必须在 `part-name` 后确定性写入唯一
  `<score-instrument id="P1-I1"><instrument-name>…</instrument-name></score-instrument>`
  与相同 ID 的 `<midi-instrument id="P1-I1"><midi-program>N</midi-program>
  </midi-instrument>`，其中 MusicXML 一基 `N = canonical program + 1`。
  channel、bank、program change、真实音色选择和其他乐器结构不在当前子集。
- 项目列表标题必须与 `scoreCredits.title` 一致；导出总是把该主标题写为唯一、无属性的
  root-level `<work><work-title>…</work-title></work>`，并在重新导入后 exact 恢复。
  谱面主标题和单 part 名称属于本切片明确核对的文本，XML 特殊字符必须正确转义，重新
  导入后不得静默改变。非空 subtitle、按 canonical 数组顺序的 composer／lyricist／
  arranger creators 和 rightsNotice 均映射到唯一根级 movement-title／identification；
  XML 1.0 非法 credits 文本、重复 creator 或其他不受支持的 credit 结构必须形成
  blocking 项。
- canonical note 的 half／quarter／eighth 与 canonical quarter rest 可携带
  `augmentationDots: 1`，并确定性写成 `<type>` 后、`<staff>` 前的唯一 `<dot/>`。
  导出固定使用 `divisions=4`，使基础时值分别为 `8`／`4`／`2`、单附点时值分别为
  `12`／`6`／`3`；容量、关系连续性与 importer re-import 均按附点后真实时值核对。
- canonical note/rest 的 `fermataMark: "fermata"` 必须确定性写为其直接子级
  `<notations><fermata/></notations>`，并由当前 importer 无损重建。
- canonical note 的 `slurToNext: true` 必须在源 note 写入
  `<slur type="start"/>`，并在同声部紧邻且时间连续的目标 note 写入
  `<slur type="stop"/>`；同小节、跨连续小节和链式关系必须由当前 importer 无损重建。
- 同一 note 同时承载 fermata、前一圆滑线 stop 和后一圆滑线 start 时，必须只生成一个
  `<notations>`，并按 fermata、stop、start 的固定顺序确定性输出。
- canonical note 的 `tieToNext: true` 必须在源 note 同时写入 direct
  `<tie type="start"/>` 和 notations `<tied type="start"/>`，并在同声部紧邻、
  同音高且时间连续的目标 note 同时写入对应 stop；同小节、跨连续小节和链式关系必须
  由当前 importer 无损重建。
- tied、fermata 与 slur 共存时必须复用一个 `<notations>`，direct tie 和 notation
  marker 均使用固定、可复核的确定性顺序：direct tie 为 stop 后 start，notations
  为 fermata、tied stop、tied start、slur stop、slur start；不存在的 marker 跳过。
  不得创建第二个容器或只输出视觉／播放 marker 的一侧。
- pitched note 的规范化非空 canonical `lyric` 必须 XML escape 后确定性写为唯一
  `<lyric><text>…</text></lyric>`，顺序位于 `<staff>` 和可选 `<notations>` 之后。
  text 最多 80 个 Unicode code point、前后无空白且无 C0／C1 控制字符、孤立
  surrogate 或 `U+FFFE`／`U+FFFF`；不得生成
  `syllabic`、verse 属性、`elision`、`extend` 或其他 canonical 未表达的歌词语义。
  非规范 canonical lyric 必须 blocking，不得在导出时 trim 或修正。
- pitched note 的 canonical `fingering: 1–5` 必须确定性写入唯一 `<notations>`
  中的 `<technical><fingering>N</fingering></technical>`；与 fermata、tied 和 slur
  共存时顺序固定在这些 marker 之后，可选 lyric 仍位于整个 `<notations>` 之后。
  `null` 不生成指法 markup，rest 不承载指法。
- pitched note 的 canonical `articulations` 必须按 accent、staccato、tenuto 固定
  顺序写入唯一 `<articulations>`；空数组不生成 markup，rest 不承载演奏法。与其他
  notations 语义共存时位于 technical/fingering 之后、可选 lyric 之前。
- note/rest 的 canonical `dynamicMark` 只允许 `pp`、`p`、`mp`、`mf`、`f` 或
  `ff`，并确定性写入唯一 `<notations><dynamics>` 中的一个同名空记号；`null`
  不生成 markup。与其他 notations 语义共存时位于 articulations 之后、可选 lyric
  之前，不生成 measure-level direction 或播放力度属性。
- note/rest 的 canonical `damperPedalMark` 只允许 `down`、`up` 或 `null`；
  `down`／`up` 分别在目标事件紧邻之前确定性写入只含 pedal `start`／`stop`、
  voice 1 和 staff 1 的严格 `<direction>`，`null` 不生成 direction。
- note/rest 的 canonical `chordSymbol` 只接受根音 `A–G` 后可选单个 ASCII
  `#`／`b` 的无后缀、`m`、`7`、`maj7`、`m7`、`6`、`aug`、`dim`、`aug7`、
  `dim7` 或 `m7b5`
  形式，分别确定性
  写为 major、minor、dominant、major-seventh、minor-seventh、major-sixth、
  augmented、diminished、augmented-seventh、diminished-seventh、half-diminished 的严格
  `<harmony>`；`#`／`b` 分别写为 exact `<root-alter>1</root-alter>`／
  `<root-alter>-1</root-alter>`，自然音省略 root-alter。和踏板共存时固定输出
  harmony → pedal direction → note/rest；`null` 不生成 harmony。
- 第一小节首事件同时包含和弦和踏板时，确定性 measure 子元素顺序为
  attributes → sound → harmony → pedal direction → event；sound 不锚定事件，也
  不进入 pedal direction。
- 多附点、多个／替代指法、其他 technical、其他演奏法、组合／其他力度、双升降／
  Unicode 升降号、slash chord、其他和弦类别及其他当前未映射的非中性 canonical
  语义，必须逐类形成稳定 blocking 项。
- 项目至少包含一个事件；任何超过当前拍号容量的小节必须 blocking。

项目 ID、document ID、event ID、创建／更新时间、revision 和 undo／redo 是本机项目
身份或编辑历史，不写入交换文件，也不纳入音乐语义等价比较。导出不得因此修改或重建
这些字段。

## 内存候选与 blocking ledger

- 打开项目或切换格式本身不能自动下载。系统先生成确定性的内存候选，显示格式、
  文件名、小节／事件摘要、字节数和完整问题清单。
- 每个不支持、无法确定、会被忽略、会被截断或无法由当前 importer 无损重建的字段，
  一律为 **blocking**；不得默认修复、丢弃或降级为 warning 后继续下载。
- blocking 项使用稳定 code、简体中文原因，并在可用时定位 part、staff、voice、
  measure 或 event。
- 只要存在任意 blocking 项，“确认并下载”保持禁用，并显示具体 disabled reason。
- 用户修改项目、切换项目、切换格式、清除候选或重新生成后，旧 fingerprint 和旧确认
  立即失效。
- 未确认、stale、fingerprint 不一致、canonical 重验失败或输出内容被修改的候选
  不得下载。

## 明确确认与下载边界

- 用户必须先看到导出摘要和完整 ledger，再主动执行“我已检查，确认导出并下载”；
  生成 XML／MXL 成功不等于用户确认。
- 确认时再次严格解析当前项目，并重验项目 revision、候选 fingerprint、零 blocking
  状态、格式和输出摘要。
- 只有确认成功后才能创建一次下载；不得在候选阶段创建隐藏下载、触发第二次下载或
  自动写入文件系统。
- 下载失败时保留候选供用户检查和重试，不得修改项目、revision、undo／redo、
  IndexedDB、recovery candidate 或项目列表。
- 导出是纯读取动作，不执行项目保存、容量腾挪、迁移或删除；应用 5 MiB 项目容量、
  浏览器下载失败和 IndexedDB quota 是不同边界，不得混为同一错误。
- 文件名必须经过本机安全规范化，不能包含路径分隔符、控制字符或路径穿越语义。

## MusicXML 与 MXL 结构

- `.musicxml` 输出为确定性的 UTF-8 `score-partwise` MusicXML，明确写出 divisions、
  调号、拍号、谱号、全局速度、staff、voice、顺序小节和每个事件的 pitch／rest、
  duration、type 与受控单附点。
- 文本必须进行 XML escape；不得通过拼接未经转义的项目标题或 part 名称生成无效 XML。
- 每个零 blocking 导出都必须显式包含唯一严格 `work/work-title`，包括由历史缺省
  work-title 输入得到的 canonical 标题；不得省略、改用 `movement-title`／`credit` 或
  依赖 importer fallback。
- `.mxl` 必须把未压缩的标准 `mimetype`
  `application/vnd.recordare.musicxml` 作为首项，并包含
  `META-INF/container.xml` 和 container 指向的 `score.musicxml`；container 使用
  MusicXML 4.0 的无 namespace、无额外属性结构，rootfile 的
  media type 为 `application/vnd.recordare.musicxml+xml`，固定路径不包含绝对路径、
  反斜杠或 `..`。
- `.mxl` 使用固定 archive metadata 形成可复核输出；解包后的 MusicXML 必须与同一项目
  的 `.musicxml` 语义等价。
- UTF-8 MusicXML 和最终 MXL 分别不得超过 2 MiB；超限、压缩或 Blob 创建失败时
  必须失败关闭，不得提供部分文件或仍显示成功。

## 仓库内部 round-trip 证据

自动验收使用两个职责不同的仓库内部读取路径：

1. 当前 canonical MusicXML importer 重新读取 `.musicxml`，以及从 `.mxl` 安全解包
   后的 XML，核对标题、part 名称、音高、时值、休止符、小节、调号、拍号和谱号等本
   切片承诺的语义，以及单附点、单段歌词、单指法、单音演奏法、单事件力度记号、
   单事件制音踏板记号、受控和弦标记、全局速度、fermata、slur 与 tie 的 canonical
   映射。
2. 既有 legacy `musicxmlParser` 作为独立代码路径，交叉核对其能够表达的音符音高、
   基础时值、小节和拍位。该 parser 以 raw duration 推进附点后的拍位，但不表达 dot
   identity、歌词、休止符、credits 或全部 canonical 字段，不能单独证明完整
   round-trip。

上述两个路径都是本仓库内部自动测试，不是 MuseScore、Dorico、Sibelius 或其他第三方
独立阅读器证据。没有真实外部程序执行记录时，不得使用“独立阅读器已通过”或“第三方
完全兼容”的表述。

## 自动验收

至少覆盖：

- 同一受支持项目的 `.musicxml` 与 `.mxl` 解包 XML 语义等价；
- XML escaping、确定性输出、安全文件名、标准 MXL container 和 rootfile；
- 谱面标题与 part 名称仅在全部 code point 属于 XML 1.0 `Char` 时输出；非法字符
  形成稳定 blocker，canonical 范围内的 supplementary-plane 字符保持无损；
- 音符、四分休止符、小节、调号、拍号、谱号、主标题和 part 名称的内部 re-import
  语义等价；
- `.musicxml` 与 `.mxl` 均总是写出唯一 root-level `work/work-title`，且 importer
  re-import 后 `scoreCredits.title` exact 等于导出前 canonical title；
- canonical `tempoBpm` 的 `30`、`90`、`240` 及范围内代表值均写为首小节
  attributes 后唯一空 `<sound tempo="N"/>`；`.musicxml`／`.mxl` re-import 后保持
  exact 速度，并覆盖与首事件 harmony／pedal 共存的固定顺序；
- half／quarter／eighth note 单附点及 quarter rest 单附点确定性写为严格 `<dot/>`，
  `.musicxml`／`.mxl` re-import 后保持 `augmentationDots`，整数 duration、容量与
  后续拍位均按 `1.5×` 真实时值；
- canonical 单段歌词按 `<staff> → <notations> → <lyric><text>` 确定性输出；中文、
  内部空格、emoji 与 XML 特殊字符经 `.musicxml`／`.mxl` re-import 后保持 exact
  `lyric`，无歌词 note 保持 `null`；
- canonical `1–5` 单指法按唯一
  `<technical><fingering>N</fingering></technical>` 确定性输出，与单附点、
  fermata、tie／tied、slur 和 lyric 共存时经 `.musicxml`／`.mxl` re-import
  保持 exact `fingering`，无指法 note 保持 `null`；
- canonical accent／staccato／tenuto 按固定顺序写入唯一 `<articulations>`，与既有
  严格语义共存并经 `.musicxml`／`.mxl` re-import 保持 exact canonical 集合；
- canonical `pp`／`p`／`mp`／`mf`／`f`／`ff` 写入唯一 `<dynamics>`，note/rest
  均可承载；与既有严格语义共存并经 `.musicxml`／`.mxl` re-import 保持 exact
  `dynamicMark`；
- canonical `down`／`up` 分别写入紧邻 note/rest 的严格 pedal `start`／`stop`
  direction，与既有严格语义共存并经 `.musicxml`／`.mxl` re-import 保持 exact
  `damperPedalMark`；`null` 不生成 direction；
- note/rest 延长记号写为严格 `<notations><fermata/></notations>`，`.musicxml`
  与 `.mxl` re-import 后保持同一 canonical `fermataMark`；
- canonical 圆滑线写为相邻时间连续 note 上严格配对的 slur start／stop；同小节、
  跨小节、链式和 fermata 共存经 `.musicxml`／`.mxl` re-import 后保持同一
  `slurToNext`；
- canonical 延音线同时写为 direct tie 和 notations/tied 的严格 start／stop 对；
  同小节、跨小节、链式及 fermata／slur 共存经 `.musicxml`／`.mxl` re-import 后
  保持同一 `tieToNext`；
- legacy parser 对音符音高、时值、小节和拍位的交叉检查；
- 非法 instrument、非法 credits 文本／重复 creator／错序 rights，以及每类未支持
  canonical 记谱字段分别形成 blocking ledger；受控 GM1 program 已按独立 acceptance
  映射，不再作为“已分配即 blocking”的能力；
- 多 part／staff／voice、非法 canonical、空事件、输出超限和压缩失败全部失败关闭；
- 未确认、stale、fingerprint 不一致和候选被修改时不能下载；
- 候选、blocking、确认和下载失败均不修改项目、revision、undo／redo、IndexedDB、
  recovery candidate 或其他项目；
- focused tests 在 `.github/workflows/quality.yml` 中恰好注册一次，并通过 lint、
  typecheck、完整 `check`、Android 本地校验／构建和 `git diff --check`。

## 人工 QA 与未执行证据

真实桌面浏览器和安装后的 Android WebView／真机分别需要检查：

1. 两种格式的候选、ledger、明确确认、单次下载、取消和失败重试。
2. 修改项目或切换格式后旧确认失效，blocking 项目无法下载。
3. 下载的 XML／MXL 可由应用重新导入，受支持语义与原项目一致。
4. 文件选择／保存体验、中文错误和离线行为在 Android WebView 中可用。
5. Network 面板或 Android 网络行为没有上传、dev API、账号或云端请求。

此外，需使用 MuseScore 等合法独立阅读器真实打开 XML／MXL，并记录程序版本、文件
摘要、打开结果、警告和语义核对结果。当前浏览器下载、Android WebView／真机和外部
独立阅读器 QA 均为 `NOT_EXECUTED`；自动测试、DOM 行为测试或仓库内部 parser 不能
替代这些证据。

真实音频、教师审核、MIDI、OMR、完整 MusicXML、完整 S3 与正式版 V1 也均为
`NOT_EXECUTED` 或未完成。

## 明确不做

- 完整 MusicXML 标准、任意多 part／staff／voice 或当前未列出的记谱语义。
- MIDI 导入／导出、PDF／图片／音频／视频、全谱／分谱或内部项目包导出。
- 图片／PDF OMR、自动转写、正式练习目标、上传、同步、协作或公开分享。
- MuseScore 等第三方独立阅读器通过宣称、完整格式兼容宣称或正式版 V1 完成宣称。

本切片只建立当前严格子集的受控 MusicXML／MXL 导出与仓库内部语义 round-trip，
不代表完整 S3 或正式版 V1 已完成。

延长记号双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-fermata-round-trip-acceptance.md`。

圆滑线双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-slur-round-trip-acceptance.md`。

延音线双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-tie-round-trip-acceptance.md`。

单附点双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-augmentation-dot-round-trip-acceptance.md`。

单段歌词双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-lyric-round-trip-acceptance.md`。

单指法双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-fingering-round-trip-acceptance.md`。

单音演奏法双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-articulation-round-trip-acceptance.md`。

单事件力度记号双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-dynamic-mark-round-trip-acceptance.md`。

单事件制音踏板记号双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-damper-pedal-round-trip-acceptance.md`。

受控和弦标记双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-chord-symbol-round-trip-acceptance.md`。

增三／减三和弦新增严格边界见
`docs/s3-local-score-project-musicxml-augmented-diminished-triad-round-trip-acceptance.md`。

减七和弦新增严格边界见
`docs/s3-local-score-project-musicxml-diminished-seventh-round-trip-acceptance.md`。

半减七和弦新增严格边界见
`docs/s3-local-score-project-musicxml-half-diminished-seventh-round-trip-acceptance.md`。

增七和弦新增严格边界见
`docs/s3-local-score-project-musicxml-augmented-seventh-round-trip-acceptance.md`。

大六和弦新增严格边界见
`docs/s3-local-score-project-musicxml-major-sixth-round-trip-acceptance.md`。

XML 1.0 文本与 Unicode 安全边界见
`docs/s3-local-score-project-musicxml-xml-text-safety-acceptance.md`。

全局整数速度双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-tempo-round-trip-acceptance.md`。

GM1 乐器归属双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-gm1-program-round-trip-acceptance.md`。

导入侧 part identity fail-closed 硬化的独立验收边界见
`docs/s3-local-score-project-musicxml-part-identity-hardening-acceptance.md`。

导入侧 note 容器 fail-closed 硬化的独立验收边界见
`docs/s3-local-score-project-musicxml-note-container-hardening-acceptance.md`。
