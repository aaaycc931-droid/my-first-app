# S2 本机谱项目延长记号验收

## 范围

本切片为事件起点级 canonical `fermataMark`：`"fermata" | null`。音符与休止符均可承载，五线谱和固定 C 简谱读取同一字段。

## 数据与迁移

- 当前文档为 `score-document-v12`，当前本机存储为 `local-score-project-storage-v13`。
- storage v1–v12、document v1–v11 以及 undo/redo 历史只读迁移为 `fermataMark: null`。
- 当前版本严格拒绝缺失或非法 `fermataMark`；编辑使用 revision/CAS、时钟保护和 no-op 语义。
- 复制粘贴、序列化、容量、恢复候选和 IndexedDB 继续沿用现有本机项目约束。

## 行为边界

- Mobile 编辑采用保存优先；保存期间 transport 不重建、不暂停、不中断。
- Fermata 只影响谱面显示和可访问文本，不改变 duration、gate、velocity、timbre、timeline、span、warning 或真实播放计划。
- 兼容旧 `score-document-v10` 内存读取时补齐缺失的踏板和 fermata 默认值。
- 本切片不实现真实 fermata 延长播放、MIDI 行为、MusicXML/MIDI round-trip、打印排版、云同步或协作。

## 验证

`npm run test:local-score-project-fermata` 覆盖创建、note/rest、CAS、非法输入、复制粘贴、undo、serialization、两种谱面显示、播放等价性和 v10 读取回归；受影响的旧迁移、存储、容量、恢复、播放测试及本地 lint、typecheck、Android 静态校验和 Web 构建均已通过。

CI、Android 构建、浏览器手测、真机、教师审核和真实演奏证据不由本验收文档宣称。
