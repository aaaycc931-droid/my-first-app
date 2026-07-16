export type EarTrainingSinglePitchDifficulty = "基础" | "进阶";

export type LocalEarTrainingSinglePitch = {
  id: string;
  label: string;
  frequencyHz: number;
  explanation: string;
};

export type LocalEarTrainingSinglePitchQuestion = {
  id: string;
  difficulty: EarTrainingSinglePitchDifficulty;
  sequence: number;
  pitch: LocalEarTrainingSinglePitch;
};

export const earTrainingSinglePitches: Record<
  EarTrainingSinglePitchDifficulty,
  LocalEarTrainingSinglePitch[]
> = {
  基础: [
    { id: "c4", label: "C4", frequencyHz: 261.63, explanation: "这是中央 C 附近的 C4。" },
    { id: "d4", label: "D4", frequencyHz: 293.66, explanation: "这是比 C4 高一个大二度的 D4。" },
    { id: "e4", label: "E4", frequencyHz: 329.63, explanation: "这是比 C4 高一个大三度的 E4。" },
    { id: "g4", label: "G4", frequencyHz: 392, explanation: "这是比 C4 高一个纯五度的 G4。" },
  ],
  进阶: [
    { id: "c4", label: "C4", frequencyHz: 261.63, explanation: "这是中央 C 附近的 C4。" },
    { id: "d4", label: "D4", frequencyHz: 293.66, explanation: "这是比 C4 高一个大二度的 D4。" },
    { id: "e4", label: "E4", frequencyHz: 329.63, explanation: "这是比 C4 高一个大三度的 E4。" },
    { id: "g4", label: "G4", frequencyHz: 392, explanation: "这是比 C4 高一个纯五度的 G4。" },
    { id: "a4", label: "A4", frequencyHz: 440, explanation: "这是常用定音参考 A4。" },
    { id: "b4", label: "B4", frequencyHz: 493.88, explanation: "这是比 A4 高一个大二度的 B4。" },
  ],
};

export const createLocalEarTrainingSinglePitchQuestion = ({
  difficulty,
  sequence,
  questionIndex,
}: {
  difficulty: EarTrainingSinglePitchDifficulty;
  sequence: number;
  /** The APK may supply a shuffled item index. Web courses keep this unset. */
  questionIndex?: number;
}): LocalEarTrainingSinglePitchQuestion => {
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.floor(sequence)) : 0;
  const safeQuestionIndex = questionIndex !== undefined && Number.isFinite(questionIndex)
    ? Math.max(0, Math.floor(questionIndex))
    : safeSequence;
  const pitches = earTrainingSinglePitches[difficulty];
  const pitch = pitches[safeQuestionIndex % pitches.length];

  return { id: `${difficulty}-${safeSequence}-${pitch.id}`, difficulty, sequence: safeSequence, pitch };
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
