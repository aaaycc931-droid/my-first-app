import {
  getBeatDurationSeconds,
  sanitizeMetronomeConfig,
  sanitizeMetronomeSubdivision,
  type MetronomeConfig,
  type MetronomeMeter,
  type MetronomeSubdivision,
} from "./metronomeConfig";

export type MetronomeBeatPhase = "count-in" | "practice";

export type MetronomeBeatMetadata = {
  phase: MetronomeBeatPhase;
  beatIndex: number;
  barNumber: number;
  beatNumber: number;
  scheduledTimeSeconds: number;
  isStrongBeat: boolean;
  meter: MetronomeMeter;
  bpm: number;
  subdivisionIndex: number;
};

export type CountInBeatMetadata = MetronomeBeatMetadata & {
  phase: "count-in";
  countInBeatNumber: number;
};

export type PracticeBeatMetadata = MetronomeBeatMetadata & {
  phase: "practice";
};

export type MetronomeSubdivisionMetadata = {
  phase: MetronomeBeatPhase;
  beatIndex: number;
  barNumber: number;
  beatNumber: number;
  subdivision: MetronomeSubdivision;
  subdivisionIndex: number;
  subdivisionCountPerBeat: number;
  isBeatLevelTick: boolean;
  isSubdivisionTick: boolean;
  scheduledTimeSeconds: number;
  meter: MetronomeMeter;
  bpm: number;
};

const meterBeatCounts: Record<MetronomeMeter, number> = {
  "2/4": 2,
  "3/4": 3,
  "4/4": 4,
};

const subdivisionCounts: Record<MetronomeSubdivision, number> = {
  quarter: 1,
  eighth: 2,
  sixteenth: 4,
};

export const getBeatsPerBar = (meter: MetronomeMeter): number =>
  meterBeatCounts[meter];

export const getSubdivisionCountPerBeat = (
  subdivision: MetronomeSubdivision,
): number => subdivisionCounts[sanitizeMetronomeSubdivision(subdivision)];

export const isStrongBeat = (beatNumber: number): boolean => beatNumber === 1;

export const createMetronomeBeatMetadata = (
  config: MetronomeConfig,
  beatIndex: number,
  scheduledTimeSeconds: number,
  phase: MetronomeBeatPhase = "practice",
): MetronomeBeatMetadata => {
  const safeConfig = sanitizeMetronomeConfig(config);
  const beatsPerBar = getBeatsPerBar(safeConfig.meter);
  const beatNumber = (beatIndex % beatsPerBar) + 1;

  return {
    phase,
    beatIndex,
    barNumber: Math.floor(beatIndex / beatsPerBar) + 1,
    beatNumber,
    scheduledTimeSeconds,
    isStrongBeat: isStrongBeat(beatNumber),
    meter: safeConfig.meter,
    bpm: safeConfig.bpm,
    subdivisionIndex: 0,
  };
};

export const createMetronomeBeatGrid = ({
  config,
  startTimeSeconds,
  beatCount,
}: {
  config: MetronomeConfig;
  startTimeSeconds: number;
  beatCount: number;
}): PracticeBeatMetadata[] => {
  const safeConfig = sanitizeMetronomeConfig(config);
  const safeBeatCount = Math.max(0, Math.floor(beatCount));
  const beatDurationSeconds = getBeatDurationSeconds(safeConfig.bpm);

  return Array.from(
    { length: safeBeatCount },
    (_, beatIndex) =>
      createMetronomeBeatMetadata(
        safeConfig,
        beatIndex,
        startTimeSeconds + beatIndex * beatDurationSeconds,
        "practice",
      ) as PracticeBeatMetadata,
  );
};

export const createCountInBeatGrid = ({
  config,
  startTimeSeconds,
}: {
  config: MetronomeConfig;
  startTimeSeconds: number;
}): CountInBeatMetadata[] => {
  const safeConfig = sanitizeMetronomeConfig(config);
  const countIn = safeConfig.countIn;

  if (!countIn?.enabled || !countIn.bars || countIn.bars <= 0) {
    return [];
  }

  const beatsPerBar = getBeatsPerBar(safeConfig.meter);
  const beatCount = countIn.bars * beatsPerBar;
  const beatDurationSeconds = getBeatDurationSeconds(safeConfig.bpm);

  return Array.from({ length: beatCount }, (_, beatIndex) => ({
    ...createMetronomeBeatMetadata(
      safeConfig,
      beatIndex,
      startTimeSeconds + beatIndex * beatDurationSeconds,
      "count-in",
    ),
    phase: "count-in",
    countInBeatNumber: beatIndex + 1,
  }));
};

export const createMetronomeSubdivisionGrid = ({
  config,
  startTimeSeconds,
  beatCount,
  phase = "practice",
}: {
  config: MetronomeConfig;
  startTimeSeconds: number;
  beatCount: number;
  phase?: MetronomeBeatPhase;
}): MetronomeSubdivisionMetadata[] => {
  const safeConfig = sanitizeMetronomeConfig(config);
  const safeBeatCount = Math.max(0, Math.floor(beatCount));
  const subdivision = safeConfig.subdivision ?? "quarter";
  const subdivisionCountPerBeat = getSubdivisionCountPerBeat(subdivision);
  const beatDurationSeconds = getBeatDurationSeconds(safeConfig.bpm);
  const subdivisionDurationSeconds =
    beatDurationSeconds / subdivisionCountPerBeat;

  return Array.from({ length: safeBeatCount }).flatMap((_, beatIndex) => {
    const beat = createMetronomeBeatMetadata(
      safeConfig,
      beatIndex,
      startTimeSeconds + beatIndex * beatDurationSeconds,
      phase,
    );

    return Array.from(
      { length: subdivisionCountPerBeat },
      (__, subdivisionIndex) => ({
        phase,
        beatIndex,
        barNumber: beat.barNumber,
        beatNumber: beat.beatNumber,
        subdivision,
        subdivisionIndex,
        subdivisionCountPerBeat,
        isBeatLevelTick: subdivisionIndex === 0,
        isSubdivisionTick: subdivisionIndex > 0,
        scheduledTimeSeconds:
          beat.scheduledTimeSeconds +
          subdivisionIndex * subdivisionDurationSeconds,
        meter: safeConfig.meter,
        bpm: safeConfig.bpm,
      }),
    );
  });
};

export const hasRhythmAssessmentFields = (
  beat: MetronomeBeatMetadata | MetronomeSubdivisionMetadata,
) =>
  ["score", "pass", "fail", "grade", "accuracyPercentage"].some(
    (fieldName) => fieldName in beat,
  );
