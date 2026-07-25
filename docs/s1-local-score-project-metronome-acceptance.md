# S1 本机谱项目节拍器验收

## 完成范围

- 项目编辑页可主动启动和停止本机节拍器。
- 配置只消费最后成功保存的 BPM 与拍号，不读取未保存输入。
- 显示当前调度小节、拍号位置和强拍；调度回调可能早于实际声音，不能称为精确声画同步。
- 节拍器与谱面钢琴预览互斥；当前不宣称伴奏或 sample-accurate 相位同步。
- BPM、拍号、revision 变化时停止旧实例，不自动按新配置重启。
- 主动停止、全局停止、失焦、后台、组件卸载和异步启动竞态都必须关闭实例并清除拍点。
- 启动失败显示简体中文原因，用户可重试。

## 自动验收

- 2/4、3/4、4/4 由既有 metronome grid 测试覆盖；本 hook 验证保存配置透传。
- 显式启动、拍点、停止、失败与恢复重试。
- pending start 后配置变化不得复活。
- 全局 stop 与卸载清理。
- 新增 `test:mobile-local-score-project-metronome-behavior` 在 Quality workflow 中恰好执行一次。

## 不在本切片

- 与谱面播放光标的精确相位同步、统一 AudioContext、预备拍、A–B 循环或后台播放。
- 录制、评分、云同步、账号、导入导出或 P119d 状态变更。

## 人工 QA 状态

| 验证面 | 状态 |
| --- | --- |
| 桌面浏览器 QA | `NOT_EXECUTED` |
| Android WebView QA | `NOT_EXECUTED` |
| Android 真机 QA | `NOT_EXECUTED` |

QA level recommendation：`strict`。本切片新增音频 runtime 和生命周期清理。

P119d 两份独立逐题六维审核与教育有效性仍为 `NOT_EXECUTED`，正式评估门禁仍为 `BLOCKED`。
