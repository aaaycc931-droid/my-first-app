import type { LocalPracticeDifficulty } from "./localPracticeCatalog";
import {
  createLocalSeventhChordQuestion,
  type SeventhChordInversionId,
  type SeventhChordQualityId,
} from "./localEarTrainingSeventhChords";

export type SeventhChordSpacingId = "close" | "open";

export type LocalSeventhChordSpacingAnswerOption = {
  id: SeventhChordSpacingId;
  label: string;
};

type BaseVariant = ReturnType<typeof createLocalSeventhChordQuestion>;
type SpacingVariant = {
  base: BaseVariant;
  spacingId: SeventhChordSpacingId;
  variantId: string;
};

const spacingIds: readonly SeventhChordSpacingId[] = ["close", "open"];
const spacingLabels: Record<SeventhChordSpacingId, string> = {
  close: "密集排列",
  open: "开放排列",
};

const baseVariantCount: Record<LocalPracticeDifficulty, number> = {
  基础: 48,
  进阶: 48,
  挑战: 192,
};

const includedQualities: Record<LocalPracticeDifficulty, readonly SeventhChordQualityId[]> = {
  基础: ["major-seventh", "dominant-seventh"],
  进阶: ["major-seventh", "dominant-seventh", "minor-seventh", "half-diminished-seventh"],
  挑战: ["major-seventh", "dominant-seventh", "minor-seventh", "half-diminished-seventh"],
};

const getBaseVariants = (difficulty: LocalPracticeDifficulty): BaseVariant[] => {
  const sourceDifficulty: LocalPracticeDifficulty = difficulty === "挑战" ? "挑战" : "基础";
  const allowedQualities = includedQualities[difficulty];
  return Array.from({ length: baseVariantCount[difficulty] }, (_, questionIndex) =>
    createLocalSeventhChordQuestion({ difficulty: sourceDifficulty, sequence: questionIndex, questionIndex }),
  ).filter((question) => allowedQualities.includes(question.quality.id));
};

const getVariants = (difficulty: LocalPracticeDifficulty): SpacingVariant[] =>
  getBaseVariants(difficulty).flatMap((base) =>
    spacingIds.map((spacingId) => ({
      base,
      spacingId,
      variantId: `seventh-chord-spacing:${base.root.id}:${base.quality.id}:${base.inversionId}:${spacingId}`,
    })),
  );

const createOpenVoicing = (
  closeFrequenciesHz: readonly [number, number, number, number],
): [number, number, number, number] => [
  closeFrequenciesHz[0],
  closeFrequenciesHz[2],
  closeFrequenciesHz[1] * 2,
  closeFrequenciesHz[3] * 2,
];

export const getLocalSeventhChordSpacingAnswerOptions = (
  _difficulty?: LocalPracticeDifficulty,
): LocalSeventhChordSpacingAnswerOption[] =>
  spacingIds.map((id) => ({ id, label: spacingLabels[id] }));

export const getLocalSeventhChordSpacingVariantCount = (difficulty: LocalPracticeDifficulty): number =>
  getVariants(difficulty).length;

export const isLocalSeventhChordSpacingVariantId = (
  difficulty: LocalPracticeDifficulty,
  variantId: string,
): boolean => getVariants(difficulty).some((variant) => variant.variantId === variantId);

export type LocalEarTrainingSeventhChordSpacingQuestion = {
  id: string;
  variantId: string;
  difficulty: LocalPracticeDifficulty;
  root: BaseVariant["root"];
  quality: BaseVariant["quality"];
  inversionId: SeventhChordInversionId;
  inversionLabel: string;
  spacingId: SeventhChordSpacingId;
  spacingLabel: string;
  answerOptionId: SeventhChordSpacingId;
  frequenciesHz: [number, number, number, number];
  explanation: string;
};

export const createLocalSeventhChordSpacingQuestion = ({
  difficulty,
  sequence,
  questionIndex,
  variantId,
}: {
  difficulty: LocalPracticeDifficulty;
  sequence: number;
  questionIndex?: number;
  variantId?: string;
}): LocalEarTrainingSeventhChordSpacingQuestion => {
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.floor(sequence)) : 0;
  const variants = getVariants(difficulty);
  const safeQuestionIndex = Number.isFinite(questionIndex)
    ? Math.max(0, Math.floor(questionIndex!))
    : safeSequence;
  const found = variantId
    ? variants.find((variant) => variant.variantId === variantId)
    : variants[safeQuestionIndex % variants.length];
  if (!found) throw new Error("Invalid local seventh chord spacing variant id.");

  const frequenciesHz = found.spacingId === "close"
    ? [...found.base.frequenciesHz] as [number, number, number, number]
    : createOpenVoicing(found.base.frequenciesHz);
  const explanation = found.spacingId === "close"
    ? `本题为${spacingLabels.close}：低音上方三个声部相邻排列，没有留下可容纳和弦音的空位。`
    : `本题为${spacingLabels.open}：保持${found.base.inversionLabel}的最低音与和弦音类别，并在上方声部之间留下可容纳和弦音的空位。`;

  return {
    id: `${difficulty}-${safeSequence}-${found.base.root.id}-${found.base.quality.id}-${found.base.inversionId}-${found.spacingId}`,
    variantId: found.variantId,
    difficulty,
    root: found.base.root,
    quality: found.base.quality,
    inversionId: found.base.inversionId,
    inversionLabel: found.base.inversionLabel,
    spacingId: found.spacingId,
    spacingLabel: spacingLabels[found.spacingId],
    answerOptionId: found.spacingId,
    frequenciesHz,
    explanation,
  };
};

export const getLocalSeventhChordSpacingAnswer = ({
  question,
  selectedOptionId,
}: {
  question: LocalEarTrainingSeventhChordSpacingQuestion;
  selectedOptionId: string | null;
}) => ({
  selectedOptionId,
  hasSelection: selectedOptionId !== null,
  matchesAnswer: selectedOptionId === question.answerOptionId,
  answerLabel: question.spacingLabel,
  explanation: question.explanation,
});
