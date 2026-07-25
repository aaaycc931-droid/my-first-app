import { noteNameToMidi } from "../audio/noteFrequency";
import type { NotationDuration } from "../practice/localNotationFragmentDraft";
import { isLocalScoreProjectContent } from "./localScoreProject";
import type { LocalNotationProjectScoreDocumentV1 } from "./scoreDocument";

export const LOCAL_SCORE_PROJECT_PLAYBACK_MIN_BPM = 30;
export const LOCAL_SCORE_PROJECT_PLAYBACK_MAX_BPM = 240;
export const LOCAL_SCORE_PROJECT_PLAYBACK_GATE = 0.88;

export type LocalScoreProjectPlaybackVoiceSelection = "first" | "all";

export type LocalScoreProjectPlaybackNoteEvent = Readonly<{
  type: "note-on" | "note-off";
  delayMs: number;
  midi: number;
  pointerId: string;
  sourceEventId: string;
}>;

export type LocalScoreProjectPlaybackEvent =
  | LocalScoreProjectPlaybackNoteEvent
  | Readonly<{
    type: "all-notes-off";
    delayMs: number;
  }>;

export type LocalScoreProjectPlaybackSpan = Readonly<{
  sourceEventId: string;
  partId: string;
  staffId: string;
  voiceId: string;
  measureNumber: number;
  startMs: number;
  endMs: number;
}>;

export type LocalScoreProjectPlaybackPlan =
  | Readonly<{
    status: "ready";
    scheduleId: string;
    documentId: string;
    revision: number;
    bpm: number;
    voiceSelection: LocalScoreProjectPlaybackVoiceSelection;
    durationMs: number;
    events: readonly LocalScoreProjectPlaybackEvent[];
    spans: readonly LocalScoreProjectPlaybackSpan[];
    warnings: readonly string[];
  }>
  | Readonly<{
    status: "blocked";
    documentId: string | null;
    revision: number | null;
    bpm: number | null;
    voiceSelection: LocalScoreProjectPlaybackVoiceSelection;
    reason: string;
  }>;

type ScoreVoice = LocalNotationProjectScoreDocumentV1["parts"][number]["staves"][number]["voices"][number];

type LocatedVoice = Readonly<{
  partId: string;
  staffId: string;
  voice: ScoreVoice;
}>;

const DURATION_BEATS: Readonly<Record<NotationDuration, number>> = {
  half: 2,
  quarter: 1,
  eighth: 0.5,
};

