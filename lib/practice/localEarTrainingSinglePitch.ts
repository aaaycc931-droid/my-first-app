import type {
  LegacyLocalPracticeDifficulty,
  LocalPracticeCatalogMode,
  LocalPracticeDifficulty,
} from "./localPracticeCatalog";

export type EarTrainingSinglePitchDifficulty = LocalPracticeDifficulty;

export type LocalEarTrainingSinglePitch = {
  id: string;
  label: string;
  frequencyHz: number;
  explanation: string;
};

export type LocalEarTrainingSinglePitchQuestion = {
  id: string;
  variantId: string;
  difficulty: EarTrainingSinglePitchDifficulty;
  sequence: number;
  durationMs: number;
  pitch: LocalEarTrainingSinglePitch;
};

type SinglePitchVariant = {
  variantId: string;
  pitch: LocalEarTrainingSinglePitch;
  durationMs: number;
};

const pitch = (
  id: string,
  label: string,
  frequencyHz: number,
  explanation = `这是 ${label}。`,
): LocalEarTrainingSinglePitch => ({ id, label, frequencyHz, explanation });

const pitchLibrary = {
  c4: pitch("c4", "C4", 261.63, "这是中央 C 附近的 C4。"),
  "c-sharp-4": pitch("c-sharp-4", "C♯4", 277.18),
  d4: pitch("d4", "D4", 293.66, "这是比 C4 高一个大二度的 D4。"),
  "d-sharp-4": pitch("d-sharp-4", "D♯4", 311.13),
  e4: pitch("e4", "E4", 329.63, "这是比 C4 高一个大三度的 E4。"),
  f4: pitch("f4", "F4", 349.23),
  "f-sharp-4": pitch("f-sharp-4", "F♯4", 369.99),
  g4: pitch("g4", "G4", 392, "这是比 C4 高一个纯五度的 G4。"),
  "g-sharp-4": pitch("g-sharp-4", "G♯4", 415.3),
  a4: pitch("a4", "A4", 440, "这是常用定音参考 A4。"),
  "a-sharp-4": pitch("a-sharp-4", "A♯4", 466.16),
  b4: pitch("b4", "B4", 493.88, "这是比 A4 高一个大二度的 B4。"),
} as const;

export const earTrainingSinglePitches: Record<
  LegacyLocalPracticeDifficulty,
  LocalEarTrainingSinglePitch[]
> = {
  基础: [pitchLibrary.c4, pitchLibrary.d4, pitchLibrary.e4, pitchLibrary.g4],
  进阶: [
    pitchLibrary.c4,
    pitchLibrary.d4,
    pitchLibrary.e4,
    pitchLibrary.g4,
    pitchLibrary.a4,
    pitchLibrary.b4,
  ],
};

const legacyVariant = (item: LocalEarTrainingSinglePitch): SinglePitchVariant => ({
  variantId: `pitch:${item.id}`,
  pitch: item,
  durationMs: 800,
});

const durationVariants = (
  items: readonly LocalEarTrainingSinglePitch[],
  durations: ReadonlyArray<{ id: string; durationMs: number }>,
  includeLegacy: boolean,
): SinglePitchVariant[] => items.flatMap((item) => [
  ...(includeLegacy ? [legacyVariant(item)] : []),
  ...durations.map(({ id, durationMs }) => ({
    variantId: `pitch:${item.id}:${id}`,
    pitch: item,
    durationMs,
  })),
]);

const expandedSinglePitchVariants: Record<LocalPracticeDifficulty, SinglePitchVariant[]> = {
  基础: durationVariants(
    earTrainingSinglePitches.基础,
    [
      { id: "brief", durationMs: 650 },
      { id: "short", durationMs: 725 },
      { id: "long", durationMs: 950 },
      { id: "sustained", durationMs: 1100 },
    ],
    true,
  ),
  进阶: durationVariants(
    earTrainingSinglePitches.进阶,
    [
      { id: "brief", durationMs: 650 },
      { id: "long", durationMs: 950 },
      { id: "sustained", durationMs: 1100 },
    ],
    true,
  ),
  挑战: durationVariants(
    Object.values(pitchLibrary),
    [
      { id: "standard", durationMs: 800 },
      { id: "brief", durationMs: 650 },
    ],
    false,
  ),
};

const getVariants = (
  difficulty: EarTrainingSinglePitchDifficulty,
  catalogMode: LocalPracticeCatalogMode,
): SinglePitchVariant[] => catalogMode === "legacy-v1"
  ? (difficulty === "挑战" ? [] : earTrainingSinglePitches[difficulty].map(legacyVariant))
  : expandedSinglePitchVariants[difficulty];

export const getLocalEarTrainingSinglePitchVariants = getVariants;

export const getLocalEarTrainingSinglePitchAnswerPitches = (
  difficulty: EarTrainingSinglePitchDifficulty,
  catalogMode: LocalPracticeCatalogMode,
): LocalEarTrainingSinglePitch[] => Array.from(
  new Map(getVariants(difficulty, catalogMode).map((item) => [item.pitch.id, item.pitch])).values(),
);

export const getLocalEarTrainingSinglePitchVariantCount = (
  difficulty: EarTrainingSinglePitchDifficulty,
  catalogMode: LocalPracticeCatalogMode,
): number => getVariants(difficulty, catalogMode).length;

export const isLocalEarTrainingSinglePitchVariantId = (
  difficulty: EarTrainingSinglePitchDifficulty,
  variantId: string,
): boolean => expandedSinglePitchVariants[difficulty].some(
  (candidate) => candidate.variantId === variantId,
);

export const createLocalEarTrainingSinglePitchQuestion = ({
  difficulty,
  sequence,
  questionIndex,
  variantId,
  catalogMode = "legacy-v1",
}: {
  difficulty: EarTrainingSinglePitchDifficulty;
  sequence: number;
  questionIndex?: number;
  variantId?: string;
  catalogMode?: LocalPracticeCatalogMode;
}): LocalEarTrainingSinglePitchQuestion => {
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.floor(sequence)) : 0;
  const safeQuestionIndex = questionIndex !== undefined && Number.isFinite(questionIndex)
    ? Math.max(0, Math.floor(questionIndex))
    : safeSequence;
  const variants = getVariants(difficulty, catalogMode);
  const resolved = variantId === undefined
    ? variants[safeQuestionIndex % variants.length]
    : expandedSinglePitchVariants[difficulty].find((candidate) => candidate.variantId === variantId);
  if (!resolved) throw new Error("Invalid local single-pitch variant id.");

  return {
    id: `${difficulty}-${safeSequence}-${resolved.pitch.id}`,
    variantId: resolved.variantId,
    difficulty,
    sequence: safeSequence,
    durationMs: resolved.durationMs,
    pitch: resolved.pitch,
  };
};

export const getLocalEarTrainingSinglePitchAnswer = ({
  question,
  selectedPitchId,
}: {
  question: LocalEarTrainingSinglePitchQuestion;
  selectedPitchId: string | null;
}) => ({
  selectedPitchId,
  hasSelection: selectedPitchId !== null,
  matchesAnswer: selectedPitchId === question.pitch.id,
  answerLabel: question.pitch.label,
  explanation: question.pitch.explanation,
});

export const hasLocalEarTrainingSinglePitchAssessmentFields = (value: object): boolean =>
  ["score", "grade", "pass", "fail", "accuracyPercentage"].some((field) => field in value);
