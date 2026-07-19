import type { LocalPracticeDifficulty } from "./localPracticeCatalog";

export type ChordPlaybackMode = "和声" | "分解";
export type ChordQualityId = "major" | "minor" | "diminished" | "augmented";
export type ChordInversionId = "root" | "first" | "second";

export type LocalChordAnswerOption = {
  id: string;
  label: string;
  qualityId: ChordQualityId;
  inversionId: ChordInversionId;
};

type ChordQuality = {
  id: ChordQualityId;
  label: string;
  intervals: readonly [number, number, number];
  structure: string;
};

type ChordRoot = { id: string; label: string; frequencyHz: number };

export type LocalEarTrainingChordQuestion = {
  id: string;
  variantId: string;
  difficulty: LocalPracticeDifficulty;
  root: ChordRoot;
  quality: ChordQuality;
  inversionId: ChordInversionId;
  inversionLabel: string;
  answerOptionId: string;
  frequenciesHz: [number, number, number];
  explanation: string;
};

const qualities: Record<ChordQualityId, ChordQuality> = {
  major: { id: "major", label: "大三和弦", intervals: [0, 4, 7], structure: "根音上的大三度与纯五度" },
  minor: { id: "minor", label: "小三和弦", intervals: [0, 3, 7], structure: "根音上的小三度与纯五度" },
  diminished: { id: "diminished", label: "减三和弦", intervals: [0, 3, 6], structure: "两个叠置的小三度，根音到五音为减五度" },
  augmented: { id: "augmented", label: "增三和弦", intervals: [0, 4, 8], structure: "两个叠置的大三度，根音到五音为增五度" },
};

const inversions: Record<ChordInversionId, { label: string; bassRole: string }> = {
  root: { label: "原位", bassRole: "根音在最低声部" },
  first: { label: "第一转位", bassRole: "三音在最低声部" },
  second: { label: "第二转位", bassRole: "五音在最低声部" },
};

const roots: ChordRoot[] = [
  { id: "c4", label: "C4", frequencyHz: 261.63 },
  { id: "d4", label: "D4", frequencyHz: 293.66 },
  { id: "e4", label: "E4", frequencyHz: 329.63 },
  { id: "f4", label: "F4", frequencyHz: 349.23 },
  { id: "g4", label: "G4", frequencyHz: 392 },
  { id: "a4", label: "A4", frequencyHz: 440 },
];

const difficultyOptions: Record<LocalPracticeDifficulty, Array<[ChordQualityId, ChordInversionId]>> = {
  基础: [["major", "root"], ["minor", "root"]],
  进阶: [
    ["major", "root"], ["major", "first"], ["minor", "root"], ["minor", "first"],
    ["diminished", "root"], ["diminished", "first"], ["augmented", "root"], ["augmented", "first"],
  ],
  挑战: (Object.keys(qualities) as ChordQualityId[]).flatMap((qualityId) =>
    (Object.keys(inversions) as ChordInversionId[]).map(
      (inversionId): [ChordQualityId, ChordInversionId] => [qualityId, inversionId],
    ),
  ),
};

const getAnswerOptionId = (qualityId: ChordQualityId, inversionId: ChordInversionId) =>
  `${qualityId}-${inversionId}`;

export const getLocalChordAnswerOptions = (
  difficulty: LocalPracticeDifficulty,
): LocalChordAnswerOption[] => difficultyOptions[difficulty].map(([qualityId, inversionId]) => ({
  id: getAnswerOptionId(qualityId, inversionId),
  label: `${qualities[qualityId].label} · ${inversions[inversionId].label}`,
  qualityId,
  inversionId,
}));

const getVariantId = (rootId: string, qualityId: ChordQualityId, inversionId: ChordInversionId) =>
  `chord:${rootId}:${qualityId}:${inversionId}`;

const getVariants = (difficulty: LocalPracticeDifficulty) => {
  const difficultyRoots = difficulty === "基础" ? roots.slice(0, 4) : roots;
  return difficultyRoots.flatMap((root) => difficultyOptions[difficulty].map(([qualityId, inversionId]) => ({
    variantId: getVariantId(root.id, qualityId, inversionId),
    root,
    qualityId,
    inversionId,
  })));
};

const getVoicingIntervals = (
  intervals: readonly [number, number, number],
  inversionId: ChordInversionId,
): [number, number, number] => {
  if (inversionId === "first") return [intervals[1], intervals[2], 12];
  if (inversionId === "second") return [intervals[2], 12, intervals[1] + 12];
  return [...intervals];
};

export const getLocalEarTrainingChordVariantCount = (
  difficulty: LocalPracticeDifficulty,
): number => getVariants(difficulty).length;

export const isLocalEarTrainingChordVariantId = (
  difficulty: LocalPracticeDifficulty,
  variantId: string,
): boolean => getVariants(difficulty).some((variant) => variant.variantId === variantId);

export const createLocalEarTrainingChordQuestion = ({
  difficulty,
  sequence,
  questionIndex,
  variantId,
}: {
  difficulty: LocalPracticeDifficulty;
  sequence: number;
  questionIndex?: number;
  variantId?: string;
}): LocalEarTrainingChordQuestion => {
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.floor(sequence)) : 0;
  const safeQuestionIndex = questionIndex !== undefined && Number.isFinite(questionIndex)
    ? Math.max(0, Math.floor(questionIndex))
    : safeSequence;
  const variants = getVariants(difficulty);
  const resolved = variantId
    ? variants.find((variant) => variant.variantId === variantId)
    : variants[safeQuestionIndex % variants.length];
  if (!resolved) throw new Error("Invalid local chord variant id.");
  const quality = qualities[resolved.qualityId];
  const inversion = inversions[resolved.inversionId];
  const frequenciesHz = getVoicingIntervals(quality.intervals, resolved.inversionId).map(
    (semitones) => resolved.root.frequencyHz * 2 ** (semitones / 12),
  ) as [number, number, number];
  return {
    id: `${difficulty}-${safeSequence}-${resolved.root.id}-${resolved.qualityId}-${resolved.inversionId}`,
    variantId: resolved.variantId,
    difficulty,
    root: resolved.root,
    quality,
    inversionId: resolved.inversionId,
    inversionLabel: inversion.label,
    answerOptionId: getAnswerOptionId(resolved.qualityId, resolved.inversionId),
    frequenciesHz,
    explanation: `${quality.label}由${quality.structure}构成；本题为${inversion.label}，${inversion.bassRole}。`,
  };
};

export const getLocalEarTrainingChordAnswer = ({
  question,
  selectedOptionId,
}: {
  question: LocalEarTrainingChordQuestion;
  selectedOptionId: string | null;
}) => ({
  selectedOptionId,
  hasSelection: selectedOptionId !== null,
  matchesAnswer: selectedOptionId === question.answerOptionId,
  answerLabel: `${question.quality.label} · ${question.inversionLabel}`,
  explanation: question.explanation,
});

export const hasLocalEarTrainingChordAssessmentFields = (value: object): boolean =>
  ["score", "grade", "pass", "fail", "accuracyPercentage"].some((field) => field in value);
