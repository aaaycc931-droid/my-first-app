# P114j Android 原生 BLE MIDI 活动验收

日期：2026-07-19

状态：implementation candidate
QA level recommendation：**strict**

## 1. 目标

P114j 在 P114h 的 Android 原生 MIDI 会话和 P114g 的 `NoteEventV1` / `PracticeTargetV1` 之上，补齐一个真实 `ble-midi` Activity 路径：

```text
Android 系统 MIDI 服务中已经可见的 TYPE_BLUETOOTH 设备
→ 用户手动查找、选择设备和 TYPE_OUTPUT 端口
→ 用户手动连接
→ NoteEventV1(source.transport = "ble")
→ 用户显式开始当前尝试
→ { mode: "ble-midi", noteIds }
→ 非评分一致 / 有差异 / 证据不足
```

只接受 `MidiDeviceInfo.getType() == TYPE_BLUETOOTH`。设备名称、厂商字符串、Web MIDI 端口或普通蓝牙连接状态均不能证明 BLE MIDI。

## 2. Android 官方 API 边界

Android 官方 `MidiManager` 文档说明：BLE MIDI 设备只有在系统中通过 `openBluetoothDevice()` 打开后，才会作为普通 `MidiDevice` 出现在 MIDI 设备发现结果中。P114j 不扫描附近蓝牙设备、不请求定位、不在应用内配对，也不调用 `openBluetoothDevice()`；因此只列出**已经由 Android 系统 MIDI 服务暴露**的 `TYPE_BLUETOOTH` 端点。

官方参考：

- https://developer.android.com/reference/android/media/midi/MidiManager
- https://developer.android.com/reference/android/media/midi/MidiDeviceInfo

UI 必须明确说明这一限制，不能把“已蓝牙配对”写成“必然可被本应用发现”。完整的应用内 BLE 扫描、用户选择、权限与 `openBluetoothDevice()` 流程属于后续独立切片。

## 3. 用户控制与生命周期

- 默认不查找、不选择、不打开、不发声、不开始练习；
- USB / BLE 切换在活动连接或连接中时禁用；
- 查找、设备选择、输出端口选择、连接、开始跟弹均为独立显式动作；
- 页面卸载、应用暂停、设备移除和用户断开必须清理端口、声音与当前尝试绑定；
- 恢复前台不得自动重连；
- 旧 generation、旧 command、旧 device session、重复/倒序 sequence 和旧 attempt 事件必须拒绝。

## 4. 输入与反馈

- 只有当前已绑定尝试、当前原生设备会话中的 verified BLE `note-on` 进入答案；
- note-off、CC64、all-notes-off 只控制声音/状态，不增加答案音符；
- USB 事件不得进入 BLE 答案，BLE 事件不得进入 USB 答案；
- Web MIDI 始终保持 `transport: "unknown"` / `verification: "unverified"`；
- 结果只表达一致、有差异或证据不足，不产生分数、等级、准确率或通过/失败。

## 5. 降级与隐私

- Web、iOS、无系统 MIDI、无已暴露 BLE MIDI 端点时，屏幕钢琴和 Web MIDI 保持可用；
- 不上传 MIDI 数据、设备信息、练习答案或录音；
- 不持久化设备地址、端口或自动重连信息；
- 不新增蓝牙扫描、定位或附近设备权限。

## 6. 自动验证

- bridge reducer：BLE device/session/source、generation、sequence、attempt 和 stale 防护；
- activity adapter：`ble-midi` definition、USB/BLE/Web 来源隔离；
- mounted behavior：USB/BLE 明确切换、Web 环境禁用原生查找、屏幕钢琴降级；
- Android 静态门禁：`TYPE_USB`、`TYPE_BLUETOOTH`、显式设备/端口/transport、无 callback 自动打开；
- 远端 `android-local`：JUnit、Debug APK 构建、工件校验。

## 7. 不能由自动测试证明

- 实体 Android 手机是否已将某款 BLE MIDI 键盘暴露给系统 MIDI 服务；
- 真实 BLE 延迟、抖动、断连、后台恢复、电量与音频体验；
- 厂商兼容性和教育有效性。

这些证据必须使用真实 BLE MIDI 硬件和 Android 真机单独记录。没有真机证据时只能写“source/CI candidate PASS”。
