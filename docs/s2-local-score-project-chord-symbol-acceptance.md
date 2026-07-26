# S2 本机谱项目和弦标记验收

## 定位

本切片承接单音指法，为本机谱项目的事件起点加入 canonical 和弦标记。和弦标记属于
乐谱内容，会随 revision、undo／redo、恢复候选、复制／粘贴和本机持久化演进；
五线谱与固定 C 简谱消费同一份数据。

本切片升级到 `score-document-v8` 与 `local-score-project-storage-v9`。读取旧数据只在
内存中确定性迁移，不因打开项目自动写回；下一次显式保存才持久化新版本。

## Canonical 语义

每个 note 或 rest event exact 保存：

```ts
{
  // 既有事件字段
  chordSymbol: string | null;
}
```

- 非空和弦标记先 trim，最多 40 个 Unicode code point；空字符串或纯空白规范化为
  `null`。
- 文本必须为单行，不得包含 C0／C1 控制字符；数字、布尔值、对象、数组和其他非
  string／null 值均非法，不做宽松转换。
- 和弦标记锚定当前事件起点；音符和休止符都可携带。`null` 表示该起点没有显式
  和弦标记，不表示自动延续、停止或推断任何和声。
- 本字段只记录用户输入的谱面标记，不解析根音、性质、转位、省略或变化音，不执行
  自动识别、合法性判断、和弦图生成或移调。

## 迁移与领域命令

- 新建 note／rest event 默认 `chordSymbol: null`。
- storage v1–v8、document v1–v7 及每个 undo／redo content 中的旧事件确定性迁移为
  `chordSymbol: null`。
- 迁移必须纯读取、不写回且不得修改传入对象。
- 导出
  `changeLocalScoreProjectEventChordSymbol({ project, expectedRevision, location, eventId, chordSymbol, now })`。
- 命令必须先执行 CAS 与时间校验，再精确定位一个既有 note 或 rest event，并复用
  既有 content revision／history／redo-clear 语义。
- 规范化后相同返回原项目，不产生 revision；旧 revision、时钟回退、非法文本或
  缺失事件均拒绝且 canonical 保持不变。
- undo／redo 必须恢复完整和弦标记；undo 后的新标记修改必须清空 redo。
- copy 必须保留和弦标记，paste 必须把它写入独立的新事件；既有跨事件延音线清除
  语义保持不变。
- clone、content fingerprint、serialization、capacity、recovery candidate 与
  IndexedDB round-trip 必须包含和弦标记。

## 显示、保存与播放

- UI 只在保存成功后显示新的 canonical 和弦标记；保存失败时保留旧 canonical 和
  当前 draft 以便重试，不得出现幽灵标记。
- 五线谱与固定 C 简谱显示同一 canonical 和弦标记，并提供可辨识的无障碍名称；
  这不代表页面排版、和弦图或完整格式交换已经完成。
- 和弦标记修改不得重建、中断或改变正在进行的播放状态。
- chord-symbol-only 修改不得改变音高、时值、小节、声部结构、播放事件、时间线、
  span、warning 或音色。revision、schedule identity 与 pointer identity 可按既有
  revision-scoped 规则变化。
- 当前播放仍只消费既有音符事件；和弦标记不得被描述为已经提供和弦伴奏或真实和弦
  播放。

## 自动验收

- domain 测试覆盖 `null`、trim、空白归一、40 code-point 边界、控制字符、非字符串、
  note／rest、CAS、时钟回退、no-op、连续 revision、redo clear、undo／redo 和缺失
  事件。
- copy／paste 测试覆盖 note 与 rest 的标记保留、粘贴后的独立事件和既有延音边界。
- 表驱动 migration 测试覆盖 storage v1–v8、document v1–v7、undo／redo content、
  输入不变和纯读取不自动写回。
- serialization、storage、capacity、IndexedDB recovery、recovery candidate、
  staff／numbered presentation、playback 与 transport 回归必须通过。
- 专项测试必须证明 chord-symbol-only 修改的播放音符事件、时间线、span、warning
  与总时长等价。
- 相关 focused tests、`npm run test:quality-workflow-test-coverage`、
  `npm run lint`、`npm run typecheck`、`npm run check` 与 `git diff --check`
  必须通过。

## 明确不做

- 自动识别、生成、推荐、校正、评分或和声分析。
- 根音／性质的结构化解析、转位、省略、变化音语义、和弦图或吉他品位。
- 和弦伴奏、和弦试听、自动配器、音色路由或改变当前播放计划。
- MusicXML／MXL／MIDI 导入导出、格式 round-trip 或 unsupported-element ledger。
- 页面排版、打印预览、PDF／SVG 导出、云同步、协作或版权判断。

## 门禁与证据边界

QA level recommendation：`strict`。本切片改变 canonical 乐谱 schema、revision、
undo／redo 和本机持久化，并跨越 presentation／playback 兼容边界。

自动测试和源码检查不等于 Browser 手动 QA、Android WebView／真机、进程中断恢复、
容量边界实机、真实排版可读性、MusicXML round-trip 或音乐教师审核。未实际执行的
外部证据必须保持 `NOT_EXECUTED`。
