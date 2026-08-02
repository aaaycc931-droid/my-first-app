# 外部 QA `NOT_EXECUTED` 矩阵与证据模板

状态：**Canonical evidence template / all listed external QA remains `NOT_EXECUTED`**

日期：2026-08-01

QA level recommendation：**none（docs-only 模板）**

## 1. 用途与诚实边界

本文件统一记录仓库自动门禁无法独立关闭的外部 QA。模板入库、自动测试通过、CI
成功、Vercel Ready、仓库内部 MusicXML re-import、模拟媒体、Android emulator 或
Debug APK 工件均不改变下表状态。只有真实执行、保存最小可复核证据并关闭阻塞 finding
后，对应记录才可依据正式版 DoD 和状态矩阵单独更新。

本模板不替代：

- `docs/final-release-definition-of-done.md` 的正式退出门槛；
- `docs/final-release-status-matrix.md` 的当前发布状态；
- `docs/android-p104-evidence-collection-guide.md` 的算法／三档真机协议；
- `docs/android-piano-manual-test-protocol.md` 的钢琴、录音与练耳真机步骤；
- `docs/p119d-dual-teacher-review-preparation-acceptance.md` 的冻结教师审核批次；
- 各 S3 MusicXML/MXL acceptance 的严格语义与 fail-closed 边界。

身份、资质、签署、同意书、真实人声、设备序列号和其他个人信息不得进入 Git、CI
artifact、APK、公开日志或聊天。仓库记录只保存匿名 token、非身份汇总、文件摘要和由
产品所有者授权的私有证据引用。

## 2. 当前统一矩阵

| ID | 类别 | 当前状态 | 必须真实执行的最小范围 | 可在仓库中先降低的风险 | 自动证据不能替代 |
| --- | --- | --- | --- | --- | --- |
| EXT-A | 仓库／CI 风险降低 | `NOT_EXECUTED` | 对计划新增的 headless browser、可访问性预筛、Android emulator 或第三方 CLI smoke 真实运行并保存命令、版本、commit 和结果 | focused tests、DOM 行为测试、parser/re-import、静态依赖边界、APK 构建与结构验证 | 真实浏览器音频、人工屏幕阅读器、Android 真机、实体 MIDI、第三方 GUI、教师或用户结论 |
| EXT-B | 桌面浏览器 | `NOT_EXECUTED` | 真实 Chrome／Edge／Firefox／Safari 中完成适用的导入、下载、重开、键盘、缩放、焦点、屏幕阅读器、音频／麦克风与失败恢复 | headless 文件流、DOM 状态、键盘基础路径、静态可访问性扫描 | Android WebView、实体设备权限／生命周期、真实手机性能或跨浏览器手动结果 |
| EXT-C | Android／WebView／麦克风／MIDI 真机 | `NOT_EXECUTED` | 已安装 APK 的飞行模式、三档设备、System WebView、权限、真实输入输出、存储、前后台／锁屏／进程重建、20 轮，以及适用的 USB／BLE MIDI | Android unit／instrumentation／emulator、bridge fake、bundle／权限／签名／结构校验 | 实体麦克风、扬声器、耳机、USB／BLE 传输、真实延迟／抖动、温度、内存或三档设备矩阵 |
| EXT-D | 第三方 MusicXML 软件 | `NOT_EXECUTED` | 使用明确版本的 MuseScore、Dorico、Sibelius 或其他合法独立阅读器真实打开 XML／MXL，记录 warning、显示、布局、重开与适用播放 | 仓库 importer、legacy parser、确定性 XML/MXL、可选固定版本 CLI smoke | 第三方 GUI 兼容、完整 MusicXML、未抽样的 483 组合、真实音色／播放或其他软件版本 |
| EXT-E1 | 独立教师 | `NOT_EXECUTED` | 按冻结范围分别完成题目／课程六维审核、算法文案与阈值、谱面／唱名／节奏／反馈及适用 MusicXML 教学语义审核 | manifest、候选生成器、worksheet schema、fail-closed validator | 教师身份、独立性、资质、签署、逐题判断、finding 闭环或教育有效性 |
| EXT-E2 | 中文目标用户 | `NOT_EXECUTED` | 至少 5 名不参与开发的目标用户独立完成正式 DoD 核心任务，统计成功率、误解、阻塞问题与修复后复测 | 自动行为测试、任务脚本、埋点或汇总计算 | 用户是否能发现、完成和理解任务，尤其是草稿／反馈与正式转写／评分的区分 |

