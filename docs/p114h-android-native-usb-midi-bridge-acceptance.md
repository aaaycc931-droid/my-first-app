# P114h — Android 原生 USB MIDI Bridge 验收标准

状态：**ACTIVE design / implementation candidate**

QA level recommendation：**strict**

## 1. 当前检查点与切片目标

P114g 已通过 PR #373 合并，当前 `main` 为 `3d8486a1980cba534872614b384e81ee97c41103`。P114g 已冻结 `musical-time-v1`、`note-event-v1` 与 `practice-target-v1`，并迁移项目原创确认谱面和屏幕钢琴活动作为真实使用者；它明确没有把 Web MIDI 冒充 USB 或 BLE。

P114h 的唯一硬件目标是建立 Android 原生 USB MIDI bridge，使一个经 Android 原生 API 验证为 `MidiDeviceInfo.TYPE_USB` 的设备输出端口，可以在用户明确连接后产生：

```text
Android MIDI bytes
→ 原生流式解析
→ note-event-v1
→ 当前 USB MIDI Activity attempt
→ usb-midi ActivityAnswer
→ 非评分检查
```

首个真实练习继续复用 P114g 的项目原创、已确认、有序钢琴目标。P114h 不扩展题库，不实现 BLE MIDI，不改变正式评分边界，也不把 Android 模拟器、虚拟 MIDI service、Web MIDI 端口或设备名称当作实体 USB 证据。

## 2. USB 传输证明与诚实来源

只有同时满足以下条件，事件来源才可写为：

```ts
{
  producer: "android-midi",
  transport: "usb",
  verification: "android-device-type",
  deviceSessionId: "当前打开会话的非持久标识"
}
```

1. 设备来自 Android `MidiManager`；
2. `MidiDeviceInfo.getType()` 的真实返回值为 `MidiDeviceInfo.TYPE_USB`；
3. 当前设备与用户显式选择并成功打开的 device session 一致；
4. 当前事件来自用户显式选择并成功打开的设备输出端口；
5. connection generation 仍是当前 generation。

以下信息都不能证明 USB 传输：

- Web MIDI `requestMIDIAccess()`；
- 端口 id、设备 id、设备名或 manufacturer 字符串；
- 名称中出现“USB”“OTG”或某个键盘型号；
- JavaScript mock、JVM fake、Android 虚拟 MIDI device/service；
- 用户手工选择“这是 USB”标签。

Web MIDI 事件必须继续规范化为 `producer: "web-midi"`、`transport: "unknown"`、`verification: "unverified"`。`TYPE_BLUETOOTH`、`TYPE_VIRTUAL` 或其他非 `TYPE_USB` 设备不得进入 P114h 的 `usb-midi` answer。

## 3. 无虚构权限与显式连接原则

P114h 不得虚构 Android 平台不存在的危险运行时权限。

- 不为 MIDI 能力编造或展示不存在的“USB MIDI 危险权限”；
- 不因为需要 USB host 就声称用户已授予麦克风、蓝牙、网络或文件权限；
- 若实现需要声明 USB host feature，必须保持 `required="false"`，没有 OTG 的设备仍可安装并使用屏幕钢琴；
- 不得为本切片增加 `INTERNET`、蓝牙扫描、蓝牙连接或位置权限；
- 不使用广泛 USB intent/device filter 造成插入设备即启动、即打开或静默连接；
- 若 Android、OEM 或 USB 系统路径展示授权/确认 UI，必须由用户点击“连接所选设备”直接触发；取消或拒绝必须 fail closed。

只读注册 `MidiManager.DeviceCallback` 或刷新设备清单不等于用户已授权、设备已打开或 Activity 已开始。它可以用于更新“可用设备”状态，但不得自动选择设备、自动打开端口、自动发声、自动开始练习或自动恢复旧连接。

必须分离以下三个动作：

1. 查看 / 刷新可用 USB MIDI 设备；
2. 明确选择设备与端口，并点击连接；
3. 明确开始 USB MIDI 跟弹 Activity。

任何一步都不能静默触发下一步。

## 4. 设备与端口枚举

设备清单必须：

- 只把 Android 原生 `TYPE_USB` 设备标记为“已由 Android 验证的 USB MIDI”；
- 为无名称设备提供简体中文 fallback；
- 不显示或持久化硬件序列号；
- 不把 Android 临时 device id 当作跨重启稳定硬件身份；
- 明确显示连接状态、打开失败和设备已移除状态。

