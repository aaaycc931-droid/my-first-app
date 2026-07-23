import type { LocalPracticeDifficulty } from "./localPracticeCatalog";
export { isLocalHarmonyProgressionVariantId } from "./localHarmonyProgressionCatalog";

type TriadQuality = "major" | "minor" | "diminished";
type ProgressionChord = {
  numeral: string;
  rootOffset: number;
  quality: TriadQuality;
  inversion: 0 | 1 | 2;
};

type ProgressionPattern = {
  id: string;
  label: string;
  chords: readonly ProgressionChord[];
  explanation: string;
};

type ProgressionKey = { id: string; label: string; frequencyHz: number };

export type LocalHarmonyProgressionAnswerOption = { id: string; label: string };

export type LocalEarTrainingHarmonyProgressionQuestion = {
  id: string;
  variantId: string;
  difficulty: LocalPracticeDifficulty;
  key: ProgressionKey;
  pattern: ProgressionPattern;
  answerOptionId: string;
  chordFrequenciesHz: Array<[number, number, number]>;
  voiceLeadingCue: {
    bassFrequenciesHz: number[];
    upperFrequenciesHz: number[];
    bassMotion: string;
    upperMotion: string;
    explanation: string;
  };
  explanation: string;
};

const keys: ProgressionKey[] = [
  { id: "c3", label: "C 大调 / c 小调", frequencyHz: 130.81 },
  { id: "d3", label: "D 大调 / d 小调", frequencyHz: 146.83 },
  { id: "eb3", label: "E♭ 大调 / e♭ 小调", frequencyHz: 155.56 },
  { id: "f3", label: "F 大调 / f 小调", frequencyHz: 174.61 },
  { id: "g3", label: "G 大调 / g 小调", frequencyHz: 196 },
  { id: "a3", label: "A 大调 / a 小调", frequencyHz: 220 },
  { id: "c4", label: "C 大调 / c 小调（高八度）", frequencyHz: 261.63 },
  { id: "d4", label: "D 大调 / d 小调（高八度）", frequencyHz: 293.66 },
  { id: "eb4", label: "E♭ 大调 / e♭ 小调（高八度）", frequencyHz: 311.13 },
  { id: "f4", label: "F 大调 / f 小调（高八度）", frequencyHz: 349.23 },
];

const basicPatterns: ProgressionPattern[] = [
  {
    id: "authentic-three",
    label: "正格收束 · I–V–I",
    chords: [
      { numeral: "I", rootOffset: 0, quality: "major", inversion: 0 },
      { numeral: "V", rootOffset: 7, quality: "major", inversion: 1 },
      { numeral: "I", rootOffset: 0, quality: "major", inversion: 0 },
    ],
    explanation: "属和弦 V 回到主和弦 I，形成明确的正格收束。",
  },
  {
    id: "plagal-three",
    label: "变格收束 · I–IV–I",
    chords: [
      { numeral: "I", rootOffset: 0, quality: "major", inversion: 0 },
      { numeral: "IV", rootOffset: 5, quality: "major", inversion: 2 },
      { numeral: "I", rootOffset: 0, quality: "major", inversion: 0 },
    ],
    explanation: "下属和弦 IV 回到主和弦 I，形成变格收束。",
  },
];

