# S3 本机谱项目 MusicXML／MXL 受控导入验收

QA level recommendation：**strict**

## 交付范围

本切片在既有 canonical 本机谱项目、IndexedDB、容量保护、恢复、双谱面与播放闭环上，
增加第一个正式用户可见的结构化乐谱导入入口：

```text
选择 .musicxml／.xml／.mxl
→ 本机解析为内存候选
→ 预览并逐项检查 blocking 问题清单
→ 用户明确确认
→ 原子保存为新的本机谱项目
→ 打开、重开、双谱面查看与播放
```

导入结果在成功保存前始终是内存候选，不是已保存项目、正式转写、练习目标或正确性结论。
文件内容只在本机处理，不上传、不调用 dev API、不依赖账号、生产网站或网络。

## 文件与资源边界

- 支持 `.musicxml`、`.xml` 和压缩 `.mxl`。
- 输入文件最大 2 MiB；空文件或超限文件在解析前拒绝。
- `.mxl` 复用既有安全边界：最多 100 个 zip entries，内部 MusicXML 解压后最大
  4 MiB。
- `.mxl` 的绝对路径、反斜杠或 `..` 路径穿越、无效／缺失
  `META-INF/container.xml`、不存在的 rootfile、损坏 archive、找不到有效
  `score-partwise`／`score-timewise` XML 均失败关闭。
- 解析失败不得创建项目、修改既有项目、写入恢复候选或保留部分 canonical 数据。
- 输入必须先通过严格 XML 良构校验；裸 `&`、非法实体、错配／缺失闭合标签和截断
  文档均以 `malformed-xml` 失败关闭，不能依赖宽松正则恢复后继续。

应用规定的 2 MiB 输入限制和 4 MiB 解压限制必须与浏览器／IndexedDB 物理 quota、
单次事务失败、项目迁移失败分别呈现，不能使用同一个模糊“空间不足”结论。

## 内存候选与 blocking ledger

- 文件读取成功后先生成确定性的内存候选，包含来源文件名、格式、measure／event
  解析摘要和逐项问题清单；当前单 part／staff／voice 边界由 ledger 门禁保证。
- 只有当前切片明确支持且能够无损映射到当前 canonical schema 的 MusicXML 元素可以
  进入候选。
- 所有不支持、无法确定、值域非法、会被忽略、会被截断或会改变音乐语义的元素，一律
  记录为 **blocking**；不得自动丢弃、默认修复、降级为非阻塞 warning 或宣称导入成功。
- 根级、`work`、`part-list` 与 `score-part` 同样采用显式白名单；creator、rights、
  instrument、movement、credit 等未映射元数据必须 blocking，`score-part` 与 `part`
  的非空 ID 必须一致。
- note 与 rest 各自最多允许一个直接、无属性且无非空文本的 `<notations>`。其中
  `<fermata/>` 必须无属性、无文本、无子元素，并无损映射为 canonical
  `fermataMark: "fermata"`。
- pitched note 的 `<slur>` 只允许唯一的 `type="start"` 或 `type="stop"` 属性，必须
  无文本、无子元素；start 必须由同声部紧邻且时间连续的下一个 pitched note 上的 stop
  闭合。该关系无损映射为源 note 的 canonical `slurToNext: true`，并允许同小节、
  跨连续小节和中间 note 同时 stop／start 的链式关系。
- fermata、slur stop 与 slur start 可以共用同一个 `<notations>`；每种 marker 在同一
  note 最多一个。重复容器／marker、孤立或错序 start／stop、休止符上的 slur、跨休止符
  或空拍、额外属性、文本、嵌套元素及错误层级必须 blocking。
- canonical 延音线只接受同声部紧邻、同音高且时间连续的 pitched notes。源／目标
  note 必须分别同时提供直接子级 `<tie type="start|stop"/>` 和唯一 `<notations>`
  中的 `<tied type="start|stop"/>`，两套 marker 必须逐 note 完全一致，才能无损映射
  为源 note 的 `tieToNext: true`。
- tie／tied 支持同小节、跨连续小节和中间 note 同时 stop／start 的链式关系，并可与
  fermata／slur 共用唯一 `<notations>`。direct-only、tied-only、两套 type 不一致、
  孤立／错序／重复 marker、不同音高、休止符、空拍、额外属性、未知 type、文本、
  嵌套元素或错误层级均必须 blocking。
- blocking 项应包含稳定 code、元素类型与原因，并在可用时包含 measure；无法定位到
  具体小节时也必须提供文件级原因。
- 只要存在任意 blocking 项，“确认并保存”保持禁用，并显示简体中文 disabled reason。
- 未确认候选不得进入播放、transport、练习目标、恢复候选或本机项目列表。
- 重新选择文件、清除、重新解析或修改候选后，旧问题清单和旧确认立即失效；不得继续
  使用 stale 候选。

本切片不得为了增加成功率而静默跳过休止符、多 part／staff／voice、和弦时序、
`backup`／`forward`、未知时值、谱号／调号／拍号、歌词、严格 fermata／slur／tie
结构以外的连线或其他 canonical 语义。
不在本切片支持清单中的内容必须 blocking。

## 明确确认与原子保存

- 用户必须先看到谱面候选和完整 blocking ledger，再主动执行“确认并保存为本机谱
  项目”；解析成功本身不能等同于确认。
- 文件读取阶段先验证格式和资源边界；确认时再次验证候选 fingerprint、零 blocking
  状态和 canonical schema，防止 stale 或被修改的候选越过门禁。
