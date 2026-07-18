# P114g — 共享音乐事件与练习目标协议验收标准

状态：**ACTIVE / implementation candidate**

QA level recommendation：**strict**

## 1. 目标与当前检查点

P114g 在 P114a–P114f 已有真实活动迁移之后，冻结一组最小、版本化的共享音乐事件与练习目标语义，并让现有项目原创、已确认钢琴跟弹活动成为真实使用者。目标是让屏幕琴键、当前 Web MIDI 管线和后续输入适配可以共享同一种音符事件身份与目标引用，不再由钢琴状态、演奏记录和 Activity 各自复制一套音符序列含义。

P114f 已通过 PR #372 合并，当前 `main` 为 `5006e882676c0ac2c747286efaa34b0423526b3c`。该合并事实不替代 Web/Android 真麦克风、真实人声、三档设备、P104 基准或教育审核。

P114g 是**共享协议和现有真实活动迁移**，不是新增硬件能力的交付声明。尤其是：

- 浏览器 Web MIDI API 返回输入端口，但不能可靠证明其物理传输是 USB、BLE、虚拟端口还是其他实现；
- 设备名称、厂商字符串、端口 id 或测试夹具名称都不能作为 USB 传输证据；
- 因此 Web MIDI 来源只能诚实标记为 Web MIDI / 外部 MIDI，不能自动提交为 `usb-midi` 或 `ble-midi` Activity answer；
- Android 原生 USB MIDI bridge、原生权限、设备枚举、热插拔与生命周期适配留给后续独立切片。

## 2. 共享音乐事件最小边界

P114g 同时冻结 `musical-time-v1` 的最小时间引用：单调毫秒、录音相对毫秒、乐谱 tick 和音频 sample。每个时间值必须携带明确 `originId`；只有 timebase 和 origin 都一致时才可直接比较。没有 tempo map、录音起点或采样率映射时，不得在不同时间域之间猜测转换。

共享音乐事件协议必须至少能无歧义表达当前真实运行时已有的：

- note-on：科学音高或稳定 note id、MIDI 音高、力度、通道和事件来源；
- note-off：与对应输入来源及音高匹配的释放事件；
- sustain：延音踏板开 / 关、控制值及通道；
- all-notes-off：切页面、后台、设备断开、全停或错误恢复时的明确终止边界；
- 当前会话或当前尝试内可比较的单调时间；
- 版本字段和稳定事件身份。

事件来源必须描述产品实际知道的 producer，例如屏幕钢琴、电脑键盘、Web MIDI、后续 Android MIDI 或回放。非 MIDI producer 不得携带设备传输；Web MIDI 必须规范化为 `transport: unknown` / `verification: unverified`；只有后续 Android 原生层从设备类型 API 得到的事实，才可把 USB 或 BLE 标为已验证。播放回放、压力测试、谱面自动播放、节拍器和用户真实输入必须可区分，不能全部折叠成同一个“琴键按下”。

共享事件只表达发生过的音乐输入事实。它不是：

- `ScoreDocument`；
- Activity answer 本身；
- 音频帧或录音；
- 正式评分、通过 / 失败或学习历史；
- 自动持久化格式。

## 3. 共享练习目标最小边界

P114g 的共享练习目标只迁移项目原创、已确认且非空的现有钢琴跟弹目标。目标必须包含：

- 稳定 target id、协议版本与内容版本；
- 来源和确认状态；
- 有序音符目标，保留重复音及其位置；
- 当前切片需要的音域和目标标签；
- `non-scoring` 边界；
- 从目标到现有 ActivityDefinition 的可追溯适配。

目标不能依赖只在某次渲染中生成的随机 id 或时间戳。修改目标内容或版本后，旧答案、旧检查证据和旧尝试引用必须失效。

该最小练习目标不是完整 `ScoreDocument`，也不能冒充正式制谱模型。它不引入 part/staff/voice、多声部、排版、歌词、和弦、调号、撤销/重做或持久化修订。现有手动 notation draft、临时节奏目标和本机 MusicXML 草稿不能因为字段相似就自动转换为 P114g 的确认目标。

## 4. 真实迁移与 Activity 边界

P114g 必须至少迁移一个现有真实使用路径：P110/P114d 的项目原创确认谱面与屏幕钢琴跟弹。迁移后：