`EXT-A` 表示“拟增加或已增加的自动风险降低动作尚未在本记录中执行”，不是把现有 CI
贬为未执行。现有 CI 的结果继续按其真实 commit／run 记录；它不能把 `EXT-B` 至
`EXT-E2` 更新为通过。

## 3. 共用证据头

每次外部 QA 建立一份不可歧义的执行记录，至少填写：

| 字段 | 必填内容 |
| --- | --- |
| `recordId` | 唯一、非身份标识，例如 `EXT-C-2026-08-01-001` |
| `category` | `EXT-A`、`EXT-B`、`EXT-C`、`EXT-D`、`EXT-E1` 或 `EXT-E2` |
| `status` | 开始前及没有完整证据时保持 `NOT_EXECUTED`；执行中可在私有记录写 `IN_PROGRESS`，不得提前写 `PASS` |
| 候选 provenance | Git commit；适用时填写 PR、CI run、artifact ID、GitHub ZIP digest、APK／输入文件内部 SHA-256；不同摘要不得混用 |
| 范围 | 被测功能、acceptance 文档、测试用例／fixture ID 与明确不在本次范围内的项目 |
| 执行环境 | 日期、时区、匿名执行者 token、操作系统／设备／程序及精确版本 |
| 结果 | 每项预期、实际、`PASS`／`FAIL`／`BLOCKED`／`NOT_APPLICABLE` 与复现步骤 |
| findings | finding ID、严重度、用户影响、证据引用、负责人、修复 commit 和复测记录；开放阻塞 finding 不得形成整体通过结论 |
| 私有证据引用 | 产品所有者控制位置中的授权引用；不得写入身份、密钥、真实录音或私有签署原件 |
| 结论边界 | 本记录真实证明什么，以及不能外推为什么 |

## 4. 分类别最小字段

### 4.1 EXT-A：仓库／CI 风险降低记录

至少记录：命令或 workflow/job、工具与版本、commit/head SHA、输入 fixture 摘要、退出码、
测试数、失败数、artifact／日志引用和重跑结果。若是 Android emulator，必须标明
`SIMULATED`；若是第三方 CLI，只能写 parser/CLI smoke，不得写 GUI 已通过。

当前可增强但尚不能关闭外部门槛的方向包括：真实浏览器 E2E 的导入→确认→下载→重开
与失败恢复、自动可访问性预筛、Android `connectedAndroidTest`／emulator 生命周期和
存储路径、固定版本第三方 MusicXML CLI smoke。是否实现必须由独立工程切片决定；本
模板不新增依赖或 CI job。

### 4.2 EXT-B：桌面浏览器记录

至少记录：OS、浏览器及版本、视口、输入方式、输出设备、麦克风设备类别与 permission／
codec（适用时）、屏幕阅读器及版本（适用时）、输入文件 SHA-256、下载文件 SHA-256、
Network 观察、键盘／焦点／缩放结果、录音／完整回放结果、截图或日志引用、失败恢复和
20 轮结果（适用时）。

云浏览器可以承载不依赖硬件的文件与 UI 路径；没有真实可控麦克风、音频输出或辅助
技术时，相关字段必须保持 `NOT_EXECUTED`，不能由模拟 `MediaRecorder` 补写。

### 4.3 EXT-C：Android／WebView／麦克风／MIDI 真机记录

至少记录：APK 文件名与内部 SHA-256、commit、CI run、artifact ID／ZIP digest、签名
类型与证书指纹、设备型号、性能档、Android／System WebView 版本、安装／覆盖升级方式、
飞行模式、冷启动样本、输出路径、麦克风与权限、前后台／锁屏／来电／音频焦点／进程
重建、localStorage／IndexedDB 跨重启与失败降级、20 轮稳定性、RTF／温度／内存观察及
问题附件。

