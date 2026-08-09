# 最终 UI 重构兼容契约

状态：**Canonical / 产品路线与实现架构约束**

生效日期：2026-07-31

QA level recommendation：**none（docs-only）**

## 1. 目的与规范关系

本文件回答：当前及未来产品路线完成的能力，怎样保证可以在正式发布前进行一次统一
UI 重构，而不重写已经验证的业务能力、破坏用户数据或降低安全与证据门槛。

核心原则：

> 路线冻结产品能力、行为契约、数据兼容和证据门槛，不冻结当前页面布局、组件树或视觉表达。

`docs/final-release-definition-of-done.md` 仍是 V1 唯一完成标准；本文件只定义 UI
重构的解释与兼容边界。发生冲突时，以正式版 DoD、状态矩阵和真实运行证据为准。

本文件不表示 UI 重构已经开始或完成。当前页面、导航和样式仍是各能力切片的
implementation candidate；浏览器、Android 真机、可访问性、教师及目标用户的最终
UI 验收均为 `NOT_EXECUTED`，除非状态矩阵记录了对应真实证据。

## 2. 路线必须保留的能力

最终 UI 可以重新设计，但不得静默删除、降级或改变以下已经冻结或验证的契约：

- canonical 音乐、乐谱、活动、媒体、学习事实和项目模型；
- storage version、迁移链、revision、undo/redo、恢复、容量和失败关闭语义；
- MusicXML/MXL、MIDI、录音、播放、分析及其他格式或设备协议的受控边界；
- 自动结果的“预览 → 检查 → 修改 / 确认 → 再进入练习”流程；
- 用户第一步、空状态、加载状态、错误状态、disabled reason、清除、重置、
  replace、stale 和重复提交行为；
- Android 离线、本地优先、Web 私有数据、所有权、删除、隐私和权限边界；
- 非评分反馈、证据忠实度、局部拒答及不得冒充正式评分或教育结论的限制；
- 简体中文、可访问性、生命周期、后台停止、音频清理和低延迟要求；
- 已有项目和用户数据的向前兼容、可回滚和可验证恢复。

视觉重构不得通过更换控件、减少页面或合并入口绕开这些行为。若交互方式变化，
新流程必须提供等价或更好的可发现性、状态反馈、恢复动作和验证证据。

## 3. 可以重新设计的范围

在不违反上一节的前提下，最终 UI 可以整体替换：

- 信息架构、首页组织、导航模式和功能入口组合；
- 页面布局、组件层级、设计系统、颜色、字体、图标、间距和动效；
- 响应式断点、手机／平板／桌面布局及 Android 壳层表现；
- 展示型组件、控件形态和非协议性文案；
- 当前 Tailwind class、DOM 结构和临时视觉分组；
- 当前页面或组件文件的拆分、合并和重命名。

URL、深链、文件格式、持久化键、原生 bridge 名称或其他外部契约不能仅因 UI
重构而直接删除；需要改变时必须提供迁移、兼容入口或明确版本化决策。

## 4. 历史与未来路线的解释规则

- 历史路线中的截图、线框图、临时页面名、按钮位置、颜色、卡片布局和示例文案，
  默认只说明当时的功能承载方式，不构成最终视觉规范。
- 历史路线中的用户任务、确认步骤、失败关闭、安全、隐私、可访问性和证据要求
  继续有效，除非被更高优先级文档明确替代。
- 未来路线必须描述“用户完成什么任务”和“必须保留什么行为”，不得无必要地把
  某一种 JSX、DOM、CSS、导航或视觉控件冻结成产品能力。
- 如果未来确实需要冻结品牌资产、伙伴形象、专业记谱含义或特定交互，应明确写出
  冻结原因、适用范围和验收证据，不能依赖旧截图推断。

## 5. 后续实现的架构边界

新功能和维护切片必须遵守：

1. `lib/` 中的 domain、protocol、parser、validator、migration 和 use-case 不得
   反向依赖 `app/`、`components/` 或 `mobile/src/`。
2. 展示组件不得直接实现 schema migration、格式解析、评分判定、数据所有权或
   持久化一致性规则。
3. 浏览器、Capacitor、IndexedDB、localStorage、文件下载、录音、MIDI 和生命周期
   通过明确的 adapter／port／runtime service 接入；共享组件不得反向依赖单一平台
   的 runtime 目录。
4. 复杂流程优先形成可测试的 controller、hook、use-case 或 state machine；JSX
   负责呈现状态和转发用户意图。
