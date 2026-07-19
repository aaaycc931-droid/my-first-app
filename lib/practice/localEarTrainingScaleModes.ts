import type { LocalPracticeDifficulty } from "./localPracticeCatalog";

export type ScaleModeId =
  | "major"
  | "natural-minor"
  | "major-pentatonic"
  | "minor-pentatonic"
  | "harmonic-minor"
  | "melodic-minor-ascending"
  | "dorian"
  | "mixolydian"
  | "phrygian"
  | "lydian"
  | "locrian"
  | "whole-tone";

type ScaleModeDefinition = {
  id: ScaleModeId;
  label: string;
  intervals: readonly number[];
  structure: string;
  characteristic: string;
};

type ScaleTonic = {
  id: string;
  label: string;
  semitoneOffset: number;
};

export type LocalScaleModeAnswerOption = { id: ScaleModeId; label: string };

export type LocalEarTrainingScaleModeQuestion = {
  id: string;
  variantId: string;
  difficulty: LocalPracticeDifficulty;
  tonic: ScaleTonic;
  scaleMode: ScaleModeDefinition;
  answerOptionId: ScaleModeId;
  frequenciesHz: number[];
  explanation: string;
};

const scaleModes: Record<ScaleModeId, ScaleModeDefinition> = {
  major: {
    id: "major",
    label: "自然大调（伊奥尼亚）",
    intervals: [0, 2, 4, 5, 7, 9, 11, 12],
    structure: "全、全、半、全、全、全、半",
    characteristic: "大三度与大七度带来明亮、稳定的主音倾向",
  },
  "natural-minor": {
    id: "natural-minor",
    label: "自然小调（爱奥尼亚）",
    intervals: [0, 2, 3, 5, 7, 8, 10, 12],
    structure: "全、半、全、全、半、全、全",
    characteristic: "小三度、小六度与小七度形成自然小调色彩",
  },
  "major-pentatonic": {
    id: "major-pentatonic",
    label: "大调五声音阶",
    intervals: [0, 2, 4, 7, 9, 12],
    structure: "1、2、3、5、6、1",
    characteristic: "省略四级与七级，保留大三度的开阔五声色彩",
  },
  "minor-pentatonic": {
    id: "minor-pentatonic",
    label: "小调五声音阶",
    intervals: [0, 3, 5, 7, 10, 12],
    structure: "1、♭3、4、5、♭7、1",
    characteristic: "小三度与小七度构成常见的小调五声色彩",
  },
  "harmonic-minor": {
    id: "harmonic-minor",
    label: "和声小调",
    intervals: [0, 2, 3, 5, 7, 8, 11, 12],
    structure: "全、半、全、全、半、增二、半",
    characteristic: "升高的七级形成导音，并在六级与七级之间产生增二度",
  },
  "melodic-minor-ascending": {
    id: "melodic-minor-ascending",
    label: "旋律小调（上行形态）",
    intervals: [0, 2, 3, 5, 7, 9, 11, 12],
    structure: "全、半、全、全、全、全、半",
    characteristic: "保留小三度，同时升高六级与七级，使上行更平滑",
  },
  dorian: {
    id: "dorian",
    label: "多利亚调式",
    intervals: [0, 2, 3, 5, 7, 9, 10, 12],
    structure: "1、2、♭3、4、5、6、♭7、1",
    characteristic: "小三度与自然六级并存，自然六级是主要辨听线索",
  },
  mixolydian: {
    id: "mixolydian",
    label: "混合利底亚调式",
    intervals: [0, 2, 4, 5, 7, 9, 10, 12],
    structure: "1、2、3、4、5、6、♭7、1",
    characteristic: "大三度配合降低的七级，形成不依赖导音的开放色彩",
  },
  phrygian: {
    id: "phrygian",
    label: "弗里几亚调式",
    intervals: [0, 1, 3, 5, 7, 8, 10, 12],
    structure: "1、♭2、♭3、4、5、♭6、♭7、1",
    characteristic: "主音上方的小二度是最鲜明的辨听线索",
  },
  lydian: {
    id: "lydian",
    label: "利底亚调式",
    intervals: [0, 2, 4, 6, 7, 9, 11, 12],
    structure: "1、2、3、♯4、5、6、7、1",
    characteristic: "升高的四级形成增四度，是主要辨听线索",
  },
  locrian: {
    id: "locrian",
    label: "洛克里亚调式",
    intervals: [0, 1, 3, 5, 6, 8, 10, 12],
    structure: "1、♭2、♭3、4、♭5、♭6、♭7、1",
    characteristic: "降低的二级与五级削弱主和弦稳定感",
  },
  "whole-tone": {
    id: "whole-tone",
    label: "全音音阶",
    intervals: [0, 2, 4, 6, 8, 10, 12],
    structure: "连续六个全音",
    characteristic: "没有半音与纯五度主导的稳定重心，色彩均匀悬浮",
  },
};

