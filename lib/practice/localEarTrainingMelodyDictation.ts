import type {
  LegacyLocalPracticeDifficulty,
  LocalPracticeCatalogMode,
  LocalPracticeDifficulty,
} from "./localPracticeCatalog";

export type EarTrainingMelodyDictationDifficulty = LocalPracticeDifficulty;

export type LocalEarTrainingMelody = {
  id: string;
  label: string;
  noteIds: string[];
  explanation: string;
};

export type LocalEarTrainingMelodyQuestion = {
  id: string;
  variantId: string;
  difficulty: EarTrainingMelodyDictationDifficulty;
  sequence: number;
  melody: LocalEarTrainingMelody;
};

export const earTrainingMelodyNotes = {
  c4: { id: "c4", label: "C4", frequencyHz: 261.63 },
  d4: { id: "d4", label: "D4", frequencyHz: 293.66 },
  e4: { id: "e4", label: "E4", frequencyHz: 329.63 },
  f4: { id: "f4", label: "F4", frequencyHz: 349.23 },
  "f-sharp-4": { id: "f-sharp-4", label: "F♯4", frequencyHz: 369.99 },
  g4: { id: "g4", label: "G4", frequencyHz: 392 },
  a4: { id: "a4", label: "A4", frequencyHz: 440 },
  b4: { id: "b4", label: "B4", frequencyHz: 493.88 },
  c5: { id: "c5", label: "C5", frequencyHz: 523.25 },
} as const;

export type EarTrainingMelodyNoteId = keyof typeof earTrainingMelodyNotes;

const labelsFor = (noteIds: readonly string[]): string => noteIds.map(
  (noteId) => earTrainingMelodyNotes[noteId as EarTrainingMelodyNoteId].label,
).join("、");

const generatedMelody = (
  tier: "basic" | "advanced" | "challenge",
  index: number,
  noteIds: EarTrainingMelodyNoteId[],
): LocalEarTrainingMelody => ({
  id: `${tier}-${String(index).padStart(2, "0")}-${noteIds.join("-")}`,
  label: `${tier === "basic" ? "基础" : tier === "advanced" ? "进阶" : "挑战"}旋律 ${String(index).padStart(2, "0")}`,
  noteIds,
  explanation: `三个音依次为：${labelsFor(noteIds)}。`,
});

const legacyMelodies: Record<LegacyLocalPracticeDifficulty, LocalEarTrainingMelody[]> = {
  基础: [
    { id: "up-step", label: "上行级进", noteIds: ["c4", "d4", "e4"], explanation: "这三个音依次上行：C4、D4、E4。" },
    { id: "return-home", label: "回到主音", noteIds: ["e4", "d4", "c4"], explanation: "这三个音依次下行：E4、D4、C4。" },
    { id: "skip-and-return", label: "跳进再回落", noteIds: ["c4", "e4", "d4"], explanation: "先从 C4 跳到 E4，再回落到 D4。" },
  ],
  进阶: [
    { id: "up-step", label: "上行级进", noteIds: ["c4", "d4", "e4"], explanation: "这三个音依次上行：C4、D4、E4。" },
    { id: "return-home", label: "回到主音", noteIds: ["e4", "d4", "c4"], explanation: "这三个音依次下行：E4、D4、C4。" },
    { id: "skip-and-return", label: "跳进再回落", noteIds: ["c4", "e4", "d4"], explanation: "先从 C4 跳到 E4，再回落到 D4。" },
    { id: "open-fifth", label: "五度展开", noteIds: ["c4", "g4", "a4"], explanation: "先从 C4 跳到 G4，再上行到 A4。" },
  ],
};

export const earTrainingMelodies = legacyMelodies;

const basicSequences: EarTrainingMelodyNoteId[][] = [
  ["c4", "d4", "e4"], ["e4", "d4", "c4"], ["c4", "e4", "d4"],
  ["c4", "d4", "c4"], ["d4", "e4", "d4"], ["e4", "d4", "e4"],
  ["d4", "c4", "d4"], ["g4", "e4", "d4"], ["d4", "e4", "g4"],
  ["g4", "d4", "c4"], ["c4", "g4", "e4"], ["e4", "g4", "e4"],
  ["g4", "e4", "g4"], ["d4", "g4", "e4"], ["e4", "c4", "d4"],
  ["d4", "c4", "e4"], ["e4", "d4", "g4"], ["g4", "d4", "e4"],
  ["c4", "e4", "g4"], ["g4", "e4", "c4"],
];

const advancedSequences: EarTrainingMelodyNoteId[][] = [
  ["c4", "d4", "e4"], ["e4", "d4", "c4"], ["c4", "e4", "d4"], ["c4", "g4", "a4"],
  ["a4", "g4", "e4"], ["d4", "e4", "g4"], ["g4", "e4", "d4"], ["e4", "g4", "a4"],
  ["a4", "e4", "d4"], ["d4", "g4", "a4"], ["a4", "g4", "d4"], ["c4", "e4", "a4"],
  ["a4", "e4", "c4"], ["g4", "a4", "g4"], ["e4", "d4", "a4"], ["d4", "a4", "g4"],
  ["g4", "c4", "d4"], ["e4", "a4", "g4"], ["a4", "c4", "e4"], ["c4", "a4", "g4"],
];

