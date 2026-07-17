export const PIANO_PERFORMANCE_SCHEMA_VERSION = 1 as const;
export const MAX_PIANO_PERFORMANCE_EVENTS = 2_000;
export const MAX_SAVED_PIANO_PERFORMANCES = 12;

export type PianoPerformanceNoteEvent = {
  type: "note-on" | "note-off";
  atMs: number;
  keyId: string;
  note: number;
  velocity?: number;
};

export type PianoPerformanceEvent = PianoPerformanceNoteEvent | {
  type: "pedal";
  atMs: number;
  down: boolean;
} | {
  type: "all-notes-off";
  atMs: number;
};

export type PianoPerformanceEventInput =
  | (Omit<PianoPerformanceNoteEvent, "atMs"> & { atMs?: number })
  | { type: "pedal"; down: boolean; atMs?: number }
  | { type: "all-notes-off"; atMs?: number };

export type PianoPerformance = {
  schemaVersion: typeof PIANO_PERFORMANCE_SCHEMA_VERSION;
  id: string;
  name: string;
  createdAt: string;
  durationMs: number;
  transpose: number;
  events: readonly PianoPerformanceEvent[];
};

export type PianoPerformanceRecorder = {
  startedAtMs: number;
  events: readonly PianoPerformanceEvent[];
};

export type PianoPlaybackVoiceFilter = "all" | "lower" | "upper";
export type PianoPlaybackRate = 0.5 | 0.75 | 1 | 1.25 | 1.5;
export type ScheduledPianoPerformanceEvent = PianoPerformanceEvent & { delayMs: number };

const safeTime = (value: number): number => Number.isFinite(value) ? Math.max(0, value) : 0;
const safeName = (value: string): string => value.trim().slice(0, 60) || "未命名演奏";

export const createPianoPerformanceRecorder = (startedAtMs: number): PianoPerformanceRecorder => ({
  startedAtMs: safeTime(startedAtMs),
  events: [],
});

export const appendPianoPerformanceEvent = (
  recorder: PianoPerformanceRecorder,
  event: PianoPerformanceEventInput,
  nowMs: number,
): PianoPerformanceRecorder => {
  if (recorder.events.length >= MAX_PIANO_PERFORMANCE_EVENTS) return recorder;
  const relativeTime = event.atMs === undefined
    ? safeTime(nowMs - recorder.startedAtMs)
    : safeTime(event.atMs);
  const previousTime = recorder.events.at(-1)?.atMs ?? 0;
  return {
    ...recorder,
    events: [...recorder.events, { ...event, atMs: Math.max(previousTime, relativeTime) } as PianoPerformanceEvent],
  };
};

export const finalizePianoPerformance = ({
  recorder,
  id,
  name,
  createdAt,
  nowMs,
  transpose = 0,
}: {
  recorder: PianoPerformanceRecorder;
  id: string;
  name: string;
  createdAt: string;
  nowMs: number;
  transpose?: number;
}): PianoPerformance | null => {
  if (!recorder.events.some((event) => event.type === "note-on")) return null;
  const durationMs = Math.max(
    recorder.events.at(-1)?.atMs ?? 0,
    safeTime(nowMs - recorder.startedAtMs),
  );
  const events = recorder.events.at(-1)?.type === "all-notes-off"
    ? recorder.events
    : [...recorder.events, { type: "all-notes-off" as const, atMs: durationMs }];
  return {
    schemaVersion: PIANO_PERFORMANCE_SCHEMA_VERSION,
    id: id.trim() || `performance-${Math.round(recorder.startedAtMs)}`,
    name: safeName(name),
    createdAt,
    durationMs,
    transpose: Math.max(-12, Math.min(12, Math.round(transpose))),
    events,
  };
};

const eventMatchesFilter = (
  event: PianoPerformanceEvent,
  filter: PianoPlaybackVoiceFilter,
): boolean => {
  if (event.type !== "note-on" && event.type !== "note-off") return true;
  if (filter === "lower") return event.note < 60;
  if (filter === "upper") return event.note >= 60;
  return true;
};

export const createPianoPlaybackSchedule = ({
  performance,
  fromMs = 0,
  toMs = performance.durationMs,
  rate = 1,
  voiceFilter = "all",
}: {
  performance: PianoPerformance;
  fromMs?: number;
  toMs?: number;
  rate?: PianoPlaybackRate;
  voiceFilter?: PianoPlaybackVoiceFilter;
}): ScheduledPianoPerformanceEvent[] => {
  const start = Math.min(performance.durationMs, safeTime(fromMs));
  const end = Math.max(start, Math.min(performance.durationMs, safeTime(toMs)));
  const activeAtStart = new Map<string, PianoPerformanceNoteEvent>();
  for (const event of performance.events) {
    if (event.atMs >= start) break;
    if (!eventMatchesFilter(event, voiceFilter)) continue;
    if (event.type === "note-on") activeAtStart.set(event.keyId, event);
    if (event.type === "note-off") activeAtStart.delete(event.keyId);
    if (event.type === "all-notes-off") activeAtStart.clear();
  }
  const initial = Array.from(activeAtStart.values()).map((event) => ({ ...event, atMs: start, delayMs: 0 }));
  const selected = performance.events
    .filter((event) => event.atMs >= start && event.atMs <= end && eventMatchesFilter(event, voiceFilter))
    .map((event) => ({ ...event, delayMs: (event.atMs - start) / rate }));
  const finalDelay = (end - start) / rate;
  return [...initial, ...selected, { type: "all-notes-off", atMs: end, delayMs: finalDelay }];
};

const isPerformanceEvent = (value: unknown): value is PianoPerformanceEvent => {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  if (!Number.isFinite(event.atMs) || Number(event.atMs) < 0) return false;
  if (event.type === "all-notes-off") return true;
  if (event.type === "pedal") return typeof event.down === "boolean";
  return (event.type === "note-on" || event.type === "note-off")
    && typeof event.keyId === "string"
    && Number.isInteger(event.note)
    && Number(event.note) >= 0
    && Number(event.note) <= 127
    && (event.type === "note-off" || (typeof event.velocity === "number" && event.velocity >= 0 && event.velocity <= 1));
};

export const parsePianoPerformanceLibrary = (raw: string | null): PianoPerformance[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_SAVED_PIANO_PERFORMANCES).filter((value): value is PianoPerformance => {
      if (!value || typeof value !== "object") return false;
      const item = value as Partial<PianoPerformance>;
      return item.schemaVersion === PIANO_PERFORMANCE_SCHEMA_VERSION
        && typeof item.id === "string"
        && typeof item.name === "string"
        && typeof item.createdAt === "string"
        && Number.isFinite(item.durationMs)
        && Number(item.durationMs) >= 0
        && Number.isInteger(item.transpose)
        && Number(item.transpose) >= -12
        && Number(item.transpose) <= 12
        && Array.isArray(item.events)
        && item.events.length <= MAX_PIANO_PERFORMANCE_EVENTS + 1
        && item.events.every(isPerformanceEvent)
        && item.events.every((event, index) => index === 0 || event.atMs >= item.events![index - 1].atMs)
        && (item.events.at(-1)?.atMs ?? 0) <= Number(item.durationMs);
    });
  } catch {
    return [];
  }
};

export const serializePianoPerformanceLibrary = (
  performances: readonly PianoPerformance[],
): string => JSON.stringify(performances.slice(0, MAX_SAVED_PIANO_PERFORMANCES));
