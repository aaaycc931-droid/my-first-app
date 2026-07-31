# S3 MusicXML／MXL 属九和弦严格 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- 在既有受控 `chordSymbol` 双向映射上只增加一种和弦类别：
  `C9` ↔ `<kind>dominant-ninth</kind>`。
- 根音仍只允许 `A–G`，以及可选的单个 ASCII `#`／`b`；因此新增 21 个确定性组合，
  使受控和弦类别从 15 种增至 16 种，组合总数从 315 增至 336。
- MusicXML 与 MXL 的 note/rest 锚定、harmony 结构、踏板共存顺序、blocking ledger、
  明确确认、re-import 和 legacy parser 边界全部复用既有严格门禁。
- `C9` 只表达受控和弦标记；本切片不推断和弦音、voicing、持续区间、真实发声、
  伴奏或其他九和弦语义。
- 不修改 canonical schema、storage version、迁移链、UI、编辑器、谱面显示或播放
  语义。

## 失败关闭边界

- `Cadd9`、`Cmaj9`、`Cm9`、`C69`、`C7add9`、`C9/E`、`C9#5`、`C9b5` 或其他
  alias／扩展／改变音不得归一化为 `C9`。
- `C9`／`dominant-ninth` 不得与 dominant、major-seventh、minor-seventh、
  major、minor、power 或其他 kind 混同、降级或推导。
- `<degree>` 及任何 altered degree，slash／bass／inversion、双升降、Unicode
  升降号、属性、额外节点、错序、重复、namespace／大小写变体及非规范间隔继续
  blocking。
- 未知 kind、其他九和弦、add／扩展音及其他未列出的和弦类别继续 blocking。
- blocking 输入不得分配 canonical event ID，也不得静默删除、截断或改变和弦语义。

## 自动验收

- 纯映射覆盖 dominant-ninth、全部 7 个自然根音及其单升／单降形式。
- XML 与 MXL 都以 pitched note 和 rest 上的单升／单降根音验证 exact import；独立
  导出 fixture 验证 `<kind>dominant-ninth</kind>`、确定性 XML/MXL、
  pitched note/rest 与既有记号共存，以及 exact re-import。
- `Cadd9`／`Cmaj9`／`Cm9`／`C69`／`C7add9`／`C9/E`、altered degree、未知
  kind、bass／inversion、namespace／大小写、属性、错序、重复和其他既有 blocker
  保持失败关闭；blocking import 不分配 event ID。
- focused import/export、chord-symbol、typecheck、documentation hygiene、完整
  `test:*` 注册门禁、production dependency audit、Android sync／本地门禁、移动端与
  Next.js production build 及 `git diff --check` 必须通过。

## 外部证据

真实浏览器导入／下载／重开、Android WebView／真机、MuseScore／Dorico／Sibelius
等第三方独立阅读器中的显示、布局、重开与真实播放均为 `NOT_EXECUTED`。真实和弦
播放、伴奏、MIDI、教师审核、目标用户验证和教育有效性也为 `NOT_EXECUTED`。

仓库内部 parser、re-import、legacy parser、CI、Vercel 或 Debug APK 工件不能替代
上述外部证据。本切片不是完整和弦系统、完整 MusicXML/MXL、完整 S3、最终 APK 或
正式版 V1。