用户必须显式选择 device 和 port。对于外部 MIDI 键盘，应用要接收设备发送的数据，应打开 `MidiDeviceInfo.PortInfo.TYPE_OUTPUT` 对应的输出端口。用户文案应写为“设备输出端口（应用接收）”，不能把设备 input port 与应用接收方向混淆。

无 USB 设备、设备没有可接收的输出端口、端口忙、打开失败或设备在打开期间消失时：

- 不生成 native MIDI session；
- 不生成 `android-midi` 事件；
- 不生成 `usb-midi` answer；
- 显示简体中文恢复说明；
- 屏幕钢琴、音色、谱面学习和其他本地练习继续可用。

每次成功打开必须生成新的、仅当前连接生命周期有效的 `deviceSessionId`。该 id 只用于隔离事件与迟到回调，不得作为硬件指纹或跨会话持久标识。

## 5. 原生 MIDI 字节解析

Android `MidiReceiver.onSend(byte[], offset, count, timestamp)` 可能一次携带半条、一条或多条 MIDI 消息。原生解析器必须是流式解析器，并覆盖：

- 一条消息跨多个 callback 拆分；
- 一个 callback 中包含多条消息；
- 非零 `offset` 与受限 `count`；
- running status；
- 穿插 MIDI realtime byte 时不破坏当前 channel message；
- 无效、截断或不支持消息 fail closed；
- SysEx、system common 和本切片不支持的消息不进入 Activity，也不上传。

P114h 最小支持：

| MIDI 输入 | `NoteEventV1` | Activity 作用 |
| --- | --- | --- |
| `0x9n note velocity`，velocity > 0 | `note-on` | 当前 USB Activity 接受时追加一个音符 |
| `0x9n note 0` | `note-off` | 释放声音，不追加答案 |
| `0x8n note velocity` | `note-off` | 释放声音，不追加答案 |
| `0xBn 64 value` | `sustain` | 更新延音，不追加答案 |
| 其他 CC | 当前切片忽略 | 不追加答案 |
| SysEx / system common | 当前切片忽略 | 不追加答案 |

音符与原始值必须位于 0–127。velocity 规范化到 0–1；零 velocity 必须转为 note-off。内部 channel 固定为 0–15，用户界面需要显示时可转换为 1–16。CC64 value 规范化到 0–1，值大于等于 64 表示 sustain down。

每个事件必须有单调递增的 sequence、稳定 event id，以及同一 connection origin 下的 `monotonic-ms`。优先使用 Android MIDI timestamp；timestamp 不可用时使用 `SystemClock.elapsedRealtimeNanos()`。时间倒退、非法值或旧 generation 数据不得重排或污染当前答案。

## 6. Native bridge 与 Web 边界

原生到 Web 的载荷必须是固定版本、类型化、可校验的数据对象。不得把设备名、厂商名、端口名或原始 MIDI bytes 拼进 `evaluateJavascript` 字符串。

Web 侧必须再次验证：

- schema version；
- event id、sequence 与 monotonic origin；
- producer / transport / verification 三元组；
- deviceSessionId 与当前连接一致；
- device / port / connection generation 一致；
- note、velocity、channel 与 sustain 值合法。

任何校验失败都必须丢弃事件。原生 bridge 不上传设备信息、MIDI 事件或 Activity evidence，也不把它们写入日志、localStorage、IndexedDB、账号数据库或云端。

## 7. USB MIDI Activity 生命周期

P114h 必须提供独立、显式的“开始 USB MIDI 跟弹”。连接设备不自动开始 Activity；开始 Activity 也不自动请求授权、打开设备或重连。

只有满足以下条件的 `note-on` 才能进入 `{ mode: "usb-midi", noteIds }`：

- 当前 Activity 正在接受输入；
- Activity target、attempt 与 connection snapshot 未变化；
- producer 是 `android-midi`；
- transport 是 `usb`；
- verification 是 `android-device-type`；
- deviceSessionId、device、port 与 generation 均匹配；
- 事件不是 checked 后的迟到事件。

屏幕琴键、电脑键盘、Web MIDI、BLE、虚拟 MIDI、谱面自动播放、已保存演奏回放和压力测试不得进入 USB answer。USB 事件也不得污染现有 `piano` answer。

活动继续使用项目原创、已确认的有序音符目标：

- 重复音保持每次出现的位置；
- 空输入或部分输入只能返回证据不足；
- 数量或顺序不同返回有差异；
- 完整有序一致返回一致；
- 所有结果保持 `non-scoring`；
- 用户必须显式检查才进入 checked；
- checked 后输入锁定。