5. 跨页面共享稳定的语义化 ViewModel／command／result，不让 domain 依赖
   Tailwind class、DOM 层级、按钮名称或视觉坐标。
6. 行为测试保护用户任务、状态转换、数据与协议；视觉结构变化不应要求重写无关的
   domain 测试。视觉回归和可访问性证据在最终 UI 阶段单独建立。
7. 不为未来重构提前进行无边界的大爆炸改写；后续功能触及耦合热点时渐进抽离，并
   保持每个切片可运行、可测试、可回滚。

仓库 hygiene 门禁会解析已跟踪的 `lib/` 源文件 import／export／dynamic import／
require 依赖，并阻止其反向引用 `app/`、`components/` 或 `mobile/src/`。该自动门禁
只保护依赖方向，不表示热点 controller／adapter 抽离或最终 UI 重构已经完成。

## 6. 当前已知的渐进抽离热点

截至 2026-08-01 的 source-level 审查确认核心 `lib/` 没有反向导入 UI，但以下文件
同时承担较多展示与流程编排职责：

| 热点 | 当前混合职责 | 重构前目标边界 |
| --- | --- | --- |
| `app/practice/page.tsx` | 页面、活动会话、计时器、录音、音频分析和反馈编排 | 提取 practice controller、录音／计时 adapter 和语义化页面状态 |
| `mobile/src/LocalScoreProjectPanel.tsx` | 编辑 UI、项目存储、MusicXML/MXL 候选、确认和下载 | 提取 score-project controller、exchange use-case 与 file adapter |
| `mobile/src/App.tsx` | 导航、生命周期和学习流程编排；课程进度、学习画像与复练队列已分别注入 repository | 提取 app shell、navigation state 与 learning controller |
| `app/recognize/page.tsx` | 文件校验、识别结果和文件选择／导入编排已由可注入 recognition workflow controller／薄 React hook 承接；API 请求和 preview URL 也分别由 client／preview adapter 承接 | 继续提取播放调度及其余页面职责；不得把 fetch／FormData 放回页面 |
| 本机课程／学习概览组件 | 课程进度、学习画像与复练队列 repository 已分别通过 PR #499／#503／#505 由 composition root 注入 | 继续由上层注入 repository、snapshot 和 commands，不把 localStorage 访问放回组件 |
| 共享实时音高组件 | 本机练声记录 storage 和下载已由 port 注入；当前会话、已保存录音和 P113 片段的 Blob 回放已由 latest-wins controller／浏览器 adapter 承接；组件仍编排录音采集与活动状态 | 继续提取 MediaRecorder adapter 和实时练习 controller；不得把已抽离 storage／下载／回放 side effect 重新耦合到组件 |

这些热点是可控技术债，不代表当前功能错误，也不单独阻塞 S3 或其他边界清楚的能力
切片。不得据此宣称 UI 重构已完成；也不得继续把新的 schema、迁移、格式解析或业务
判定堆入这些展示文件。

共享实时音高组件的首个 storage port 抽离边界见
`docs/ui-realtime-pitch-local-record-storage-port-acceptance.md`，Blob 回放抽离边界见
`docs/local-blob-audio-playback-controller-acceptance.md`。后者只承接当前会话、已保存录音
和 P113 片段的浏览器回放 side effect 与 stale-result 编排，不表示 MediaRecorder、完整
实时练习 controller、其余音频路径或最终 UI 已完成重构。

本机课程进度 repository 注入边界见
`docs/ui-mobile-course-progress-repository-port-acceptance.md`，已通过 PR #499 合并为
`c919bd155994598d02462706821ba4e00bda47ad`。该切片保持 P118a／P118e 课程 key、schema、
失败关闭和界面行为不变，只把浏览器 storage adapter 留在 Android composition root；
不表示 App shell、其他学习存储或最终 UI 已完成重构。

本机学习画像 repository port 边界见
`docs/ui-mobile-learning-profile-repository-port-acceptance.md`，已通过 PR #503 合并为
`9065d74f368b3bbe38e4c9af7a97fb5335707a88`。该切片只把 P114m／P118b／
P118d／P118e 已有学习事实持久化改由 Android composition root 注入，不改变 key、schema、
迁移、统计、建议、重置或界面行为；完整 learning controller、App shell 和
最终 UI 重构仍未完成。

本机复练队列 repository port 边界见
`docs/ui-mobile-practice-review-repository-port-acceptance.md`，已通过 PR #505 合并为
`fa037a7395e0d78b22599e22802e428ac067e301`。该切片只把现有复练队列
持久化改由 Android composition root 注入，不改变 key、schema／catalog version、迁移、
MRU、最多 12 项、答题更新、清空确认或界面行为；完整 learning controller、App shell、
navigation state 和最终 UI 重构仍未完成。

