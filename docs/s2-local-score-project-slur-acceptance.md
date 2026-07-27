# S2 本机谱项目圆滑线验收

状态：**implementation candidate**

## 范围

- canonical 谱面升级为 `score-document-v13`，本机存储升级为
  `local-score-project-storage-v14`。
- 音符提供必填 `slurToNext: boolean`；休止符不允许伪造圆滑线字段。
- 圆滑线只连接同一 part、staff、voice 中相邻的两个音符。末音、后继休止符、
  删除或移动后会悬空的关系必须失败关闭，最后保存版本保持不变。
- storage v1–v13、document v1–v12 及 undo/redo 历史只读迁移为
  `slurToNext: false`。读取旧记录不回写 IndexedDB。
- CAS、undo/redo、copy/paste、serialization、应用容量、IndexedDB quota、
  recovery candidate 与 save-first 移动编辑语义保持不变。复制单个音符会清除
  `slurToNext`，避免粘贴出孤立关系。
- 五线谱与固定 C 简谱读取同一字段并显示圆滑线；辅助文本明确区分圆滑线与延音线。
- playback/transport 接受新版本，但本切片不改变 velocity、gate、duration、
  timeline、span 或实际连奏效果。

## 失败关闭

- 当前版本缺少 `slurToNext`、类型非法、休止符携带该字段或关系没有相邻音符终点时，
  解析或修改必须失败。
- revision 冲突、应用容量上限、浏览器 IndexedDB quota、单次写入失败、事务中止与
  recovery 失败继续使用既有独立错误分类；不得删除或覆盖已有项目来腾出空间。
- UI 只有在持久化成功后才发布新版本；失败时保留最后保存谱面。

## 验证

`npm run test:local-score-project-slur` 覆盖创建、严格校验、关系完整性、CAS、
no-op、undo/redo、复制粘贴、serialization、旧版本只读迁移、双谱面与播放等价性。
同时运行受影响的本机谱项目存储、容量、recovery、IndexedDB、移动端预览和 transport
回归，以及 lint、typecheck、Web build 和 Android 静态校验。

自动测试和 CI 不替代浏览器手测、Android 真机、教师审核、MusicXML/MIDI round-trip
或真实连奏播放证据。
