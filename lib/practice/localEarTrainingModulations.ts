import type { LocalPracticeDifficulty } from "./localPracticeCatalog";
import {
  isLocalModulationVariantId,
  LOCAL_MODULATION_DESTINATIONS_BY_DIFFICULTY,
  LOCAL_MODULATION_ROUTE_IDS,
  LOCAL_MODULATION_TONIC_IDS,
  type ModulationDestinationId,
  type ModulationRouteId,
} from "./localModulationCatalog";

export { isLocalModulationVariantId, type ModulationDestinationId } from "./localModulationCatalog";

type TriadQuality = "major" | "minor" | "diminished";
type ModulationChord = {
  numeral: string;
  rootOffset: number;
  quality: TriadQuality;
};

export type ModulationTonic = {
  id: (typeof LOCAL_MODULATION_TONIC_IDS)[number];
  label: string;
  frequencyHz: number;
};

export type ModulationDestination = {
  id: ModulationDestinationId;
  label: string;
  targetTonicOffset: number;
  targetMode: "major" | "minor";
};

export type ModulationRoute = {
  id: ModulationRouteId;
  label: string;
  analysis: string;
};

export type LocalModulationAnswerOption = {
  id: ModulationDestinationId;
  label: string;
};

export type LocalEarTrainingModulationQuestion = {
  id: string;
  variantId: string;
  difficulty: LocalPracticeDifficulty;
  tonic: ModulationTonic;
  destination: ModulationDestination;
  route: ModulationRoute;
  targetTonicLabel: string;
  answerOptionId: ModulationDestinationId;
  chordFrequenciesHz: Array<[number, number, number]>;
  explanation: string;
};

const tonicNames = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"] as const;
const dominantNames = ["G", "A♭", "A", "B♭", "B", "C", "D♭", "D", "E♭", "E", "F", "F♯"] as const;
const relativeMinorNames = ["a", "b♭", "b", "c", "c♯", "d", "e♭", "e", "f", "f♯", "g", "g♯"] as const;
const tonics: ModulationTonic[] = LOCAL_MODULATION_TONIC_IDS.map((id, semitones) => ({
  id,
  label: `${tonicNames[semitones]} 大调`,
  frequencyHz: 130.81278265 * 2 ** (semitones / 12),
}));

const destinations: Record<ModulationDestinationId, ModulationDestination> = {
  "stay-tonic": { id: "stay-tonic", label: "保持原调", targetTonicOffset: 0, targetMode: "major" },
  dominant: { id: "dominant", label: "转到属调", targetTonicOffset: 7, targetMode: "major" },
  "relative-minor": { id: "relative-minor", label: "转到关系小调", targetTonicOffset: 9, targetMode: "minor" },
  "parallel-minor": { id: "parallel-minor", label: "转到同主音小调", targetTonicOffset: 0, targetMode: "minor" },
};

