import type {
  LegacyLocalPracticeDifficulty,
  LocalPracticeCatalogMode,
  LocalPracticeDifficulty,
} from "./localPracticeCatalog";

export type EarTrainingDifficulty = LocalPracticeDifficulty;
export type EarTrainingDirection = "上行" | "下行";

export type LocalEarTrainingInterval = {
  id: string;
  label: string;
  semitones: number;
  explanation: string;
};

type QuestionRoot = { id: string; label: string; frequencyHz: number };
type IntervalVariant = { variantId: string; root: QuestionRoot; interval: LocalEarTrainingInterval };

export type LocalEarTrainingQuestion = {
  id: string;
  variantId: string;
  difficulty: EarTrainingDifficulty;
  direction: EarTrainingDirection;
  rootLabel: string;
  rootFrequencyHz: number;
  interval: LocalEarTrainingInterval;
};

const interval = (id: string, label: string, semitones: number): LocalEarTrainingInterval => ({
  id,
  label,
  semitones,
  explanation: `两个音相差 ${semitones} 个半音。`,
});

const intervalLibrary = {
  "minor-second": interval("minor-second", "小二度", 1),
  "major-second": interval("major-second", "大二度", 2),
  "minor-third": interval("minor-third", "小三度", 3),
  "major-third": interval("major-third", "大三度", 4),
  "perfect-fourth": interval("perfect-fourth", "纯四度", 5),
  tritone: interval("tritone", "三全音", 6),
  "perfect-fifth": interval("perfect-fifth", "纯五度", 7),
  "minor-sixth": interval("minor-sixth", "小六度", 8),
  "major-sixth": interval("major-sixth", "大六度", 9),
  "minor-seventh": interval("minor-seventh", "小七度", 10),
  "major-seventh": interval("major-seventh", "大七度", 11),
  "perfect-octave": interval("perfect-octave", "纯八度", 12),
} as const;

export const earTrainingIntervals: Record<LegacyLocalPracticeDifficulty, LocalEarTrainingInterval[]> = {
  基础: [
    intervalLibrary["major-third"],
    intervalLibrary["perfect-fourth"],
    intervalLibrary["perfect-fifth"],
  ],
  进阶: [
    intervalLibrary["minor-second"],
    intervalLibrary["major-second"],
    intervalLibrary["minor-third"],
    intervalLibrary["major-third"],
    intervalLibrary["perfect-fourth"],
    intervalLibrary["perfect-fifth"],
  ],
};

const rootLibrary = {
  c4: { id: "c4", label: "C4", frequencyHz: 261.63 },
  d4: { id: "d4", label: "D4", frequencyHz: 293.66 },
  e4: { id: "e4", label: "E4", frequencyHz: 329.63 },
  f4: { id: "f4", label: "F4", frequencyHz: 349.23 },
  g4: { id: "g4", label: "G4", frequencyHz: 392 },
  a4: { id: "a4", label: "A4", frequencyHz: 440 },
  b4: { id: "b4", label: "B4", frequencyHz: 493.88 },
} as const;

const legacyRoots = [rootLibrary.c4, rootLibrary.d4, rootLibrary.e4, rootLibrary.g4];
const getIntervalVariantId = (rootId: string, intervalId: string): string =>
  `interval:${rootId}:${intervalId}`;
const buildVariants = (
  roots: readonly QuestionRoot[],
  intervals: readonly LocalEarTrainingInterval[],
): IntervalVariant[] => roots.flatMap((root) => intervals.map((candidate) => ({
  variantId: getIntervalVariantId(root.id, candidate.id),
  root,
  interval: candidate,
})));

const legacyVariants: Record<LegacyLocalPracticeDifficulty, IntervalVariant[]> = {
  基础: buildVariants(legacyRoots, earTrainingIntervals.基础),
  进阶: buildVariants(legacyRoots, earTrainingIntervals.进阶),
};

const expandedVariants: Record<LocalPracticeDifficulty, IntervalVariant[]> = {
  基础: buildVariants(
    Object.values(rootLibrary),
    earTrainingIntervals.基础,
  ),
  进阶: legacyVariants.进阶,
  挑战: buildVariants(
    [rootLibrary.c4, rootLibrary.e4],
    Object.values(intervalLibrary),
  ),
};

const getVariants = (
  difficulty: EarTrainingDifficulty,
  catalogMode: LocalPracticeCatalogMode,
): IntervalVariant[] => catalogMode === "legacy-v1"
  ? (difficulty === "挑战" ? [] : legacyVariants[difficulty])
  : expandedVariants[difficulty];

export const getLocalEarTrainingIntervals = (
  difficulty: EarTrainingDifficulty,
  catalogMode: LocalPracticeCatalogMode,
): LocalEarTrainingInterval[] => Array.from(
  new Map(getVariants(difficulty, catalogMode).map((item) => [item.interval.id, item.interval])).values(),
);

export const isLocalEarTrainingIntervalVariantId = (
  difficulty: EarTrainingDifficulty,
  variantId: string,
): boolean => expandedVariants[difficulty].some((candidate) => candidate.variantId === variantId);

export const getLocalEarTrainingQuestionVariantCount = (
  difficulty: EarTrainingDifficulty,
  catalogMode: LocalPracticeCatalogMode = "legacy-v1",
): number => getVariants(difficulty, catalogMode).length;

export const createLocalEarTrainingQuestion = ({
  difficulty,
  direction,
  sequence,
  questionIndex,
  variantId,
  catalogMode = "legacy-v1",
}: {
  difficulty: EarTrainingDifficulty;
  direction: EarTrainingDirection;
  sequence: number;
  questionIndex?: number;
  variantId?: string;
  catalogMode?: LocalPracticeCatalogMode;
}): LocalEarTrainingQuestion => {
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.floor(sequence)) : 0;
  const safeQuestionIndex = questionIndex !== undefined && Number.isFinite(questionIndex)
    ? Math.max(0, Math.floor(questionIndex))
    : safeSequence;
  const variants = getVariants(difficulty, catalogMode);
  const resolved = variantId === undefined
    ? variants[safeQuestionIndex % variants.length]
    : expandedVariants[difficulty].find((candidate) => candidate.variantId === variantId);
  if (!resolved) throw new Error("Invalid local interval variant id.");

  return {
    id: `${difficulty}-${direction}-${safeSequence}-${resolved.interval.id}-${resolved.root.label}`,
    variantId: resolved.variantId,
    difficulty,
    direction,
    rootLabel: resolved.root.label,
    rootFrequencyHz: resolved.root.frequencyHz,
    interval: resolved.interval,
  };
};

export const getIntervalTargetFrequencyHz = (question: LocalEarTrainingQuestion): number =>
  question.rootFrequencyHz
  * 2 ** ((question.direction === "上行" ? 1 : -1) * question.interval.semitones / 12);

export const getLocalEarTrainingDirectionDescription = (
  direction: EarTrainingDirection,
): string => direction === "上行"
  ? "第一个音较低，第二个音较高。"
  : "第一个音较高，第二个音较低。";

export const getLocalEarTrainingAnswer = ({
  question,
  selectedIntervalId,
}: {
  question: LocalEarTrainingQuestion;
  selectedIntervalId: string | null;
}) => ({
  selectedIntervalId,
  hasSelection: selectedIntervalId !== null,
  matchesAnswer: selectedIntervalId === question.interval.id,
  answerLabel: question.interval.label,
  explanation: question.interval.explanation,
});

export const hasLocalEarTrainingAssessmentFields = (value: object): boolean =>
  ["score", "grade", "pass", "fail", "accuracyPercentage"].some((field) => field in value);
