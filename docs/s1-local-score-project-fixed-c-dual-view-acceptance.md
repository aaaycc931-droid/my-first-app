# S1 本机谱项目固定 C 简谱双视图验收

## 完成范围

- 本机谱项目为当前已保存修订提供“五线谱／固定 C 简谱”双视图；默认进入五线谱，
  用户可以在同一编辑页面内明确切换。
- 简谱固定使用 C 为 1：C、D、E、F、G、A、B 分别显示为 1–7；八度使用数字
  上方或下方的结构化点表示。当前切片不依据调号、旋律内容或用户操作推断首调，
  也不进行移调。
- 两种视图必须消费完全相同的 `ScoreDocument`、document id、revision 和 event id。
  视图层只能从 canonical 事件单向派生显示 token，不得复制、改写或另建谱面文档，
  也不得由显示字符串反推音高。
- 两种视图共享同一事件选择、播放 active event id 和播放光标。用户在任一视图选择
  事件后，切换视图仍指向同一个 event id；播放光标在两种视图中均按同一事件时间线
  前进。
- 视图状态必须位于稳定的 transport 所属组件内。切换视图不得卸载、重建、停止或
  重新启动 transport，不得重新触发音符、创建第二条音频通道、重置播放进度或启动
  节拍器；正在播放时切换后必须继续原计划，直至主动停止或自然结束。
- 当前可见范围继续冻结为第一 part、第一 staff、第一 voice。不得因为存在其他声部而
  合并、猜测或显示其事件；未支持的结构必须按既有谱项目规则失败关闭。
- 简谱必须表达当前谱项目已支持的节奏语义：小节与拍号、二分／四分／八分时值、
  休止符、单附点、合法延音链和歌词。延音、附点、歌词、选择与播放状态均保留原
  event id，不能生成替代事件。
- 空声部提供明确简体中文空态。小节过满、非法延音、缺失首声部或无法可靠表示的
  文档必须显示简体中文原因并停止生成误导性预览；不得静默丢弃事件、自动补休止、
  自动修谱或回退到猜测结果。
- 视图切换是纯展示状态，不修改项目 revision、undo／redo、更新时间或 IndexedDB
  内容，也不创建练习目标、活动答案、成绩、等级或通过／失败结论。

## 自动测试

- pure presentation：
  - 相同 document/revision 生成确定性简谱 token；
  - C4–B4 与 C5 按固定 C 映射，且不根据旋律或拍号改变数字；
  - 第一声部的小节顺序、事件顺序、event id、拍位及时值保持稳定；
  - 二分／四分／八分、休止、附点、延音和歌词生成结构化表示；
  - 空声部可用，小节过满、非法延音和缺失首声部失败关闭。
- mounted numbered preview：
  - 提供简体中文可访问名称、拍号、小节、事件和空态；
  - 高低八度点、时值线、休止、附点、延音和歌词不是尾随显示字符串；
  - 鼠标与键盘选择回传与五线谱一致的 `LocalScoreProjectStaffSelection`；
  - `selectedEventId` 与 `activeEventIds` 分别产生可区分的选择和播放状态。
- panel / transport integration：
  - 默认五线谱，双视图控件使用可访问单选语义；
  - 在两种视图之间切换后保持同一选择与同一保存修订；
  - 播放中双向切换后 transport 保持播放、光标继续推进，不停止通道、不重复起音，
    最后可自然结束或由用户停止；
  - 只有 document revision、速度、生命周期或既有全局停止条件变化时，才按既有
    transport 规则停止旧计划。
- Quality workflow：
  - `test:mobile-local-score-project-numbered-preview-behavior` 在
    `package.json` 定义一次，并在 Quality workflow 中恰好执行一次；
  - `test:quality-workflow-test-coverage` 继续拒绝遗漏、未知或重复的 `test:*` 命令。

## 门禁

- `npm run test:mobile-local-score-project-numbered-preview-behavior`
- `npm run test:mobile-local-score-project-staff-preview-behavior`
- `npm run test:mobile-local-score-project-playback-behavior`
- `npm run test:mobile-local-score-project-transport-behavior`
- `npm run test:mobile-local-score-project-behavior`
- `npm run test:local-score-project-playback`
- `npm run test:quality-workflow-test-coverage`
- `npm run lint`
- `npm run typecheck`
- `npm run check`
- `git diff --check`

## 隐私、产品与证据边界

- 本切片继续使用 Android 离线优先的本机谱项目，不新增网络、账号、数据库、上传、
  云同步或生产 OMR 依赖。
- 简谱是当前用户已保存谱面修订的另一种展示，不是自动识别最终结果、正式转写、
  正式练习目标或评分证据。
- 自动测试、源码审查、CI 和 APK 工件不能替代 Browser、Android WebView、Android
  真机、教师或中文目标用户证据。
- P119d 已冻结的候选批次、教师审核计划和教育有效性门禁不受本切片影响。

## 人工 QA

- Browser：播放中五线谱→简谱→五线谱双向切换；检查无停顿、重复起音或光标重置，
  并覆盖键盘、屏幕阅读器、200% 缩放、窄屏和字体 fallback。
- Android WebView／真机：覆盖横竖屏、不同密度、后台／恢复、音频焦点、全局停止、
  飞行模式冷启动和连续切换稳定性。
- 教师检查：确认固定 C、八度点、时值线、休止、附点、延音和歌词表达无误。
- 当前人工与外部证据在实际执行并留存前均为 `NOT_EXECUTED`。
- QA level recommendation：`strict`。

## 明确不做

- 首调唱名、自动调性推断、移调、谱号／调号编辑或调号驱动的数字变化。
- 多 part/staff/voice 可见编辑、和弦叠置、连音、双附点或出版级简谱排版。
- MusicXML/MIDI 导入导出、自动转写、云同步、账号、评分或正式能力评级。
- 自动修复、静默覆盖、清理或迁移用户项目。
