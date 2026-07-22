# P118a 中文本地课程路径验收记录

状态：`IMPLEMENTATION_CANDIDATE`。本文件记录仓库内实现与自动验证边界，不代表正式验证、发布批准或教育有效性结论。

合并事实：PR #403 已 squash 合并为 main commit `8a31126cfd993ee7f150e0fbe17b1ddaf9b54d5b`。PR Quality run `29904618128` 的 `quality` 与 `android-local` 均成功；Android artifact `8523330552` 来自 PR synthetic merge commit `8456f0f229deb492457ed363bf60b1c1b93f1e94`，不能表述为 main commit 的真机验证。

## 实现范围

- 稳定课程 ID `00000000-0000-0000-0000-000000000001`，内容版本 `zh-foundation-2026.1`，一个中文基础章节和三个顺序课节。
- 复用既有单音 C4、上行大三度和四拍均匀 Activity；没有创建平行答案协议，也不调用 Web/Supabase 课程 RPC。
- 课节完成条件是绑定的非评分 Activity 在当前 attempt 中进入 `checked`。答案一致、不同或证据不足都只表示“已经练习并查看说明”，不表示通过、失败、分数或能力等级。
- 解锁由有效前置课节完成事实推导，不持久化解锁结论。
- 独立本机进度 envelope 只保存 schema/course/content version、课节 ID、完成指纹和 revision；不保存答案、正确性、录音、Blob、PCM、音高帧、详细生物特征或 `ActivitySession`，不上传。
- 未知 schema、不同内容版本、未知课节、指纹不一致、重复课节和超长/畸形 JSON 均 fail closed；当前没有可证明安全的旧版课程数据，因此不猜测迁移。
- 用户可确认后重置课程进度；存储不可用或失败时可继续当前会话，但明确说明不会标记为已保存。

## 自动验证

合并前必须通过：

- `npm run test:local-course-path`
- `npm run check`
- `npm audit --omit=dev --audit-level=high`
- `npm run android:sync`
- `npm run validate:android-local`
- `git diff --check`
- GitHub Quality 与 `android-local`

## 外部证据

以下均为 `NOT_EXECUTED`：Browser 真实麦克风、Android 三档真机、权限拒绝/重新授权、后台恢复和进程重建、长循环、升级/回滚、真实人声采集与标注、真实音高验证、两名独立教师审核、至少 5 名中文目标用户可用性、文案误解、正式签名、私测分发、已知问题、回滚方案和发布批准证据包。

自动测试、DOM/模拟行为、CI、同步工程和 APK 构建工件不能替代上述人工证据。

## 切片边界

P118a 不包含 P118b 详细统计、P118c 薄弱点复练队列、P118d 自适应推荐或 P118e 整合；不新增账户、云端、数据库、网络依赖或 `INTERNET` 权限。
