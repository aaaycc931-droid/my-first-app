# S2 本机谱项目单音指法验收

## 定位

本切片承接谱面标题与署名，为本机谱项目的单个有音高音符加入 canonical 指法。指法
属于乐谱内容，会随 revision、undo／redo、恢复候选、复制／粘贴和本机持久化演进；
五线谱与固定 C 简谱消费同一份数据。

本切片升级到 `score-document-v7` 与 `local-score-project-storage-v8`。读取旧数据只在
内存中确定性迁移，不因打开项目自动写回；下一次显式保存才持久化新版本。

## Canonical 语义

每个 note event exact 保存：

```ts
{
  // 既有 note event 字段
  fingering: 1 | 2 | 3 | 4 | 5 | null;
}
```

- `1`–`5` 表示单音的第一至第五指；`null` 表示该音符没有显式指法。
- 指法只属于 `type: "note"` 的事件。休止符不得携带 `fingering` 字段。
- 数字字符串、`0`、`6`、小数、`NaN`、布尔值、对象及其他额外状态均非法，不做
  宽松转换。
- 指法不表达左右手、换指线、跨音连指、吉他和弦图、弦号、品位或其他乐器专用
  技法；这些能力必须由后续独立 schema 明确建模。

## 迁移与领域命令

- 新建 note event 默认 `fingering: null`；rest event 保持没有该字段。
- storage v1–v7、document v1–v6 及每个 undo／redo content 中的旧 note event
  确定性迁移为 `fingering: null`。
- 迁移必须纯读取、不写回且不得修改传入对象。
- 导出
  `changeLocalScoreProjectEventFingering({ project, expectedRevision, location, eventId, fingering, now })`。
- 命令必须先执行 CAS 与时间校验，再精确定位一个既有 note event，并复用既有
  content revision／history／redo-clear 语义。
- 相同指法返回原项目，不产生 revision；旧 revision、时钟回退、非法指法、缺失
  事件或目标为 rest 均拒绝且 canonical 保持不变。
- undo／redo 必须恢复完整指法；undo 后的新指法修改必须清空 redo。
- copy 必须保留 note 的指法，paste 必须把它写入新 note；复制 rest 不产生指法。
- clone、content fingerprint、serialization、capacity、recovery candidate 与
  IndexedDB round-trip 必须包含指法。

## 显示、保存与播放

- UI 只在保存成功后显示新的 canonical 指法；保存失败时保留旧 canonical 和当前
  draft 以便重试，不得出现幽灵指法。
- 五线谱与固定 C 简谱显示同一 canonical 指法；这不代表左右手判断、自动指法推荐
  或完整排版已经完成。
- 指法修改不得重建、中断或改变正在进行的播放状态。
- fingering-only 修改不得改变音高、时值、小节、声部结构、播放事件、时间线或
  音色。revision 与 schedule identity 可按既有规则变化。

## 自动验收

- domain 测试覆盖 `1`–`5`、`null`、非法值、note-only、CAS、时钟回退、no-op、
  连续 revision、redo clear、undo／redo 和缺失事件。
- copy／paste 测试覆盖指法保留、粘贴后的独立事件和 rest 不携带指法。
- migration 测试覆盖 storage v1–v7、document v1–v6、undo／redo content、输入
  不变和纯读取不自动写回。
- serialization、storage、capacity、IndexedDB recovery、recovery candidate、
  staff／numbered presentation、playback 与 transport 回归必须通过。
- 专项测试必须证明 fingering-only 修改的播放音符事件、时间线、span 与 warning
  等价。
- 相关 focused tests、`npm run lint`、`npm run typecheck`、`npm run check` 与
  `git diff --check` 必须通过。

## 明确不做

- 自动生成、推荐、评分或校正指法。
- 左右手、换指线、同音换指、跨音连指、和弦多指法或演奏动作分析。
- 吉他／贝斯 TAB、弦号、品位、和弦图、鼓谱或古筝专用指法。
- MusicXML／MXL／MIDI 导入导出、格式 round-trip 或 unsupported-element ledger。
- 页面排版、打印预览、PDF／SVG 导出、云同步或协作。

## 门禁与证据边界

QA level recommendation：`strict`。本切片改变 canonical 乐谱 schema、revision、
undo／redo 和本机持久化，并跨越 presentation／playback 兼容边界。

自动测试和源码检查不等于 Browser 手动 QA、Android WebView／真机、进程中断恢复、
容量边界实机、真实演奏可读性、MusicXML round-trip 或音乐教师审核。未实际执行的
外部证据必须保持 `NOT_EXECUTED`。
