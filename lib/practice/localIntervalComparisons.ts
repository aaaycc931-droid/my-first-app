import {
  createLocalEarTrainingQuestion,
  getIntervalTargetFrequencyHz,
  getLocalEarTrainingIntervals,
  type EarTrainingDirection,
  type LocalEarTrainingQuestion,
} from "./localEarTrainingIntervals";
import type { LocalPracticeDifficulty } from "./localPracticeCatalog";

export type IntervalSizeRelation = "first-larger" | "second-larger" | "same-size";
export type IntervalDirectionRelation =
  | "both-ascending"
  | "both-descending"
  | "first-ascending-second-descending"
  | "first-descending-second-ascending";

export type LocalIntervalComparisonQuestion = {
  id: string;
  variantId: string;
  difficulty: LocalPracticeDifficulty;
  sequence: number;
  first: LocalEarTrainingQuestion;
  second: LocalEarTrainingQuestion;
  sizeRelation: IntervalSizeRelation;
  directionRelation: IntervalDirectionRelation;
};

export const intervalSizeOptions = [
  { id: "first-larger", label: "第一组更大" },
  { id: "second-larger", label: "第二组更大" },
  { id: "same-size", label: "两组一样大" },
] as const;

export const intervalDirectionOptions = [
  { id: "both-ascending", label: "两组都上行" },
  { id: "both-descending", label: "两组都下行" },
  { id: "first-ascending-second-descending", label: "第一组上行，第二组下行" },
  { id: "first-descending-second-ascending", label: "第一组下行，第二组上行" },
] as const;

const rootsByDifficulty = {
  基础: ["c4", "d4", "e4", "f4", "g4", "a4", "b4"],
  进阶: ["c4", "d4", "e4", "g4"],
  挑战: ["c4", "e4"],
} as const;
const directions: ReadonlyArray<readonly [EarTrainingDirection, EarTrainingDirection]> = [
  ["上行", "上行"],
  ["下行", "下行"],
  ["上行", "下行"],
  ["下行", "上行"],
];

type ComparisonVariant = {
  variantId: string;
  firstVariantId: string;
  secondVariantId: string;
  firstDirection: EarTrainingDirection;
  secondDirection: EarTrainingDirection;
};

const variantsByDifficulty = (Object.keys(rootsByDifficulty) as LocalPracticeDifficulty[])
  .reduce<Record<LocalPracticeDifficulty, ComparisonVariant[]>>((result, difficulty) => {
    const roots = rootsByDifficulty[difficulty];
    const intervals = getLocalEarTrainingIntervals(difficulty, "expanded-local-v2");
    result[difficulty] = roots.flatMap((root, rootIndex) => intervals.flatMap((candidate, intervalIndex) =>
      [0, 1, 2].map((offset) => {
        const secondRoot = roots[(rootIndex + 1) % roots.length]!;
        const secondInterval = intervals[(intervalIndex + offset) % intervals.length]!;
        const [firstDirection, secondDirection] = directions[(rootIndex + intervalIndex + offset) % directions.length]!;
        return {
          variantId: `interval-comparison:${root}:${candidate.id}:${firstDirection}:${secondRoot}:${secondInterval.id}:${secondDirection}`,
          firstVariantId: `interval:${root}:${candidate.id}`,
          secondVariantId: `interval:${secondRoot}:${secondInterval.id}`,
          firstDirection,
          secondDirection,
        };
      }),
    ));
    return result;
  }, { 基础: [], 进阶: [], 挑战: [] });

export const getLocalIntervalComparisonVariantCount = (difficulty: LocalPracticeDifficulty): number =>
  variantsByDifficulty[difficulty].length;

export const isLocalIntervalComparisonVariantId = (
  difficulty: LocalPracticeDifficulty,
  variantId: string,
): boolean => variantsByDifficulty[difficulty].some((variant) => variant.variantId === variantId);

const directionRelation = (
  first: EarTrainingDirection,
  second: EarTrainingDirection,
): IntervalDirectionRelation => first === "上行"
  ? second === "上行" ? "both-ascending" : "first-ascending-second-descending"
  : second === "下行" ? "both-descending" : "first-descending-second-ascending";

export const createLocalIntervalComparisonQuestion = ({
  difficulty,
  sequence,
  questionIndex,
  variantId,
}: {
  difficulty: LocalPracticeDifficulty;
  sequence: number;
  questionIndex?: number;
  variantId?: string;
}): LocalIntervalComparisonQuestion => {
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.floor(sequence)) : 0;
  const safeQuestionIndex = questionIndex !== undefined && Number.isFinite(questionIndex)
    ? Math.max(0, Math.floor(questionIndex))
    : safeSequence;
  const variants = variantsByDifficulty[difficulty];
  const resolved = variantId === undefined
    ? variants[safeQuestionIndex % variants.length]
    : variants.find((variant) => variant.variantId === variantId);
  if (!resolved) throw new Error("Invalid local interval-comparison variant id.");
  const first = createLocalEarTrainingQuestion({
    difficulty, direction: resolved.firstDirection, sequence: safeSequence,
    variantId: resolved.firstVariantId, catalogMode: "expanded-local-v2",
  });
  const second = createLocalEarTrainingQuestion({
    difficulty, direction: resolved.secondDirection, sequence: safeSequence,
    variantId: resolved.secondVariantId, catalogMode: "expanded-local-v2",
  });
  const sizeRelation: IntervalSizeRelation = first.interval.semitones === second.interval.semitones
    ? "same-size"
    : first.interval.semitones > second.interval.semitones ? "first-larger" : "second-larger";
  return {
    id: `${resolved.variantId}:sequence:${safeSequence}`,
    variantId: resolved.variantId,
    difficulty,
    sequence: safeSequence,
    first,
    second,
    sizeRelation,
    directionRelation: directionRelation(first.direction, second.direction),
  };
};

export const getLocalIntervalComparisonFrequencies = (
  question: LocalIntervalComparisonQuestion,
): readonly [readonly [number, number], readonly [number, number]] => [
  [question.first.rootFrequencyHz, getIntervalTargetFrequencyHz(question.first)],
  [question.second.rootFrequencyHz, getIntervalTargetFrequencyHz(question.second)],
];

export const getLocalIntervalComparisonAnswer = (question: LocalIntervalComparisonQuestion) => ({
  optionIds: [question.sizeRelation, question.directionRelation],
  explanation: `第一组是${question.first.direction}${question.first.interval.label}（${question.first.interval.semitones} 个半音），第二组是${question.second.direction}${question.second.interval.label}（${question.second.interval.semitones} 个半音）。`,
});

export const hasLocalIntervalComparisonAssessmentFields = (value: object): boolean =>
  ["score", "grade", "pass", "fail", "accuracyPercentage", "rating"].some((field) => field in value);