const EVENT_PRIORITY: Readonly<Record<LocalScoreProjectPlaybackEvent["type"], number>> = {
  "note-off": 0,
  "note-on": 1,
  "all-notes-off": 2,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getDocumentIdentity = (document: unknown) => {
  if (!isRecord(document)) return { documentId: null, revision: null };
  return {
    documentId: typeof document.documentId === "string"
      ? document.documentId
      : null,
    revision: Number.isSafeInteger(document.revision) && (document.revision as number) > 0
      ? document.revision as number
      : null,
  };
};

const isPlaybackDocument = (
  document: unknown,
): document is LocalNotationProjectScoreDocumentV1 =>
  isRecord(document)
  && document.schemaVersion === "score-document-v1"
  && document.documentKind === "notation-project"
  && typeof document.documentId === "string"
  && document.documentId.length > 0
  && Number.isSafeInteger(document.revision)
  && (document.revision as number) > 0
  && document.reviewState === "draft"
  && document.localOnly === true
  && document.sessionOnly === false
  && isRecord(document.source)
  && document.source.kind === "local-score-project"
  && typeof document.source.projectId === "string"
  && document.source.projectId.length > 0
  && isLocalScoreProjectContent(document);

const meterBeats = (meter: LocalNotationProjectScoreDocumentV1["meter"]): number =>
  Number(meter.split("/")[0]);

const locateVoices = (
  document: LocalNotationProjectScoreDocumentV1,
): readonly LocatedVoice[] =>
  document.parts.flatMap((part) =>
    part.staves.flatMap((staff) =>
      staff.voices.map((voice) => ({
        partId: part.partId,
        staffId: staff.staffId,
        voice,
      })),
    ),
  );

const pointerIdFor = ({
  document,
  locatedVoice,
  eventId,
  measureNumber,
}: {
  document: LocalNotationProjectScoreDocumentV1;
  locatedVoice: LocatedVoice;
  eventId: string;
  measureNumber: number;
}) => [
  "score-project",
  document.documentId,
  `r${document.revision}`,
  locatedVoice.partId,
  locatedVoice.staffId,
  locatedVoice.voice.voiceId,
  `m${measureNumber}`,
  eventId,
].map(encodeURIComponent).join(":");

export const createLocalScoreProjectPlaybackPlan = ({
  document,
  bpm,
  voiceSelection = "all",
}: {
  document: unknown;
  bpm: number;
  voiceSelection?: LocalScoreProjectPlaybackVoiceSelection;
}): LocalScoreProjectPlaybackPlan => {
  const identity = getDocumentIdentity(document);
  const blocked = (reason: string): LocalScoreProjectPlaybackPlan => ({
    status: "blocked",
    ...identity,
    bpm: Number.isFinite(bpm)
      ? Math.max(
        LOCAL_SCORE_PROJECT_PLAYBACK_MIN_BPM,
        Math.min(LOCAL_SCORE_PROJECT_PLAYBACK_MAX_BPM, Math.round(bpm)),
      )
      : null,
    voiceSelection,
    reason,
  });

  if (voiceSelection !== "first" && voiceSelection !== "all") {
    return blocked("播放声部范围无效。");
  }
  if (!Number.isFinite(bpm)) return blocked("BPM 必须是有限数值。");
  if (!isPlaybackDocument(document)) {
    return blocked("乐谱项目文档无效，无法安全播放。");
  }

  const safeBpm = Math.max(
    LOCAL_SCORE_PROJECT_PLAYBACK_MIN_BPM,
    Math.min(LOCAL_SCORE_PROJECT_PLAYBACK_MAX_BPM, Math.round(bpm)),
  );
  const beatMs = 60_000 / safeBpm;
  const beatsPerMeasure = meterBeats(document.meter);
  const allVoices = locateVoices(document);
  const selectedVoices = voiceSelection === "first"
    ? allVoices.slice(0, 1)
    : allVoices;
  const noteEvents: LocalScoreProjectPlaybackNoteEvent[] = [];
  const spans: LocalScoreProjectPlaybackSpan[] = [];
  const warnings: string[] = [];
  let sourceEventCount = 0;
  let totalBeats = 0;

  for (const locatedVoice of selectedVoices) {
    for (const measure of locatedVoice.voice.measures) {
      const measureStartBeat = (measure.measureNumber - 1) * beatsPerMeasure;
      let cursorBeat = 0;
      sourceEventCount += measure.events.length;

      for (const event of measure.events) {
        const durationBeats = DURATION_BEATS[event.duration];
        if (cursorBeat + durationBeats > beatsPerMeasure) {
          return blocked(
            `声部 ${locatedVoice.voice.voiceId} 的第 ${measure.measureNumber} 小节超过 ${document.meter} 拍号容量。`,
          );
        }

        const onsetBeat = measureStartBeat + cursorBeat;
        spans.push({
          sourceEventId: event.id,
          partId: locatedVoice.partId,
          staffId: locatedVoice.staffId,
          voiceId: locatedVoice.voice.voiceId,
          measureNumber: measure.measureNumber,
          startMs: onsetBeat * beatMs,
          endMs: (onsetBeat + durationBeats) * beatMs,
        });

        if (event.type === "note") {
          const midi = event.pitch === null ? null : noteNameToMidi(event.pitch);
          if (midi === null || midi < 21 || midi > 108) {
            return blocked(`事件 ${event.id} 的音高不在本地钢琴 A0–C8 范围内。`);
          }
          const pointerId = pointerIdFor({
            document,
            locatedVoice,
            eventId: event.id,
            measureNumber: measure.measureNumber,
          });
          noteEvents.push({
            type: "note-on",
            delayMs: onsetBeat * beatMs,
            midi,
            pointerId,
            sourceEventId: event.id,
          }, {
            type: "note-off",
            delayMs: (onsetBeat + durationBeats * LOCAL_SCORE_PROJECT_PLAYBACK_GATE) * beatMs,
            midi,
            pointerId,
            sourceEventId: event.id,
          });
        }
        cursorBeat += durationBeats;
      }

      totalBeats = Math.max(totalBeats, measureStartBeat + cursorBeat);
      if (cursorBeat < beatsPerMeasure) {
        warnings.push(
          `声部 ${locatedVoice.voice.voiceId} 的第 ${measure.measureNumber} 小节未填满 ${document.meter}。`,
        );
      }
    }
  }

  if (sourceEventCount === 0) {
    return blocked("当前播放范围没有可预览的事件。");
  }

  const durationMs = totalBeats * beatMs;
  const events: LocalScoreProjectPlaybackEvent[] = [
    ...noteEvents,
    { type: "all-notes-off", delayMs: durationMs },
  ];
  events.sort(
    (left, right) =>
      left.delayMs - right.delayMs
      || EVENT_PRIORITY[left.type] - EVENT_PRIORITY[right.type],
  );

  return {
    status: "ready",
    scheduleId: [
      document.documentId,
      `r${document.revision}`,
      voiceSelection,
      `${safeBpm}bpm`,
    ].map(encodeURIComponent).join(":"),
    documentId: document.documentId,
    revision: document.revision,
    bpm: safeBpm,
    voiceSelection,
    durationMs,
    events,
    spans,
    warnings,
  };
};