切换 device 或 port、所选设备拔出、显式断开、pause、destroy、全局 stop、重置和重试必须清除未完成输入与旧 evidence，并建立边界清楚的新 attempt。普通连接失败发生在未脏 ready 状态时，不应无意义增加 attempt。

## 8. 热插拔和生命周期矩阵

| 场景 | 必须行为 | 禁止行为 |
| --- | --- | --- |
| 插入未选择设备 | 更新可用清单 | 自动授权、选择、打开、发声或开始 Activity |
| 移除未选择设备 | 更新可用清单，当前连接不变 | 清除无关当前 attempt |
| 移除当前设备 | all-notes-off、关闭端口/设备、清 active notes、旧 attempt 失效、显示 fallback | 保留延音、残音、旧答案或静默重连 |
| 重新插入 | 显示为可用的新连接候选 | 沿用旧 deviceSessionId、端口或答案 |
| 切换设备 | 先关闭旧连接，再显式打开新连接；生成新 session 和新 attempt | 混合两个设备事件 |
| 切换端口 | 释放旧端口所有音与踏板；生成新 generation 和新 attempt | 旧端口迟到事件写入新答案 |
| `onPause` / 锁屏 / pagehide | all-notes-off，关闭 receiver、port 和 device，停止 Activity 输入 | 后台继续采集或保持音符 |
| `onResume` | 回到 disconnected / ready，可由用户刷新和重连 | 自动重新打开、自动继续旧 attempt |
| `onDestroy` / Web 卸载 | 注销 DeviceCallback 与 bridge listener，幂等关闭全部资源 | 晚到 open callback 重新绑定 |

关闭顺序必须幂等。无论关闭来自设备回调、用户动作、Activity lifecycle 还是异常路径，同一个 port/device 只关闭一次；晚到的 open callback 必须识别旧 generation 并立即关闭。

## 9. 屏幕钢琴 fallback

P114h 是条件增强能力。以下任何状态都不能阻断屏幕钢琴：

- 设备没有 USB host；
- 没有 USB MIDI 设备；
- 用户取消或拒绝平台确认；
- 设备或端口打开失败；
- 设备忙或被其他应用占用；
- 设备拔出；
- bridge 初始化或事件校验失败；
- USB Activity 被重置或停止。

fallback 必须保留本地屏幕钢琴的音域、音色、触控、录制、节拍器、谱面学习和 `piano` Activity。界面不得显示“USB 已连接”或“USB 已验证”，除非当前 native device session 真实满足 TYPE_USB 门槛。

## 10. Strict 自动测试矩阵

### 10.1 纯 JVM parser

必须覆盖：

- note-on、显式 note-off、note-on velocity 0；
- velocity 0、1、63、64、127；
- channel 0–15；
- CC64 0、63、64、127；
- 非零 offset、受限 count；
- 一包多消息、消息拆包、running status；
- realtime byte 穿插；
- 无效状态、短消息、不支持 CC、SysEx 与 system common；
- unsigned byte 边界。

### 10.2 JVM native coordinator

用可注入的 MidiManager / device / port facade fake 覆盖：

- 仅 TYPE_USB 可进入候选清单；
- 只打开用户选中的 TYPE_OUTPUT port；
- 无用户连接动作时不 open；
- 空设备、空端口、取消、拒绝、设备忙、打开失败；
- deviceSessionId 与 generation；
- attach / detach、切 device、切 port；
- pause / resume / destroy；
- all-notes-off 与 close exactly once；
- 迟到 open callback 和旧 receiver callback；
- resume / reattach 不自动重连。

### 10.3 Android instrumentation

可以验证：

- native bridge 注册与注销；
- MainActivity pause / resume / destroy 协调；
- 类型化 payload 与 Web 事件分发；
- 注入 facade 下的 TYPE_USB / 非 USB UI 状态；
- 虚拟 MidiDeviceService 必须保持 virtual，不得被算作 USB。

Instrumentation 或 emulator 无法证明实体 USB 传输。使用 fake 返回 TYPE_USB 只能证明分支和资源协调逻辑，测试报告必须写“simulated TYPE_USB”。

### 10.4 TypeScript focused tests

必须覆盖：

