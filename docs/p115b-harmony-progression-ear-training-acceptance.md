# P115b：和声进行与终止式听辨验收标准

状态：**IMPLEMENTATION CANDIDATE / 等待远端 PR 与 CI**
日期：2026-07-19
QA level recommendation：**strict**

## 1. 目标

在 Android 离线练耳入口交付 P115 的第二个纵向切片：用户主动播放一组依次发声的三和弦，辨认级数进行与收束方式，再进入统一 Activity 非评分答案、本机复练和学习事实画像闭环。

## 2. 题库与难度

- 基础：4 个调性中的 `I–V–I` 正格收束与 `I–IV–I` 变格收束，共 8 个稳定变体。
- 进阶：6 个调性中的 `I–IV–V–I`、`I–V–vi–IV`、`I–vi–IV–V` 与 `ii–V–I`，共 24 个稳定变体。
- 挑战：进阶四类，加 `I–IV–V–vi` 阻碍进行、`i–iv–V–i` 与 `i–VI–iv–V–i` 小调进行，6 个调性共 42 个稳定变体。
- 每个和弦由确定性三和弦音程与受控转位生成；同一会话完整遍历前不得重复，相同种子与题号必须复现相同题目。

基础与进阶尚未达到长期路线“每档至少 40 个经验证题目或等价组合”的完整题量门槛，不能写成 P115 已完成。

## 3. 真实使用路径

1. 用户选择基础、进阶或挑战并主动播放题目。
2. 每个和弦内部同时发声，各和弦按固定间隔依次播放；停止、新题、切换难度、离开页面和后台生命周期必须停止既有音源。
3. 用户选择级数进行，查看答案后锁定本轮选择并显示调性、功能关系和非评分解释。
4. 错题以 `harmony-progression` 稳定目标写入本机复练；复练答对后移除。
5. 查看答案与开始复练写入最小学习事件，画像只增加该题型事实，不推断能力等级。

## 4. 迁移与隐私

- 复练队列升级到 schema/catalog v4，迁移 v1、v2、v3；旧版本不得伪造和声进行目标。
- 学习画像信封升级到 schema v3，迁移 v1/v2 并为 `harmony-progression` 事实补零。
- 不保存音频、录音、用户具体选择、账号、设备标识、分数或能力标签；不上传、不联网、不写数据库。
- 损坏、超限、未知字段、未知版本或与难度不匹配的稳定目标必须失败关闭。

## 5. 自动验收

- `npm run test:local-harmony-progressions`
- `npm run test:legacy-activity-adapters`
- `npm run test:expanded-local-practice-catalog`
- `npm run test:local-practice-review-queue`
- `npm run test:learning-event-profile`
- `npm run test:mobile-practice-review-storage`
- `npm run test:mobile-practice-review-behavior`
- `npm run validate:android-local`
- `npm run check`

## 6. 不包含

- 七和弦、和弦外音、完整四部和声、调制、转调或正式和声分析；
- 麦克风/MIDI 作答、正式评分、自适应、跨设备同步或伙伴运行时；
- 教师审核、五名目标用户、三档 Android 真机矩阵、正式签名或最终发布完成。