const routes: Record<ModulationDestinationId, Record<ModulationRouteId, ModulationRoute & { chords: readonly ModulationChord[] }>> = {
  "stay-tonic": {
    "diatonic-predominant": {
      id: "diatonic-predominant",
      label: "下中和弦连接",
      analysis: "vi–ii–V–I 再次确认起始大调",
      chords: [
        { numeral: "vi", rootOffset: 9, quality: "minor" },
        { numeral: "ii", rootOffset: 2, quality: "minor" },
        { numeral: "V", rootOffset: 7, quality: "major" },
        { numeral: "I", rootOffset: 0, quality: "major" },
      ],
    },
    "alternate-predominant": {
      id: "alternate-predominant",
      label: "下属和弦连接",
      analysis: "IV–ii–V–I 再次确认起始大调",
      chords: [
        { numeral: "IV", rootOffset: 5, quality: "major" },
        { numeral: "ii", rootOffset: 2, quality: "minor" },
        { numeral: "V", rootOffset: 7, quality: "major" },
        { numeral: "I", rootOffset: 0, quality: "major" },
      ],
    },
  },
  dominant: {
    "diatonic-predominant": {
      id: "diatonic-predominant",
      label: "vi 枢纽连接",
      analysis: "原调 vi 作为属调 ii，再经 IV–V–I 建立属调",
      chords: [
        { numeral: "vi = ii/V", rootOffset: 9, quality: "minor" },
        { numeral: "IV/V", rootOffset: 0, quality: "major" },
        { numeral: "V/V", rootOffset: 2, quality: "major" },
        { numeral: "I/V", rootOffset: 7, quality: "major" },
      ],
    },
    "alternate-predominant": {
      id: "alternate-predominant",
      label: "I 枢纽连接",
      analysis: "原调 I 作为属调 IV，再经 ii–V–I 建立属调",
      chords: [
        { numeral: "I = IV/V", rootOffset: 0, quality: "major" },
        { numeral: "vi = ii/V", rootOffset: 9, quality: "minor" },
        { numeral: "V/V", rootOffset: 2, quality: "major" },
        { numeral: "I/V", rootOffset: 7, quality: "major" },
      ],
    },
  },
  "relative-minor": {
    "diatonic-predominant": {
      id: "diatonic-predominant",
      label: "vi 枢纽连接",
      analysis: "原调 vi 成为关系小调 i，再经 iv–V–i 建立小调",
      chords: [
        { numeral: "vi = i/vi", rootOffset: 9, quality: "minor" },
        { numeral: "iv/vi", rootOffset: 2, quality: "minor" },
        { numeral: "V/vi", rootOffset: 4, quality: "major" },
        { numeral: "i/vi", rootOffset: 9, quality: "minor" },
      ],
    },
    "alternate-predominant": {
      id: "alternate-predominant",
      label: "VI 枢纽连接",
      analysis: "原调 IV 作为关系小调 VI，再经 ii°–V–i 建立小调",
      chords: [
        { numeral: "IV = VI/vi", rootOffset: 5, quality: "major" },
        { numeral: "ii°/vi", rootOffset: 11, quality: "diminished" },
        { numeral: "V/vi", rootOffset: 4, quality: "major" },
        { numeral: "i/vi", rootOffset: 9, quality: "minor" },
      ],
    },
  },
  "parallel-minor": {
    "diatonic-predominant": {
      id: "diatonic-predominant",
      label: "同主音直接换调式",
      analysis: "同一主音由大三和弦转为小三和弦，再经 iv–V–i 建立同主音小调",
      chords: [
        { numeral: "i", rootOffset: 0, quality: "minor" },
        { numeral: "iv", rootOffset: 5, quality: "minor" },
        { numeral: "V", rootOffset: 7, quality: "major" },
        { numeral: "i", rootOffset: 0, quality: "minor" },
      ],
    },
    "alternate-predominant": {
      id: "alternate-predominant",
      label: "降 VI 连接",
      analysis: "降 VI 引出同主音小调色彩，再经 ii°–V–i 建立小调",
      chords: [
        { numeral: "VI", rootOffset: 8, quality: "major" },
        { numeral: "ii°", rootOffset: 2, quality: "diminished" },
        { numeral: "V", rootOffset: 7, quality: "major" },
        { numeral: "i", rootOffset: 0, quality: "minor" },
      ],
    },
  },
};

const sourceEstablishment: readonly ModulationChord[] = [
  { numeral: "I", rootOffset: 0, quality: "major" },
  { numeral: "IV", rootOffset: 5, quality: "major" },
  { numeral: "V", rootOffset: 7, quality: "major" },
  { numeral: "I", rootOffset: 0, quality: "major" },
];

const qualityIntervals: Record<TriadQuality, readonly [number, number, number]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
};

