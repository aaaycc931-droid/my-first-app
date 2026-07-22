import {
  earTrainingMelodyNotes,
  type EarTrainingMelodyNoteId,
  type LocalEarTrainingMelodyQuestion,
} from "./localEarTrainingMelodyDictation";
import type { OfflineAlignmentTarget } from "./offlineNoteAlignment";

export const LOCAL_MELODY_IMITATION_TIMELINE_VERSION = "local-melody-imitation-timeline-v1";
export const LOCAL_MELODY_IMITATION_COUNT_IN_BEATS = 4;
export const LOCAL_MELODY_IMITATION_DEFAULT_BPM = 90;

const MELODY_NOTE_MIDI: Readonly<Record<EarTrainingMelodyNoteId, number>> = {
  c4: 60,
  d4: 62,
  e4: 64,
  f4: 65,
  "f-sharp-4": 66,
  g4: 67,
  a4: 69,
  b4: 71,
  c5: 72,
};

export type LocalMelodyImitationTimelineEvent = {
  position: 0 | 1 | 2;
  noteId: EarTrainingMelodyNoteId;
  onsetMs: number;
  durationMs: number;
};

export type LocalMelodyImitationTimeline = {
  timelineVersion: string;
  targetId: string;
  questionId: string;
  variantId: string;
  difficulty: LocalEarTrainingMelodyQuestion["difficulty"];
  sequence: number;
  bpm: number;
  meter: {
    beatsPerMeasure: 4;
    beatUnit: 4;
  };
  countIn: {
    beats: 4;
    startMs: number;
    endMs: number;
  };
  recordingZeroMs: number;
  events: readonly [
    LocalMelodyImitationTimelineEvent,
    LocalMelodyImitationTimelineEvent,
    LocalMelodyImitationTimelineEvent,
  ];
  phrase: {
    startMs: number;
    endMs: number;
  };
  recordingWindow: {
    startMs: number;
    endMs: number;
  };
  totalWindowMs: number;
};

export type LocalMelodyImitationPlaybackEvent = Pick<
  LocalMelodyImitationTimelineEvent,
  "position" | "noteId" | "durationMs"
> & {
  startOffsetMs: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isCanonicalNoteId = (value: unknown): value is EarTrainingMelodyNoteId =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(earTrainingMelodyNotes, value);

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(`Invalid local melody imitation timeline: ${message}`);
};

const stableHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const identityPayload = (timeline: Omit<LocalMelodyImitationTimeline, "targetId">): string =>
  JSON.stringify({
    timelineVersion: timeline.timelineVersion,
    questionId: timeline.questionId,
    variantId: timeline.variantId,
    difficulty: timeline.difficulty,
    sequence: timeline.sequence,
    bpm: timeline.bpm,
    meter: timeline.meter,
    countIn: timeline.countIn,
    recordingZeroMs: timeline.recordingZeroMs,
    events: timeline.events,
    phrase: timeline.phrase,
    recordingWindow: timeline.recordingWindow,
    totalWindowMs: timeline.totalWindowMs,
  });

const createTargetId = (timeline: Omit<LocalMelodyImitationTimeline, "targetId">): string =>
  `local-melody-imitation:${stableHash(identityPayload(timeline))}`;