const challengeSequences: EarTrainingMelodyNoteId[][] = [
  ["c4", "d4", "e4"], ["e4", "f4", "f-sharp-4"], ["f-sharp-4", "g4", "a4"],
  ["a4", "b4", "c5"], ["c5", "b4", "a4"], ["g4", "f-sharp-4", "e4"],
  ["c4", "e4", "f-sharp-4"], ["f-sharp-4", "e4", "d4"], ["d4", "f4", "a4"],
  ["a4", "f-sharp-4", "d4"], ["c4", "g4", "f-sharp-4"], ["f-sharp-4", "b4", "a4"],
  ["b4", "g4", "e4"], ["e4", "a4", "c5"], ["c5", "g4", "f-sharp-4"],
  ["d4", "b4", "g4"], ["f4", "c5", "a4"], ["a4", "e4", "b4"],
  ["b4", "f-sharp-4", "c5"], ["c5", "a4", "f4"],
];

const preserveLegacyIds = (
  legacy: readonly LocalEarTrainingMelody[],
  sequences: readonly EarTrainingMelodyNoteId[][],
  tier: "basic" | "advanced",
): LocalEarTrainingMelody[] => sequences.map((noteIds, index) =>
  legacy[index] ?? generatedMelody(tier, index + 1, [...noteIds]),
);

const expandedMelodies: Record<LocalPracticeDifficulty, LocalEarTrainingMelody[]> = {
  基础: preserveLegacyIds(legacyMelodies.基础, basicSequences, "basic"),
  进阶: preserveLegacyIds(legacyMelodies.进阶, advancedSequences, "advanced"),
  挑战: challengeSequences.map((noteIds, index) => generatedMelody("challenge", index + 1, noteIds)),
};

const getMelodies = (
  difficulty: EarTrainingMelodyDictationDifficulty,
  catalogMode: LocalPracticeCatalogMode,
): LocalEarTrainingMelody[] => catalogMode === "legacy-v1"
  ? (difficulty === "挑战" ? [] : legacyMelodies[difficulty])
  : expandedMelodies[difficulty];

const getMelodyVariantId = (melodyId: string): string => `melody:${melodyId}`;

export const getLocalEarTrainingMelodies = getMelodies;

export const getLocalEarTrainingMelodyVariantCount = (
  difficulty: EarTrainingMelodyDictationDifficulty,
  catalogMode: LocalPracticeCatalogMode,
): number => getMelodies(difficulty, catalogMode).length;

export const earTrainingMelodyNoteIds = Object.keys(earTrainingMelodyNotes) as EarTrainingMelodyNoteId[];

const legacyAnswerNoteIds: Record<LegacyLocalPracticeDifficulty, EarTrainingMelodyNoteId[]> = {
  基础: ["c4", "d4", "e4", "g4"],
  进阶: ["c4", "d4", "e4", "g4", "a4"],
};

export const getEarTrainingMelodyNoteIds = (
  difficulty: EarTrainingMelodyDictationDifficulty,
  catalogMode: LocalPracticeCatalogMode = "legacy-v1",
): EarTrainingMelodyNoteId[] => catalogMode === "legacy-v1"
  ? (difficulty === "挑战" ? [] : legacyAnswerNoteIds[difficulty])
  : Array.from(new Set(
    getMelodies(difficulty, catalogMode).flatMap((melody) => melody.noteIds),
  )) as EarTrainingMelodyNoteId[];

export const isLocalEarTrainingMelodyVariantId = (
  difficulty: EarTrainingMelodyDictationDifficulty,
  variantId: string,
): boolean => expandedMelodies[difficulty].some(
  (melody) => getMelodyVariantId(melody.id) === variantId,
);

export const createLocalEarTrainingMelodyQuestion = ({
  difficulty,
  sequence,
  questionIndex,
  variantId,
  catalogMode = "legacy-v1",
}: {
  difficulty: EarTrainingMelodyDictationDifficulty;
  sequence: number;
  questionIndex?: number;
  variantId?: string;
  catalogMode?: LocalPracticeCatalogMode;
}): LocalEarTrainingMelodyQuestion => {
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.floor(sequence)) : 0;
  const safeQuestionIndex = questionIndex !== undefined && Number.isFinite(questionIndex)
    ? Math.max(0, Math.floor(questionIndex))
    : safeSequence;
  const melodies = getMelodies(difficulty, catalogMode);
  const melody = variantId === undefined
    ? melodies[safeQuestionIndex % melodies.length]
    : expandedMelodies[difficulty].find((candidate) => getMelodyVariantId(candidate.id) === variantId);
  if (!melody) throw new Error("Invalid local melody variant id.");
  return {
    id: `${difficulty}-${safeSequence}-${melody.id}`,
    variantId: getMelodyVariantId(melody.id),
    difficulty,
    sequence: safeSequence,
    melody,
  };
};

export const getLocalEarTrainingMelodyAnswer = ({
  question,
  selectedNoteIds,
}: {
  question: LocalEarTrainingMelodyQuestion;
  selectedNoteIds: Array<string | null>;
}) => {
  const answerNoteIds = question.melody.noteIds;
  const normalizedSelection = answerNoteIds.map((_, index) => selectedNoteIds[index] ?? null);
  const hasSelection = normalizedSelection.every((noteId) => noteId !== null);
  const matchesAnswer = hasSelection
    && normalizedSelection.every((noteId, index) => noteId === answerNoteIds[index]);
  return {
    selectedNoteIds: normalizedSelection,
    hasSelection,
    matchesAnswer,
    answerNoteIds,
    answerLabel: answerNoteIds.map(
      (noteId) => earTrainingMelodyNotes[noteId as EarTrainingMelodyNoteId].label,
    ).join(" → "),
    explanation: question.melody.explanation,
  };
};

export const hasLocalEarTrainingMelodyAssessmentFields = (value: object): boolean =>
  ["score", "grade", "pass", "fail", "accuracyPercentage"].some((field) => field in value);
