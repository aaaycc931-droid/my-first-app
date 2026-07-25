# S1 本机谱项目谱号与调号验收

## 完成范围

- 仅把本机谱项目升级为 `score-document-v3`，存储信封升级为
  `local-score-project-storage-v4`；通用 `ScoreDocumentEventV1` 与其他练习文档
  保持不变。
- 每个 pitched staff 支持高音谱号与低音谱号；新项目默认使用高音谱号。
- 项目文档顶层保存一个全局调号，当前只支持一降、无升降、一升：
  `{ fifths: -1 | 0 | 1 }`；新项目默认无升降。
- 当前本机项目音高仍只支持 C4–C5 的自然音，canonical `pitch` 始终表示实际音高。
  调号是谱面书写上下文，不移调、不改写事件音高，也不改变播放 MIDI。调号覆盖的
  自然音由后续 presentation 显示还原号；本切片不扩展升降音输入。
- 谱号与调号修改都必须走现有 expected revision、时间戳、内容校验、undo/redo
  和 save-first 链路。有效修改增加一次 document revision、写入一项 undo history
  并清空 redo history；同值修改为 no-op，不改变 revision、history 或更新时间。
- 谱号修改按 `partId + staffId` 精确定位。目标不存在或不唯一、谱号/调号值无效、
  expected revision 冲突或设备时间倒退时，修改必须失败且原项目保持不变。
- 旧 storage v1 / v2 / v3 项目在读取时确定性迁移到内存：
  - v1 / v2 继续补齐附点、延音线与歌词默认值；
  - v1 / v2 / v3 都补齐 `{ fifths: 0 }`；
  - 既有 staff 保持高音谱号；
  - document revision、createdAt、updatedAt 与 undo/redo 顺序保持不变。
- 列表或打开旧项目不得自动写回；下一次用户明确保存成功后才持久化 storage v4。
  IndexedDB 数据库版本和 object store 结构不变。
- 项目面板提供中文谱号与调号选择器；保存成功后五线谱与固定 C 简谱同步读取同一
  document revision。保存失败不得发布候选值，也不得中断仍基于最后成功修订的播放。
- 五线谱按谱号使用独立谱位、谱号字形和必要加线，并显示调号。由于事件 `pitch`
  是实际自然音，一个升号下的 F、一个降号下的 B 必须显示还原号。
- 固定 C 简谱的 degree、octave、event id、选择与播放光标不随谱号或调号改变；
  预览必须明确说明固定 C 不随当前调号变化。
- 保存成功产生新 revision 时，播放按现有 revision 生命周期安全停止；单纯在
  五线谱与固定 C 简谱之间切换仍不得中断播放或重建 transport。

## 自动测试

- 新项目使用 `score-document-v3`、storage v4、高音谱号和无升降调号。
- 高音／低音谱号以及 -1／0／1 调号可修改、可撤销、可重做；同值修改保持 no-op。
- 非法谱号、非法调号、缺失 staff、revision 冲突和时间倒退失败关闭。
- 调号在添加、更新、移动、复制粘贴、增删小节和拍号修改后保持不变。
- clone、content fingerprint、document revision 与 history 均包含调号。
- storage v1 / v2 / v3 的 document 与每项 undo/redo history 无损迁移到 v4；
  迁移不改变 revision 或时间戳。
- 缺失/非法调号、非法谱号、未来 schema、损坏历史和重复标识继续拒绝读取。
- canonical 自然音在调号修改前后保持相同，领域层不执行移调或音高改写。
- 高音/低音谱号谱位、通用加线、三档调号、必要还原号和中文 aria 均有
  presentation 与 mounted behavior 回归。
- 谱号 × 调号六种组合下，固定 C token 内容与 event identity 保持不变。
- panel 覆盖保存成功、写失败保持旧值、撤销恢复；playback 覆盖 v3 文档可播放且
  调号不改变 canonical MIDI。

## 明确不做

- 中音、次中音、打击乐、TAB 或谱号中途变化。
- 超过一个升降号、大小调模式推断、转调、移调或首调唱名。
- 升降音输入、临时升降号编辑、等音拼写或扩大 C4–C5 音域。
- MusicXML 导入导出、云同步、账号、上传、正式转写、练习目标或评分。

## 门禁与证据边界

- `npm run test:local-score-project`
- `npm run test:local-score-project-storage`
- `npm run test:local-score-project-capacity`
- `npm run test:local-score-project-indexeddb-recovery`
- `npm run test:local-score-project-playback`
- `npm run test:mobile-local-score-project-staff-preview-behavior`
- `npm run test:mobile-local-score-project-numbered-preview-behavior`
- `npm run test:mobile-local-score-project-behavior`
- `npm run typecheck`
- `npm run lint`
- `npm run check`
- `git diff --check`

自动测试和源码审查只能证明领域、迁移与静态契约候选，不能替代 Browser、
Android WebView、Android 真机或教师检查。

QA level recommendation：`strict`。谱号和调号属于会影响持久化修订、撤销历史和
后续谱面表达的核心制谱语义；完整 UI 合并前还必须执行 presentation、panel、
playback、存储恢复、构建及人工可访问性和真机回归。
