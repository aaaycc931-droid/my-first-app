# P117d — 三音旋律回唱麦克风验收

日期：2026-07-22

状态：implementation candidate

QA level recommendation：**strict**

## 1. 目标

P117d 为 Android 离线扩展随机练习增加三音旋律回唱。用户完整听完隐藏目标后，主动启用麦克风，在与目标共用的版本化预备拍和时间线上回唱；停止并回放检查录音后，用户二次确认仅在本机执行 P112 解码与 P113 有序对齐。只有当前 attempt 的可靠证据才能生成逐音、逐句非评分反馈。

完整路径：

```text
选择旋律回唱
→ 完整播放隐藏三音目标
→ 主动启用麦克风
→ 主动开始并完成固定预备拍
→ 录制三音回唱
→ 主动停止 / 到时结束
→ 回放检查或丢弃录音
→ 二次确认仅本机分析
→ P112 解码与 P113 有序对齐
→ 提交 melody-imitation microphone Activity
→ 揭示逐音 / 单句非评分反馈
→ 定位片段复练 / 清除重录 / 下一题
```

## 2. 入口与范围

- 首版只挂 `expandedLocalCatalog && !initialReviewTarget && !activeCustomPractice`。
- review/custom 暂不暴露回唱，避免已知目标、旧错题 schema 与麦克风证据混用。
- 复用当前三难度、每档版本化三音旋律，支持重复音、F♯4 与 C5。
- 只处理单句、三个等时值音高；不生成正式分数、正确率、等级、通过/失败或能力结论。
- P117d 不包含旋律视唱、可见谱面同步、节奏评分、声部/音域判断、自动消除扬声器回灌、云端分析或持久录音；旋律视唱必须在 P117e 独立验收。

## 3. 版本化时间目标

- 新增单一 canonical timeline，播放、预备拍、录音窗口与 P113 target 必须从同一结构派生，禁止分别复制常量或从 oscillator/setTimeout 反推。
- timeline 至少固定 `timelineVersion`、`targetId`、question/variant、BPM、4/4 上下文、四拍预备拍、录音零点、三个 onset/duration、phrase 起止与总窗口。
- 三个音首版等时值；每个目标事件保留 position 与 canonical `EarTrainingMelodyNoteId`。
- 同 seed/variant/config 必须产生稳定 target identity；跨 variant、BPM、timelineVersion 或事件内容必须产生不同 identity。
- 缺事件、乱序、重叠、非有限时间、无效音高、phrase 越界或播放/分析 timeline 不一致必须拒绝。
- 预备拍点击若进入录音数据，分析前必须按版本化录音零点裁除；点击声不得成为检测音符。不能把“timer 已到”冒充真实录音同步。

## 4. Activity 与证据

- Activity `family: "melody-imitation"`，输入方式 `microphone`，target 来源为当前内置版本化旋律时间目标。
- answer/evidence 至少绑定 definition、question/variant、attemptId、playbackQualificationId、timedTargetId、recordingId、analysisRunId 与 algorithmVersion。
- 实时曲线只用于录制中观察，不能直接成为 Activity answer 或 P113 evidence。
- 正式证据只来自用户停止、回放检查并二次确认后的本机重新解码与 P113 对齐结果。
- 有序/单调对齐必须保持 miss/extra 守恒；禁止用目标先验把唱错音或八度错误吸附成正确。
- 可靠位置可表达 `close / high / low`；缺唱、无声、短录音、复音、强噪声、串音、额外音、证据不可靠或目标数不守恒必须局部/整体 `insufficient`。
- 全部可靠且接近才可 `consistent`；存在可靠差异返回 `different`；无足够可解释证据返回 `insufficient`。
- 始终 `assessmentMode: "non-scoring"`，不得把接近/偏高/偏低映射为正式正确/错误、分数、等级或通过失败。

## 5. 隐藏目标与用户控制

- 完整参考播放前不能录音；参考播放结束后才可主动启用麦克风与开始回唱。
- 从参考播放开始到提交后检查完成，目标音名、唱名、五线谱、简谱、目标频率、answer explanation 不得进入 DOM、ARIA、提示或禁用原因。
- 参考音、预备拍、录音、录音回放与片段回放必须互斥；录音时不得同时播放目标音。
- 不自动请求麦克风权限、不自动开始分析、不自动保存录音。
- 用户必须能回放当前录音、丢弃并重录；二次确认前不得执行正式 P112/P113 分析。
- 结果显示每位置目标音、仅在可靠时显示检测音、cents 中位/范围、音头/稳定段/尾音、时间偏移、拒答原因与建议复练片段；单句汇总不得越过逐音证据。
- checked 后当前 attempt 锁定；重录、复练或下一题创建新 attempt。

