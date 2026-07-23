# P117 收尾后的产品需求与执行路线

最后更新：2026-07-23

本文件是短周期执行索引。正式版完成标准以 `final-release-definition-of-done.md` 为准，实时缺口以 `final-release-status-matrix.md` 为准，长期多泳道关系以 `unified-development-roadmap-with-ai-music-companion-2026-07-18.md` 为准。

## 已确认基线

- P106–P113、P114a–P114m、P115a–P115i 已合并。
- P116a–P116d 已合并；P116d 通过 PR #394 合并为 `4260fafc420e913b4df73d48b7f0b7f0bc1d3d6f`。
- P117a 已通过 PR #395 合并为 `9bcba3c533503d8cf50d6105471ba67f1f6d3f43`；Actions 运行 `29809682809` 的 `quality` 与 `android-local` 通过，Android 工件 `8486945545` 的 GitHub artifact ZIP digest 为 `ee9cb33b41fcd6dba075ccc3548b86948f1328a5837b2d7a4beb8352da8b025b`。
- P117b 已通过 PR #396 合并为 `3455052a65a42841cbab76e83fc0abe5ad7b74e9`；Actions 运行 `29830492176` 的 `quality` 与 `android-local` 通过，Android 工件 `8495101348` 的 GitHub artifact ZIP digest 为 `587780402d5a339f968dc58c20f27adac23ef67f4ffdef8e2c35dda77955b477`。
- P117c 已通过 PR #397 合并为 `046da82f7a7ec1fe670e11c77c851c13caf6e7c0`；Actions 运行 `29887214619` 的 `quality` 与 `android-local` 通过，Android 工件 `8516958894` 的 GitHub artifact ZIP digest 为 `41221b560e6af280e4167aee276d8bfaf39a4a5d26702f2d6b473b09ef27a501`。
- P117d 已通过 PR #398 合并为 `37bd4c6aa2f094611abe661168188b4b921465de`；Actions 运行 `29894710668` 的 `quality` 与 `android-local` 通过，Android 工件 `8519558587` 的 GitHub artifact ZIP digest 为 `29bb8cad6858ffeee304d0634a1ac682e9e6259e5419f99ff08e8deab34c5aa9`。
- P117e 已通过 PR #399 合并为 `c2fc6a8943c9c432c850f3d0c89455b378c2cdd5`；PR Actions 运行 `29896738992` 的 `quality` 与 `android-local` 通过，Android 工件 `8520299089` 的 GitHub artifact ZIP digest 为 `f769801fda8b9667bb150092bf6f70cfad571ed694bde42197300b738d1b6345`。合并后的 main Quality 运行 `29897075998` 也已通过。
- Android 当前保持本地优先、离线、隐私最小化；不上传练习录音，不新增账户、云端或数据库依赖。
- P115h 的模唱反馈只表达接近、偏高／偏低或证据不足，不是评分、等级、通过／失败或专业声乐评估。
- 自动测试和 CI 只证明代码、构建与约定行为；不证明 Android 真机、真实人声、教师审核或教育有效性。

## 已完成教学纵向切片：P116 节奏专业套件

P116 按可回滚的小切片推进，不把四种活动一次塞入单个 PR：

1. 节奏视读（P116a，已完成）：预备拍、可见目标、触控输入与已有延迟校准，输出可解释非评分偏移反馈。
2. 节奏回模（P116b，已完成）：本地播放后复现，陈旧 attempt、重播、暂停、后台与重置必须 fail closed。
3. 节奏找错（P116c，已完成）：只标记题目中可验证的漏拍、拆分、合并或位移，不推断演奏能力。
4. 节奏听写（P116d，已完成）：完整听题后编辑拍内事件草稿，复用 `score-document-v1` 确认修订与 Activity `staff-notation` 输入；必须经过预览、检查、修改／确认后才能揭示题目事件对照。

每个切片至少包含 focused domain tests、真实挂载移动端行为测试、必要迁移测试、Android validator、CI 与独立 APK 工件验证。自动输入不得冒充真实拍手、真实设备触控或教师验收。

## 已完成教学纵向切片：P117 旋律听写、回唱与视唱

P117 继续按边界清楚的完整切片推进，不能把现有三音选择题、参考钢琴或底层录音能力直接宣称为专业旋律闭环：

