import { noteNameToMidi } from "../audio/noteFrequency";
import type { NotationDuration } from "../practice/localNotationFragmentDraft";
import {
  getLocalScoreProjectEventDurationBeats,
  hasValidLocalScoreProjectTies,
  isLocalScoreProjectContent,
  LOCAL_SCORE_PROJECT_TIE_CONTINUITY_ERROR,
} from "./localScoreProject";
import type {
  LocalNotationProjectScoreDocumentV1,
  LocalNotationProjectScoreDocumentV2,
  LocalNotationProjectScoreDocumentV3,
  LocalNotationProjectScoreDocumentV4,
  LocalNotationProjectScoreDocumentV5,
  LocalNotationProjectScoreDocumentV6,
  LocalNotationProjectScoreDocumentV7,
  LocalNotationProjectScoreDocumentV8,
  LocalScoreProjectEventV2,
  LocalScoreProjectEventV3,
  LocalScoreProjectEventV4,
  ScoreDocumentEventV1,
} from "./scoreDocument";

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

type PlaybackDocument =
  | LocalNotationProjectScoreDocumentV1
  | LocalNotationProjectScoreDocumentV2
  | LocalNotationProjectScoreDocumentV3
  | LocalNotationProjectScoreDocumentV4
  | LocalNotationProjectScoreDocumentV5
  | LocalNotationProjectScoreDocumentV6
  | LocalNotationProjectScoreDocumentV7
  | LocalNotationProjectScoreDocumentV8;

type PlaybackEvent =
  | ScoreDocumentEventV1
  | LocalScoreProjectEventV2
  | LocalScoreProjectEventV3
  | LocalScoreProjectEventV4;

type ScoreVoice = PlaybackDocument["parts"][number]["staves"][number]["voices"][number];

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

const isLegacyPlaybackContent = (document: Record<string, unknown>): boolean => {
  if (!Array.isArray(document.parts)) return false;
  const parts = document.parts.map((part, partIndex) => {
    if (!isRecord(part) || !Array.isArray(part.staves)) return null;
    const staves = part.staves.map((staff) => {
      if (!isRecord(staff) || !Array.isArray(staff.voices)) return null;
      const voices = staff.voices.map((voice) => {
        if (!isRecord(voice) || !Array.isArray(voice.measures)) return null;
        const measures = voice.measures.map((measure) => {
          if (!isRecord(measure) || !Array.isArray(measure.events)) return null;
          const events = measure.events.map((event) => {
            if (!isRecord(event)) return null;
            return event.type === "note"
              ? {
                ...event,
                augmentationDots: 0,
                tieToNext: false,
                lyric: null,
                fingering: null,
                chordSymbol: null,
              }
              : {
                ...event,
                augmentationDots: 0,
                chordSymbol: null,
              };
          });
          if (events.some((event) => event === null)) return null;
          return { ...measure, events };
        });
        if (measures.some((measure) => measure === null)) return null;
        return { ...voice, measures };
      });
      if (voices.some((voice) => voice === null)) return null;
      return { ...staff, voices };
    });
    if (staves.some((staff) => staff === null)) return null;
    return {
      ...part,
      name: `声部组 ${partIndex + 1}`,
      instrument: { kind: "unassigned" },
      staves,
    };
  });
  return !parts.some((part) => part === null)
    && isLocalScoreProjectContent({
      scoreCredits: {
        title: "未命名乐谱",
        subtitle: null,
        creators: [],
        rightsNotice: null,
      },
      meter: document.meter,
      keySignature: { fifths: 0 },
      parts,
    });
};

const isPreviousPlaybackContent = (
  document: Record<string, unknown>,
): boolean =>
  Array.isArray(document.parts)
  && isLocalScoreProjectContent({
    scoreCredits: isRecord(document.scoreCredits)
      ? document.scoreCredits
      : {
        title: "未命名乐谱",
        subtitle: null,
        creators: [],
        rightsNotice: null,
      },
    meter: document.meter,
    keySignature: document.keySignature,
    parts: document.parts.map((part, index) => {
      if (!isRecord(part)) return part;
      const staves = document.schemaVersion === "score-document-v8"
        ? part.staves
        : Array.isArray(part.staves)
          ? part.staves.map((staff) =>
            isRecord(staff) && Array.isArray(staff.voices)
              ? {
                ...staff,
                voices: staff.voices.map((voice) =>
                  isRecord(voice) && Array.isArray(voice.measures)
                    ? {
                      ...voice,
                      measures: voice.measures.map((measure) =>
                        isRecord(measure) && Array.isArray(measure.events)
                          ? {
                            ...measure,
                            events: measure.events.map((event) => {
                              if (!isRecord(event)) return event;
                              const withFingering =
                                document.schemaVersion === "score-document-v7"
                                  || event.type !== "note"
                                  ? event
                                  : { ...event, fingering: null };
                              return { ...withFingering, chordSymbol: null };
                            }),
                          }
                          : measure),
                    }
                    : voice),
              }
              : staff)
          : part.staves;
      return {
        ...part,
        name: typeof part.name === "string"
          ? part.name
          : `声部组 ${index + 1}`,
        instrument: isRecord(part.instrument)
          ? part.instrument
          : { kind: "unassigned" },
        staves,
      };
    }),
  });