浏览器 recognition API client port／adapter 边界已通过 PR #511 合并为
`0655dfcd3f2c59b8e131bd313295c9ace9204e5d`。该切片只把 `/recognize` 页面既有三个
fetch／FormData 路径改由可注入 client 承接，保持 endpoint、POST、字段、开发开关、
响应默认值、错误文案、原始网络异常传播和界面行为不变；真实 OMR 和最终 UI 重构仍未完成。
PR #514 又把图片选择后的 object URL 创建／释放改由可注入 browser recognition file
preview adapter 承接；文件校验、选择／清空时机、预览显示、endpoint、FormData、错误
文案和用户行为保持不变。PR #521 随后完成 recognition workflow controller 与薄 React
subscription hook，承接图片、MusicXML 和开发态 Audiveris 的文件选择及异步编排，并加入
源替换 stale-result guard、迟到回调屏蔽和 dispose 后 preview URL 单次撤销。该切片仍不
改变真实 OMR、浏览器／WebView／真机或最终 UI 验收状态。

PR #515 随后把两个静态 validator 对齐到上述 page／client 依赖方向：endpoint、POST、
字段和条件参数仍在 client 检查，页面重新出现 fetch、FormData 或 dev endpoint literal
会失败。该维护不改变 runtime 或界面，但防止后续重构把已抽离的平台依赖重新放回页面。

课程库加载失败关闭边界已通过 PR #507 合并为
`a43b323bb14678990cdcb4111c3969cf5fc66f76`：成功与 rejection 路径保持不变，永不 settle
的请求最多等待 10 秒，随后退出 loading 并显示既有错误。该切片不改变课程 schema、
内容、页面布局、导航或错误文案。2026-08-01 云 Chrome 仅完成对应 timeout、首页模式
切换／刷新保持和路由渲染的部分自动化 smoke，不代表完整浏览器、可访问性或最终 UI QA。

## 7. 每个未来切片的兼容检查

涉及 UI、导航、存储或用户流程的 PR 至少回答：

- 新增能力是否只通过稳定 domain/use-case 接口进入 UI；
- 是否新增了组件对 storage、parser、migration 或平台 API 的直接依赖；
- 当前控件被完全替换后，业务状态机和数据契约能否继续复用；
- 是否把历史页面结构误当成了不可替换的产品需求；
- 是否保留 loading、error、disabled、clear、reset、stale 和确认边界；
- 是否需要渐进抽离本文件列出的热点；
- 哪些验证是自动测试，哪些 Browser／Android／可访问性／目标用户 QA 仍为
  `NOT_EXECUTED`。

纯 domain、协议或 docs 切片如果不改变 UI runtime，可明确记录“无 UI runtime
变化”，无需为了形式增加展示组件。

## 8. 最终 UI 重构的进入门槛

正式启动统一 UI 重构前必须准备：

- 当前用户任务、入口、状态和平台差异清单；
- 关键 domain、storage、format 和 bridge 契约基线；
- 已有本机项目、迁移样本和恢复样本；
- Web／Android 的行为回归基线；
- 设计系统、信息架构、简体中文、可访问性和响应式目标；
- 分阶段替换、兼容入口、遥测／错误观察和回滚方案；
- 对上述热点的 controller／adapter 抽离顺序。

不得等到视觉替换过程中才决定数据迁移、安全、评分、删除或自动结果确认语义。

## 9. 最终 UI 重构的退出门槛

只有同时满足以下条件，才能称为 UI 重构完成：

- 冻结范围内的用户任务在新 UI 中可发现且可完整完成；
- 既有 canonical 项目、存储、迁移、导入导出和学习事实无损兼容；
- Web 与 Android 的关键行为、音频、录音、权限、生命周期和离线路径通过；
- empty/loading/error/disabled/clear/reset/replace/stale/confirm 全部有证据；
- 简体中文、键盘、屏幕阅读器、缩放、对比度和触控目标完成正式审查；
- production build、性能、错误观察、升级和回滚路径验证完成；
- 真实浏览器、Android 真机和目标用户任务验收完成；
- 未把自动测试、DOM 测试、CI、模拟音频或 Debug APK 冒充外部 QA。

教师、目标用户、第三方 MusicXML 阅读器、真实人声、MIDI 设备或其他外部证据只在
实际执行后才能更新状态；UI 重构本身不能自动补齐这些发布门槛。
