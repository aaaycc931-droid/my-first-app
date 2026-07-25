# S1 本机谱项目延音线时值连续性验收

## 完成范围

- 延音线除同一声部、相邻事件和同音高外，还必须在乐谱时间轴上严格连续：
  后一个音符的起点必须正好等于前一个音符的结束点。
- 同一小节内的合法相邻同音延音继续允许；跨小节延音只有在来源音符正好结束于
  小节线、目标音符从下一小节第一拍开始时才允许。
- 附点后的真实时值参与连续性计算；合法的附点多段延音链可以跨小节延续，
  每个来源事件仍保留独立身份、谱面 token 和播放光标跨度。
- 未填满小节形成的时间间隙、空小节、不同音高、休止符、不同声部或不存在的目标
  都必须失败关闭，不能把视觉上相邻但时间上不连续的事件解释为延音。
- 文档解析、旧项目迁移、撤销／重做历史、编辑命令、五线谱预览和播放计划必须消费
  同一套延音连续性规则，避免存储、显示与播放各自接受不同文档。
- 编辑器必须原样传播清晰的简体中文拒绝原因；失败时继续遵守 save-first，
  不增加 revision、不发布未保存延音状态，也不修改已有数据。用户修正小节时值后可重试。
- 本切片不改变 `score-document-v2`、`local-score-project-storage-v3`、
  IndexedDB 数据库版本、项目数量／容量限制或既有 CAS 语义。

## 自动测试

- domain：
  - 同小节连续延音、正好跨小节线延音和附点多段延音链通过；
  - 跨未填满小节、跨空小节、不同音高、休止符、不同声部和缺少目标失败；
  - 创建、更新、移动、删除、拍号修改、解析、迁移以及 undo／redo 历史使用相同规则；
  - 拒绝后 revision、内容和历史保持不变，修正条件后可以重试。
- playback：
  - 合法多段延音链只产生一次起音和最终一次止音；
  - 每个事件继续产生独立光标跨度；
  - 存在时值间隙的延音文档不能生成可播放计划。
- staff：
  - 合法跨小节多段延音链绘制每一段弧线并保留附点；
  - 跨未填满小节的延音预览失败关闭并显示时值连续性原因。
- UI：
  - 不同音高和跨小节时间间隙的拒绝原因以完整简体中文传播；
  - 失败后已保存谱面、revision 和界面事件保持不变。
- Quality workflow：
  - 所有 `test:*` 命令必须保持恰好执行一次；本切片不新增重复注册。
- 完整门禁：
  - `npm run check`
  - `npm run lint`
  - `npm run typecheck`
  - `git diff --check`

当前记录：

- `npm run test:local-score-project`：`PASS`
- `npm run test:local-score-project-storage`：`PASS`
- `npm run test:local-score-project-capacity`：`PASS`
- `npm run test:local-score-project-indexeddb-recovery`：`PASS`
- `npm run test:local-score-project-playback`：`PASS`
- `npm run test:mobile-local-score-project-playback-behavior`：`PASS`（4/4）
- `npm run test:mobile-local-score-project-metronome-behavior`：`PASS`（4/4）
- `npm run test:mobile-local-score-project-transport-behavior`：`PASS`（7/7）
- `npm run test:mobile-local-score-project-behavior`：`PASS`（9/9）
- `npm run test:mobile-local-score-project-staff-preview-behavior`：`PASS`（12/12）
- `npm run test:quality-workflow-test-coverage`：`PASS`（139/139，恰好一次）
- `npm run check`：`PASS`
- `npm run lint`：`PASS`
- `npm run typecheck`：`PASS`
- `git diff --check`：`PASS`

## 人工 QA

- 桌面浏览器 QA：`NOT_EXECUTED`
- Android WebView QA：`NOT_EXECUTED`
- Android 真机 QA：`NOT_EXECUTED`
- QA 建议：`strict`

## 明确不做

- 圆滑线、跨声部延音、跨不连续时间的视觉连接或自动补休止符。
- 双附点、三连音、其他连音分组或复杂歌词排版。
- 简谱、谱号／调号、多 part/staff/voice 可见编辑或大规模 UI 重构。
- MusicXML/MIDI 导入导出、云同步、账号、自动清理或付费扩容。
- 自动修复、删除、压缩、覆盖或静默修改用户项目。

## P119d 状态

P119d 已批准的 153 项候选审核批次及双教师审核计划不受本切片影响。
两份独立逐题六维教师审核和教育有效性仍为 `NOT_EXECUTED`，
正式评估门禁仍为 `BLOCKED`。