const intermediatePatterns: ProgressionPattern[] = [
  {
    id: "cadence-four",
    label: "完整正格 · I–IV–V–I",
    chords: [
      { numeral: "I", rootOffset: 0, quality: "major", inversion: 0 },
      { numeral: "IV", rootOffset: 5, quality: "major", inversion: 2 },
      { numeral: "V", rootOffset: 7, quality: "major", inversion: 1 },
      { numeral: "I", rootOffset: 0, quality: "major", inversion: 0 },
    ],
    explanation: "I 经 IV、V 建立下属与属功能，再回到 I。",
  },
  {
    id: "pop-axis",
    label: "流行轴线 · I–V–vi–IV",
    chords: [
      { numeral: "I", rootOffset: 0, quality: "major", inversion: 0 },
      { numeral: "V", rootOffset: 7, quality: "major", inversion: 1 },
      { numeral: "vi", rootOffset: 9, quality: "minor", inversion: 1 },
      { numeral: "IV", rootOffset: 5, quality: "major", inversion: 2 },
    ],
    explanation: "I–V–vi–IV 以主、属、下中、下属功能循环，末尾不直接收束到主和弦。",
  },
  {
    id: "turnaround",
    label: "循环连接 · I–vi–IV–V",
    chords: [
      { numeral: "I", rootOffset: 0, quality: "major", inversion: 0 },
      { numeral: "vi", rootOffset: 9, quality: "minor", inversion: 1 },
      { numeral: "IV", rootOffset: 5, quality: "major", inversion: 2 },
      { numeral: "V", rootOffset: 7, quality: "major", inversion: 1 },
    ],
    explanation: "I–vi–IV–V 以 V 停留，常用于再次循环回 I。",
  },
  {
    id: "two-five-one",
    label: "二五一 · ii–V–I",
    chords: [
      { numeral: "ii", rootOffset: 2, quality: "minor", inversion: 0 },
      { numeral: "V", rootOffset: 7, quality: "major", inversion: 1 },
      { numeral: "I", rootOffset: 0, quality: "major", inversion: 0 },
    ],
    explanation: "ii 作为前属功能连接 V，再由 V 回到 I。",
  },
];

const challengePatterns: ProgressionPattern[] = [
  ...intermediatePatterns,
  {
    id: "deceptive",
    label: "阻碍进行 · I–IV–V–vi",
    chords: [
      { numeral: "I", rootOffset: 0, quality: "major", inversion: 0 },
      { numeral: "IV", rootOffset: 5, quality: "major", inversion: 2 },
      { numeral: "V", rootOffset: 7, quality: "major", inversion: 1 },
      { numeral: "vi", rootOffset: 9, quality: "minor", inversion: 1 },
    ],
    explanation: "V 没有回到 I，而转向 vi，形成阻碍进行。",
  },
  {
    id: "minor-authentic",
    label: "小调正格 · i–iv–V–i",
    chords: [
      { numeral: "i", rootOffset: 0, quality: "minor", inversion: 0 },
      { numeral: "iv", rootOffset: 5, quality: "minor", inversion: 2 },
      { numeral: "V", rootOffset: 7, quality: "major", inversion: 1 },
      { numeral: "i", rootOffset: 0, quality: "minor", inversion: 0 },
    ],
    explanation: "小调的 iv 与带导音倾向的 V 共同回到主和弦 i。",
  },
  {
    id: "minor-six-four-five",
    label: "小调展开 · i–VI–iv–V–i",
    chords: [
      { numeral: "i", rootOffset: 0, quality: "minor", inversion: 0 },
      { numeral: "VI", rootOffset: 8, quality: "major", inversion: 1 },
      { numeral: "iv", rootOffset: 5, quality: "minor", inversion: 2 },
      { numeral: "V", rootOffset: 7, quality: "major", inversion: 1 },
      { numeral: "i", rootOffset: 0, quality: "minor", inversion: 0 },
    ],
    explanation: "i–VI 扩展小调色彩，再经 iv–V–i 完成正格收束。",
  },
];

const patternsByDifficulty: Record<LocalPracticeDifficulty, ProgressionPattern[]> = {
  基础: basicPatterns,
  进阶: intermediatePatterns,
  挑战: challengePatterns,
};

const keyCountByDifficulty: Record<LocalPracticeDifficulty, number> = {
  基础: 10,
  进阶: 6,
  挑战: 6,
};

const qualityIntervals: Record<TriadQuality, readonly [number, number, number]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
};

