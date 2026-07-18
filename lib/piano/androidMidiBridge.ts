import { normalizeNoteEventV1, type NoteEventSourceV1, type NoteEventV1 } from "../music/noteEvent";

export const ANDROID_MIDI_BRIDGE_PROTOCOL_VERSION = "android-midi-bridge-v1" as const;

export type AndroidMidiTransport = Extract<NoteEventSourceV1["transport"], "usb" | "ble" | "virtual" | "unknown">;
export type AndroidMidiTransportVerification = Extract<
  NoteEventSourceV1["verification"],
  "android-device-type" | "unverified"
>;

export type AndroidMidiDevice = {
  nativeDeviceId: string;
  name: string;
  manufacturer: string | null;
  outputPorts: number[];
  transport: AndroidMidiTransport;
  verification: AndroidMidiTransportVerification;
};

type PayloadBase = {
  protocolVersion: typeof ANDROID_MIDI_BRIDGE_PROTOCOL_VERSION;
  generation: number;
};

export type AndroidMidiBridgePayload = PayloadBase & (
  | { type: "devices"; devices: AndroidMidiDevice[] }
  | {
    type: "session-started";
    commandId: string;
    nativeDeviceId: string;
    outputPort: number;
    deviceSessionId: string;
    transport: AndroidMidiTransport;
    verification: AndroidMidiTransportVerification;
  }
  | { type: "session-stopped"; deviceSessionId: string; reason: string | null }
  | { type: "device-disconnected"; deviceSessionId: string; reason: string | null }
  | { type: "error"; commandId: string | null; message: string }
  | {
    type: "note-on";
    deviceSessionId: string;
    sequence: number;
    sessionPositionMs: number;
    channel: number;
    note: number;
    velocity: number;
  }
  | {
    type: "note-off";
    deviceSessionId: string;
    sequence: number;
    sessionPositionMs: number;
    channel: number;
    note: number;
  }
  | {
    type: "sustain";
    deviceSessionId: string;
    sequence: number;
    sessionPositionMs: number;
    channel: number;
    value: number;
  }
  | {
    type: "all-notes-off";
    deviceSessionId: string;
    sequence: number;
    sessionPositionMs: number;
    channel: number | null;
  }
);

export type AndroidMidiBridgeStatus =
  | "unavailable"
  | "idle"
  | "discovering"
  | "devices-ready"
  | "selected"
  | "starting"
  | "active"
  | "stopping"
  | "stopped"
  | "error"
  | "disconnected";

type ActiveDeviceSession = {
  nativeDeviceId: string;
  outputPort: number;
  deviceSessionId: string;
  transport: AndroidMidiTransport;
  verification: AndroidMidiTransportVerification;
};

type AttemptBinding = {
  attemptId: string;
  eventOriginId: string;
  deviceSessionId: string;
};

export type AndroidMidiBridgeState = {
  status: AndroidMidiBridgeStatus;
  generation: number;
  devices: AndroidMidiDevice[];
  selectedDeviceId: string | null;
  selectedOutputPort: number | null;
  pendingCommandId: string | null;
  closingDeviceSessionId: string | null;
  switchTargetDeviceId: string | null;
  activeSession: ActiveDeviceSession | null;
  seenDeviceSessionIds: string[];
  attemptBinding: AttemptBinding | null;
  lastSequence: number | null;
  error: string | null;
};

export type AndroidMidiBridgeAction =
  | { type: "mark-unavailable" }
  | { type: "request-devices"; generation: number }
  | { type: "select-device"; nativeDeviceId: string }
  | { type: "select-output-port"; outputPort: number }
  | { type: "request-start"; commandId: string }
  | { type: "request-stop"; commandId: string }
  | { type: "switch-device"; nativeDeviceId: string; commandId: string }
  | { type: "suspend" }
  | { type: "resume" }
  | { type: "bind-attempt"; attemptId: string; eventOriginId: string }
  | { type: "unbind-attempt" };

