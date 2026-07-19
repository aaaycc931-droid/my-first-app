import assert from "node:assert/strict";

import {
  ANDROID_MIDI_BRIDGE_PROTOCOL_VERSION,
  applyAndroidMidiBridgePayload,
  createAndroidMidiBridgeState,
  parseAndroidMidiBridgePayload,
  reduceAndroidMidiBridge,
  type AndroidMidiBridgeState,
} from "../lib/piano/androidMidiBridge";

const envelope = { protocolVersion: ANDROID_MIDI_BRIDGE_PROTOCOL_VERSION, generation: 1 };
const activeEnvelope = { ...envelope, generation: 2 };
const usbDevice = {
  nativeDeviceId: "device-usb-1",
  name: "USB keyboard",
  manufacturer: null,
  outputPorts: [0, 2],
  transport: "usb",
  verification: "android-device-type",
} as const;
const bleDevice = {
  nativeDeviceId: "device-ble-1",
  name: "BLE keyboard",
  manufacturer: null,
  outputPorts: [1],
  transport: "ble",
  verification: "android-device-type",
} as const;

let state = createAndroidMidiBridgeState();
state = reduceAndroidMidiBridge(state, { type: "request-devices", generation: 1 });
let result = applyAndroidMidiBridgePayload(state, { ...envelope, type: "devices", devices: [usbDevice] });
assert.equal(result.rejection, null);
state = result.state;
assert.equal(state.status, "devices-ready");
assert.equal(state.selectedDeviceId, null, "设备发现不得自动选择首个设备");
assert.equal(state.activeSession, null, "设备发现不得自动开始输入");

const unchangedOnResume = reduceAndroidMidiBridge(state, { type: "resume" });
assert.deepEqual(unchangedOnResume, state, "resume 不得自动选择或启动设备");
state = reduceAndroidMidiBridge(state, { type: "select-device", nativeDeviceId: usbDevice.nativeDeviceId });
assert.equal(state.status, "devices-ready", "选择设备后仍须显式选择设备输出端口");
state = reduceAndroidMidiBridge(state, { type: "select-output-port", outputPort: 2 });
assert.equal(state.status, "selected");
state = reduceAndroidMidiBridge(state, { type: "request-start", commandId: "start-1" });
assert.equal(state.status, "starting");
assert.equal(state.generation, 2);

result = applyAndroidMidiBridgePayload(state, {
  ...activeEnvelope,
  type: "session-started",
  commandId: "stale-start",
  nativeDeviceId: usbDevice.nativeDeviceId,
  outputPort: 2,
  deviceSessionId: "session-stale",
  transport: "usb",
  verification: "android-device-type",
});
assert.match(result.rejection ?? "", /显式开始请求不匹配/);
assert.equal(result.state.status, "starting");

result = applyAndroidMidiBridgePayload(state, {
  ...activeEnvelope,
  type: "session-started",
  commandId: "start-1",
  nativeDeviceId: usbDevice.nativeDeviceId,
  outputPort: 2,
  deviceSessionId: "session-1",
  transport: "usb",
  verification: "android-device-type",
});
assert.equal(result.rejection, null);
state = result.state;
assert.equal(state.status, "active");
assert.equal(state.attemptBinding, null, "活动设备会话不得自动绑定练习尝试");

const note = (overrides: Record<string, unknown> = {}) => ({
  ...activeEnvelope,
  type: "note-on",
  deviceSessionId: "session-1",
  sequence: 0,
  sessionPositionMs: 12.5,
  channel: 0,
  note: 60,
  velocity: 1,
  ...overrides,
});
result = applyAndroidMidiBridgePayload(state, note());
assert.match(result.rejection ?? "", /已绑定尝试/);

state = reduceAndroidMidiBridge(state, {
  type: "bind-attempt",
  attemptId: "attempt-1",
  eventOriginId: "piano:p114h:attempt-1",
});
result = applyAndroidMidiBridgePayload(state, note());
assert.equal(result.rejection, null);
assert.equal(result.event?.source.producer, "android-midi");
assert.deepEqual(result.event?.source, {
  producer: "android-midi",
  transport: "usb",
  verification: "android-device-type",
  deviceSessionId: "session-1",
});
assert.equal(result.event?.time.positionMs, 12.5);
assert.match(result.event?.eventId ?? "", /attempt-1:session-1:event-0$/);
state = result.state;

