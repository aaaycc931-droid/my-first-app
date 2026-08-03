# 账户密码恢复验收边界

状态：**V1-02 partial**

QA level recommendation：**strict**

## 1. 本切片范围

- 未登录账户入口可发送 Supabase 密码恢复邮件；邮箱先 trim 并做基础格式检查，redirect 固定回到 `/account?flow=password-recovery`。
- 成功与“邮箱未关联账户”使用同一确认文案，不向页面暴露账户是否存在；请求后有 60 秒冷却。
- 只有 Supabase `PASSWORD_RECOVERY` 且携带有效 session 时才进入设置新密码界面。URL query 只表示等待验证，不能单独授权改密。
- 恢复界面要求两次新密码一致且至少 8 个字符，并调用 `updateUser({ password })`；成功后清空瞬态密码，再允许进入私人账户界面。
- 同一恢复用户的 `INITIAL_SESSION`、`SIGNED_IN`、`TOKEN_REFRESHED` 和先于 promise settle 的 `USER_UPDATED` 不会误判成功结果为 stale；退出、不同用户、替换流程或卸载会使旧结果失效。

## 2. 必须保持的行为

- magic link、密码注册／登录、60 秒登录邮件冷却、session 恢复、资料 RLS 读写、结构化导出和退出行为保持不变。
- 恢复链接验证和新密码更新完成前，不显示私人资料、数据导出或其他账户操作。
- 无效／过期链接、无 session、限流、邮件服务、网络、弱密码和重复密码错误使用简体中文恢复动作，不回显 Supabase 原始错误。
- 密码只保留在当前 React 组件瞬态 state，并在事件、取消、成功、退出和卸载时清空；不写入日志、导出、业务数据库或仓库。
- 无效 query marker 不能借用已有普通登录 session 修改密码。

## 3. 明确不在本切片

- 生产 Supabase Redirect URL allowlist、邮件模板、SMTP 配置、真实邮件送达和过期时间配置。
- MFA、第三方登录、管理员重置、账户删除、Auth／数据库／Storage 级联删除和 24 小时 SLA。
- 真实浏览器／邮件客户端、跨浏览器、移动 WebView、Android／iOS 真机、人工可访问性、教师或目标用户 QA。

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

这些自动证据只证明仓库内策略、事件顺序、组件挂载、构建和 Android 本地 bundle 边界；不证明生产邮件、真实浏览器、真实 WebView 或真机验收。
