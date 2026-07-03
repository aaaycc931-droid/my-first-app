import {
  getBeatDurationSeconds,
  sanitizeMetronomeConfig,
  type MetronomeConfig,
  type MetronomeMeter,
} from "./metronomeConfig";

export type MetronomeBeatMetadata = {
  beatIndex: number;
  barNumber: number;
  beatNumber: number;
  scheduledTimeSeconds: number;
  isStrongBeat: boolean;
  meter: MetronomeMeter;
  bpm: number;
  subdivisionIndex: number;
};

const meterBeatCounts: Record<MetronomeMeter, number> = {
  "2/4": 2,
  "3/4": 3,
  "4/4": 4,
};

export const getBeatsPerBar = (meter: MetronomeMeter): number =>
  meterBeatCounts[meter];

export const isStrongBeat = (beatNumber: number): boolean => beatNumber === 1;

export const createMetronomeBeatMetadata = (
  config: MetronomeConfig,
  beatIndex: number,
  scheduledTimeSeconds: number,
): MetronomeBeatMetadata => {
  const safeConfig = sanitizeMetronomeConfig(config);
  const beatsPerBar = getBeatsPerBar(safeConfig.meter);
  const beatNumber = (beatIndex % beatsPerBar) + 1;

  return {
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
}): MetronomeBeatMetadata[] => {
  const safeConfig = sanitizeMetronomeConfig(config);
  const safeBeatCount = Math.max(0, Math.floor(beatCount));
  const beatDurationSeconds = getBeatDurationSeconds(safeConfig.bpm);

  return Array.from({ length: safeBeatCount }, (_, beatIndex) =>
    createMetronomeBeatMetadata(
      safeConfig,
      beatIndex,
      startTimeSeconds + beatIndex * beatDurationSeconds,
    ),
  );
};

export const hasRhythmAssessmentFields = (beat: MetronomeBeatMetadata) =>
  ["score", "pass", "fail", "grade", "accuracyPercentage"].some(
    (fieldName) => fieldName in beat,
  );
