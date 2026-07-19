# P115a：和弦性质与转位听辨验收标准

状态：**IMPLEMENTATION CANDIDATE / 等待远端 PR 与 CI**
日期：2026-07-19
QA level recommendation：**strict**

## 1. 目标

在 Android 离线练耳入口交付 P115 的第一个完整纵向切片：三和弦性质与转位听辨。题目、播放、选择答案、非评分解释、本机复练和本机学习事实必须形成同一闭环，不依赖账号、网络或云端服务。

## 2. 题库与难度

- 基础：大三和弦、小三和弦，原位，4 个根音，共 8 个稳定题目变体。
- 进阶：大、小、减、增三和弦，原位与第一转位，6 个根音，共 48 个稳定题目变体。
- 挑战：大、小、减、增三和弦，原位、第一转位与第二转位，6 个根音，共 72 个稳定题目变体。
- 每题使用稳定 `variantId`；同一会话完整遍历前不得重复，相同种子与题号必须复现相同题目。
- 和弦音按正确的根音音程结构生成，转位只改变最低音与排列，不改变和弦性质。

本切片的基础档只有 8 个变体，尚未达到长期路线“每档至少 40 个经验证题目或等价组合”的完整 P115 门槛，不得写成 P115 已完成。

## 3. 真实使用路径

1. 用户选择基础、进阶或挑战难度。
2. 用户选择“和声”同时发声或“分解”由低到高播放；切换播放方式会开始新的未作答尝试。
3. 用户主动播放题目并选择答案，查看答案后锁定本轮选择。
4. Activity 协议只给出正确/错误事实和中文解释，不生成分数、等级或通过/失败。
5. 错题写入容量受限的本机复练队列，保留难度、稳定题目标识和播放方式；复练答对后移除。
6. 查看答案与开始复练分别写入本机最小学习事件，画像新增 `chord-inversion` 事实，但不推断能力等级。
7. 可选本地参考钢琴保持独立；弹奏不会自动提交答案或改变练习事实。

## 4. 数据迁移与隐私

- 复练队列当前为 schema v3 / catalog v3；严格读取并迁移既有 v1/catalog v1 与 v2/catalog v2 数据。
- v2 数据不得伪造 P115 和弦目标；只有 v3 才允许包含 `playbackMode` 的 `chord-inversion` 目标。
- 学习画像保持 `learning-profile-v1` 语义，存储信封升级为 schema v2；读取 schema v1 时为新题型补零并在后续保存时写回 v2。
- 不保存用户音频、录音、账号、邮箱、设备标识、原始答案内容、分数或伙伴关系。
- 不上传、不联网、不写数据库；卸载或清除应用数据后消失。

## 5. 故障与生命周期

- Web Audio 不可用、创建失败或播放失败时显示中文错误，作答仍可继续。
- 新题、难度切换、播放方式切换、复练目标变化与组件卸载必须停止既有音源。
- storage 读取、保存或移除失败必须明确提示，不能阻断核心练习，也不能伪称已持久化。
- 损坏、超限、未知字段或版本不匹配的持久数据必须失败关闭。

## 6. 自动验收

- `npm run test:local-ear-training-chords`
- `npm run test:legacy-activity-adapters`
- `npm run test:expanded-local-practice-catalog`
- `npm run test:local-practice-review-queue`
- `npm run test:learning-event-profile`
- `npm run test:mobile-practice-review-storage`
- `npm run test:mobile-learning-profile-storage`
- `npm run test:mobile-practice-review-behavior`
- `npm run validate:android-local`
- `npm run check`

## 7. 本切片不包含

- 七和弦、开放/密集排列、和弦进行、终止式、音阶或调式听辨；
- 麦克风回唱、MIDI 作答、正式课程、统一定制器或自适应出题；
- 教师审核、五名目标用户、三档 Android 真机矩阵或教育有效性结论；
- 正式签名、商店发布、跨设备同步或最终 V1 发布完成。
