export type EarTrainingDifficulty = "基础" | "进阶";
export type EarTrainingDirection = "上行" | "下行";

export type LocalEarTrainingInterval = {
  id: string;
  label: string;
  semitones: number;
  explanation: string;
};

export type LocalEarTrainingQuestion = {
  id: string;
  variantId: string;
  difficulty: EarTrainingDifficulty;
  direction: EarTrainingDirection;
  rootLabel: string;
  rootFrequencyHz: number;
  interval: LocalEarTrainingInterval;
};

export const earTrainingIntervals: Record<EarTrainingDifficulty, LocalEarTrainingInterval[]> = {
  基础: [
    { id: "major-third", label: "大三度", semitones: 4, explanation: "两个音相差 4 个半音。" },
    { id: "perfect-fourth", label: "纯四度", semitones: 5, explanation: "两个音相差 5 个半音。" },
    { id: "perfect-fifth", label: "纯五度", semitones: 7, explanation: "两个音相差 7 个半音。" },
  ],
  进阶: [
    { id: "minor-second", label: "小二度", semitones: 1, explanation: "两个音相差 1 个半音。" },
    { id: "major-second", label: "大二度", semitones: 2, explanation: "两个音相差 2 个半音。" },
    { id: "minor-third", label: "小三度", semitones: 3, explanation: "两个音相差 3 个半音。" },
    { id: "major-third", label: "大三度", semitones: 4, explanation: "两个音相差 4 个半音。" },
    { id: "perfect-fourth", label: "纯四度", semitones: 5, explanation: "两个音相差 5 个半音。" },
    { id: "perfect-fifth", label: "纯五度", semitones: 7, explanation: "两个音相差 7 个半音。" },
  ],
};

const questionRoots = [
  { id: "c4", label: "C4", frequencyHz: 261.63 },
  { id: "d4", label: "D4", frequencyHz: 293.66 },
  { id: "e4", label: "E4", frequencyHz: 329.63 },
  { id: "g4", label: "G4", frequencyHz: 392 },
];

const getIntervalVariantId = (rootId: string, intervalId: string): string =>
  `interval:${rootId}:${intervalId}`;

export const isLocalEarTrainingIntervalVariantId = (
  difficulty: EarTrainingDifficulty,
  variantId: string,
): boolean => questionRoots.some((root) =>
  earTrainingIntervals[difficulty].some(
    (interval) => getIntervalVariantId(root.id, interval.id) === variantId,
  ),
);

export const getLocalEarTrainingQuestionVariantCount = (difficulty: EarTrainingDifficulty): number =>
  earTrainingIntervals[difficulty].length * questionRoots.length;

export const createLocalEarTrainingQuestion = ({
  difficulty,
  direction,
  sequence,
  questionIndex,
  variantId,
}: {
  difficulty: EarTrainingDifficulty;
  direction: EarTrainingDirection;
  sequence: number;
  /** The APK may supply a shuffled root/interval combination index. */
  questionIndex?: number;
  /** A persisted local review target uses this stable root/interval identity. */
  variantId?: string;
}): LocalEarTrainingQuestion => {
  const intervals = earTrainingIntervals[difficulty];
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.floor(sequence)) : 0;
  const safeQuestionIndex = questionIndex !== undefined && Number.isFinite(questionIndex)
    ? Math.max(0, Math.floor(questionIndex))
    : safeSequence;
  const scheduledInterval = intervals[safeQuestionIndex % intervals.length];
  const scheduledRoot = questionRoots[Math.floor(safeQuestionIndex / intervals.length) % questionRoots.length];
  const resolved = variantId === undefined
    ? { interval: scheduledInterval, root: scheduledRoot }
    : questionRoots.flatMap((root) => intervals.map((interval) => ({ root, interval }))).find(
      ({ root, interval }) => getIntervalVariantId(root.id, interval.id) === variantId,
    );
  if (!resolved) throw new Error("Invalid local interval variant id.");
  const { interval, root } = resolved;

  return {
    id: `${difficulty}-${direction}-${safeSequence}-${interval.id}-${root.label}`,
    variantId: getIntervalVariantId(root.id, interval.id),
    difficulty,
    direction,
    rootLabel: root.label,
    rootFrequencyHz: root.frequencyHz,
    interval,
  };
};

export const getIntervalTargetFrequencyHz = (question: LocalEarTrainingQuestion): number =>
  question.rootFrequencyHz *
  2 ** ((question.direction === "上行" ? 1 : -1) * question.interval.semitones / 12);

export const getLocalEarTrainingDirectionDescription = (
  direction: EarTrainingDirection,
): string => (direction === "上行" ? "第一个音较低，第二个音较高。" : "第一个音较高，第二个音较低。");

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