const getVariants = (difficulty: LocalPracticeDifficulty) => tonics.flatMap((tonic) =>
  LOCAL_MODULATION_DESTINATIONS_BY_DIFFICULTY[difficulty].flatMap((destinationId) =>
    LOCAL_MODULATION_ROUTE_IDS.map((routeId) => ({
      tonic,
      destinationId,
      routeId,
      variantId: `modulation:${tonic.id}:${destinationId}:${routeId}`,
    })),
  ),
);

export const getLocalModulationVariantCount = (difficulty: LocalPracticeDifficulty): number =>
  getVariants(difficulty).length;

export const getLocalModulationAnswerOptions = (
  difficulty: LocalPracticeDifficulty,
): LocalModulationAnswerOption[] => LOCAL_MODULATION_DESTINATIONS_BY_DIFFICULTY[difficulty].map((id) => ({
  id,
  label: destinations[id].label,
}));

const createTriad = (tonicFrequencyHz: number, chord: ModulationChord): [number, number, number] => {
  const rootFrequencyHz = tonicFrequencyHz * 2 ** (chord.rootOffset / 12);
  return qualityIntervals[chord.quality].map(
    (semitones) => rootFrequencyHz * 2 ** (semitones / 12),
  ) as [number, number, number];
};

export const createLocalModulationQuestion = ({
  difficulty,
  sequence,
  questionIndex,
  variantId,
}: {
  difficulty: LocalPracticeDifficulty;
  sequence: number;
  questionIndex?: number;
  variantId?: string;
}): LocalEarTrainingModulationQuestion => {
  const safeSequence = Number.isFinite(sequence) ? Math.max(0, Math.floor(sequence)) : 0;
  const safeQuestionIndex = Number.isFinite(questionIndex)
    ? Math.max(0, Math.floor(questionIndex!))
    : safeSequence;
  const variants = getVariants(difficulty);
  const resolved = variantId && isLocalModulationVariantId(difficulty, variantId)
    ? variants.find((variant) => variant.variantId === variantId)
    : variantId
      ? undefined
      : variants[safeQuestionIndex % variants.length];
  if (!resolved) throw new Error("Invalid local modulation variant id.");

  const destination = destinations[resolved.destinationId];
  const routeDefinition = routes[resolved.destinationId][resolved.routeId];
  const route: ModulationRoute = {
    id: routeDefinition.id,
    label: routeDefinition.label,
    analysis: routeDefinition.analysis,
  };
  const chordFrequenciesHz = [...sourceEstablishment, ...routeDefinition.chords].map((chord) =>
    createTriad(resolved.tonic.frequencyHz, chord),
  );
  const tonicIndex = LOCAL_MODULATION_TONIC_IDS.indexOf(resolved.tonic.id);
  const targetTonicLabel = destination.id === "stay-tonic"
    ? resolved.tonic.label
    : destination.id === "dominant"
      ? `${dominantNames[tonicIndex]} 大调`
      : destination.id === "relative-minor"
        ? `${relativeMinorNames[tonicIndex]} 小调`
        : `${tonicNames[tonicIndex].toLowerCase()} 小调`;

  return {
    id: `${difficulty}-${safeSequence}-${resolved.tonic.id}-${resolved.destinationId}-${resolved.routeId}`,
    variantId: resolved.variantId,
    difficulty,
    tonic: resolved.tonic,
    destination,
    route,
    targetTonicLabel,
    answerOptionId: resolved.destinationId,
    chordFrequenciesHz,
    explanation: `${resolved.tonic.label}先由 I–IV–V–I 建立起始调；随后${route.analysis}，最后确认 ${targetTonicLabel}。本题判断的是短句最后建立的调性中心。`,
  };
};

export const getLocalModulationAnswer = ({
  question,
  selectedOptionId,
}: {
  question: LocalEarTrainingModulationQuestion;
  selectedOptionId: string | null;
}) => ({
  selectedOptionId,
  hasSelection: selectedOptionId !== null,
  matchesAnswer: selectedOptionId === question.answerOptionId,
  answerLabel: question.destination.label,
  explanation: question.explanation,
});
