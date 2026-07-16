import type {
  LegacyLocalPracticeDifficulty,
  LocalPracticeCatalogMode,
  LocalPracticeDifficulty,
} from "./localPracticeCatalog";

export type EarTrainingRhythmDifficulty = LocalPracticeDifficulty;

export type LocalEarTrainingRhythmPattern = {
  id: string;
  label: string;
  onsetBeats: number[];
  explanation: string;
};

type RhythmVariant = {
  variantId: string;
  pattern: LocalEarTrainingRhythmPattern;
  bpm: number;
};

export type LocalEarTrainingRhythmQuestion = {
  id: string;
  variantId: string;
  difficulty: EarTrainingRhythmDifficulty;
  sequence: number;
  bpm: number;
  beatsPerMeasure: 4;
  pattern: LocalEarTrainingRhythmPattern;
};

const pattern = (
  id: string,
  label: string,
  onsetBeats: number[],
  explanation: string,
): LocalEarTrainingRhythmPattern => ({ id, label, onsetBeats, explanation });

const patternLibrary = {
  "even-quarters": pattern(
    "even-quarters",
    "四拍均匀",
    [0, 1, 2, 3],
    "每一拍开头各有一次击拍，四拍之间的间隔相同。",
  ),
  "front-dense": pattern(
    "front-dense",
    "前半小节更密",
    [0, 0.5, 1, 1.5, 2, 3],
    "前两拍各被分成两个更短的击拍，后两拍回到每拍一次。",
  ),
  "back-dense": pattern(
    "back-dense",
    "后半小节更密",
    [0, 1, 2, 2.5, 3, 3.5],
    "前两拍每拍一次，后两拍各被分成两个更短的击拍。",
  ),
  "even-eighths": pattern(
    "even-eighths",
    "八分音符均匀",
    [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
    "四拍都均匀分成两个八分位置。",
  ),
  "outer-dense": pattern(
    "outer-dense",
    "首尾更密",
    [0, 0.5, 1, 2, 3, 3.5],
    "第一拍和最后一拍更密，中间保持每拍一次。",
  ),
  "middle-gap": pattern(
    "middle-gap",
    "中间留空",
    [0, 0.5, 2.5, 3],
    "第一拍有两个较短击拍，中间留空，末尾再次出现击拍。",
  ),
  "syncopated-bridge": pattern(
    "syncopated-bridge",
    "切分连接",
    [0, 0.5, 1.5, 2, 3],
    "弱拍位置连接到后续正拍，需要辨认中间的切分感。",
  ),
  "staggered-eighths": pattern(
    "staggered-eighths",
    "错落八分",
    [0, 1, 1.5, 2.5, 3],
    "八分位置分散在小节中部和末尾。",
  ),
  "sixteenth-burst": pattern(
    "sixteenth-burst",
    "十六分音符短组",
    [0, 0.25, 0.5, 0.75, 2, 3],
    "开头是一组四个十六分位置，后半回到较疏的正拍。",
  ),
  "opening-triplet": pattern(
    "opening-triplet",
    "开头三连音",
    [0, 1 / 3, 2 / 3, 1, 2, 3],
    "第一拍包含均分三连音位置，后面回到正拍。",
  ),
} as const;

export const earTrainingRhythmPatterns: Record<
  LegacyLocalPracticeDifficulty,
  LocalEarTrainingRhythmPattern[]
> = {
  基础: [
    patternLibrary["even-quarters"],
    patternLibrary["front-dense"],
    patternLibrary["back-dense"],
  ],
  进阶: [
    patternLibrary["even-quarters"],
    patternLibrary["front-dense"],
    patternLibrary["back-dense"],
    patternLibrary["middle-gap"],
  ],
};

const expandedPatterns: Record<LocalPracticeDifficulty, LocalEarTrainingRhythmPattern[]> = {
  基础: [
    patternLibrary["even-quarters"],
    patternLibrary["front-dense"],
    patternLibrary["back-dense"],
    patternLibrary["even-eighths"],
    patternLibrary["outer-dense"],
  ],
  进阶: [
    patternLibrary["even-quarters"],
    patternLibrary["front-dense"],
    patternLibrary["back-dense"],
    patternLibrary["even-eighths"],
    patternLibrary["outer-dense"],
    patternLibrary["middle-gap"],
    patternLibrary["syncopated-bridge"],
    patternLibrary["staggered-eighths"],
  ],
  挑战: Object.values(patternLibrary),
};

const legacyBpm: Record<LegacyLocalPracticeDifficulty, number> = { 基础: 84, 进阶: 100 };
const expandedBpms: Record<LocalPracticeDifficulty, number[]> = {
  基础: [72, 84, 92, 104],
  进阶: [88, 100, 112],
  挑战: [96, 120],
};

const legacyVariantId = (patternId: string): string => `rhythm:${patternId}`;
const explicitVariantId = (patternId: string, bpm: number): string =>
  `rhythm:${patternId}:bpm-${bpm}`;

const buildExpandedVariants = (difficulty: LocalPracticeDifficulty): RhythmVariant[] =>
  expandedPatterns[difficulty].flatMap((candidate) =>
    expandedBpms[difficulty].map((bpm) => {
      const canUseLegacyId = difficulty !== "挑战"
        && bpm === legacyBpm[difficulty]
        && earTrainingRhythmPatterns[difficulty].some((legacy) => legacy.id === candidate.id);
      return {
        variantId: canUseLegacyId
          ? legacyVariantId(candidate.id)
          : explicitVariantId(candidate.id, bpm),
        pattern: candidate,
        bpm,
      };
    }),
  );

const expandedVariants: Record<LocalPracticeDifficulty, RhythmVariant[]> = {
  基础: buildExpandedVariants("基础"),
  进阶: buildExpandedVariants("进阶"),
  挑战: buildExpandedVariants("挑战"),
};

const getVariants = (
  difficulty: EarTrainingRhythmDifficulty,
  catalogMode: LocalPracticeCatalogMode,
): RhythmVariant[] => catalogMode === "legacy-v1"
  ? (difficulty === "挑战" ? [] : earTrainingRhythmPatterns[difficulty].map((candidate) => ({
      variantId: legacyVariantId(candidate.id),
      pattern: candidate,
      bpm: legacyBpm[difficulty],
    })))
  : expandedVariants[difficulty];

export const getLocalEarTrainingRhythmPatterns = (
  difficulty: EarTrainingRhythmDifficulty,
  catalogMode: LocalPracticeCatalogMode,
): LocalEarTrainingRhythmPattern[] => Array.from(
  new Map(getVariants(difficulty, catalogMode).map((item) => [item.pattern.id, item.pattern])).values(),
);

export const getLocalEarTrainingRhythmVariantCount = (
  difficulty: EarTrainingRhythmDifficulty,
  catalogMode: LocalPracticeCatalogMode,
): number => getVariants(difficulty, catalogMode).length;

export const isLocalEarTrainingRhythmVariantId = (
  difficulty: EarTrainingRhythmDifficulty,
  variantId: string,
): boolean => expandedVariants[difficulty].some((candidate) => candidate.variantId === variantId);

export const createLocalEarTrainingRhythmQuestion = ({
  difficulty,
  sequence,
  questionIndex,
  variantId,
  catalogMode = "legacy-v1",
}: {
  difficulty: EarTrainingRhythmDifficulty;
  sequence: number;
  questionIndex?: number;
  variantId?: string;
  catalogMode?: LocalPracticeCatalogMode;
}): LocalEarTrainingRhythmQuestion => {
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.floor(sequence)) : 0;
  const safeQuestionIndex = questionIndex !== undefined && Number.isFinite(questionIndex)
    ? Math.max(0, Math.floor(questionIndex))
    : safeSequence;
  const variants = getVariants(difficulty, catalogMode);
  const resolved = variantId === undefined
    ? variants[safeQuestionIndex % variants.length]
    : expandedVariants[difficulty].find((candidate) => candidate.variantId === variantId);
  if (!resolved) throw new Error("Invalid local rhythm variant id.");

  return {
    id: resolved.variantId === legacyVariantId(resolved.pattern.id)
      ? `${difficulty}-${safeSequence}-${resolved.pattern.id}`
      : `${difficulty}-${safeSequence}-${resolved.pattern.id}-${resolved.bpm}`,
    variantId: resolved.variantId,
    difficulty,
    sequence: safeSequence,
    bpm: resolved.bpm,
    beatsPerMeasure: 4,
    pattern: resolved.pattern,
  };
};

export const getLocalEarTrainingRhythmAnswer = ({
  question,
  selectedPatternId,
}: {
  question: LocalEarTrainingRhythmQuestion;
  selectedPatternId: string | null;
}) => ({
  selectedPatternId,
  hasSelection: selectedPatternId !== null,
  matchesAnswer: selectedPatternId === question.pattern.id,
  answerLabel: question.pattern.label,
  explanation: question.pattern.explanation,
});

export const getLocalEarTrainingRhythmDurationMs = (question: LocalEarTrainingRhythmQuestion): number =>
  Math.ceil((question.beatsPerMeasure * 60_000) / question.bpm + 250);

export const hasLocalEarTrainingRhythmAssessmentFields = (value: object): boolean =>
  ["score", "grade", "pass", "fail", "accuracyPercentage"].some((field) => field in value);
