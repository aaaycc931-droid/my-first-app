# 练习页节奏 runtime controller 验收

状态：**Active implementation acceptance**

最后核验：2026-08-12

规范来源：`docs/final-ui-refactor-compatibility-contract.md`

## 1. 动机

`/practice` 的普通节奏与谱面临时节奏练习此前在页面中重复持有
`BrowserMetronomeScheduler`、generation、count-in／结束 timeout、60ms 刷新 interval、
拍击 ID 和五项 runtime state。两条 start 路径虽然已有 stale-start guard，但相同的
生命周期协议由大型页面重复维护，且主要依赖源码正则而不是独立行为测试。

本切片以纯 run plan 冻结配置和时间，把共享 scheduler／timer、latest-wins、状态转换和
拍击记录放入框架无关 controller；浏览器 port 承接 clock 与计时 API，React hook 只负责
订阅和 StrictMode-safe 生命周期。

## 2. 必须改变

- 页面不再直接持有 rhythm scheduler、generation、timeout、interval 或 tap-id refs；
- 普通 pattern 与谱面 rhythm 共用同一个 `start(plan)` 状态机；
- A start pending 时开始 B，A 的迟到 true／false／rejection 和 timer callback 均不能覆盖 B；
- reset、目标替换／失效和最终卸载必须同步停止 scheduler、清除全部 owned timers 并失效旧回调；
- 目标替换／失效同时清除旧 runtime error，避免新目标显示旧来源错误；
- manual stop 保留 targets／taps、写入最终时钟并进入 `stopped`；reset 回到空 `idle`；
- 仅 `practice` phase 接受拍击，ID 在每次 run 内单调递增且时间来自同一 port clock；
- 新 controller 测试进入 Quality 与 runtime lane ownership 清单；旧页面源码测试只检查仍由
  页面持有的独立节拍器和 latency calibration 两条 start。

## 3. 必须保留

- 80ms start delay、count-in 小节、BPM、拍号、subdivision 与 60ms `now` 刷新；
- 普通练习固定小节数及 quarter／eighth pattern target；
- 谱面 note 产生 target、rest 只推进时间、目标 identity／fingerprint 与 Activity session 规则；
- practice duration 后继续保留 180ms match window 与 120ms 尾窗；
- `count-in → practice → stopped`、手动停止、重置、拍击按钮和 Space 键行为；
- latency offset、反馈算法、非评分文案和停止后由页面写入 Activity evidence 的边界；
- 独立节拍器、latency calibration、录音 timer、全局音频停止与 UI 布局不属于本 controller；
- 不新增持久化、网络、正式评分、通过／失败或 AI 调用。

## 4. 验证边界

自动测试必须覆盖 run-plan 时间、pattern／notation targets、count-in、自动／手动停止、
phase gate、单调 tap ID、pending replacement、迟到 callback、false／rejection、cleanup、
dispose、StrictMode synthetic remount、页面 source contract 及既有 latency／notation 回归。

真实浏览器音频时钟、Safari／Firefox、Android System WebView／已安装 APK、后台／锁屏、
长时间 timer drift、真实触控／键盘节奏、音频焦点、可访问性和目标用户 QA 均保持
`NOT_EXECUTED`。

QA level recommendation：**strict**。
