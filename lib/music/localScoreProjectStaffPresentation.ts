import type {
  NotationDuration,
  NotationPitch,
} from "../practice/localNotationFragmentDraft";
import { isLocalScoreProjectContent } from "./localScoreProject";
import type { LocalNotationProjectScoreDocumentV1 } from "./scoreDocument";

export const LOCAL_SCORE_STAFF_HEIGHT = 132;
export const LOCAL_SCORE_STAFF_LINE_Y = [36, 48, 60, 72, 84] as const;
export const LOCAL_SCORE_STAFF_HEADER_WIDTH = 96;
export const LOCAL_SCORE_STAFF_MEASURE_WIDTH = 240;
export const LOCAL_SCORE_STAFF_MEASURE_PADDING = 24;

export type LocalScoreStaffEventLocation = Readonly<{
  partId: string;
  staffId: string;
  voiceId: string;
  measureNumber: number;
}>;

type LocalScoreStaffTokenBase = Readonly<{
  eventId: string;
  location: LocalScoreStaffEventLocation;
  onsetBeat: number;
  onsetBeatInMeasure: number;
  duration: NotationDuration;
  durationBeats: number;
  x: number;
  y: number;
  accessibleLabel: string;
}>;

export type LocalScoreStaffNoteToken = LocalScoreStaffTokenBase & Readonly<{
  type: "note";
  pitch: NotationPitch;
  head: "open" | "filled";
  hasStem: true;
  hasEighthFlag: boolean;
  hasC4LedgerLine: boolean;
}>;

export type LocalScoreStaffRestToken = LocalScoreStaffTokenBase & Readonly<{
  type: "rest";
  pitch: null;
  rest: "quarter";
}>;

export type LocalScoreStaffToken =
  | LocalScoreStaffNoteToken
  | LocalScoreStaffRestToken;

export type LocalScoreStaffMeasureLayout = Readonly<{
  measureNumber: number;
  startX: number;
  endX: number;
  barlineX: number;
  usedBeats: number;
  capacityBeats: number;
  tokens: readonly LocalScoreStaffToken[];
}>;

export type LocalScoreStaffPresentation =
  | Readonly<{
    status: "ready";
    documentId: string;
    revision: number;
    meter: LocalNotationProjectScoreDocumentV1["meter"];
    meterNumerator: number;
    meterDenominator: 4;
    width: number;
    height: typeof LOCAL_SCORE_STAFF_HEIGHT;
    partId: string;
    staffId: string;
    voiceId: string;
    measures: readonly LocalScoreStaffMeasureLayout[];
    tokens: readonly LocalScoreStaffToken[];
    warnings: readonly string[];
  }>
  | Readonly<{
    status: "blocked";
    documentId: string | null;
    revision: number | null;
    reason: string;
  }>;

const DURATION_BEATS: Readonly<Record<NotationDuration, number>> = {
  half: 2,
  quarter: 1,
  eighth: 0.5,
};

const DURATION_LABELS: Readonly<Record<NotationDuration, string>> = {
  half: "二分",
  quarter: "四分",
  eighth: "八分",
};

