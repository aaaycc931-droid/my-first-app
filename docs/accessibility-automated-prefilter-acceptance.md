# Android 本地入口自动可访问性前置筛查验收

状态：**AUTOMATED PREFILTER ONLY / external accessibility QA remains `NOT_EXECUTED`**

QA level recommendation：**none（test/tooling-only，不改变运行时）**

## 1. 切片范围

本切片把 `axe-core` 作为直接开发依赖，在 `happy-dom` 中挂载当前 Android 本地 React
入口，并检查下列八个初始界面：

- 首页；
- 中文课程；
- 练习统计；
- 本机谱项目；
- 实时音高反馈；
- 单音听辨；
- 旋律听写；
- 本地参考钢琴。

命令：

```bash
npm run test:accessibility-prefilter
```

筛查使用 `axe-core` 的 WCAG 2.0 A／AA、2.1 A／AA 与 2.2 AA 标签规则，阻止初始 DOM
中可确定识别的可访问名称、标签、ARIA 属性／角色、标题与 landmark 等语义违规进入
Quality workflow。颜色对比规则明确关闭，因为 DOM 模拟器不能可靠计算实际 CSS、字体、
背景和系统渲染结果；颜色对比必须由真实渲染和人工复核完成。

## 2. 兼容边界

本切片只新增测试、开发依赖、CI 命令和本文档；不修改 UI、页面文案、schema、storage
version、迁移、Android 权限、音频／录音行为或其他用户行为。既有 Next ESLint
`jsx-a11y` 静态检查继续保留；本筛查补充的是挂载后 DOM 语义，不重复宣称源码 lint
已经证明的范围。

## 3. 不能由本筛查证明的项目

以下项目仍须真实执行并保持 `NOT_EXECUTED`，不得把本命令通过写成这些项目已通过：

- 键盘完整路径、真实焦点顺序、可见焦点、焦点恢复和动态提示朗读；
- 人工屏幕阅读器，包括适用版本的 TalkBack、VoiceOver、NVDA 或 JAWS；
- 真实颜色对比、200%／400% 缩放、reflow、横竖屏、触控目标和运动效果；
- Chrome、Edge、Firefox、Safari、Android Chrome／System WebView 的真实浏览器矩阵；
- Android 真机、麦克风、扬声器、耳机、USB／BLE MIDI、生命周期和性能；
- 第三方 MusicXML GUI 打开、显示、播放、保存和重开；
- 独立教师逐题审核和至少 5 名中文目标用户任务验证。

因此 `docs/final-release-status-matrix.md` 的正式可访问性门槛、EXT-B、EXT-C、EXT-D、
EXT-E1 和 EXT-E2 均不因本切片改变；EXT-A 也只能记录为自动风险降低的局部执行，不能
外推为外部 QA 完成。

## 4. 失败与扩展规则

- 任一确定性 axe violation 使命令失败，并输出 rule ID 与帮助文本；
- 新增核心 Android 初始界面时，应把它加入当前代表性界面矩阵或说明为什么不适用；
- 依赖真实布局、像素、浏览器、辅助技术或用户判断的规则不得用模拟结果补写为通过；
- 后续真实浏览器自动扫描必须作为独立切片绑定明确 commit、URL、浏览器版本和 viewport，
  不能静默扩大本测试的结论。
