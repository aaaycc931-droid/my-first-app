# P115h 音程比较与非评分模唱反馈验收

状态：**本地严格验证中的 implementation candidate**  
基线：`main@51089a24b1a0330e4cf4d75260b281e3c66de5bd`  
QA level recommendation：**strict**

## 最小完整纵向切片

1. Android 离线首页可进入“音程比较与模唱”。比较题同时要求判断两组音程的大小关系和各自方向。
2. 基础、进阶、挑战各有不少于 40 个确定、可复现的稳定变体，复用既有音程定义与本地 Web Audio 播放，不引入远端题库。
3. 比较题按统一 Activity 状态完成作答和核对；只有核对后的正确/错误事实可进入本机复练与学习画像。
4. 核对后可选模唱任一组“根音—目标音—根音”，复用 P114f `analysis-evidence-v1`。反馈仅为“接近”“偏高”“偏低”或“证据不足”。
5. 录音、选择与逐音分析证据只存在于当前页面内存，不上传，不进入账号、数据库、复练队列或学习画像。

## Fail-closed 规则

- evidence 的 attemptId 必须等于当前活动 attempt，录音 Blob 必须仍是当前 Blob，目标必须仍是开始录音时冻结的三音目标。
- 清除、切组、切题、重录或主动清除分析会使旧 attempt/evidence 失效；旧 Blob 的迟到解码不得完成新 attempt。
- 权限拒绝、无 MediaRecorder、空录音、目标缺失、低可靠性或部分证据缺失均不得推断正误，必须保持未完成或返回“证据不足”。
- 页面卸载与生命周期资源释放沿用麦克风 hook 的 generation/mounted 守卫；自动恢复不得自行开始录音或提交证据。

## 验收门槛

- focused domain tests：稳定题量、答案关系、变体校验、Activity 适配和四类模唱反馈。
- migration tests：复练与画像 v1–v8 到 v9；旧信封中的未来题型、重复或损坏内容原子拒绝。
- 真实挂载移动端行为：从首页进入、双维作答、检查后显示模唱入口、仅比较事实写入本机画像。
- `npm run check`、`npm run android:sync`、`npm run validate:android-local` 全部通过。
- GitHub `android-local` 是 Debug APK 的权威构建与独立验包门禁；通过后记录 run、artifact 与摘要。

## 明确不构成的证据

自动测试、jsdom、合成输入、Android validator、CI 构建和 APK 工件验证都不等于 Android 真机麦克风、真实人声、教师审核、目标用户可用性或教育有效性证据。本切片也不提供正式评分、等级、通过／失败、诊断或专业声乐评估。

## 后续顺序

P115h 合并后按路线继续拆分：和声低音/外声部线索与可解释反馈；双教师校准/教育审核；Android 真机、真实人声与生命周期证据；最终签名、私测、回滚与发布闭环。双教师与目标用户证据是外部执行硬门槛，不得由开发者或 CI 代签。