result = applyAndroidMidiBridgePayload(state, note());
assert.match(result.rejection ?? "", /重复或倒序/);
result = applyAndroidMidiBridgePayload(state, note({ sequence: 1, deviceSessionId: "other-session" }));
assert.match(result.rejection ?? "", /deviceSessionId 不匹配/);
result = applyAndroidMidiBridgePayload(state, note({ sequence: 1, generation: 3 }));
assert.match(result.rejection ?? "", /generation 不匹配/);

result = applyAndroidMidiBridgePayload(state, note({ sequence: 1, velocity: 0 }));
assert.equal(result.event?.type, "note-off", "零力度 note-on 必须规范化为 note-off");
state = result.state;
result = applyAndroidMidiBridgePayload(state, {
  ...activeEnvelope,
  type: "sustain",
  deviceSessionId: "session-1",
  sequence: 2,
  sessionPositionMs: 20,
  channel: 15,
  value: 64 / 127,
});
assert.equal(result.event?.type, "sustain");
if (result.event?.type !== "sustain") throw new Error("sustain narrowing failed");
assert.equal(result.event.down, true);
state = result.state;

assert.throws(() => parseAndroidMidiBridgePayload(note({ channel: 16 })), /channel/);
assert.throws(() => parseAndroidMidiBridgePayload(note({ protocolVersion: "future" })), /协议版本/);
assert.throws(() => parseAndroidMidiBridgePayload({
  ...envelope,
  type: "session-started",
  commandId: "x",
  nativeDeviceId: "x",
  outputPort: 0,
  deviceSessionId: "x",
  transport: "ble",
  verification: "unverified",
}), /不一致/);
assert.throws(() => parseAndroidMidiBridgePayload({
  ...envelope,
  type: "devices",
  devices: [usbDevice, usbDevice],
}), /重复/);

state = reduceAndroidMidiBridge(state, { type: "request-stop", commandId: "stop-1" });
assert.equal(state.status, "stopping");
assert.equal(state.activeSession, null, "stop 请求必须立即 fail-closed invalidate session");
assert.equal(state.attemptBinding, null);
result = applyAndroidMidiBridgePayload(state, note({ sequence: 3 }));
assert.match(result.rejection ?? "", /活动设备会话/);
result = applyAndroidMidiBridgePayload(state, {
  ...activeEnvelope,
  type: "session-stopped",
  deviceSessionId: "session-1",
  reason: "user-stop",
});
assert.equal(result.rejection, null);
assert.equal(result.state.status, "stopped");
state = reduceAndroidMidiBridge(result.state, { type: "select-device", nativeDeviceId: usbDevice.nativeDeviceId });
state = reduceAndroidMidiBridge(state, { type: "select-output-port", outputPort: 2 });
state = reduceAndroidMidiBridge(state, { type: "request-start", commandId: "start-reconnect" });
const reconnectEnvelope = { ...envelope, generation: 3 };
result = applyAndroidMidiBridgePayload(state, {
  ...reconnectEnvelope,
  type: "session-started",
  commandId: "start-reconnect",
  nativeDeviceId: usbDevice.nativeDeviceId,
  outputPort: 2,
  deviceSessionId: "session-1",
  transport: "usb",
  verification: "android-device-type",
});
assert.match(result.rejection ?? "", /显式开始请求不匹配/, "重新开始不得复用旧 deviceSessionId");
result = applyAndroidMidiBridgePayload(state, {
  ...reconnectEnvelope,
  type: "session-started",
  commandId: "start-reconnect",
  nativeDeviceId: usbDevice.nativeDeviceId,
  outputPort: 2,
  deviceSessionId: "session-reconnect-new",
  transport: "usb",
  verification: "android-device-type",
});
assert.equal(result.rejection, null);
assert.equal(result.state.activeSession?.deviceSessionId, "session-reconnect-new");

