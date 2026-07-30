# S3 本机谱项目 MusicXML／MXL 谱面标题、署名与版权严格 round-trip 验收

QA level recommendation：**strict**

## 范围

本切片把已经存在于 canonical `scoreCredits`、编辑器和本机持久化中的谱面元数据
接入既有受控单 part／staff／voice MusicXML／MXL 交换层：

- `scoreCredits.title` → 唯一根级 `<work><work-title>…</work-title></work>`；
- `scoreCredits.subtitle` → 唯一根级 `<movement-title>…</movement-title>`；
- `scoreCredits.creators` → 唯一 `<identification>` 中按 canonical 数组顺序出现的
  `<creator type="composer|lyricist|arranger">…</creator>`；
- `scoreCredits.rightsNotice` → 同一 `<identification>` 中唯一、且位于全部 creator
  之后的 `<rights>…</rights>`。

根级确定性顺序为：

```text
work → movement-title → identification → part-list → part
```

可选的 movement-title 与 identification 缺省时不生成空元素；导出始终生成唯一
work/work-title。导入完全缺省 work/work-title 时保留历史确定性文件名 fallback，
但一旦出现 work/work-title 就必须满足本切片的严格规则。

## Canonical 与 fail-closed 边界

- title、subtitle、creator name、rightsNotice 必须是 canonical 单行文本，分别遵守
  现有本机标题／副标题／署名／版权 code-point 上限；C0/C1 控制字符、空文本、
  首尾空白、超长文本和 XML 1.0 不可表示字符均 blocking。
- creator role 只接受 `composer`、`lyricist`、`arranger`；保持数组顺序，同一
  `role + name` 重复、超过 16 项、额外属性、错大小写或 namespace 均 blocking。
- work、work-title、movement-title、identification、creator、rights 均要求精确
  无 namespace、无额外属性；叶节点只允许纯文本。CDATA、comment、processing
  instruction、未知子元素、重复容器、错层级、rights 位于 creator 之前均 blocking。
- XML 文本必须 escape；导入不能 trim、猜测、选择第一项、静默忽略或分配 event ID
  后再报告阻断。阻断候选不得修改项目、revision、undo／redo 或持久化。
- `project.title` 与 `scoreCredits.title` 的既有一致性门槛继续保留，避免导出后
  静默丢失本机项目名称；本切片不改变本机项目名称的独立 canonical 语义。

## 自动验收

必须覆盖 `.musicxml` 与 `.mxl`：

1. 普通中文、XML 特殊字符、Unicode supplementary-plane 文本的确定性导出；
2. title、subtitle、creator 多人同角色、任意合法数组顺序、rights 的 exact re-import；
3. 根级顺序 `work → movement-title → identification → part-list → part`，以及与
   首小节 `attributes → sound → harmony → direction → event` 同时成立；
4. 缺省 work-title fallback 后重新导出显式 work-title；
5. 重复、空、超长、控制字符、额外属性、错层级、CDATA/comment/PI、未知 role、
   duplicate creator、rights 错序和 XML 1.0 非法文本全部 fail-closed；
6. focused import/export tests、documentation hygiene、lint、typecheck、统一 check、
   Android 本地 bundle 校验、远端 Quality/Android CI 与 `git diff --check`。

仓库内部 importer re-import、MXL 解包和 legacy parser 交叉检查只是自动证据；它们
不等于真实浏览器下载／重新打开、Android WebView／实体设备、MuseScore／Dorico／
Sibelius 独立阅读器或教师审核。

## 明确不做

本切片不宣称完成完整 MusicXML/MXL、完整 S3、tempo map／中途变速、MIDI、OMR、
打印布局、credit 坐标、字体排版、作者身份／版权真实性验证、云端同步、正式 V1
或第一代最终 APK。未执行的浏览器、设备、第三方阅读器和教师证据必须保持
`NOT_EXECUTED`。
