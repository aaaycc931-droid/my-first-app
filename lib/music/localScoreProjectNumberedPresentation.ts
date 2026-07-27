import type {
  NotationDuration,
  NotationPitch,
} from "../practice/localNotationFragmentDraft";
import {
  createLocalScoreProjectStaffPresentation,
  type LocalScoreCreditsPresentation,
  type LocalScoreProjectVoiceTarget,
  type LocalScoreStaffEventLocation,
} from "./localScoreProjectStaffPresentation";
import type {
  LocalScoreProjectArticulationV1,
  LocalScoreProjectDamperPedalMarkV1,
  LocalScoreProjectDynamicMarkV1,
  LocalScoreProjectFingeringV1,
  LocalScoreProjectFermataMarkV1,
} from "./scoreDocument";

export type LocalScoreNumberedTokenBase = Readonly<{
  eventId: string;
  location: LocalScoreStaffEventLocation;
  onsetBeat: number;
  onsetBeatInMeasure: number;
  duration: NotationDuration;
  durationBeats: number;
  augmentationDots: 0 | 1;
  chordSymbol: string | null;
  dynamicMark: LocalScoreProjectDynamicMarkV1 | null;
  damperPedalMark: LocalScoreProjectDamperPedalMarkV1 | null;
  fermataMark: LocalScoreProjectFermataMarkV1 | null;
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
    slurToNext: boolean;
    slurTargetEventId: string | null;
    lyric: string | null;
    fingering: LocalScoreProjectFingeringV1 | null;
    articulations: readonly LocalScoreProjectArticulationV1[];
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
    scoreCredits: LocalScoreCreditsPresentation;
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

export const LOCAL_SCORE_PROJECT_ARTICULATION_LABELS:
Readonly<Record<LocalScoreProjectArticulationV1, string>> = {
  accent: "重音",
  staccato: "断奏",
  tenuto: "保持",
};

const LOCAL_SCORE_PROJECT_DYNAMIC_MARK_LABELS:
Readonly<Record<LocalScoreProjectDynamicMarkV1, string>> = {
  pp: "很弱",
  p: "弱",
  mp: "中弱",
  mf: "中强",
  f: "强",
  ff: "很强",
};

const LOCAL_SCORE_PROJECT_DAMPER_PEDAL_MARK_LABELS:
Readonly<Record<LocalScoreProjectDamperPedalMarkV1, string>> = {
  down: "踩下制音踏板",
  up: "释放制音踏板",
};

const createAccessibleLabel = (
  token: LocalScoreNumberedTokenWithoutLabel,
) => {
  const position =
    `第 ${token.location.measureNumber} 小节，固定 C 简谱`;
  const chord = token.chordSymbol === null
    ? ""
    : `，和弦名称“${token.chordSymbol}”`;
  const dynamic = token.dynamicMark === null
    ? ""
    : `，力度记号 ${LOCAL_SCORE_PROJECT_DYNAMIC_MARK_LABELS[token.dynamicMark]}（${token.dynamicMark}）`;
  const damper = token.damperPedalMark === null
    ? ""
    : `，${LOCAL_SCORE_PROJECT_DAMPER_PEDAL_MARK_LABELS[token.damperPedalMark]}（${token.damperPedalMark}）`;
  const fermata = token.fermataMark === null ? "" : "，延长记号";
  const duration = token.augmentationDots === 1
    ? `附点${DURATION_LABELS[token.duration]}`
    : DURATION_LABELS[token.duration];
  if (token.type === "rest") {
    return `${position}，0，${duration}休止符${chord}${dynamic}${damper}${fermata}`;
  }
  const octave = token.octave === "upper" ? "高音" : "";
  const tie = token.tieToNext ? "，与下一音符用延音线相连" : "";
  const slur = token.slurToNext ? "，与下一音符用圆滑线相连" : "";
  const lyric = token.lyric === null ? "" : `，歌词“${token.lyric}”`;
  const fingering = token.fingering === null
    ? ""
    : `，指法 ${token.fingering}`;
  const articulations = token.articulations.length === 0
    ? ""
    : `，演奏法：${token.articulations
      .map((articulation) =>
        LOCAL_SCORE_PROJECT_ARTICULATION_LABELS[articulation])
      .join("、")}`;
  return `${position}，${octave}${token.degree}（${token.pitch}），${duration}音符${chord}${dynamic}${damper}${fermata}${tie}${slur}${lyric}${fingering}${articulations}`;
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
        chordSymbol: token.chordSymbol,
        dynamicMark: token.dynamicMark,
        damperPedalMark: token.damperPedalMark,
        fermataMark: token.fermataMark,
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
          slurToNext: token.slurToNext,
          slurTargetEventId: token.slurTargetEventId,
          lyric: token.lyric,
          fingering: token.fingering,
          articulations: token.articulations,
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
    scoreCredits: staff.scoreCredits,
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