- 只有零 blocking 项的候选才能构造当前 canonical `ScoreDocument`，并通过一次
  `persistNewLocalScoreProject` 原子保存为新项目。
- 不得先保存空白项目，再逐项写入；不得在失败后留下幽灵项目、部分事件或错误的容量
  占用。
- 项目数量上限、应用 5 MiB 总量上限、浏览器／IndexedDB quota、事务中止、单次写入
  失败或迁移失败时，保存必须失败关闭：所有既有项目、revision、undo／redo 和恢复
  数据保持原样，内存候选保留为可检查、可重试状态。
- 保存成功后才可把新项目发布到列表并打开编辑器；保存后的 revision、serialization
  和 fingerprint 必须来自持久化 canonical，而不是未保存候选。

## 保存后纵向闭环

- 成功项目可立即在五线谱和固定 C 简谱中查看；两种表示必须读取同一 canonical 数据。
- 项目可使用既有 playback／transport 播放，停止、全停、切页、后台与 revision 变化
  继续遵守现有清理规则。
- 刷新、关闭页面或重启 APK 后可从 IndexedDB 重开同一项目，内容、标题、revision 和
  当前支持的记谱语义保持一致。
- 导入项目继续遵守既有 CAS、undo／redo、save-first、容量保护、recovery 和安全删除
  语义，不建立第二套项目存储。

## 自动验收

至少覆盖：

- `.musicxml` 与 `.xml` 的受支持最小 fixture 生成等价 canonical；
- 同一内容的 `.mxl` 与未压缩 XML 生成等价候选；
- 音符、休止符、小节边界及当前明确支持的谱号／调号／拍号无静默丢失；
- note/rest 的严格 `<notations><fermata/></notations>` 映射为 canonical
  `fermataMark`；带属性、文本、重复、空容器或错误层级的变体全部失败关闭；
- 相邻时间连续 note 的严格 slur start／stop 映射为 canonical `slurToNext`；同小节、
  跨小节、链式及 fermata 共存保持不变，孤立、错序、重复、休止符、空拍、额外属性、
  非 `start`／`stop` type、文本、嵌套和错误层级全部失败关闭；
- 相邻同音高且时间连续 note 的 direct tie 与 notations/tied start／stop 必须成对
  一致并映射为 canonical `tieToNext`；同小节、跨小节、链式和 fermata／slur 共存
  保持不变，两套 marker 缺失或不一致、孤立、错序、重复、不同音高、休止符、空拍、
  额外属性、未知 type、文本、嵌套和错误层级全部失败关闭；
- 空文件、2 MiB 超限、非良构／损坏 XML／archive、根级未映射语义、part ID 不一致、
  100 entries 超限、4 MiB 解压超限、
  container/rootfile 异常和路径穿越全部失败关闭；
- 每类未支持元素形成 blocking ledger，任一 blocking 项阻止确认和保存；
- 清除、替换、重新解析及候选修改使旧确认 stale；
- 未确认、stale 或 fingerprint 不一致的候选不能保存或播放；
- 确认后只写入一个完整项目；项目数量、5 MiB、quota、事务和迁移失败不改变既有数据；
- 保存后重开、serialization、双谱面与 playback／transport 回归；
- focused tests 在 `.github/workflows/quality.yml` 中恰好注册一次，并通过 lint、
  typecheck、完整 `check`、Android 本地校验／构建和 `git diff --check`。

## 人工 QA

在真实桌面浏览器和安装后的 Android WebView／真机分别检查：

1. 受支持 XML 和 MXL 的选择、解析、候选预览、问题清单和明确确认。
2. blocking 文件无法确认，替换／清除后旧候选不可恢复为当前结果。
3. 保存成功后项目列表只新增一个项目，可打开、双谱面查看、播放并在重启后重开。
4. 容量、quota 或事务失败时已有项目仍可打开，候选可在条件恢复后重试。
5. Network 面板或 Android 网络行为没有文件上传、dev API、账号或云端请求。

没有真实执行和记录时，上述浏览器、Android WebView 与真机证据必须保持
`NOT_EXECUTED`。

第三方独立阅读器、真实音频、教师审核、MIDI、OMR、完整 MusicXML、完整 S3 与正式版
V1 也均为 `NOT_EXECUTED` 或未完成；仓库内部导入测试不能替代这些证据。

## 明确不做

- 本导入切片自身不验收 MIDI 导入／导出、MusicXML／MXL 导出或格式 round-trip；
  后续受控导出与仓库内部 round-trip 已由独立切片完成。
- 独立阅读器重新打开、PDF／图片／音频／视频导出、全谱／分谱导出。
- 图片／PDF OMR、Audiveris production、自动转写、置信度评分或正式练习目标。
- 上传、云同步、账号、公开曲库、协作、教师批注或第三方格式转换。
- 对当前未支持 MusicXML 元素进行猜测、静默删除、自动修复或“尽力导入”。

本切片只是 S3 的第一个受控导入纵向切片，不代表完整 MusicXML 标准、MIDI、导出、
round-trip、OMR、教师审核、真机验收或正式版 V1 已完成。

后续同一严格子集的受控导出边界见
`docs/s3-local-score-project-musicxml-export-acceptance.md`；该切片已经完成，但不改变
本文件的导入验收范围，也不能反向把首个导入切片描述为当时已经完成导出或第三方
阅读器验证。

延长记号双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-fermata-round-trip-acceptance.md`。

圆滑线双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-slur-round-trip-acceptance.md`。

延音线双向严格子集的独立验收边界见
`docs/s3-local-score-project-musicxml-tie-round-trip-acceptance.md`。