MIDI 另填：USB 或 BLE、设备类别、OTG／系统暴露方式、端口、力度、和弦、CC64、拔线／
断连、重新连接、后台、延迟／抖动及 fallback。fake facade、虚拟 MIDI 或 emulator 必须
标为 `SIMULATED`，不得记为实体硬件结果。一台旧设备的历史记录不能外推到当前候选或
三档设备矩阵。

P104 的汇总继续填入被 Git 忽略的
`local-fixtures/android-p104/evidence.local.json`，真实人声元数据继续遵守
`local-fixtures/real-voice/README.md`；原始录音和身份授权不得提交仓库。

### 4.4 EXT-D：第三方 MusicXML 软件记录

至少记录：软件名称、版本、OS、输入格式、输入 SHA-256、生成 commit、对应严格子集／
fixture ID、打开结果、全部 warning、标题／署名、part／乐器、速度、音高／时值／拍位、
歌词、指法、演奏法、力度、踏板、fermata、slur、tie、和弦标记的适用检查、布局、真实
播放、保存／重开、第三方再次导出的文件 SHA-256 及与原 canonical 的差异。

抽样必须声明覆盖和未覆盖的根音、类别与共存组合。代表性文件通过不能外推为当前
24 类 × 21 根音的 504 个组合全部通过，更不能外推为完整 MusicXML、MIDI、OMR 或真实
和弦／踏板／连奏音频语义。

### 4.5 EXT-E1：独立教师记录

至少记录：匿名 reviewer token、私有资质核验引用、冻结 manifest／candidate SHA-256、
独立审核声明、审核维度、逐项 worksheet 引用、finding、修改批次、重新批准和私有签署
引用。两位教师必须分别审核同一获批批次；一方结论不得提前泄露给另一方。

P119d 当前只证明两名教师在仓库外批准了 153 项样本计划。逐题六维审核、两份完整性
复核、finding 闭环、教育有效性和专业每档 40 仍为 `NOT_EXECUTED` 或 `BLOCKED`。
结构 validator 通过也必须人工核对真实身份、资质、签署和原始记录。

### 4.6 EXT-E2：中文目标用户记录

至少记录：匿名 participant token、非开发参与者确认、私有同意引用、目标用户画像的
非身份摘要、设备／辅助技术、候选 provenance、任务起止、是否无代操作完成、耗时、
误触、求助、失败、对“草稿／练习反馈”和“正式转写／正式评分”的理解、finding 与修复
后复测。不得把教师、开发者或产品所有者自测计入 5 名目标用户。

正式 DoD 的核心任务按同一冻结脚本统计：登录、开始课程、完成并保存一次练习、找到
历史、导入受支持素材、确认草稿和删除素材。至少 5 人且任务成功率至少 80% 只是最低
门槛；任何阻断问题仍须修复并复测。

## 5. 执行登记表

新增执行时复制一行；没有真实记录前保持如下状态：

| Record ID | 类别 | 候选 commit／artifact／input SHA | 环境 | 私有证据引用 | findings | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 待执行 | EXT-A | 待填写 | 待填写 | 待填写 | 待填写 | `NOT_EXECUTED` |
| 待执行 | EXT-B | 待填写 | 待填写 | 待填写 | 待填写 | `NOT_EXECUTED` |
| 待执行 | EXT-C | 待填写 | 待填写 | 待填写 | 待填写 | `NOT_EXECUTED` |
| 待执行 | EXT-D | 待填写 | 待填写 | 待填写 | 待填写 | `NOT_EXECUTED` |
| 待执行 | EXT-E1 | 待填写 | 待填写 | 待填写 | 待填写 | `NOT_EXECUTED` |
| 待执行 | EXT-E2 | 待填写 | 待填写 | 待填写 | 待填写 | `NOT_EXECUTED` |

### 5.1 2026-08-01 云 Chrome 部分自动化 smoke

该记录是风险降低证据，不是完整 EXT-B 执行记录：**`PARTIAL automated/browser smoke`；
EXT-B 总体仍为 `NOT_EXECUTED`**。