const invert = (intervals: readonly [number, number, number], inversion: 0 | 1 | 2) => {
  if (inversion === 1) return [intervals[1], intervals[2], 12] as const;
  if (inversion === 2) return [intervals[2], 12, intervals[1] + 12] as const;
  return intervals;
};

const describeMotion = (frequenciesHz: number[]): string => frequenciesHz.slice(1).map((frequency, index) => {
  const previous = frequenciesHz[index]!;
  if (Math.abs(frequency - previous) < 0.01) return "保持";
  return frequency > previous ? "上行" : "下行";
}).join(" → ");

const variants = (difficulty: LocalPracticeDifficulty) => keys
  .slice(0, keyCountByDifficulty[difficulty])
  .flatMap((key) => patternsByDifficulty[difficulty].map((pattern) => ({
    key,
    pattern,
    variantId: `progression:${key.id}:${pattern.id}`,
  })));

export const getLocalHarmonyProgressionVariantCount = (difficulty: LocalPracticeDifficulty) =>
  variants(difficulty).length;

export const getLocalHarmonyProgressionAnswerOptions = (
  difficulty: LocalPracticeDifficulty,
): LocalHarmonyProgressionAnswerOption[] => patternsByDifficulty[difficulty].map((pattern) => ({
  id: pattern.id,
  label: pattern.label,
}));

export const createLocalHarmonyProgressionQuestion = ({
  difficulty,
  sequence,
  questionIndex,
  variantId,
}: {
  difficulty: LocalPracticeDifficulty;
  sequence: number;
  questionIndex?: number;
  variantId?: string;
}): LocalEarTrainingHarmonyProgressionQuestion => {
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.floor(sequence)) : 0;
  const safeIndex = questionIndex !== undefined && Number.isFinite(questionIndex)
    ? Math.max(0, Math.floor(questionIndex))
    : safeSequence;
  const available = variants(difficulty);
  const resolved = variantId
    ? available.find((variant) => variant.variantId === variantId)
    : available[safeIndex % available.length];
  if (!resolved) throw new Error("Invalid local harmony progression variant id.");
  const chordFrequenciesHz = resolved.pattern.chords.map((chord) => {
    const rootFrequency = resolved.key.frequencyHz * 2 ** (chord.rootOffset / 12);
    return invert(qualityIntervals[chord.quality], chord.inversion).map(
      (semitones) => rootFrequency * 2 ** (semitones / 12),
    ) as [number, number, number];
  });
  const bassFrequenciesHz = chordFrequenciesHz.map((chord) => chord[0]);
  const upperFrequenciesHz = chordFrequenciesHz.map((chord) => chord[2]);
  const bassMotion = describeMotion(bassFrequenciesHz);
  const upperMotion = describeMotion(upperFrequenciesHz);
  return {
    id: `${difficulty}-${safeSequence}-${resolved.key.id}-${resolved.pattern.id}`,
    variantId: resolved.variantId,
    difficulty,
    key: resolved.key,
    pattern: resolved.pattern,
    answerOptionId: resolved.pattern.id,
    chordFrequenciesHz,
    voiceLeadingCue: {
      bassFrequenciesHz,
      upperFrequenciesHz,
      bassMotion,
      upperMotion,
      explanation: `低音线索：${bassMotion}；高声部线索：${upperMotion}。这些方向来自本题实际排列，用来解释听感，不单独判分。`,
    },
    explanation: `${resolved.key.label}：${resolved.pattern.explanation}`,
  };
};

export const getLocalHarmonyProgressionAnswer = ({
  question,
  selectedOptionId,
}: {
  question: LocalEarTrainingHarmonyProgressionQuestion;
  selectedOptionId: string | null;
}) => ({
  selectedOptionId,
  hasSelection: selectedOptionId !== null,
  matchesAnswer: selectedOptionId === question.answerOptionId,
  answerLabel: question.pattern.label,
  explanation: question.explanation,
});
