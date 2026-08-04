# Web 私人练习历史验收

状态：**MERGED / V1-12 partial**

QA level recommendation：**strict**

## 用户闭环

登录用户在 `/account` 的私人学习空间中可以：

1. 读取当前账户最近 20 条已完成的系统课程练习记录；
2. 看到课程、课节、练习类型、难度、完成时间和“与题目答案一致／不一致”的非评分核对事实；
3. 从任一可验证记录直接回到同一课程练习再练一次；
4. 手动刷新；读取失败时看到中文原因并重试；没有记录时看到真实空状态。

## 所有权与失败关闭

- 查询显式限定当前 session user ID，同时继续依赖 `practice_attempts` RLS；只读取 `completed`、`system_course` 且 exercise 仍已发布的记录，按真实完成时间倒序扫描最近 60 条并最多显示 20 条可验证记录。
- UI 再次验证 session 来源、exercise 发布状态以及完整 lesson/course 关系；记录必须有真实完成时间，类型必须是当前支持的 `single_pitch`、`interval` 或 `rhythm`，难度必须属于对应类型白名单，`client_summary.exercise_kind` 必须与 exercise kind 一致，`matches_answer` 必须是 boolean，且 `formal_evaluation` 必须明确为 `false`。
- 旧记录缺少上述字段时不猜测、不显示原始 JSON；页面只报告未显示数量。
- 退出、换用户、组件卸载或后续刷新发生后，先前请求的迟到成功／失败不得覆盖当前账户状态。
- 读取失败时不保留或显示另一账户的旧记录。

## 明确边界

- 本切片是只读 Web 历史 UI，不新增写入 RPC、数据库迁移、正式技能画像、推荐排序、分数、准确率、等级或通过／失败。
- “答案一致／不一致”只是用户已经查看答案时保存的题目核对摘要，不是正式评测。
- Android 本地复练队列、学习画像和练声记录保持独立离线边界；本切片不把 Web 账户或网络加入 APK。
- 跨设备同步协议、长期趋势、完整 Web 课程范围、生产 RLS 演练、浏览器矩阵、可访问性人工验证和目标用户 QA 仍未执行。

## 自动验证

- 纯映射测试覆盖白名单、kind 一致性、非正式结果、系统课程来源、发布状态、课程关系、损坏记录拒绝、owner filter、completed filter、完成时间排序和扫描上限。
- React 行为测试覆盖成功、再练链接、错误重试和换用户迟到结果屏蔽。
- Quality 工作流必须恰好一次执行 `test:web-private-practice-history`。