1. 屏幕钢琴答案输入（P117a，已完成）：复用现有版本化三音旋律题库、Activity `piano` answer、共享屏幕 `note-event-v1`、本机复练与学习画像。用户完整播放隐藏旋律后再明确开始接收三个有序屏幕琴键 `note-on`；非屏幕钢琴来源、重播、停止、全局停止、后台、换题、重置与迟到事件全部 fail closed。
2. 五线谱答案输入（P117b，已完成）：完整听题后以真实五线、高音谱号和三个有序谱位编辑受控草稿，通过“预览 → 结构检查 → 修改／重新检查 → 明确确认”冻结为会话内 `score-document-v1`，再以 Activity `staff-notation` 答案揭示逐位置非评分对照。当前只比较音高顺序，不扩大为完整制谱、MusicXML、OMR、正式转写或节奏评价。
3. 简谱答案输入（P117c，已完成）：复用同一版本化旋律目标和 Activity 文档修订语义，用固定 C 为 1 的三个有序简谱音位完成“预览 → 结构检查 → 修改／重新检查 → 明确确认”，保留音高顺序、重复音、F♯4 左侧升号与 C5 上方高音点身份，不能把显示 token 冒充 canonical pitch。
4. 三音旋律回唱（P117d，已完成）：完整听完隐藏目标后，使用与播放共用的版本化时间线完成四拍预备拍、会话内录音、完整回放和二次确认，再以 P112/P113 有序对齐结果提交 `melody-imitation` microphone Activity；只表达接近、偏高/偏低、缺唱或证据不足，不生成正式评分。
5. 三音旋律视唱（P117e，已实现并合并）：从开始显示只读五线谱与固定唱名，不播放完整答案；四拍只建立录音零点，完整回放和二次确认后提交 `melody-sight-singing` microphone Activity。可见表示、timed target、count-in、录音与真实 analysis run 必须严格绑定。

P117a–P117e 均已合并，各自边界见对应 acceptance；P117e 验收见 `docs/p117e-melody-sight-singing-acceptance.md`。P117e 不能用 P117d 隐藏目标状态机或五线谱听写草稿冒充从开始可见的视唱目标，也不能用模拟录音替代真实人声证据。

P117e 已形成合并后的 implementation candidate；这不等于正式验证或正式发布完成。P117d/P117e 的 Browser 真麦克风、Android 三档真机、真实人声、双教师时间目标/反馈审核、以及至少 5 名中文目标用户的可用性验收均仍为 `NOT_EXECUTED`；源码、DOM 测试、模拟录音、CI 与 APK 工件不得替代这些证据。

第一版内部测试发布前优先完成可由仓库内开发闭环的 P118 切片；双教师、真机、真实人声、目标用户和正式签名等外部证据泳道在内部测试包形成后启动，但在此之前始终保持未完成状态。

## 后续教学主轴

- P118a（已实现并合并的 implementation candidate）：PR #403 已合并为 `8a31126cfd993ee7f150e0fbe17b1ddaf9b54d5b`；PR Quality run `29904618128` 的 `quality` 与 `android-local` 均成功。外部人工证据仍为 `NOT_EXECUTED`，因此不标记为正式验证或发布完成。
- P118a 状态同步已通过 PR #405 合并，存储失败关闭修复已通过 PR #406 合并为 `f0c0810acb6e4417329466bcc13decc607589c92`；PR #406 Quality run `29905841378` 的 `quality` 与 `android-local` 均成功。
- P118b（已实现并合并的 implementation candidate）：PR #407 已合并为 `03a94882d870ed11339efb727558e74be00f876f`；PR Quality run `29927839993` 的 `quality` 与 `android-local` 均成功，Vercel Ready。统计只聚合当前保留的最近事件，完全忽略 `outcome`；外部人工与真机证据仍为 `NOT_EXECUTED`。
- P118c（已实现并合并的 implementation candidate）：PR #409 已合并为 `55093e4d1004bc97408f45ef0e2a26a2adee6c0b`；PR Quality run `29970087207` 的 `quality` 与 `android-local` 均成功，Vercel Ready。它按题目族分组既有精确未解决目标，不读取 `outcome`，不按正确率或能力排序。验收见 `docs/p118c-weak-point-review-queue-acceptance.md`。
- P118d（当前唯一教学 next slice）：在既有课程、画像、统计与复练协议上推进可解释非评分推荐，不创建平行协议，不顺带实现 P118e。
- P118e：随后推进课程／统计／复练／推荐整合，保持独立 PR。
- P119/Q：汇合教学、算法、钢琴、制谱、伴奏、云端、教育和目标用户证据。
- P120：范围明确的 Android 专业私测候选，不是公开最终版。

## 与开发并行但不能由开发替代的证据泳道

- 两名独立音乐教师完成题目、答案、难度递进、解释文本与误解风险校准。
- 至少三档 Android 真机覆盖安装、断网冷启动、麦克风权限拒绝、录音／重录、后台恢复、进程重建、长循环和升级／回滚。
- 真实人声按预先冻结的采集、标注、隐私与删除协议执行；缺证据时保持拒答或非评分反馈。
- 目标用户完成核心任务可用性与文案误解检查。
- 专用签名、私测分发、工件摘要、已知问题、回滚与发布批准形成同一证据包。

## PR 与发布门禁

- 每个 PR 必须边界清晰、可验证、可回滚；不得接续历史遗留 PR。
- 合并前运行完整 `check`、Android sync／validator，并以 GitHub `android-local` 为 APK 权威门禁。
- 权限拒绝、陈旧 attempt、迟到分析、清除／重录和生命周期变化默认 fail closed。
- 任何“真实设备”“真实人声”“教师审核”“教育有效性”结论必须指向对应人工证据，不得引用自动化结果替代。
