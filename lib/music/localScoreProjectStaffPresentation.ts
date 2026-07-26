import type {
  NotationDuration,
  NotationPitch,
} from "../practice/localNotationFragmentDraft";
import {
  getLocalScoreProjectEventDurationBeats,
  hasValidLocalScoreProjectTies,
  isLocalScoreProjectContent,
  LOCAL_SCORE_PROJECT_TIE_CONTINUITY_ERROR,
} from "./localScoreProject";
import type {
  LocalNotationProjectScoreDocumentV3,
  LocalNotationProjectScoreDocumentV4,
  LocalNotationProjectScoreDocumentV5,
} from "./scoreDocument";

export const LOCAL_SCORE_STAFF_HEIGHT = 148;
export const LOCAL_SCORE_STAFF_LINE_Y = [36, 48, 60, 72, 84] as const;
export const LOCAL_SCORE_BASS_STAFF_HEIGHT = 196;
export const LOCAL_SCORE_BASS_STAFF_LINE_Y = [96, 108, 120, 132, 144] as const;
export const LOCAL_SCORE_STAFF_HEADER_WIDTH = 96;
export const LOCAL_SCORE_STAFF_MEASURE_WIDTH = 240;
export const LOCAL_SCORE_STAFF_MEASURE_PADDING = 24;

export type LocalScoreStaffEventLocation = Readonly<{
  partId: string;
  staffId: string;
  voiceId: string;
  measureNumber: number;
}>;

export type LocalScoreProjectVoiceTarget = Readonly<{
  partId: string;
  staffId: string;
  voiceId: string;
}>;

export const getLocalScoreProjectVoiceIdentityLabel = (
  target: LocalScoreProjectVoiceTarget,
) => `声部组 ${target.partId}／谱表 ${target.staffId}／声部 ${target.voiceId}`;

