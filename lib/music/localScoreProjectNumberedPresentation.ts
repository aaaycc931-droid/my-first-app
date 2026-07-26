import type {
  NotationDuration,
  NotationPitch,
} from "../practice/localNotationFragmentDraft";
import {
  createLocalScoreProjectStaffPresentation,
  type LocalScoreProjectVoiceTarget,
  type LocalScoreStaffEventLocation,
} from "./localScoreProjectStaffPresentation";

export type LocalScoreNumberedTokenBase = Readonly<{
  eventId: string;
  location: LocalScoreStaffEventLocation;
  onsetBeat: number;
  onsetBeatInMeasure: number;
  duration: NotationDuration;
  durationBeats: number;
  augmentationDots: 0 | 1;
  accessibleLabel: string;
}>;

export type LocalScoreNumberedNoteToken =
  LocalScoreNumberedTokenBase & Readonly<{
    type: "note";
    pitch: NotationPitch;
    degree: 1 | 2 | 3 | 4 | 5 | 6 | 7;
    octave: "base" | "upper";
    sustainDashes: 0 | 1;
    underlineCount: 0 | 1;
    tieToNext: boolean;
    tieTargetEventId: string | null;
    lyric: string | null;
  }>;

export type LocalScoreNumberedRestToken =
  LocalScoreNumberedTokenBase & Readonly<{
    type: "rest";
    degree: 0;
    sustainDashes: 0;
    underlineCount: 0;
  }>;

export type LocalScoreNumberedToken =
  | LocalScoreNumberedNoteToken
  | LocalScoreNumberedRestToken;

type LocalScoreNumberedTokenWithoutLabel =
  | Omit<LocalScoreNumberedNoteToken, "accessibleLabel">
  | Omit<LocalScoreNumberedRestToken, "accessibleLabel">;

export type LocalScoreNumberedMeasure = Readonly<{
  measureNumber: number;
  usedBeats: number;
  capacityBeats: number;
  tokens: readonly LocalScoreNumberedToken[];
}>;

export type LocalScoreNumberedPresentation =
  | Readonly<{
    status: "ready";
    documentId: string;
    revision: number;
    meter: string;
    keySignatureFifths: -1 | 0 | 1;
    keySignatureLabel:
      | "无升降号"
      | "一个升号（F♯）"
      | "一个降号（B♭）";
    partId: string;
    staffId: string;
    voiceId: string;
    measures: readonly LocalScoreNumberedMeasure[];
    tokens: readonly LocalScoreNumberedToken[];
    warnings: readonly string[];
  }>
  | Readonly<{
    status: "blocked";
    documentId: string | null;
    revision: number | null;
    reason: string;
  }>;

const FIXED_C_PITCHES: Readonly<
  Record<
    NotationPitch,
    Readonly<{
      degree: 1 | 2 | 3 | 4 | 5 | 6 | 7;
      octave: "base" | "upper";
    }>
  >
> = {
  C4: { degree: 1, octave: "base" },
  D4: { degree: 2, octave: "base" },
  E4: { degree: 3, octave: "base" },
  F4: { degree: 4, octave: "base" },
  G4: { degree: 5, octave: "base" },
  A4: { degree: 6, octave: "base" },
  B4: { degree: 7, octave: "base" },
  C5: { degree: 1, octave: "upper" },
};

const DURATION_LABELS: Readonly<Record<NotationDuration, string>> = {
  half: "二分",
  quarter: "四分",
  eighth: "八分",
};

const createAccessibleLabel = (
  token: LocalScoreNumberedTokenWithoutLabel,
) => {
  const position =
    `第 ${token.location.measureNumber} 小节，固定 C 简谱`;
  const duration = token.augmentationDots === 1
    ? `附点${DURATION_LABELS[token.duration]}`
    : DURATION_LABELS[token.duration];
  if (token.type === "rest") {
    return `${position}，0，${duration}休止符`;
  }
  const octave = token.octave === "upper" ? "高音" : "";
  const tie = token.tieToNext ? "，与下一音符用延音线相连" : "";
  const lyric = token.lyric === null ? "" : `，歌词“${token.lyric}”`;
  return `${position}，${octave}${token.degree}（${token.pitch}），${duration}音符${tie}${lyric}`;
};

export const createLocalScoreProjectNumberedPresentation = (
  document: unknown,
  target?: LocalScoreProjectVoiceTarget,
): LocalScoreNumberedPresentation => {
  const staff = createLocalScoreProjectStaffPresentation(document, target);
  if (staff.status === "blocked") return staff;

  const tokenByEventId = new Map<string, LocalScoreNumberedToken>();
  const measures = staff.measures.map((measure) => {
    const tokens = measure.tokens.map((token): LocalScoreNumberedToken => {
      const base = {
        eventId: token.eventId,
        location: token.location,
        onsetBeat: token.onsetBeat,
        onsetBeatInMeasure: token.onsetBeatInMeasure,
        duration: token.duration,
        durationBeats: token.durationBeats,
        augmentationDots: token.augmentationDots,
      };
      const withoutLabel: LocalScoreNumberedTokenWithoutLabel =
        token.type === "rest"
        ? {
          ...base,
          type: "rest",
          degree: 0,
          sustainDashes: 0,
          underlineCount: 0,
        }
        : {
          ...base,
          type: "note",
          pitch: token.pitch,
          ...FIXED_C_PITCHES[token.pitch],
          sustainDashes: token.duration === "half" ? 1 : 0,
          underlineCount: token.duration === "eighth" ? 1 : 0,
          tieToNext: token.tieToNext,
          tieTargetEventId: token.tieTargetEventId,
          lyric: token.lyric,
        };
      const numbered = {
        ...withoutLabel,
        accessibleLabel: createAccessibleLabel(withoutLabel),
      } as LocalScoreNumberedToken;
      tokenByEventId.set(numbered.eventId, numbered);
      return numbered;
    });
    return {
      measureNumber: measure.measureNumber,
      usedBeats: measure.usedBeats,
      capacityBeats: measure.capacityBeats,
      tokens,
    };
  });

  return {
    status: "ready",
    documentId: staff.documentId,
    revision: staff.revision,
    meter: staff.meter,
    keySignatureFifths: staff.keySignatureFifths,
    keySignatureLabel: staff.keySignatureLabel,
    partId: staff.partId,
    staffId: staff.staffId,
    voiceId: staff.voiceId,
    measures,
    tokens: Array.from(tokenByEventId.values()),
    warnings: staff.warnings,
  };
};