- Android MIDI `usb` 只接受 `android-device-type` verification；
- Web MIDI 强制回到 `unknown/unverified`；
- deviceSessionId、sequence、origin 与 generation 校验；
- native payload 非法字段拒绝；
- 只有 verified USB note-on 转换为 noteIds；
- screen、computer keyboard、Web MIDI、BLE、virtual 和 playback 排除；
- ordered / repeated notes；
- Activity revision、checked lock、restart 与 stale event。

### 10.5 真实挂载行为

必须覆盖：

- 初始不连接、不授权、不自动开始 Activity；
- 设备与端口显式选择；
- ready → answering → 显式 checked；
- 屏幕钢琴 fallback；
- 无设备、打开失败和平台取消；
- 切设备、切端口、拔出、pause、resume、destroy；
- 迟到 open / event；
- checked 后事件锁定；
- USB 与 screen `piano` answer 互不污染；
- 不持久化设备或 Activity evidence。

### 10.6 Android 静态与 CI

必须覆盖：

- minSdk 24 下 Android MIDI API 可编译；
- USB host feature 如存在则 `required=false`；
- Manifest 不新增网络、蓝牙或虚构 MIDI 危险权限；
- Gradle JVM tests、instrumentation compile、debug APK build；
- Android bundle validator 与离线边界；
- P106–P114g、钢琴音频、演奏记录、Web MIDI fallback、生命周期和 Activity 回归；
- `npm run check`、依赖审计、`git diff --check`、GitHub `quality` / `android-local` 与 Vercel 门禁。

## 11. 必须由实体 OTG 真机完成的证据

以下项目不能由 JVM fake、emulator、虚拟 MIDI service、Web MIDI mock、源码审查或 CI 替代：

1. 支持 OTG 的 Android 真机通过 `MidiManager` 真实枚举键盘，且 `getType()` 返回 `TYPE_USB`；
2. 平台实际授权 / 确认、取消、再次连接和 OEM 差异；
3. 实体设备和真实输出端口清单；
4. 实际 note-on/off、最轻与最重 velocity、重复音、和弦与多指；
5. 至少 channel 1 及设备可配置时的另一 channel；
6. CC64 值在 63 / 64 边界及真实延音踏板抬起 / 踩下；
7. 拔线、快速反复插拔、重新插入；
8. 至少两设备或多端口条件下的显式切换；
9. 锁屏、前后台、返回退出、Activity destroy / 进程重建后的资源释放；
10. resume 后不自动重连，旧音符、踏板、答案和 attempt 不复活；
11. OTG 供电、转接器 / Hub、低端机性能、延迟、抖动和长时间演奏稳定性；
12. 无网络时已安装 APK 的完整连接、演奏和非评分检查。

至少应在项目三档 Android 设备中具备 OTG 条件的设备执行并记录：设备档位、Android 版本、键盘 / Hub 类型、APK version、commit、端口、步骤、结果和限制。若设备不支持 OTG、系统未枚举或键盘不兼容，应记录为 `UNSUPPORTED` / `BLOCKED`，不能改写为 PASS。

## 12. 隐私、安全与非目标

P114h 不读取或持久化 USB serial，不上传设备身份或 MIDI 事件，不接收 SysEx，不新增云端调用，也不创建正式学习历史。

P114h 不包含：

- BLE MIDI、Web Bluetooth、蓝牙扫描、配对或重连；
- Web MIDI transport 推断；
- 虚拟 / 软件 MIDI Activity；
- 自动设备授权、自动连接、自动重连；
- 后台 MIDI 服务；
- 正式演奏评分、力度评分、节奏评分、百分比、等级或通过 / 失败；
- 新题库、MusicXML 语义扩展、ScoreDocument、五线谱 / 简谱答案；
- 云同步、数据库迁移、伙伴 UI 或生成式反馈。

## 13. 完成声明分层

完成状态必须分层记录：

- 设计和验收冻结：可写 **ACTIVE design / implementation candidate**；
- 自动门禁通过：只能写 **native USB bridge implementation candidate / simulated coordinator PASS**；
- 至少一台实体 OTG + TYPE_USB 完整流程通过：可写 **conditional device PASS**，并附设备证据；
- 三档设备、延迟、热插拔、长时稳定性和专业任务矩阵未完成前，不得写“Android USB MIDI 正式完成”；
- BLE MIDI、Web MIDI USB 证明、正式评分和 P114 整体完成均不能从 P114h 自动继承 PASS。

代码、自动测试、完整仓库门禁、PR、merge commit 和实体 OTG 证据必须分别记录。任何一项缺失时，都不得用另一项替代。
