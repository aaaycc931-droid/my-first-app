# S2 本机谱项目单音演奏法验收

## 定位

本切片承接和弦标记，为本机谱项目的音符加入 canonical 单音演奏法。演奏法属于乐谱
内容，会随 revision、undo／redo、恢复候选、复制／粘贴和本机持久化演进；五线谱
与固定 C 简谱消费同一份数据。

本切片升级到 `score-document-v9` 与 `local-score-project-storage-v10`。读取旧数据
只在内存中确定性迁移，不因打开项目自动写回；下一次显式保存才持久化新版本。

## Canonical 语义

每个 note event exact 保存：

```ts
{
  // 既有音符字段
  articulations: readonly ("accent" | "staccato" | "tenuto")[];
}
```

- `accent`、`staccato`、`tenuto` 分别表示重音、断奏、保持音。
- canonical 顺序固定为 `accent → staccato → tenuto`，每种最多出现一次。
- 输入可为任意顺序并含重复项，领域边界确定性排序、去重；未知值和非数组输入拒绝。
- 组合是集合语义，不能用互斥单值字段建模；空数组表示没有显式演奏法。
- 演奏法只附着于 note；rest 不得携带或通过命令获得演奏法。
- 本字段只记录用户输入的谱面标记，不自动识别、生成、推荐、校正或推断演奏法。

## 迁移与领域命令

- 新建 note 默认 `articulations: []`；新建 rest 不存在该字段。
- storage v1–v9、document v1–v8 及每个 undo／redo content 中的旧音符确定性迁移为
  `articulations: []`。
- 迁移必须纯读取、不写回且不得修改传入对象。
- 导出
  `changeLocalScoreProjectEventArticulations({ project, expectedRevision, location, eventId, articulations, now })`。
- 命令必须先执行 CAS 与时间校验，再精确定位一个既有 note；rest、缺失事件、旧
  revision、时钟回退和非法输入均拒绝，canonical 保持不变。
- 规范化后相同返回原项目，不产生 revision。
- undo／redo 必须恢复完整组合；undo 后的新演奏法修改必须清空 redo。
- copy 必须保留演奏法，paste 必须写入独立的新数组和新事件；既有跨事件延音线
  清除语义保持不变。
- clone、content fingerprint、serialization、capacity、recovery candidate 与
  IndexedDB round-trip 必须包含演奏法。

## 显示、保存与播放

- UI 只在保存成功后显示新的 canonical 演奏法；保存失败时保留旧 canonical 和当前
  draft 以便重试，不得出现幽灵标记。
- 五线谱与固定 C 简谱显示同一 canonical 组合，并提供可辨识的简体中文无障碍名称。
- 本切片是 display-only 记谱能力。演奏法不改变当前播放的 gate、velocity、音高、
  时值、时间线、span、warning、音色或总时长；不得描述为已经真实演奏重音、断奏
  或保持音。
- 演奏法修改不得重建、中断或改变正在进行的播放状态。
- articulation-only revision 的 schedule identity 与 pointer identity 继续沿用既有
  revision-scoped 规则；除此之外音乐播放语义必须等价。

## 自动验收

- domain 测试覆盖三个允许值、组合、固定顺序、去重、空数组、未知值、非数组、
  note／rest、CAS、时钟回退、no-op、连续 revision、redo clear、undo／redo 和缺失
  事件。
- copy／paste 测试覆盖组合保留、粘贴数组独立和既有延音边界。
- 表驱动 migration 测试覆盖 storage v1–v9、document v1–v8、undo／redo content、
  输入不变和纯读取不自动写回。
- 当前 storage 对乱序、重复、未知值、rest 携带演奏法必须严格拒绝，不能在读取时
  宽松修复。
- serialization、storage、capacity、IndexedDB recovery、recovery candidate、
  staff／numbered presentation、playback 与 transport 回归必须通过。
- 专项测试必须证明 articulation-only 修改的音乐播放事件、时间线、span、warning
  与总时长等价，同时保留既有 revision-scoped identity。
- 相关 focused tests、`npm run test:quality-workflow-test-coverage`、
  `npm run lint`、`npm run typecheck`、`npm run check` 与 `git diff --check`
  必须通过。

## 明确不做

- 演奏法播放实现、gate／velocity 映射、音源发音法、自动演奏解释或评分。
- 呼吸、弓法、拨弦、弱音器、演奏文字或其他演奏法。
- MusicXML／MXL／MIDI 导入导出、格式 round-trip 或 unsupported-element ledger。
- 页面排版、打印预览、PDF／SVG 导出、云同步、协作或教师审核。

## 门禁与证据边界

QA level recommendation：`strict`。本切片改变 canonical 乐谱 schema、revision、
undo／redo 和本机持久化，并跨越 presentation／playback 兼容边界。

Browser 手动 QA、Android WebView／真机、进程中断恢复、容量边界实机、真实排版
可读性、MusicXML round-trip、真实演奏法播放和音乐教师审核均为 `NOT_EXECUTED`；
自动测试和源码检查不得替代这些外部证据。