1. 用户仍须明确开始当前活动；
2. 只有当前活动允许的屏幕琴键用户输入进入本轮 `piano` answer；
3. 目标音符按顺序比较并保留重复音；
4. 回放、参考谱面自动播放、压力测试、演奏记录回放和非活动输入不得污染答案；
5. 检查仍只产生一致、有差异或证据不足的非评分解释；
6. checked 后锁定，重试、目标变化、移调变化、页面离开和全停清除旧输入并建立清楚的新尝试边界；
7. P114d 现有 `piano` 行为和旧数据保持兼容。

当前 Web MIDI 管线可以迁移为共享音乐事件的真实生产者，以证明共享事件不是空类型；但它不得在 P114g 中被自动计入屏幕 `piano` answer，也不得仅因经过 `requestMIDIAccess` 就改称 `usb-midi` 或 `ble-midi` answer。未来硬件 Activity 适配必须有独立的能力解析、用户选择、生命周期与真机验收。

## 5. 状态、清理与降级

实现必须覆盖：

- 未开始活动时输入不进入答案；
- 输入为空时检查返回证据不足；
- 音符数量不足、过多或顺序不同保留可解释差异；
- note-off、pedal 和 all-notes-off 不被误记为额外 note-on；
- checked 后的迟到事件不能改写结果；
- 重试、停止、移调、设备断开、全局音频停止、后台和卸载会释放活动音并清除未完成输入；
- 不支持 Web MIDI、权限拒绝、空设备或设备断开时，屏幕钢琴活动继续可用并显示简体中文说明；
- 任何事件或目标校验失败都 fail closed，不伪造答案、来源或成绩。

P114g 不自动写入 localStorage、IndexedDB、账号数据库或云端。现有用户主动保存的钢琴演奏记录保持独立，不能被冒充为 Activity answer 或正式学习历史。

## 6. Strict 自动门禁

至少需要：

- focused 共享事件测试：版本、稳定身份、note-on/off、力度、通道、sustain、all-notes-off、来源和非法输入拒绝；
- focused 音乐时间测试：四类 timebase、origin、非负/整数边界、规范化，以及不同 timebase/origin 不得直接比较；
- focused 共享目标测试：确认来源、稳定版本、有序音符、重复音、空目标拒绝和内容变化失效；
- 适配器与 session 测试：真实项目原创目标、`piano` answer、一致 / 有差异 / 证据不足、revision、新尝试和 checked 锁定；
- 屏幕钢琴真实挂载回归：开始、部分输入、完整输入、检查、重试、移调、全停、后台和卸载；
- Web MIDI 回归：显式请求、unsupported、拒绝、空设备、设备切换、断开、迟到权限结果、卸载清理，并确认 Web MIDI 事件不会冒充屏幕答案或 USB/BLE 传输；
- P114a–P114f、钢琴音频、演奏记录、MusicXML 草稿、Android lifecycle 和本地静态包回归；
- `npm run check`、依赖审计、`git diff --check`、GitHub `quality` / `android-local` 与 Vercel 门禁。

自动测试只能证明协议、适配与降级行为。触控、多指、Web MIDI 设备、音频延迟、后台、热插拔和 Android WebView 行为仍需真实设备验证。

## 7. 非目标与后续硬件边界

P114g 不包含：

- `usb-midi` 或 `ble-midi` Activity answer 的交付声明；
- 从 Web MIDI 端口名称推断物理 USB / BLE 传输；
- Android 原生 USB MIDI bridge、原生 BLE MIDI、蓝牙扫描或配对；
- 新 Android USB / 蓝牙权限、原生插件或后台服务；
- 五线谱 / 简谱答案、完整 `ScoreDocument`、正式制谱或 OMR；
- 正式演奏评分、力度评分、节奏评分、百分比、等级或通过 / 失败；
- 云同步、数据库迁移、伙伴 UI 或生成式反馈。

后续 USB MIDI 必须单独验证 Android 原生设备枚举、权限、OTG、力度、通道、踏板、热插拔、后台和错误恢复。BLE MIDI 必须另行决定原生或 Web Bluetooth 技术路线，并覆盖扫描、配对、GATT MIDI 时间戳、重连、权限和隐私。两者均不能由 P114g 自动继承 PASS。

## 8. 完成判定

只有共享事件、共享目标、现有真实钢琴活动迁移、focused tests、完整仓库门禁、PR 和 merge commit 都可核实时，P114g 才能从 implementation candidate 改为已合并。

即使 P114g 合并，以下能力仍必须保持未交付或条件状态，直到各自真机与协议门槛完成：USB MIDI Activity、BLE MIDI Activity、Android 原生 USB bridge、完整 ScoreDocument、五线谱 / 简谱输入、正式评分和 P114 整体完成。