const PITCH_Y: Readonly<Record<NotationPitch, number>> = {
  C4: 96,
  D4: 90,
  E4: 84,
  F4: 78,
  G4: 72,
  A4: 66,
  B4: 60,
  C5: 54,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getIdentity = (document: unknown) => {
  if (!isRecord(document)) return { documentId: null, revision: null };
  return {
    documentId: typeof document.documentId === "string"
      ? document.documentId
      : null,
    revision: Number.isSafeInteger(document.revision)
      && (document.revision as number) > 0
      ? document.revision as number
      : null,
  };
};

const isLocalScoreProjectDocument = (
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

const tokenX = ({
  measureStartX,
  onsetBeatInMeasure,
  capacityBeats,
}: {
  measureStartX: number;
  onsetBeatInMeasure: number;
  capacityBeats: number;
}) => {
  const usableWidth =
    LOCAL_SCORE_STAFF_MEASURE_WIDTH - 2 * LOCAL_SCORE_STAFF_MEASURE_PADDING;
  return measureStartX
    + LOCAL_SCORE_STAFF_MEASURE_PADDING
    + onsetBeatInMeasure / capacityBeats * usableWidth;
};

export const createLocalScoreProjectStaffPresentation = (
  document: unknown,
): LocalScoreStaffPresentation => {
  const identity = getIdentity(document);
  const blocked = (reason: string): LocalScoreStaffPresentation => ({
    status: "blocked",
    ...identity,
    reason,
  });

  if (!isLocalScoreProjectDocument(document)) {
    return blocked("乐谱项目文档无效，无法安全生成五线谱预览。");
  }

  const part = document.parts[0];
  const staff = part?.staves[0];
  const voice = staff?.voices[0];
  if (!part || !staff || !voice) {
    return blocked("当前项目没有可展示的第一声部。");
  }

  const meterNumerator = Number(document.meter.split("/")[0]);
  const warnings: string[] = [];
  const measures: LocalScoreStaffMeasureLayout[] = [];

  for (
    let measureIndex = 0;
    measureIndex < voice.measures.length;
    measureIndex += 1
  ) {
    const measure = voice.measures[measureIndex];
    if (!measure) continue;
    const startX =
      LOCAL_SCORE_STAFF_HEADER_WIDTH
      + measureIndex * LOCAL_SCORE_STAFF_MEASURE_WIDTH;
    const endX = startX + LOCAL_SCORE_STAFF_MEASURE_WIDTH;
    let cursorBeat = 0;
    const tokens: LocalScoreStaffToken[] = [];

    for (
      let eventIndex = 0;
      eventIndex < measure.events.length;
      eventIndex += 1
    ) {
      const event = measure.events[eventIndex];
      if (!event) continue;
      const durationBeats = DURATION_BEATS[event.duration];
      if (cursorBeat + durationBeats > meterNumerator) {
        return blocked(
          `第一声部第 ${measure.measureNumber} 小节超过 ${document.meter} 拍号容量。`,
        );
      }
      const location = {
        partId: part.partId,
        staffId: staff.staffId,
        voiceId: voice.voiceId,
        measureNumber: measure.measureNumber,
      };
      const x = tokenX({
        measureStartX: startX,
        onsetBeatInMeasure: cursorBeat,
        capacityBeats: meterNumerator,
      });
      const positionLabel =
        `第 ${measure.measureNumber} 小节第 ${eventIndex + 1} 个事件`;
      if (event.type === "note" && event.pitch !== null) {
        tokens.push({
          eventId: event.id,
          location,
          type: "note",
          pitch: event.pitch,
          onsetBeat:
            (measure.measureNumber - 1) * meterNumerator + cursorBeat,
          onsetBeatInMeasure: cursorBeat,
          duration: event.duration,
          durationBeats,
          x,
          y: PITCH_Y[event.pitch],
          head: event.duration === "half" ? "open" : "filled",
          hasStem: true,
          hasEighthFlag: event.duration === "eighth",
          hasC4LedgerLine: event.pitch === "C4",
          accessibleLabel:
            `${positionLabel}，${event.pitch} ${DURATION_LABELS[event.duration]}音符`,
        });
      } else {
        tokens.push({
          eventId: event.id,
          location,
          type: "rest",
          pitch: null,
          onsetBeat:
            (measure.measureNumber - 1) * meterNumerator + cursorBeat,
          onsetBeatInMeasure: cursorBeat,
          duration: event.duration,
          durationBeats,
          x,
          y: 66,
          rest: "quarter",
          accessibleLabel: `${positionLabel}，四分休止符`,
        });
      }
      cursorBeat += durationBeats;
    }

    if (cursorBeat < meterNumerator) {
      warnings.push(
        `第一声部第 ${measure.measureNumber} 小节未填满 ${document.meter}。`,
      );
    }
    measures.push({
      measureNumber: measure.measureNumber,
      startX,
      endX,
      barlineX: endX,
      usedBeats: cursorBeat,
      capacityBeats: meterNumerator,
      tokens,
    });
  }

  const width =
    LOCAL_SCORE_STAFF_HEADER_WIDTH
    + measures.length * LOCAL_SCORE_STAFF_MEASURE_WIDTH
    + LOCAL_SCORE_STAFF_MEASURE_PADDING;
  return {
    status: "ready",
    documentId: document.documentId,
    revision: document.revision,
    meter: document.meter,
    meterNumerator,
    meterDenominator: 4,
    width,
    height: LOCAL_SCORE_STAFF_HEIGHT,
    partId: part.partId,
    staffId: staff.staffId,
    voiceId: voice.voiceId,
    measures,
    tokens: measures.flatMap((measure) => measure.tokens),
    warnings,
  };
};
