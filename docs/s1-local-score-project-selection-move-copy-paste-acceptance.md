# S1 本机谱项目事件移动与复制粘贴验收

## 完成范围

- 对第一声部的单个已保存事件进行选择并移动到已有小节末尾；选择当前小节时可移到本小节末尾。移动保留事件 ID、内容并只产生一次 revision 与一条 undo。
- 从已保存项目复制事件内容到当前组件的临时剪贴板；复制本身不修改项目、revision 或历史。
- 将临时副本粘贴到已有小节并生成新事件 ID；粘贴只产生一次 revision 与一条 undo。
- 移动和粘贴在目标小节正好填满拍号容量时允许，超过容量时以简体中文拒绝并保留已保存谱面。
- 所有移动和粘贴继续通过既有 CAS、应用容量、IndexedDB quota、普通写入和事务失败保护；只有存储成功后才发布到 UI。失败时保留选择、目标与副本，可在条件恢复后重试。
- 返回项目列表时清空临时副本，避免无提示跨项目粘贴。

## 明确不做

- 不使用系统剪贴板，不跨项目保留副本。
- 不加入拖拽、多选、批量编辑或跨 part/staff/voice 的 UI。
- 不增加 schema 或 IndexedDB migration，不改变容量上限。
- 不包含云同步、账号、导入导出、自动清理或付费扩容。
- 不改变 P119d 教师审核状态；逐题六维审核与教育有效性仍为 `NOT_EXECUTED`，正式评估门禁仍为 `BLOCKED`。

## 自动验证

- 本机谱项目 domain 测试：`PASS`。
- 本机谱项目面板行为测试：`PASS`（7/7）。
- 本机谱项目容量与 IndexedDB 恢复测试：`PASS`。
- Quality workflow `test:*` 注册检查：`PASS`（139/139，恰好一次）。
- `npm run check`：`PASS`。
- `npm run lint`：`PASS`。
- `npm run typecheck`：`PASS`。
- `git diff --check`：`PASS`。

## 人工 QA

- 桌面浏览器 QA：`NOT_EXECUTED`
- Android WebView QA：`NOT_EXECUTED`
- Android 真机 QA：`NOT_EXECUTED`
- QA 建议：`strict`