| 字段 | 记录 |
| --- | --- |
| `recordId` | `EXT-B-2026-08-01-CLOUD-PARTIAL-001` |
| 候选 provenance | PR #504 Preview head `a1af890ae9e66745c621d5f424d464b62c5c2121`（merged main commit `70edce0bbe96ac88483cf380f6932aa7c653d735`）；PR #507 Preview head `eab858000fec1bd1c6436c08d9900a6889ff73cc`（merged main commit `a43b323bb14678990cdcb4111c3969cf5fc66f76`） |
| URL | baseline `https://my-first-app-git-agent-sync-mino-fbe8b4-my-first-app-s-projects.vercel.app/learn`；Preview `https://my-first-app-git-agent-course-li-d323c2-my-first-app-s-projects.vercel.app/learn` |
| 环境 | ChatGPT cloud browser／Chrome，2026-08-01；Chrome 精确版本、OS 与 viewport 未采集，因此不能形成完整 EXT-B 环境证据 |
| 状态 | `PARTIAL automated/browser smoke`；EXT-B 保持 `NOT_EXECUTED` |
| 结论边界 | 只证明下列云浏览器 UI 路径在所列候选中被观察；不外推到完整跨浏览器、真实音频／麦克风、辅助技术、Android、第三方 MusicXML、教师或用户 QA |

| 检查 | 观察结果 |
| --- | --- |
| PR #504 baseline `/learn` | 2.5 秒时仍处于课程加载状态 |
| PR #507 Preview `/learn` | 初始为 loading；11 秒时显示既有错误 `课程库暂时无法加载，请稍后重试。` |
| 首页模式切换 | 键盘／点击切换通过；刷新后选择保持 |
| 路由渲染 | `/practice`、`/recognize`、`/account` 均可渲染 |

未执行项包括音频／麦克风、文件导入／下载／重开、Chrome 以外浏览器、缩放／焦点／
屏幕阅读器、适用的 20 轮、Android 真机、第三方 MusicXML 软件、独立教师和中文目标用户。
云浏览器扩展或工具自身的 console error 不计为应用错误，也不作为应用通过证据。

### 5.2 2026-08-01 可访问性 DOM 自动预筛

PR #519 在 Quality 中对 canonical registry 的 18 个 Android 初始视图运行 axe WCAG tag DOM 语义预筛；18/18
focused tests 通过。该记录只属于 **`PARTIAL automated risk reduction`**：模拟 DOM 不能
可靠产生布局和 computed color 证据，因此 color-contrast rule 被明确禁用；它也没有运行
真实键盘／焦点路径、屏幕阅读器、缩放／reflow、浏览器、WebView 或 Android 设备。

PR #519 的 CI 证据没有形成具备独立 recordId、完整执行环境和原始证据字段的 EXT-A 正式记录，因此不改变 EXT-A 状态。EXT-A 与可访问性外部 QA 继续保持 `NOT_EXECUTED`，不得把 axe 零 finding 写成 WCAG
通过、人工审计通过或目标用户可用性通过。若后续执行真实辅助技术／设备验证，仍必须按
本模板另建包含候选 commit、工具／设备版本、步骤、原始证据与 finding 闭环的记录。

## 6. 当前载体与真实缺口

- P104 JSON／validator、真实人声本地元数据约定和 P119d candidate／worksheet／approval／
  review／finding 模板继续作为专项结构化载体；不得复制一套平行 schema。
- Android 钢琴手测协议可承载 P107–P115 的真机步骤，旧 OPPO PHY110 记录只证明当时
  一台设备的有限主观结果，不是当前候选或三档矩阵。
- 本模板补齐跨 S3 浏览器／Android／第三方 MusicXML、BLE MIDI、正式可访问性与目标
  用户证据的统一最小字段；具体执行记录仍须绑定当时的冻结候选和 acceptance。
- 任何状态更新必须同步 `docs/final-release-status-matrix.md` 和适用 acceptance；未执行、
  证据不可访问或存在阻塞 finding 时，不得写成 `PASS`。
