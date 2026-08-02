# 账户会话异步 stale-result guard 验收边界

## 本切片交付

- 账户资料读取、资料保存和结构化数据导出都绑定启动异步操作时的用户 ID 与会话代数。
- 切换登录用户、退出登录或随后以同一用户重新登录，都会使旧 token 失效；迟到的成功、失败和下载副作用不会写入当前账户界面。
- 切换会话时清空上一账户的资料、导出状态和预览文案；不改变既有 Supabase API、RLS 字段白名单、导出 schema 或中文文案。

## 自动化证据

- `npm run test:account-session-stale-guard`：通过用户切换、退出和重新登录的 token 行为测试。
- `npm run test:account-data-export`：既有导出 schema 与 fail-closed 测试仍通过。
- `npm run test:account-data-export-ui-contract`：既有账户导出 UI 边界测试仍通过。

## 未执行 / 不声称

本切片没有执行真实浏览器、Supabase Auth、多账户并发、真实数据库/RLS、Storage 级联删除、Android/iOS 真机或外部 QA 验收；这些仍为 `NOT_EXECUTED`，且账户删除能力仍未实现。
