# 账户密码注册与登录验收边界

状态：**V1-02 partial**

QA level recommendation：**strict**

## 1. 本切片范围

- 保留既有邮箱 magic link 登录，不改变 Supabase browser client、会话持久化或资料／导出 API。
- 在同一私人账户入口增加邮箱＋密码登录与邮箱＋密码注册。
- 注册要求两次输入一致且至少 8 个字符；邮箱只做客户端基础格式检查，最终策略仍由 Supabase Auth 决定。
- 密码只传给 Supabase Auth，不写入 React 持久状态以外的存储、日志、导出、数据库表或仓库。
- 注册成功但没有立即建立 session 时，只显示通用的确认邮件步骤，不暴露邮箱是否已注册。
- 密码登录／注册的迟到响应绑定操作代数；新的 auth event、替换认证方式、退出或组件卸载都会使旧响应失效。

## 2. 必须保持的行为

- magic link 的 60 秒冷却、错误中文化、同设备默认浏览器提示保持不变。
- 登录后的 session、资料加载／保存、结构化数据导出和退出继续复用现有 Supabase API 与 `AccountSessionWorkGuard`。
- 重复提交在请求期间禁用；无效邮箱、短密码、注册确认不一致均在发起网络请求前失败关闭。
- 后端限流、未确认邮箱、无效凭据、弱密码和网络错误显示简体中文恢复提示，不回显原始后端错误。
- auth event 先于请求完成时，迟到成功或失败不得覆盖新的会话界面。

## 3. 明确不在本切片

- 账户删除、Auth／数据库／Storage 级联删除、原始私有资产导出和 24 小时 SLA。
- 密码重置、MFA、第三方登录、生产邮件模板或生产 Supabase Auth 配置变更。
- 真实邮件送达、生产注册／登录、跨浏览器、移动 WebView、Android／iOS 真机、可访问性、教师或目标用户 QA。

## 4. 自动验收

- `npm run test:auth-ui-policy`
- `npm run test:account-password-auth`
- `npm run test:account-session-stale-guard`
- `npm run test:account-data-export`
- `npm run test:account-data-export-ui-contract`
- `npm run test:quality-workflow-test-coverage`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run android:sync && npm run validate:android-local`

这些自动证据只证明仓库内策略、挂载行为、构建和 Android 本地 bundle 边界；不证明生产 Auth、真实邮件、真实浏览器或真机验收。
