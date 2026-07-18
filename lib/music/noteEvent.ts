import {
  MUSICAL_TIME_SCHEMA_VERSION,
  normalizeMusicalTimeV1,
  validateMusicalTimeV1,
  type MonotonicMusicalTimeV1,
} from "./musicalTime";

export const NOTE_EVENT_SCHEMA_VERSION = "note-event-v1" as const;

export type NoteEventProducerV1 =
  | "screen-piano"
  | "computer-keyboard"
  | "web-midi"
  | "android-midi"
  | "playback";

export type NoteEventTransportV1 = "none" | "usb" | "ble" | "virtual" | "unknown";
export type NoteEventTransportVerificationV1 = "not-applicable" | "android-device-type" | "unverified";

export type NoteEventSourceV1 = {
  producer: NoteEventProducerV1;
  transport: NoteEventTransportV1;
  verification: NoteEventTransportVerificationV1;
  deviceSessionId: string | null;
};

type NoteEventBaseV1 = {
  schemaVersion: typeof NOTE_EVENT_SCHEMA_VERSION;
  eventId: string;
  sequence: number;
  time: MonotonicMusicalTimeV1;
  source: NoteEventSourceV1;
};

export type NoteEventV1 = NoteEventBaseV1 & (
  | { type: "note-on"; note: number; velocity: number; channel: number }
  | { type: "note-off"; note: number; channel: number }
  | { type: "sustain"; down: boolean; value: number; channel: number }
  | { type: "all-notes-off"; channel: number | null }
);

const clampInteger = (value: number, minimum: number, maximum: number) =>
  Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, Math.round(value))) : minimum;

const clampUnit = (value: number) => Number.isFinite(value)
  ? Math.min(1, Math.max(0, value))
  : 0;

const normalizeSource = (source: NoteEventSourceV1): NoteEventSourceV1 => {
  if (source.producer === "web-midi") {
    return {
      producer: "web-midi",
      transport: "unknown",
      verification: "unverified",
      deviceSessionId: source.deviceSessionId?.trim() || null,
    };
  }
  if (source.producer === "android-midi") {
    const transport = source.transport === "none" ? "unknown" : source.transport;
    return {
      producer: "android-midi",
      transport,
      verification: transport === "unknown" ? "unverified" : source.verification,
      deviceSessionId: source.deviceSessionId?.trim() || null,
    };
  }
  return {
    producer: source.producer,
    transport: "none",
    verification: "not-applicable",
    deviceSessionId: null,
  };
};

export const validateNoteEventV1 = (event: NoteEventV1): NoteEventV1 => {
  if (event.schemaVersion !== NOTE_EVENT_SCHEMA_VERSION) throw new Error("不支持的音符事件协议版本。");
  if (!event.eventId.trim()) throw new Error("音符事件缺少稳定标识。");
  if (!Number.isSafeInteger(event.sequence) || event.sequence < 0) throw new Error("音符事件顺序必须是非负整数。");
  validateMusicalTimeV1(event.time);
  if (event.time.timebase !== "monotonic-ms") throw new Error("实时音符事件必须使用单调毫秒时间域。");

  const source = event.source;
  if (!["screen-piano", "computer-keyboard", "web-midi", "android-midi", "playback"].includes(source.producer)) {
    throw new Error("音符事件生产者无效。");
  }
  if (!["none", "usb", "ble", "virtual", "unknown"].includes(source.transport)) {
    throw new Error("音符事件传输类型无效。");
  }
  if (!["not-applicable", "android-device-type", "unverified"].includes(source.verification)) {
    throw new Error("音符事件传输验证方式无效。");
  }
  if (!["note-on", "note-off", "sustain", "all-notes-off"].includes(event.type)) {
    throw new Error("音符事件类型无效。");
  }
  const midiProducer = source.producer === "web-midi" || source.producer === "android-midi";
  if (midiProducer && !source.deviceSessionId?.trim()) throw new Error("MIDI 音符事件缺少设备会话标识。");
  if (source.producer === "web-midi" && (source.transport !== "unknown" || source.verification !== "unverified")) {
    throw new Error("Web MIDI 无法验证 USB 或 BLE 传输类型。");
  }
  if (source.producer === "android-midi") {
    if (source.transport === "none") throw new Error("Android MIDI 必须声明已验证或未知的传输类型。");
    if (source.transport === "unknown" && source.verification !== "unverified") {
      throw new Error("未知 Android MIDI 传输不得标记为已验证。");
    }
    if (source.transport !== "unknown" && source.verification !== "android-device-type") {
      throw new Error("Android MIDI 传输类型必须来自原生设备类型验证。");
    }
  }
  if (!midiProducer && (
    source.transport !== "none"
    || source.verification !== "not-applicable"
    || source.deviceSessionId !== null
  )) throw new Error("非 MIDI 音符事件不得伪造设备传输来源。");

  if (event.channel !== null && (!Number.isInteger(event.channel) || event.channel < 0 || event.channel > 15)) {
    throw new Error("内部 MIDI channel 必须位于 0–15。");
  }
  if (event.type === "note-on" || event.type === "note-off") {
    if (!Number.isInteger(event.note) || event.note < 0 || event.note > 127) throw new Error("MIDI 音符必须位于 0–127。");
  }
  if (event.type === "note-on" && (!Number.isFinite(event.velocity) || event.velocity <= 0 || event.velocity > 1)) {
    throw new Error("note-on 力度必须位于 (0, 1]；零力度应规范化为 note-off。");
  }
  if (event.type === "sustain" && (!Number.isFinite(event.value) || event.value < 0 || event.value > 1)) {
    throw new Error("延音控制值必须位于 0–1。");
  }
  return event;
};

export const normalizeNoteEventV1 = (event: NoteEventV1): NoteEventV1 => {
  const base = {
    ...event,
    schemaVersion: NOTE_EVENT_SCHEMA_VERSION,
    eventId: event.eventId.trim(),
    sequence: Number.isFinite(event.sequence) ? Math.max(0, Math.round(event.sequence)) : 0,
    time: normalizeMusicalTimeV1({
      ...event.time,
      schemaVersion: MUSICAL_TIME_SCHEMA_VERSION,
    }) as MonotonicMusicalTimeV1,
    source: normalizeSource(event.source),
  };
  const channel = event.channel === null ? null : clampInteger(event.channel, 0, 15);
  if (event.type === "all-notes-off") return validateNoteEventV1({ ...base, type: "all-notes-off", channel });
  const normalizedChannel = channel ?? 0;
  if (event.type === "sustain") {
    const value = clampUnit(event.value);
    return validateNoteEventV1({ ...base, type: "sustain", down: value >= 64 / 127, value, channel: normalizedChannel });
  }
  const note = clampInteger(event.note, 0, 127);
  if (event.type === "note-off") return validateNoteEventV1({ ...base, type: "note-off", note, channel: normalizedChannel });
  const velocity = clampUnit(event.velocity);
  return velocity === 0
    ? validateNoteEventV1({ ...base, type: "note-off", note, channel: normalizedChannel })
    : validateNoteEventV1({ ...base, type: "note-on", note, velocity, channel: normalizedChannel });
};
