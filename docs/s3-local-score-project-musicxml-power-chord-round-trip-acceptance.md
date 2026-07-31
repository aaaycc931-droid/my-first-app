# S3 MusicXML／MXL 强力和弦严格 round-trip 验收

状态：**严格子集实现候选；外部 QA NOT_EXECUTED**

QA level recommendation：**strict**

## 范围

- 在既有受控 `chordSymbol` 双向映射上只增加一种和弦类别：
  `C5` ↔ `<kind>power</kind>`。
- 根音仍只允许 `A–G`，以及可选的单个 ASCII `#`／`b`；因此新增 21 个确定性组合，
  使受控组合总数从 294 增至 315。
- MusicXML 与 MXL 的 note/rest 锚定、harmony 结构、踏板共存顺序、blocking ledger、
  明确确认、re-import 和 legacy parser 边界全部复用既有严格门禁。
- `C5` 只表达受控和弦标记；本切片不推断和弦音、三音省略、voicing、持续区间、
  真实发声或伴奏。
- 不修改 canonical schema、storage version、迁移链、编辑器、谱面显示或播放语义。

## 失败关闭边界

- `Cm5`、`C55`、`Cpower`、`C(no3)`、`Comit3`、`C5/E` 或其他 alias／扩展
  不得归一化为 `C5`。
- `C5`／`power` 不得与 major、minor、suspended-second、suspended-fourth、
  major-sixth、minor-sixth 或其他 kind 混同或降级。
- add／扩展音及其他未列出的和弦类别继续 blocking。
- slash／bass／inversion、双升降、Unicode 升降号、属性、额外节点、错序、重复、
  namespace／大小写变体及非规范间隔继续 blocking。
- blocking 输入不得分配 canonical event ID，也不得静默删除或改变和弦语义。

## 自动验收

- 纯映射覆盖 power、全部 7 个自然根音及其单升／单降形式。
- XML 与 MXL 都以 pitched note 和 rest 上的升降根音验证 exact import；独立导出
  fixture 验证 `<kind>power</kind>`、确定性 XML/MXL、pitched note/rest 与既有
  记号共存，以及 exact re-import。
- `Cm5`／`C55`／`Cpower`／`C(no3)`／`Comit3`／`C5/E`、未知 kind、
  bass／inversion、
  namespace／大小写、属性、错序、重复和其他既有 blocker 保持失败关闭；
  blocking import 不分配 event ID。
- focused import/export、chord-symbol、typecheck、documentation hygiene、完整
  `test:*` 注册门禁、production dependency audit、Android sync／本地门禁、移动端与
  Next.js production build 及 `git diff --check` 必须通过。

## 外部证据

真实浏览器导入／下载／重开、Android WebView／真机、MuseScore／Dorico／Sibelius
中的显示、布局、重开与真实播放继续为 `NOT_EXECUTED`。真实和弦播放、伴奏、MIDI、
教师审核、目标用户验证和教育有效性也为 `NOT_EXECUTED`。

仓库内部 parser、re-import、legacy parser、CI、Vercel 或 Debug APK 工件不能替代
上述外部证据。本切片不是完整和弦系统、完整 MusicXML/MXL、完整 S3、最终 APK 或
正式版 V1。
