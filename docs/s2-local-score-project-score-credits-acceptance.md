# S2 本机谱项目谱面标题与署名验收

## 定位

本切片承接编制模板，为本机谱项目加入 canonical 谱面标题、署名和版权声明。它们是
乐谱内容，会随 revision、undo／redo、恢复候选和本机持久化演进；本机项目列表名称
仍是独立字段，不会与谱面标题自动同步。

本切片升级到 `score-document-v6` 与 `local-score-project-storage-v7`。读取旧数据只在
内存中确定性迁移，不因打开项目自动写回；下一次显式保存才持久化新版本。

## Canonical 语义

`scoreCredits` 必须 exact 保存：

```ts
{
  title: string;
  subtitle: string | null;
  creators: readonly {
    role: "composer" | "lyricist" | "arranger";
    name: string;
  }[];
  rightsNotice: string | null;
}
```

- `title` trim 后非空，最多 120 个 Unicode code point。
- `subtitle`、`rightsNotice` 的空白输入规范化为 `null`，非空时分别最多 120、240 个
  Unicode code point。
- `creators` 最多 16 项并保持顺序；姓名 trim 后非空且最多 80 个 Unicode code
  point。同一角色允许多人，但规范化后相同的 `role + name` 不得重复。
- 所有文本均为单行并拒绝 C0／C1 控制字符。credits 对象、creator 对象均拒绝额外
  字段。
- `project.title` 只表示本机项目名称；`scoreCredits.title` 只表示谱面标题。修改任一
  字段不得隐式修改另一字段。
- 版权声明仅记录用户输入文本，不验证作者身份、权利归属或授权状态。

## 迁移与领域命令

- 新建项目和模板项目使用创建时规范化后的外层 `project.title` 初始化
  `scoreCredits.title`，其余字段为空。
- storage v1–v6、document v1–v5 及每个 undo／redo content 使用外层
  `project.title` 初始化同一份默认 credits。
- 迁移必须纯读取、不写回且不得修改传入对象。
- 导出
  `changeLocalScoreProjectScoreCredits({ project, expectedRevision, scoreCredits, now })`。
- 命令为完整替换，先执行 CAS 与时间校验，再规范化、严格校验并复用既有 content
  revision／history／redo-clear 语义。
- 规范化后相同返回原项目，不产生 revision；非法输入、重复署名、旧 revision 或
  时钟回退均拒绝且 canonical 保持不变。
- clone、content fingerprint、serialization、capacity、recovery candidate 与
  IndexedDB round-trip 必须包含深拷贝后的 credits。

## 显示与持久化

- UI 应明确区分“本机项目名称”和“谱面标题与署名”，只在显式保存成功后显示新的
  canonical 值。
- 保存失败时保留旧 canonical 和当前 draft 以便重试，不得出现幽灵标题或署名。
- 五线谱和固定 C 简谱可显示同一 canonical 标题与署名头部；这不是页面布局、打印
  预览或 PDF 证据。
- credits-only 修改不得改变音符、时值、音高、声部结构或播放音符计划。revision 与
  schedule identity 可按既有规则变化。

## 自动验收

- domain 测试覆盖 fresh/default、trim/null、Unicode 上下界、控制字符、exact
  shape、role、多人同角色、重复项、最大人数、CAS、时间、no-op、连续 revision、
  redo clear、undo／redo、项目名称独立和音乐结构不变。
- migration 测试覆盖 storage v1–v6、document v1–v5、undo／redo content、输入不变
  和纯读取不自动写回。
- storage、capacity、IndexedDB recovery、recovery candidate、模板、staff／numbered
  presentation、playback 与 transport 回归必须通过。
- 相关 focused tests、`npm run lint`、`npm run typecheck`、`npm run check` 与
  `git diff --check` 必须通过。

## 明确不做

- 页面尺寸、页边距、系统换行、分页、总谱括号、打印预览、PDF／SVG 导出。
- MusicXML／MXL／MIDI 导入导出、格式 round-trip 或 unsupported-element ledger。
- 账号身份、作者身份、版权验证、许可证明、公开分享或云端同步。
- 多行富文本、字体、字号、位置坐标或完整排版模板。
- 高级符号、移调谱、打击乐谱、TAB、古筝谱或完整谱种宣称。

## 门禁与证据边界

QA level recommendation：`strict`。本切片改变 canonical 乐谱 schema、revision、
undo／redo 和本机持久化，并跨越 presentation／playback 兼容边界。

自动测试和源码检查不等于 Browser 手动 QA、Android WebView／真机、进程中断恢复、
容量边界实机、打印布局、标准格式 round-trip、音乐教师审核或版权验证。未实际执行
的外部证据必须保持 `NOT_EXECUTED`。