const isPlaybackDocument = (
  document: unknown,
): document is PlaybackDocument =>
  isRecord(document)
  && (
    document.schemaVersion === "score-document-v1"
    || document.schemaVersion === "score-document-v2"
    || document.schemaVersion === "score-document-v3"
    || document.schemaVersion === "score-document-v4"
    || document.schemaVersion === "score-document-v5"
    || document.schemaVersion === "score-document-v6"
    || document.schemaVersion === "score-document-v7"
    || document.schemaVersion === "score-document-v8"
  )
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
  && (
    (
      document.schemaVersion === "score-document-v1"
      && isLegacyPlaybackContent(document)
    )
    || (
      document.schemaVersion === "score-document-v2"
      && isLegacyPlaybackContent(document)
    )
    || (
      document.schemaVersion === "score-document-v3"
      && isPreviousPlaybackContent(document)
    )
    || (
      document.schemaVersion === "score-document-v4"
      && isPreviousPlaybackContent(document)
    )
    || (
      (
        document.schemaVersion === "score-document-v5"
        || document.schemaVersion === "score-document-v6"
        || document.schemaVersion === "score-document-v7"
        || document.schemaVersion === "score-document-v8"
      )
      && isPreviousPlaybackContent(document)
    )
  );

const meterBeats = (meter: PlaybackDocument["meter"]): number =>
  Number(meter.split("/")[0]);

const locateVoices = (
  document: PlaybackDocument,
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
  document: PlaybackDocument;
  locatedVoice: LocatedVoice;
  eventId: string;
  measureNumber: number;
}) => [
  "score-project",
  document.documentId,
  ...(document.schemaVersion === "score-document-v8"
    ? []
    : [`r${document.revision}`]),
  locatedVoice.partId,
  locatedVoice.staffId,
  locatedVoice.voice.voiceId,
  `m${measureNumber}`,
  eventId,
].map(encodeURIComponent).join(":");

const durationBeatsFor = (event: PlaybackEvent): number =>
  "augmentationDots" in event
    ? getLocalScoreProjectEventDurationBeats(event)
    : DURATION_BEATS[event.duration];

const tiesToNext = (event: PlaybackEvent): boolean =>
  event.type === "note"
  && "tieToNext" in event
  && event.tieToNext === true;

type TimedVoiceEvent = Readonly<{
  event: PlaybackEvent;
  measureNumber: number;
  onsetBeat: number;
  endBeat: number;
}>;

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
  if (document.schemaVersion !== "score-document-v1") {
    if (!hasValidLocalScoreProjectTies(document)) {
      return blocked(LOCAL_SCORE_PROJECT_TIE_CONTINUITY_ERROR);
    }
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
    const timedVoiceEvents: TimedVoiceEvent[] = [];
    for (const measure of locatedVoice.voice.measures) {
      const measureStartBeat = (measure.measureNumber - 1) * beatsPerMeasure;
      let cursorBeat = 0;
      sourceEventCount += measure.events.length;

      for (const event of measure.events) {
        const durationBeats = durationBeatsFor(event);
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

        timedVoiceEvents.push({
          event,
          measureNumber: measure.measureNumber,
          onsetBeat,
          endBeat: onsetBeat + durationBeats,
        });
        cursorBeat += durationBeats;
      }

      totalBeats = Math.max(totalBeats, measureStartBeat + cursorBeat);
      if (cursorBeat < beatsPerMeasure) {
        warnings.push(
          `声部 ${locatedVoice.voice.voiceId} 的第 ${measure.measureNumber} 小节未填满 ${document.meter}。`,
        );
      }
    }

    for (let index = 0; index < timedVoiceEvents.length; index += 1) {
      const first = timedVoiceEvents[index];
      if (first.event.type !== "note") continue;
      const midi = first.event.pitch === null
        ? null
        : noteNameToMidi(first.event.pitch);
      if (midi === null || midi < 21 || midi > 108) {
        return blocked(`事件 ${first.event.id} 的音高不在本地钢琴 A0–C8 范围内。`);
      }

      let last = first;
      while (tiesToNext(last.event)) {
        const next = timedVoiceEvents[index + 1];
        if (
          !next
          || next.event.type !== "note"
          || next.event.pitch !== first.event.pitch
        ) {
          return blocked(
            `事件 ${last.event.id} 的延音线与已验证的领域规则不一致。`,
          );
        }
        index += 1;
        last = next;
      }

      const pointerId = pointerIdFor({
        document,
        locatedVoice,
        eventId: first.event.id,
        measureNumber: first.measureNumber,
      });
      const finalDurationBeats = last.endBeat - last.onsetBeat;
      noteEvents.push({
        type: "note-on",
        delayMs: first.onsetBeat * beatMs,
        midi,
        pointerId,
        sourceEventId: first.event.id,
      }, {
        type: "note-off",
        delayMs: (
          last.onsetBeat
          + finalDurationBeats * LOCAL_SCORE_PROJECT_PLAYBACK_GATE
        ) * beatMs,
        midi,
        pointerId,
        sourceEventId: first.event.id,
      });
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