## 6. fail-closed 与错误恢复

以下操作必须停止 playback/recorder/media tracks，释放 Object URL、计时器与监听，撤销资格并作废旧录音、analysis、answer/evidence 与揭示：

- 参考播放重播、手停、全局停止、后台或 AudioContext 中断；
- 预备拍中断、录音失败、空 Blob、重录、丢弃、清空、重置；
- 换题、难度、活动/答案方式、review/custom 入口或组件卸载；
- 麦克风权限拒绝、无设备、被占用、迟到 stream、MediaRecorder/codec/decode 不支持；
- recordingId、attemptId、timedTargetId、playbackQualificationId、analysisRunId 或 algorithmVersion 不一致。

旧 timer、迟到权限、旧 MediaRecorder 事件、旧 decode/alignment 回调不得恢复新 attempt。生命周期作废时即使 recorder 产生最终 Blob，也必须丢弃而不能分析。错误状态使用简体中文给出恢复路径，并保留非麦克风练习入口。

## 7. 存储与隐私

- 默认 session-only；不上传、不写 localStorage/IndexedDB/账号/数据库。
- Blob、PCM、Object URL、实时帧/曲线、逐音 evidence、attempt、资格和 ActivitySession 不持久化。
- 首版不把 `close` 硬映射为错题系统的 correct，也不把 `different/insufficient` 写成能力弱点；P117d 保持会话内反馈，P118 再独立扩展非评分画像迁移。
- 用户主动保存既有练声记录的能力必须与本 Activity 提交隔离，不得自动复用。

## 8. 自动门禁

- focused timeline：三难度身份、BPM/预备拍/录音零点、onset/duration/phrase、同 variant 确定性、非法或缺失时间目标拒绝。
- focused Activity/evidence：当前 attempt+target 的 close/high/low/missing/unreliable、部分可靠、全不足、跨 attempt/target/recording/algorithm、重复/缺失 evidence；恒定 non-scoring。
- alignment 回归：ordered/monotonic、miss/extra 守恒、八度错误、首尾缺音、额外音、短录音、噪声、无声与确定性。
- mounted microphone：不自动请求权限；完整参考播放 gate；权限拒绝/迟到 stream；预备拍/录音锚点；开始/停止/回放/丢弃；二次确认前不解码；可靠/局部不足/失败；隐藏目标；checked 锁定；重录/重置/全停/后台/unmount；旧 timer/旧分析不复活。
- App：仅 expanded random 可见，review/custom 隐藏；不写 Blob/PCM/note evidence/attempt；首版不写复练正确/错误或能力画像。
- 回归：P112/P113、P114f、P115h、P117a–c、全局音频、Android lifecycle、录音回放与片段定位。
- `npm audit --omit=dev --audit-level=high`、`npm run check`、Android sync/validator、GitHub `quality` 与 `android-local` 必须通过。

## 9. 外部证据

以下证据必须独立记录，不能由模拟 MediaRecorder、合成音、DOM、CI 或 APK 工件替代：

- Browser 真实麦克风：Chrome/Edge/Firefox/Safari 权限、codec、录音/回放、串音、键盘与屏幕阅读器。
- 三档 Android 真机：System WebView、拒绝/允许权限、扬声器与耳机分开验证、预备拍/录音同步、后台/锁屏/来电/音频焦点/进程重建、20 轮、RTF/温度/内存。
- 真实人声：冻结授权、盲测、设备分层与标注版本；合成音、单开发者录音不能替代。
- 双教师：题目真值、时间目标、三难度、唱名/八度、反馈解释与拒答边界。
- 至少 5 名中文用户独立完成“听→预备拍→回唱→停止→检查录音→确认分析→理解反馈→片段复练”；正式 V1 核心任务成功率至少 80%，问题修复后复测。

当前 Browser、三档 Android 真机、真实人声、教师与目标用户证据均为 `NOT_EXECUTED / INCOMPLETE`。

## 10. 后续边界

- P117e 旋律视唱需独立 acceptance：目标从开始可见，谱面/唱名同步与预备拍语义不同，不能复用回唱的隐藏目标断言。
- P117d 自动门禁通过不代表 P117 整体、真实人声基准或正式 V1 完成。