export const validateLocalMelodyImitationTimeline = (
  value: unknown,
): LocalMelodyImitationTimeline => {
  assert(isRecord(value), "timeline must be an object.");
  assert(typeof value.timelineVersion === "string" && value.timelineVersion.length > 0, "timelineVersion is required.");
  assert(typeof value.targetId === "string" && value.targetId.length > 0, "targetId is required.");
  assert(typeof value.questionId === "string" && value.questionId.length > 0, "questionId is required.");
  assert(typeof value.variantId === "string" && value.variantId.length > 0, "variantId is required.");
  assert(value.difficulty === "基础" || value.difficulty === "进阶" || value.difficulty === "挑战", "difficulty is invalid.");
  assert(isFiniteNumber(value.sequence) && Number.isInteger(value.sequence) && value.sequence >= 0, "sequence is invalid.");
  assert(isFiniteNumber(value.bpm) && value.bpm > 0, "bpm must be finite and positive.");

  assert(isRecord(value.meter), "meter is required.");
  assert(value.meter.beatsPerMeasure === 4 && value.meter.beatUnit === 4, "meter must be 4/4.");
  assert(isRecord(value.countIn), "countIn is required.");
  assert(value.countIn.beats === LOCAL_MELODY_IMITATION_COUNT_IN_BEATS, "countIn must contain four beats.");
  assert(value.countIn.startMs === 0, "countIn must start at timeline zero.");
  assert(isFiniteNumber(value.countIn.endMs) && value.countIn.endMs > 0, "countIn end is invalid.");
  assert(isFiniteNumber(value.recordingZeroMs), "recording zero is invalid.");
  assert(value.recordingZeroMs === value.countIn.endMs, "recording zero must equal countIn end.");

  const beatDurationMs = 60_000 / value.bpm;
  const expectedCountInEndMs = beatDurationMs * LOCAL_MELODY_IMITATION_COUNT_IN_BEATS;
  assert(Math.abs(value.countIn.endMs - expectedCountInEndMs) < 1e-7, "countIn does not match bpm.");
  assert(Array.isArray(value.events) && value.events.length === 3, "exactly three events are required.");

  let previousEndMs = value.recordingZeroMs;
  for (let index = 0; index < value.events.length; index += 1) {
    const event = value.events[index];
    assert(isRecord(event), `event ${index} is invalid.`);
    assert(event.position === index, `event ${index} position is out of order.`);
    assert(isCanonicalNoteId(event.noteId), `event ${index} noteId is invalid.`);
    assert(isFiniteNumber(event.onsetMs) && isFiniteNumber(event.durationMs), `event ${index} time is not finite.`);
    assert(event.durationMs > 0, `event ${index} duration must be positive.`);
    assert(Math.abs(event.durationMs - beatDurationMs) < 1e-7, "events must have one equal beat duration.");
    assert(Math.abs(event.onsetMs - (value.recordingZeroMs + index * beatDurationMs)) < 1e-7, `event ${index} onset is invalid.`);
    assert(event.onsetMs >= previousEndMs - 1e-7, `event ${index} overlaps the previous event.`);
    previousEndMs = event.onsetMs + event.durationMs;
  }

  assert(isRecord(value.phrase), "phrase is required.");
  assert(isFiniteNumber(value.phrase.startMs) && isFiniteNumber(value.phrase.endMs), "phrase time is invalid.");
  assert(value.phrase.startMs === value.recordingZeroMs, "phrase must start at recording zero.");
  assert(Math.abs(value.phrase.endMs - previousEndMs) < 1e-7, "phrase must cover all three events exactly.");
  assert(isRecord(value.recordingWindow), "recordingWindow is required.");
  assert(value.recordingWindow.startMs === value.recordingZeroMs, "recording window must start at recording zero.");
  assert(value.recordingWindow.endMs === value.phrase.endMs, "recording window must equal the phrase window.");
  assert(isFiniteNumber(value.totalWindowMs) && value.totalWindowMs === value.recordingWindow.endMs, "total window is invalid.");
  for (const event of value.events) {
    assert(
      event.onsetMs >= value.phrase.startMs - 1e-7
      && event.onsetMs + event.durationMs <= value.phrase.endMs + 1e-7,
      "event is outside phrase.",
    );
  }

  const timeline = value as unknown as LocalMelodyImitationTimeline;
  const { targetId: _targetId, ...withoutTargetId } = timeline;
  assert(timeline.targetId === createTargetId(withoutTargetId), "target identity does not match timeline content.");
  return timeline;
};

export const validateLocalMelodyImitationTimelineMatch = ({
  playbackTimeline,
  analysisTimeline,
}: {
  playbackTimeline: unknown;
  analysisTimeline: unknown;
}): LocalMelodyImitationTimeline => {
  const playback = validateLocalMelodyImitationTimeline(playbackTimeline);
  const analysis = validateLocalMelodyImitationTimeline(analysisTimeline);
  const { targetId: _playbackTargetId, ...playbackContent } = playback;
  const { targetId: _analysisTargetId, ...analysisContent } = analysis;
  assert(
    playback.targetId === analysis.targetId
      && identityPayload(playbackContent) === identityPayload(analysisContent),
    "playback and analysis timelines do not match.",
  );
  return analysis;
};