const buildActiveState = (deviceSessionId: string): AndroidMidiBridgeState => {
  let next = createAndroidMidiBridgeState();
  next = reduceAndroidMidiBridge(next, { type: "request-devices", generation: 1 });
  next = applyAndroidMidiBridgePayload(next, { ...envelope, type: "devices", devices: [usbDevice] }).state;
  next = reduceAndroidMidiBridge(next, { type: "select-device", nativeDeviceId: usbDevice.nativeDeviceId });
  next = reduceAndroidMidiBridge(next, { type: "select-output-port", outputPort: 2 });
  next = reduceAndroidMidiBridge(next, { type: "request-start", commandId: `start-${deviceSessionId}` });
  return applyAndroidMidiBridgePayload(next, {
    ...activeEnvelope,
    type: "session-started",
    commandId: `start-${deviceSessionId}`,
    nativeDeviceId: usbDevice.nativeDeviceId,
    outputPort: 2,
    deviceSessionId,
    transport: "usb",
    verification: "android-device-type",
  }).state;
};

state = buildActiveState("session-2");
state = reduceAndroidMidiBridge(state, { type: "bind-attempt", attemptId: "attempt-2", eventOriginId: "origin-2" });
state = reduceAndroidMidiBridge(state, { type: "suspend" });
assert.equal(state.status, "stopped");
assert.equal(state.activeSession, null);
assert.equal(state.attemptBinding, null);
assert.equal(reduceAndroidMidiBridge(state, { type: "resume" }).status, "stopped");

state = buildActiveState("session-3");
state = reduceAndroidMidiBridge(state, {
  type: "switch-device",
  nativeDeviceId: usbDevice.nativeDeviceId,
  commandId: "switch-stop-3",
});
assert.equal(state.status, "stopping");
assert.equal(state.activeSession, null, "switch 必须 invalidate 当前 session");
assert.equal(
  reduceAndroidMidiBridge(state, { type: "request-start", commandId: "too-early" }).status,
  "stopping",
  "旧 session 停止确认前不得开始新设备",
);
result = applyAndroidMidiBridgePayload(state, {
  ...activeEnvelope,
  type: "session-stopped",
  deviceSessionId: "session-3",
  reason: "device-switch",
});
assert.equal(result.rejection, null);
assert.equal(result.state.status, "selected");
assert.equal(result.state.selectedDeviceId, usbDevice.nativeDeviceId);

state = buildActiveState("session-4");
result = applyAndroidMidiBridgePayload(state, {
  ...activeEnvelope,
  type: "device-disconnected",
  deviceSessionId: "session-4",
  reason: "cable-removed",
});
assert.equal(result.state.status, "disconnected");
assert.equal(result.state.activeSession, null);

let bleState = createAndroidMidiBridgeState();
bleState = reduceAndroidMidiBridge(bleState, { type: "request-devices", generation: 1 });
bleState = applyAndroidMidiBridgePayload(bleState, { ...envelope, type: "devices", devices: [bleDevice] }).state;
bleState = reduceAndroidMidiBridge(bleState, { type: "select-device", nativeDeviceId: bleDevice.nativeDeviceId });
bleState = reduceAndroidMidiBridge(bleState, { type: "select-output-port", outputPort: 1 });
bleState = reduceAndroidMidiBridge(bleState, { type: "request-start", commandId: "start-ble" });
bleState = applyAndroidMidiBridgePayload(bleState, {
  ...activeEnvelope,
  type: "session-started",
  commandId: "start-ble",
  nativeDeviceId: bleDevice.nativeDeviceId,
  outputPort: 1,
  deviceSessionId: "session-ble",
  transport: "ble",
  verification: "android-device-type",
}).state;
bleState = reduceAndroidMidiBridge(bleState, {
  type: "bind-attempt",
  attemptId: "attempt-ble",
  eventOriginId: "piano:p114j:attempt-ble",
});
const bleResult = applyAndroidMidiBridgePayload(bleState, {
  ...activeEnvelope,
  type: "note-on",
  deviceSessionId: "session-ble",
  sequence: 0,
  sessionPositionMs: 8,
  channel: 0,
  note: 64,
  velocity: 0.75,
});
assert.deepEqual(bleResult.event?.source, {
  producer: "android-midi",
  transport: "ble",
  verification: "android-device-type",
  deviceSessionId: "session-ble",
});

console.log("Android MIDI bridge tests passed.");