type LocalScoreStaffTokenBase = Readonly<{
  eventId: string;
  location: LocalScoreStaffEventLocation;
  onsetBeat: number;
  onsetBeatInMeasure: number;
  duration: NotationDuration;
  durationBeats: number;
  augmentationDots: 0 | 1;
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
  accidental: "natural" | null;
  ledgerLineYs: readonly number[];
  tieToNext: boolean;
  tieTargetEventId: string | null;
  lyric: string | null;
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
    meter: LocalNotationProjectScoreDocumentV3["meter"];
    meterNumerator: number;
    meterDenominator: 4;
    clef: "treble" | "bass";
    clefLabel: "高音谱号" | "低音谱号";
    clefGlyph: "𝄞" | "𝄢";
    clefGlyphY: number;
    keySignatureFifths: -1 | 0 | 1;
    keySignatureLabel:
      | "无升降号"
      | "一个升号（F♯）"
      | "一个降号（B♭）";
    keySignatureGlyph: "♯" | "♭" | null;
    keySignatureGlyphY: number | null;
    staffLineYs: readonly [number, number, number, number, number];
    restY: number;
    lyricY: number;
    width: number;
    height: number;
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

const DURATION_LABELS: Readonly<Record<NotationDuration, string>> = {
  half: "二分",
  quarter: "四分",
  eighth: "八分",
};

const TREBLE_PITCH_Y: Readonly<Record<NotationPitch, number>> = {
  C4: 96,
  D4: 90,
  E4: 84,
  F4: 78,
  G4: 72,
  A4: 66,
  B4: 60,
  C5: 54,
};

const BASS_PITCH_Y: Readonly<Record<NotationPitch, number>> = {
  C4: 84,
  D4: 78,
  E4: 72,
  F4: 66,
  G4: 60,
  A4: 54,
  B4: 48,
  C5: 42,
};

const getLedgerLineYs = ({
  y,
  staffLineYs,
}: {
  y: number;
  staffLineYs: readonly [number, number, number, number, number];
}) => {
  const ledgerLineYs: number[] = [];
  const top = staffLineYs[0];
  const bottom = staffLineYs[4];
  if (y < top) {
    for (let ledgerY = top - 12; ledgerY >= y; ledgerY -= 12) {
      ledgerLineYs.push(ledgerY);
    }
  } else if (y > bottom) {
    for (let ledgerY = bottom + 12; ledgerY <= y; ledgerY += 12) {
      ledgerLineYs.push(ledgerY);
    }
  }
  return ledgerLineYs;
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

const isPresentationContent = (
  document: Record<string, unknown>,
): boolean =>
  Array.isArray(document.parts)
  && isLocalScoreProjectContent({
    meter: document.meter,
    keySignature: document.keySignature,
    parts: document.parts.map((part, index) =>
      isRecord(part)
        ? {
          ...part,
          name: typeof part.name === "string"
            ? part.name
            : `声部组 ${index + 1}`,
          instrument: isRecord(part.instrument)
            ? part.instrument
            : { kind: "unassigned" },
        }
        : part),
  });

const isLocalScoreProjectDocument = (
  document: unknown,
): document is
  | LocalNotationProjectScoreDocumentV3
  | LocalNotationProjectScoreDocumentV4
  | LocalNotationProjectScoreDocumentV5 =>
  isRecord(document)
  && (
    document.schemaVersion === "score-document-v3"
    || document.schemaVersion === "score-document-v4"
    || document.schemaVersion === "score-document-v5"
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
  && isPresentationContent(document);

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
  target?: LocalScoreProjectVoiceTarget,
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
  if (!hasValidLocalScoreProjectTies({
    meter: document.meter,
    parts: document.parts.map((part, index) => ({
      ...part,
      name: "name" in part ? part.name : `声部组 ${index + 1}`,
    })),
  })) {
    return blocked(`${LOCAL_SCORE_PROJECT_TIE_CONTINUITY_ERROR}无法安全生成五线谱预览。`);
  }

  const part = target
    ? document.parts.find((candidate) => candidate.partId === target.partId)
    : document.parts[0];
  const staff = target
    ? part?.staves.find((candidate) => candidate.staffId === target.staffId)
    : part?.staves[0];
  const voice = target
    ? staff?.voices.find((candidate) => candidate.voiceId === target.voiceId)
    : staff?.voices[0];
  if (!part || !staff || !voice) {
    return blocked(target
      ? `未找到指定的当前声部（${getLocalScoreProjectVoiceIdentityLabel(target)}），无法安全生成五线谱预览。`
      : "当前项目没有可展示的当前声部（默认第一声部组／谱表／声部）。");
  }
  const voiceIdentity = getLocalScoreProjectVoiceIdentityLabel({
    partId: part.partId,
    staffId: staff.staffId,
    voiceId: voice.voiceId,
  });
  const clef = staff.clef;
  const keySignatureFifths = document.keySignature.fifths;
  const staffLineYs = clef === "bass"
    ? LOCAL_SCORE_BASS_STAFF_LINE_Y
    : LOCAL_SCORE_STAFF_LINE_Y;
  const pitchY = clef === "bass" ? BASS_PITCH_Y : TREBLE_PITCH_Y;
  const clefLabel = clef === "bass" ? "低音谱号" : "高音谱号";
  const keySignatureLabel = keySignatureFifths === 1
    ? "一个升号（F♯）"
    : keySignatureFifths === -1
      ? "一个降号（B♭）"
      : "无升降号";
  const keySignatureGlyph = keySignatureFifths === 1
    ? "♯"
    : keySignatureFifths === -1
      ? "♭"
      : null;
  const keySignatureGlyphY = keySignatureFifths === 1
    ? (clef === "bass" ? 108 : 36)
    : keySignatureFifths === -1
      ? (clef === "bass" ? 132 : 60)
      : null;

  const meterNumerator = Number(document.meter.split("/")[0]);
  const warnings: string[] = [];
  const measures: LocalScoreStaffMeasureLayout[] = [];
  const orderedEvents = voice.measures.flatMap((measure) => measure.events);
  const eventIndexById = new Map(
    orderedEvents.map((event, index) => [event.id, index]),
  );

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
      const durationBeats = getLocalScoreProjectEventDurationBeats(event);
      if (cursorBeat + durationBeats > meterNumerator) {
        return blocked(
          `当前声部（${voiceIdentity}）第 ${measure.measureNumber} 小节超过 ${document.meter} 拍号容量。`,
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
        const orderedEventIndex = eventIndexById.get(event.id);
        const tieTarget = event.tieToNext && orderedEventIndex !== undefined
          ? orderedEvents[orderedEventIndex + 1]
          : undefined;
        const accidental = (
          (keySignatureFifths === 1 && event.pitch === "F4")
          || (keySignatureFifths === -1 && event.pitch === "B4")
        ) ? "natural" as const : null;
        const detailLabels = [
          accidental === "natural" ? "还原号" : "",
          `${event.augmentationDots === 1 ? "附点" : ""}${DURATION_LABELS[event.duration]}音符`,
          event.tieToNext ? "与下一音符用延音线相连" : "",
          event.lyric === null ? "" : `歌词“${event.lyric}”`,
        ].filter(Boolean);
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
          augmentationDots: event.augmentationDots,
          x,
          y: pitchY[event.pitch],
          head: event.duration === "half" ? "open" : "filled",
          hasStem: true,
          hasEighthFlag: event.duration === "eighth",
          accidental,
          ledgerLineYs: getLedgerLineYs({
            y: pitchY[event.pitch],
            staffLineYs,
          }),
          tieToNext: event.tieToNext,
          tieTargetEventId: tieTarget?.id ?? null,
          lyric: event.lyric,
          accessibleLabel:
            `${positionLabel}，${event.pitch} ${detailLabels.join("，")}`,
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
          augmentationDots: event.augmentationDots,
          x,
          y: clef === "bass" ? 126 : 66,
          rest: "quarter",
          accessibleLabel:
            `${positionLabel}，${event.augmentationDots === 1 ? "附点" : ""}四分休止符`,
        });
      }
      cursorBeat += durationBeats;
    }

    if (cursorBeat < meterNumerator) {
      warnings.push(
        `当前声部（${voiceIdentity}）第 ${measure.measureNumber} 小节未填满 ${document.meter}。`,
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
    clef,
    clefLabel,
    clefGlyph: clef === "bass" ? "𝄢" : "𝄞",
    clefGlyphY: clef === "bass" ? 151 : 87,
    keySignatureFifths,
    keySignatureLabel,
    keySignatureGlyph,
    keySignatureGlyphY,
    staffLineYs,
    restY: clef === "bass" ? 126 : 66,
    lyricY: clef === "bass" ? 180 : 124,
    width,
    height: clef === "bass"
      ? LOCAL_SCORE_BASS_STAFF_HEIGHT
      : LOCAL_SCORE_STAFF_HEIGHT,
    partId: part.partId,
    staffId: staff.staffId,
    voiceId: voice.voiceId,
    measures,
    tokens: measures.flatMap((measure) => measure.tokens),
    warnings,
  };
};
