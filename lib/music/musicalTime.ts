export const MUSICAL_TIME_SCHEMA_VERSION = "musical-time-v1" as const;

type MusicalTimeBaseV1 = {
  schemaVersion: typeof MUSICAL_TIME_SCHEMA_VERSION;
  originId: string;
};

export type MonotonicMusicalTimeV1 = MusicalTimeBaseV1 & {
  timebase: "monotonic-ms";
  positionMs: number;
};

export type RecordingRelativeMusicalTimeV1 = MusicalTimeBaseV1 & {
  timebase: "recording-relative-ms";
  positionMs: number;
};

export type ScoreTickMusicalTimeV1 = MusicalTimeBaseV1 & {
  timebase: "score-ticks";
  tick: number;
  ticksPerQuarter: number;
};

export type AudioSampleMusicalTimeV1 = MusicalTimeBaseV1 & {
  timebase: "audio-samples";
  sampleIndex: number;
  sampleRate: number;
};

export type MusicalTimeV1 =
  | MonotonicMusicalTimeV1
  | RecordingRelativeMusicalTimeV1
  | ScoreTickMusicalTimeV1
  | AudioSampleMusicalTimeV1;

const finiteNonNegative = (value: number) => Number.isFinite(value) && value >= 0;
const integerNonNegative = (value: number) => Number.isSafeInteger(value) && value >= 0;
const positiveInteger = (value: number) => Number.isSafeInteger(value) && value > 0;

export const validateMusicalTimeV1 = <T extends MusicalTimeV1>(time: T): T => {
  if (time.schemaVersion !== MUSICAL_TIME_SCHEMA_VERSION) throw new Error("不支持的音乐时间协议版本。");
  if (!time.originId.trim()) throw new Error("音乐时间缺少明确的时间原点标识。");
  if (!["monotonic-ms", "recording-relative-ms", "score-ticks", "audio-samples"].includes(time.timebase)) {
    throw new Error("音乐时间域无效。");
  }
  if (time.timebase === "monotonic-ms" || time.timebase === "recording-relative-ms") {
    if (!finiteNonNegative(time.positionMs)) throw new Error("毫秒时间位置必须是非负有限数。");
    return time;
  }
  if (time.timebase === "score-ticks") {
    if (!integerNonNegative(time.tick) || !positiveInteger(time.ticksPerQuarter)) {
      throw new Error("乐谱 tick 与每四分音符 tick 数必须是有效整数。");
    }
    return time;
  }
  if (time.timebase !== "audio-samples" || !integerNonNegative(time.sampleIndex) || !positiveInteger(time.sampleRate)) {
    throw new Error("音频采样位置与采样率必须是有效整数。");
  }
  return time;
};

export const normalizeMusicalTimeV1 = <T extends MusicalTimeV1>(time: T): T => {
  const originId = time.originId.trim();
  if (time.timebase === "monotonic-ms" || time.timebase === "recording-relative-ms") {
    const positionMs = Number.isFinite(time.positionMs) ? Math.max(0, time.positionMs) : 0;
    return validateMusicalTimeV1({ ...time, originId, positionMs }) as T;
  }
  if (time.timebase === "score-ticks") {
    const tick = Number.isFinite(time.tick) ? Math.max(0, Math.round(time.tick)) : 0;
    const ticksPerQuarter = Number.isFinite(time.ticksPerQuarter)
      ? Math.max(1, Math.round(time.ticksPerQuarter))
      : 1;
    return validateMusicalTimeV1({ ...time, originId, tick, ticksPerQuarter }) as T;
  }
  const sampleIndex = Number.isFinite(time.sampleIndex) ? Math.max(0, Math.round(time.sampleIndex)) : 0;
  const sampleRate = Number.isFinite(time.sampleRate) ? Math.max(1, Math.round(time.sampleRate)) : 1;
  return validateMusicalTimeV1({ ...time, originId, sampleIndex, sampleRate }) as T;
};

export const shareMusicalTimebaseV1 = (left: MusicalTimeV1, right: MusicalTimeV1) =>
  left.timebase === right.timebase && left.originId === right.originId;