export type AndroidMidiBridgeResult = {
  state: AndroidMidiBridgeState;
  event: NoteEventV1 | null;
  rejection: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const fail = (message: string): never => { throw new Error(message); };
const record = (value: unknown, field: string): Record<string, unknown> => {
  if (!isRecord(value)) throw new Error(`Android MIDI ${field} 必须是对象。`);
  return value;
};
const text = (value: unknown, field: string) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Android MIDI ${field} 必须是非空字符串。`);
  return value.trim();
};
const nullableText = (value: unknown, field: string) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error(`Android MIDI ${field} 必须是字符串或 null。`);
  return value.trim() || null;
};
const integer = (value: unknown, field: string, minimum: number, maximum = Number.MAX_SAFE_INTEGER) => {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    fail(`Android MIDI ${field} 超出允许范围。`);
  }
  return value as number;
};
const unit = (value: unknown, field: string) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Android MIDI ${field} 必须位于 0–1。`);
  }
  return value;
};
const nonNegativeNumber = (value: unknown, field: string) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Android MIDI ${field} 必须是非负有限数。`);
  }
  return value;
};

const parseTransport = (value: unknown): AndroidMidiTransport => {
  if (value === "usb" || value === "ble" || value === "virtual" || value === "unknown") return value;
  return fail("Android MIDI transport 无效。");
};

const parseVerification = (
  value: unknown,
  transport: AndroidMidiTransport,
): AndroidMidiTransportVerification => {
  if (transport === "unknown" && value === "unverified") return value;
  if (transport !== "unknown" && value === "android-device-type") return value;
  return fail("Android MIDI transport 与 verification 不一致。");
};

const parseDevice = (value: unknown): AndroidMidiDevice => {
  const device = record(value, "device");
  const transport = parseTransport(device.transport);
  const rawOutputPorts = device.outputPorts;
  if (!Array.isArray(rawOutputPorts)) throw new Error("Android MIDI outputPorts 必须是数组。");
  const outputPorts = rawOutputPorts.map((port: unknown) => integer(port, "outputPort", 0, 255));
  if (outputPorts.length === 0 || new Set(outputPorts).size !== outputPorts.length) {
    fail("Android MIDI outputPorts 为空或重复。");
  }
  return {
    nativeDeviceId: text(device.nativeDeviceId, "nativeDeviceId"),
    name: text(device.name, "device name"),
    manufacturer: nullableText(device.manufacturer, "manufacturer"),
    outputPorts,
    transport,
    verification: parseVerification(device.verification, transport),
  };
};

export const parseAndroidMidiBridgePayload = (value: unknown): AndroidMidiBridgePayload => {
  const payload = record(value, "payload");
  if (payload.protocolVersion !== ANDROID_MIDI_BRIDGE_PROTOCOL_VERSION) fail("不支持的 Android MIDI bridge 协议版本。");
  const generation = integer(payload.generation, "generation", 0);
  const base: PayloadBase = { protocolVersion: ANDROID_MIDI_BRIDGE_PROTOCOL_VERSION, generation };
  if (payload.type === "devices") {
    if (!Array.isArray(payload.devices)) throw new Error("Android MIDI devices 必须是数组。");
    const devices = payload.devices.map(parseDevice);
    if (new Set(devices.map((device) => device.nativeDeviceId)).size !== devices.length) {
      fail("Android MIDI devices 含重复 nativeDeviceId。");
    }
    return { ...base, type: "devices", devices };
  }
  if (payload.type === "session-started") {
    const transport = parseTransport(payload.transport);
    return {
      ...base,
      type: "session-started",
      commandId: text(payload.commandId, "commandId"),
      nativeDeviceId: text(payload.nativeDeviceId, "nativeDeviceId"),
      outputPort: integer(payload.outputPort, "outputPort", 0, 255),
      deviceSessionId: text(payload.deviceSessionId, "deviceSessionId"),
      transport,
      verification: parseVerification(payload.verification, transport),
    };
  }
  if (payload.type === "session-stopped" || payload.type === "device-disconnected") {
    return {
      ...base,
      type: payload.type,
      deviceSessionId: text(payload.deviceSessionId, "deviceSessionId"),
      reason: nullableText(payload.reason, "reason"),
    };
  }
  if (payload.type === "error") {
    return {
      ...base,
      type: "error",
      commandId: nullableText(payload.commandId, "commandId"),
      message: text(payload.message, "error message"),
    };
  }
  const messageTypes = ["note-on", "note-off", "sustain", "all-notes-off"];
  if (!messageTypes.includes(String(payload.type))) fail("Android MIDI payload type 无效。");
  const messageBase = {
    ...base,
    deviceSessionId: text(payload.deviceSessionId, "deviceSessionId"),
    sequence: integer(payload.sequence, "sequence", 0),
    sessionPositionMs: nonNegativeNumber(payload.sessionPositionMs, "sessionPositionMs"),
  };
  const channel = payload.channel === null && payload.type === "all-notes-off"
    ? null
    : integer(payload.channel, "channel", 0, 15);
  if (payload.type === "note-on") return {
    ...messageBase,
    type: "note-on",
    channel: channel as number,
    note: integer(payload.note, "note", 0, 127),
    velocity: unit(payload.velocity, "velocity"),
  };
  if (payload.type === "note-off") return {
    ...messageBase,
    type: "note-off",
    channel: channel as number,
    note: integer(payload.note, "note", 0, 127),
  };
  if (payload.type === "sustain") return {
    ...messageBase,
    type: "sustain",
    channel: channel as number,
    value: unit(payload.value, "sustain value"),
  };
  return { ...messageBase, type: "all-notes-off", channel };
};

export const createAndroidMidiBridgeState = (): AndroidMidiBridgeState => ({
  status: "idle",
  generation: 0,
  devices: [],
  selectedDeviceId: null,
  selectedOutputPort: null,
  pendingCommandId: null,
  closingDeviceSessionId: null,
  switchTargetDeviceId: null,
  activeSession: null,
  seenDeviceSessionIds: [],
  attemptBinding: null,
  lastSequence: null,
  error: null,
});

const invalidateSession = (
  state: AndroidMidiBridgeState,
  status: AndroidMidiBridgeStatus,
  pendingCommandId: string | null = null,
): AndroidMidiBridgeState => ({
  ...state,
  status,
  pendingCommandId,
  closingDeviceSessionId: null,
  switchTargetDeviceId: null,
  activeSession: null,
  attemptBinding: null,
  lastSequence: null,
});

export const reduceAndroidMidiBridge = (
  state: AndroidMidiBridgeState,
  action: AndroidMidiBridgeAction,
): AndroidMidiBridgeState => {
  if (action.type === "mark-unavailable") return {
    ...invalidateSession(state, "unavailable"), devices: [], selectedDeviceId: null, selectedOutputPort: null,
  };
  if (action.type === "request-devices") {
    if (
      state.activeSession
      || state.status === "starting"
      || state.status === "stopping"
      || !Number.isSafeInteger(action.generation)
      || action.generation <= state.generation
    ) return state;
    return {
      ...invalidateSession(state, "discovering"),
      generation: action.generation,
      devices: [],
      selectedDeviceId: null,
      selectedOutputPort: null,
      error: null,
    };
  }
  if (action.type === "select-device") {
    if (state.activeSession || !state.devices.some((device) => device.nativeDeviceId === action.nativeDeviceId)) return state;
    return {
      ...state,
      status: "devices-ready",
      selectedDeviceId: action.nativeDeviceId,
      selectedOutputPort: null,
      error: null,
    };
  }
  if (action.type === "select-output-port") {
    const selectedDevice = state.devices.find((device) => device.nativeDeviceId === state.selectedDeviceId);
    if (state.activeSession || !selectedDevice?.outputPorts.includes(action.outputPort)) return state;
    return { ...state, status: "selected", selectedOutputPort: action.outputPort, error: null };
  }
  if (action.type === "request-start") {
    if (
      state.status !== "selected"
      || !state.selectedDeviceId
      || state.selectedOutputPort === null
      || !action.commandId.trim()
    ) return state;
    return {
      ...state,
      status: "starting",
      generation: state.generation + 1,
      pendingCommandId: action.commandId.trim(),
      error: null,
    };
  }
  if (action.type === "request-stop") {
    if (!state.activeSession || !action.commandId.trim()) return state;
    const deviceSessionId = state.activeSession.deviceSessionId;
    return {
      ...invalidateSession(state, "stopping", action.commandId.trim()),
      closingDeviceSessionId: deviceSessionId,
    };
  }
  if (action.type === "switch-device") {
    if (
      !state.activeSession
      || !action.commandId.trim()
      || !state.devices.some((device) => device.nativeDeviceId === action.nativeDeviceId)
    ) return state;
    const deviceSessionId = state.activeSession.deviceSessionId;
    return {
      ...invalidateSession(state, "stopping", action.commandId.trim()),
      closingDeviceSessionId: deviceSessionId,
      switchTargetDeviceId: action.nativeDeviceId,
      selectedOutputPort: null,
      error: null,
    };
  }
  if (action.type === "suspend") return invalidateSession(state, "stopped");
  if (action.type === "resume") return state;
  if (action.type === "bind-attempt") {
    if (!state.activeSession || !action.attemptId.trim() || !action.eventOriginId.trim()) return state;
    return {
      ...state,
      attemptBinding: {
        attemptId: action.attemptId.trim(),
        eventOriginId: action.eventOriginId.trim(),
        deviceSessionId: state.activeSession.deviceSessionId,
      },
      lastSequence: null,
    };
  }
  return { ...state, attemptBinding: null, lastSequence: null };
};

const reject = (state: AndroidMidiBridgeState, rejection: string): AndroidMidiBridgeResult => ({
  state, event: null, rejection,
});

export const applyAndroidMidiBridgePayload = (
  state: AndroidMidiBridgeState,
  unknownPayload: unknown,
): AndroidMidiBridgeResult => {
  let payload: AndroidMidiBridgePayload;
  try {
    payload = parseAndroidMidiBridgePayload(unknownPayload);
  } catch (error) {
    return reject(state, error instanceof Error ? error.message : "Android MIDI payload 无效。");
  }
  if (payload.generation !== state.generation) return reject(state, "Android MIDI generation 不匹配。");
  if (payload.type === "devices") {
    if (state.status !== "discovering") return reject(state, "当前未请求 Android MIDI 设备列表。");
    return {
      state: { ...state, status: "devices-ready", devices: payload.devices, selectedDeviceId: null },
      event: null,
      rejection: null,
    };
  }
  if (payload.type === "session-started") {
    const selectedDevice = state.devices.find((device) => device.nativeDeviceId === state.selectedDeviceId);
    if (
      state.status !== "starting"
      || payload.commandId !== state.pendingCommandId
      || payload.nativeDeviceId !== state.selectedDeviceId
      || payload.outputPort !== state.selectedOutputPort
      || !selectedDevice
      || payload.transport !== selectedDevice.transport
      || payload.verification !== selectedDevice.verification
      || state.seenDeviceSessionIds.includes(payload.deviceSessionId)
    ) return reject(state, "Android MIDI session-started 与当前显式开始请求不匹配。");
    return {
      state: {
        ...state,
        status: "active",
        pendingCommandId: null,
        closingDeviceSessionId: null,
        switchTargetDeviceId: null,
        activeSession: {
          nativeDeviceId: payload.nativeDeviceId,
          outputPort: payload.outputPort,
          deviceSessionId: payload.deviceSessionId,
          transport: payload.transport,
          verification: payload.verification,
        },
        seenDeviceSessionIds: [...state.seenDeviceSessionIds, payload.deviceSessionId],
        attemptBinding: null,
        lastSequence: null,
        error: null,
      },
      event: null,
      rejection: null,
    };
  }
  if (payload.type === "session-stopped" || payload.type === "device-disconnected") {
    const matchesActive = payload.deviceSessionId === state.activeSession?.deviceSessionId;
    const matchesClosing = payload.deviceSessionId === state.closingDeviceSessionId;
    if (!matchesActive && !matchesClosing) {
      return reject(state, "Android MIDI 停止或断连事件不属于当前设备会话。");
    }
    if (payload.type === "session-stopped" && matchesClosing && state.switchTargetDeviceId) {
      return {
        state: {
          ...invalidateSession(state, "selected"),
          selectedDeviceId: state.switchTargetDeviceId,
          error: null,
        },
        event: null,
        rejection: null,
      };
    }
    return {
      state: invalidateSession(state, payload.type === "session-stopped" ? "stopped" : "disconnected"),
      event: null,
      rejection: null,
    };
  }
  if (payload.type === "error") {
    if (payload.commandId && payload.commandId !== state.pendingCommandId) {
      return reject(state, "Android MIDI error 不属于当前命令。");
    }
    return {
      state: { ...invalidateSession(state, "error"), error: payload.message },
      event: null,
      rejection: null,
    };
  }
  const session = state.activeSession;
  const binding = state.attemptBinding;
  if (state.status !== "active" || !session || !binding) {
    return reject(state, "Android MIDI 当前没有已绑定尝试的活动设备会话。");
  }
  if (payload.deviceSessionId !== session.deviceSessionId || payload.deviceSessionId !== binding.deviceSessionId) {
    return reject(state, "Android MIDI deviceSessionId 不匹配。");
  }
  if (state.lastSequence !== null && payload.sequence <= state.lastSequence) {
    return reject(state, "Android MIDI sequence 重复或倒序。");
  }
  const eventBase = {
    schemaVersion: "note-event-v1" as const,
    eventId: `${binding.eventOriginId}:${payload.deviceSessionId}:event-${payload.sequence}`,
    sequence: payload.sequence,
    time: {
      schemaVersion: "musical-time-v1" as const,
      timebase: "monotonic-ms" as const,
      originId: `${binding.eventOriginId}:${payload.deviceSessionId}`,
      positionMs: payload.sessionPositionMs,
    },
    source: {
      producer: "android-midi" as const,
      transport: session.transport,
      verification: session.verification,
      deviceSessionId: session.deviceSessionId,
    },
  };
  const event = payload.type === "note-on"
    ? normalizeNoteEventV1({ ...eventBase, type: "note-on", note: payload.note, velocity: payload.velocity, channel: payload.channel })
    : payload.type === "note-off"
      ? normalizeNoteEventV1({ ...eventBase, type: "note-off", note: payload.note, channel: payload.channel })
      : payload.type === "sustain"
        ? normalizeNoteEventV1({ ...eventBase, type: "sustain", down: payload.value >= 64 / 127, value: payload.value, channel: payload.channel })
        : normalizeNoteEventV1({ ...eventBase, type: "all-notes-off", channel: payload.channel });
  return { state: { ...state, lastSequence: payload.sequence }, event, rejection: null };
};
