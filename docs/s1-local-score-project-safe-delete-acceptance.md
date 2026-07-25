# S1 本机谱项目安全删除与容量恢复验收

## 完成范围

- 本机项目列表提供单项目删除入口。
- 删除前必须在页面内明确确认，也可以取消；不使用自动清理或批量删除。
- 删除继续使用预期 revision。其他页面已更新项目时拒绝 stale delete，并保留当前记录。
- 删除写入或 IndexedDB 事务失败时，列表和已有数据保持不变，并显示简体中文原因。
- 存储条件恢复后可重试删除；删除成功后释放应用项目数量与容量名额，可重试新建或保存。
- 不修改其他项目，不压缩、不覆盖、不静默变更用户数据。

## 不在本切片

- 云同步、账号、导入导出、自动清理、批量删除、回收站、付费扩容。
- 与容量保护无关的大规模 UI 重构。
- P119d 教师审核状态变更。

## 自动化验证

- `npm run test:mobile-local-score-project-behavior`
- `npm run test:local-score-project-capacity`
- `npm run test:local-score-project-storage`
- `npm run test:local-score-project-indexeddb-recovery`
- `npm run check`
- `npm run lint`
- `npm run typecheck`
- `git diff --check`
- Quality workflow 测试注册检查：所有 `test:*` 命令保持恰好执行一次。

## 人工 QA 状态

| 验证面 | 状态 | 说明 |
| --- | --- | --- |
| 桌面浏览器 QA | `NOT_EXECUTED` | 尚未执行人工确认、取消、失败保留与恢复重试流程。 |
| Android WebView QA | `NOT_EXECUTED` | 尚未在 Android WebView 执行。 |
| Android 真机 QA | `NOT_EXECUTED` | 尚未在 Android 真机执行。 |

## P119d 状态

两位教师仅批准审核计划和 153 项候选批次。两份独立逐题六维审核与教育有效性仍为 `NOT_EXECUTED`，正式评估门禁仍为 `BLOCKED`。
