export type EarTrainingMelodyDictationDifficulty = "基础" | "进阶";

export type LocalEarTrainingMelody = {
  id: string;
  label: string;
  noteIds: string[];
  explanation: string;
};

export type LocalEarTrainingMelodyQuestion = {
  id: string;
  difficulty: EarTrainingMelodyDictationDifficulty;
  sequence: number;
  melody: LocalEarTrainingMelody;
};

export const earTrainingMelodyNotes = {
  c4: { id: "c4", label: "C4", frequencyHz: 261.63 },
  d4: { id: "d4", label: "D4", frequencyHz: 293.66 },
  e4: { id: "e4", label: "E4", frequencyHz: 329.63 },
  g4: { id: "g4", label: "G4", frequencyHz: 392 },
  a4: { id: "a4", label: "A4", frequencyHz: 440 },
} as const;

export const earTrainingMelodyNoteIds = Object.keys(earTrainingMelodyNotes) as Array<keyof typeof earTrainingMelodyNotes>;

export const getEarTrainingMelodyNoteIds = (
  difficulty: EarTrainingMelodyDictationDifficulty,
): Array<keyof typeof earTrainingMelodyNotes> =>
  difficulty === "基础"
    ? ["c4", "d4", "e4", "g4"]
    : earTrainingMelodyNoteIds;

export const earTrainingMelodies: Record<EarTrainingMelodyDictationDifficulty, LocalEarTrainingMelody[]> = {
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

export const createLocalEarTrainingMelodyQuestion = ({
  difficulty,
  sequence,
  questionIndex,
}: {
  difficulty: EarTrainingMelodyDictationDifficulty;
  sequence: number;
  /** The APK may supply a shuffled item index. */
  questionIndex?: number;
}): LocalEarTrainingMelodyQuestion => {
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.floor(sequence)) : 0;
  const safeQuestionIndex = questionIndex !== undefined && Number.isFinite(questionIndex)
    ? Math.max(0, Math.floor(questionIndex))
    : safeSequence;
  const melodies = earTrainingMelodies[difficulty];
  const melody = melodies[safeQuestionIndex % melodies.length];
  return { id: `${difficulty}-${safeSequence}-${melody.id}`, difficulty, sequence: safeSequence, melody };
};

export const getLocalEarTrainingMelodyAnswer = ({ question, selectedNoteIds }: { question: LocalEarTrainingMelodyQuestion; selectedNoteIds: Array<string | null> }) => {
  const answerNoteIds = question.melody.noteIds;
  const normalizedSelection = answerNoteIds.map((_, index) => selectedNoteIds[index] ?? null);
  const hasSelection = normalizedSelection.every((noteId) => noteId !== null);
  const matchesAnswer = hasSelection && normalizedSelection.every((noteId, index) => noteId === answerNoteIds[index]);
  return { selectedNoteIds: normalizedSelection, hasSelection, matchesAnswer, answerNoteIds, answerLabel: answerNoteIds.map((noteId) => earTrainingMelodyNotes[noteId as keyof typeof earTrainingMelodyNotes].label).join(" → "), explanation: question.melody.explanation };
};

export const hasLocalEarTrainingMelodyAssessmentFields = (value: object): boolean => ["score", "grade", "pass", "fail", "accuracyPercentage"].some((field) => field in value);
