# S1 本机谱项目统一播放控制面验收

## 完成范围

- 谱面播放与节拍器由同一个 transport 控制面协调，只公开空闲、谱面播放、节拍器启动中和节拍器运行四种模式。
- 两种播放模式双向互斥；切换前先停止旧模式，异步启动在用户改变意图后不能复活。
- 失焦、进入后台、`pagehide`、修订或已保存配置变化、全局停止及卸载都会停止活动模式并清除旧回调。
- 提示只跟随最后一次用户意图，避免切换后继续显示另一模式的旧错误。
- UI 仍明确节拍器拍点是提前调度信息，不表示与谱面播放精确相位同步。

## 明确不做

- 不统一谱面钢琴与节拍器的 `AudioContext`，不宣称 sample-accurate 同步。
- 不加入节拍器伴奏、预备拍、暂停/继续、seek、A-B/选区循环或 tempo map。
- 不改变乐谱文档 schema、IndexedDB 存储、容量保护或 save-first 语义。
- 不加入云同步、账号、导入导出、自动清理或付费扩容。
- 不改变 P119d 教师审核状态；逐题六维审核与教育有效性仍为 `NOT_EXECUTED`，正式评估门禁仍为 `BLOCKED`。

## 自动验证

- 统一 transport 行为测试：`PASS`（7/7）。
- 既有谱面播放行为测试：`PASS`（3/3）。
- 既有节拍器行为测试：`PASS`（4/4）。
- 本机谱项目面板行为测试：`PASS`（6/6）。
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
