export type EarTrainingRhythmDifficulty = "基础" | "进阶";

export type LocalEarTrainingRhythmPattern = {
  id: string;
  label: string;
  onsetBeats: number[];
  explanation: string;
};

export type LocalEarTrainingRhythmQuestion = {
  id: string;
  difficulty: EarTrainingRhythmDifficulty;
  sequence: number;
  bpm: number;
  beatsPerMeasure: 4;
  pattern: LocalEarTrainingRhythmPattern;
};

export const earTrainingRhythmPatterns: Record<
  EarTrainingRhythmDifficulty,
  LocalEarTrainingRhythmPattern[]
> = {
  基础: [
    {
      id: "even-quarters",
      label: "四拍均匀",
      onsetBeats: [0, 1, 2, 3],
      explanation: "每一拍开头各有一次击拍，四拍之间的间隔相同。",
    },
    {
      id: "front-dense",
      label: "前半小节更密",
      onsetBeats: [0, 0.5, 1, 1.5, 2, 3],
      explanation: "前两拍各被分成两个更短的击拍，后两拍回到每拍一次。",
    },
    {
      id: "back-dense",
      label: "后半小节更密",
      onsetBeats: [0, 1, 2, 2.5, 3, 3.5],
      explanation: "前两拍每拍一次，后两拍各被分成两个更短的击拍。",
    },
  ],
  进阶: [
    {
      id: "even-quarters",
      label: "四拍均匀",
      onsetBeats: [0, 1, 2, 3],
      explanation: "每一拍开头各有一次击拍，四拍之间的间隔相同。",
    },
    {
      id: "front-dense",
      label: "前半小节更密",
      onsetBeats: [0, 0.5, 1, 1.5, 2, 3],
      explanation: "前两拍各被分成两个更短的击拍，后两拍回到每拍一次。",
    },
    {
      id: "back-dense",
      label: "后半小节更密",
      onsetBeats: [0, 1, 2, 2.5, 3, 3.5],
      explanation: "前两拍每拍一次，后两拍各被分成两个更短的击拍。",
    },
    {
      id: "middle-gap",
      label: "中间留空",
      onsetBeats: [0, 0.5, 2.5, 3],
      explanation: "第一拍有两个较短击拍，中间两拍没有击拍，最后一拍有两个较短击拍。",
    },
  ],
};

export const createLocalEarTrainingRhythmQuestion = ({
  difficulty,
  sequence,
}: {
  difficulty: EarTrainingRhythmDifficulty;
  sequence: number;
}): LocalEarTrainingRhythmQuestion => {
  const safeSequence = Math.max(0, Math.floor(sequence));
  const patterns = earTrainingRhythmPatterns[difficulty];
  const pattern = patterns[safeSequence % patterns.length];

  return {
    id: `${difficulty}-${safeSequence}-${pattern.id}`,
    difficulty,
    sequence: safeSequence,
    bpm: difficulty === "基础" ? 84 : 100,
    beatsPerMeasure: 4,
    pattern,
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