export const createLocalMelodyImitationTimeline = ({
  question,
  bpm = LOCAL_MELODY_IMITATION_DEFAULT_BPM,
  timelineVersion = LOCAL_MELODY_IMITATION_TIMELINE_VERSION,
}: {
  question: LocalEarTrainingMelodyQuestion;
  bpm?: number;
  timelineVersion?: string;
}): LocalMelodyImitationTimeline => {
  assert(typeof question.id === "string" && question.id.length > 0, "question id is required.");
  assert(typeof question.variantId === "string" && question.variantId.length > 0, "question variant is required.");
  assert(Number.isInteger(question.sequence) && question.sequence >= 0, "question sequence is invalid.");
  assert(Array.isArray(question.melody.noteIds) && question.melody.noteIds.length === 3, "question must contain exactly three notes.");
  assert(question.melody.noteIds.every(isCanonicalNoteId), "question contains an invalid canonical noteId.");
  assert(isFiniteNumber(bpm) && bpm > 0, "bpm must be finite and positive.");
  assert(typeof timelineVersion === "string" && timelineVersion.length > 0, "timelineVersion is required.");

  const beatDurationMs = 60_000 / bpm;
  const recordingZeroMs = beatDurationMs * LOCAL_MELODY_IMITATION_COUNT_IN_BEATS;
  const events = question.melody.noteIds.map((noteId, position) => ({
    position: position as 0 | 1 | 2,
    noteId: noteId as EarTrainingMelodyNoteId,
    onsetMs: recordingZeroMs + position * beatDurationMs,
    durationMs: beatDurationMs,
  })) as unknown as LocalMelodyImitationTimeline["events"];
  const phraseEndMs = recordingZeroMs + events.length * beatDurationMs;
  const withoutTargetId: Omit<LocalMelodyImitationTimeline, "targetId"> = {
    timelineVersion,
    questionId: question.id,
    variantId: question.variantId,
    difficulty: question.difficulty,
    sequence: question.sequence,
    bpm,
    meter: { beatsPerMeasure: 4, beatUnit: 4 },
    countIn: { beats: 4, startMs: 0, endMs: recordingZeroMs },
    recordingZeroMs,
    events,
    phrase: { startMs: recordingZeroMs, endMs: phraseEndMs },
    recordingWindow: { startMs: recordingZeroMs, endMs: phraseEndMs },
    totalWindowMs: phraseEndMs,
  };
  return validateLocalMelodyImitationTimeline({
    ...withoutTargetId,
    targetId: createTargetId(withoutTargetId),
  });
};

export const getLocalMelodyImitationPlaybackEvents = (
  timeline: LocalMelodyImitationTimeline,
): LocalMelodyImitationPlaybackEvent[] => {
  const valid = validateLocalMelodyImitationTimeline(timeline);
  return valid.events.map((event) => ({
    position: event.position,
    noteId: event.noteId,
    startOffsetMs: event.onsetMs - valid.recordingZeroMs,
    durationMs: event.durationMs,
  }));
};

export const getLocalMelodyImitationP113Targets = (
  timeline: LocalMelodyImitationTimeline,
): OfflineAlignmentTarget[] => {
  const valid = validateLocalMelodyImitationTimeline(timeline);
  return valid.events.map((event) => ({
    targetId: `${valid.targetId}:position-${event.position}`,
    index: event.position,
    phraseIndex: 0,
    label: earTrainingMelodyNotes[event.noteId].label,
    midi: MELODY_NOTE_MIDI[event.noteId],
    startMs: event.onsetMs - valid.recordingZeroMs,
    endMs: event.onsetMs + event.durationMs - valid.recordingZeroMs,
  }));
};

export const getLocalMelodyImitationRecordingTimeMs = (
  timeline: LocalMelodyImitationTimeline,
  timelineTimeMs: number,
): number => {
  const valid = validateLocalMelodyImitationTimeline(timeline);
  assert(isFiniteNumber(timelineTimeMs), "recording timestamp is not finite.");
  return timelineTimeMs - valid.recordingZeroMs;
};