const tonics: ScaleTonic[] = [
  { id: "c4", label: "C4", semitoneOffset: 0 },
  { id: "db4", label: "D♭4", semitoneOffset: 1 },
  { id: "d4", label: "D4", semitoneOffset: 2 },
  { id: "eb4", label: "E♭4", semitoneOffset: 3 },
  { id: "e4", label: "E4", semitoneOffset: 4 },
  { id: "f4", label: "F4", semitoneOffset: 5 },
  { id: "gb4", label: "G♭4", semitoneOffset: 6 },
  { id: "g4", label: "G4", semitoneOffset: 7 },
  { id: "ab4", label: "A♭4", semitoneOffset: 8 },
  { id: "a4", label: "A4", semitoneOffset: 9 },
  { id: "bb4", label: "B♭4", semitoneOffset: 10 },
  { id: "b4", label: "B4", semitoneOffset: 11 },
];

const modeIdsByDifficulty: Record<LocalPracticeDifficulty, readonly ScaleModeId[]> = {
  基础: ["major", "natural-minor", "major-pentatonic", "minor-pentatonic"],
  进阶: [
    "major", "natural-minor", "major-pentatonic", "minor-pentatonic",
    "harmonic-minor", "melodic-minor-ascending", "dorian", "mixolydian",
  ],
  挑战: [
    "major", "natural-minor", "major-pentatonic", "minor-pentatonic",
    "harmonic-minor", "melodic-minor-ascending", "dorian", "mixolydian",
    "phrygian", "lydian", "locrian", "whole-tone",
  ],
};

const variants = (difficulty: LocalPracticeDifficulty) => tonics.flatMap((tonic) =>
  modeIdsByDifficulty[difficulty].map((scaleModeId) => ({
    tonic,
    scaleMode: scaleModes[scaleModeId],
    variantId: `scale:${tonic.id}:${scaleModeId}`,
  })),
);

export const getLocalScaleModeVariantCount = (difficulty: LocalPracticeDifficulty) =>
  variants(difficulty).length;

export const getLocalScaleModeAnswerOptions = (
  difficulty: LocalPracticeDifficulty,
): LocalScaleModeAnswerOption[] => modeIdsByDifficulty[difficulty].map((id) => ({
  id,
  label: scaleModes[id].label,
}));

export const createLocalScaleModeQuestion = ({
  difficulty,
  sequence,
  questionIndex,
  variantId,
}: {
  difficulty: LocalPracticeDifficulty;
  sequence: number;
  questionIndex?: number;
  variantId?: string;
}): LocalEarTrainingScaleModeQuestion => {
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.floor(sequence)) : 0;
  const safeIndex = questionIndex !== undefined && Number.isFinite(questionIndex)
    ? Math.max(0, Math.floor(questionIndex))
    : safeSequence;
  const available = variants(difficulty);
  const resolved = variantId
    ? available.find((variant) => variant.variantId === variantId)
    : available[safeIndex % available.length];
  if (!resolved) throw new Error("Invalid local scale or mode variant id.");
  const tonicFrequencyHz = 261.625565 * 2 ** (resolved.tonic.semitoneOffset / 12);
  return {
    id: `${difficulty}-${safeSequence}-${resolved.tonic.id}-${resolved.scaleMode.id}`,
    variantId: resolved.variantId,
    difficulty,
    tonic: resolved.tonic,
    scaleMode: resolved.scaleMode,
    answerOptionId: resolved.scaleMode.id,
    frequenciesHz: resolved.scaleMode.intervals.map(
      (semitones) => tonicFrequencyHz * 2 ** (semitones / 12),
    ),
    explanation: `${resolved.tonic.label} 起音：${resolved.scaleMode.label}的音程结构是${resolved.scaleMode.structure}；${resolved.scaleMode.characteristic}。`,
  };
};

export const getLocalScaleModeAnswer = ({
  question,
  selectedOptionId,
}: {
  question: LocalEarTrainingScaleModeQuestion;
  selectedOptionId: ScaleModeId | null;
}) => ({
  selectedOptionId,
  hasSelection: selectedOptionId !== null,
  matchesAnswer: selectedOptionId === question.answerOptionId,
  answerLabel: question.scaleMode.label,
  explanation: question.explanation,
});

export { isLocalScaleModeVariantId } from "./localScaleModeCatalog";
