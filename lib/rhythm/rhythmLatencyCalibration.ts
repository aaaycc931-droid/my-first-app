import type { MetronomeConfig } from "../metronome/metronomeConfig";
import { createRhythmTargetPattern, type RhythmTargetEvent } from "./rhythmTapFeedback";

export type RhythmLatencyCalibrationStatus =
  | "not-started"
  | "collecting"
  | "insufficient-samples"
  | "estimated"
  | "unstable";

export type RhythmLatencyCalibrationTap = {
  id: number;
  timestampMs: number;
};

export type RhythmLatencyCalibrationSample = {
  tapId: number;
  targetIndex: number;
  tapTimeMs: number;
  targetTimeMs: number;
  offsetMs: number;
};

export type RhythmLatencyCalibrationResult = {
  status: RhythmLatencyCalibrationStatus;
  sampleCount: number;
  acceptedSampleCount: number;
  rejectedOutlierCount: number;
  offsetMs: number | null;
  stabilityHint: "not-enough-data" | "stable" | "unstable";
  samples: RhythmLatencyCalibrationSample[];
};

export const rhythmLatencyCalibrationMinimumSamples = 8;
export const rhythmLatencyCalibrationOutlierWindowMs = 220;
export const rhythmLatencyCalibrationUnstableSpreadMs = 90;

export const createRhythmLatencyCalibrationTargets = ({
  config,
  calibrationStartTimeMs,
  barCount = 2,
}: {
  config: MetronomeConfig;
  calibrationStartTimeMs: number;
  barCount?: number;
}): RhythmTargetEvent[] =>
  createRhythmTargetPattern({
    config,
    practiceStartTimeMs: calibrationStartTimeMs,
    barCount,
    pattern: "quarter-note-pulse",
  });

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
    : sorted[midpoint];
};

export const getRhythmLatencyCalibration = ({
  targets,
  taps,
  status = "collecting",
  minimumSamples = rhythmLatencyCalibrationMinimumSamples,
  outlierWindowMs = rhythmLatencyCalibrationOutlierWindowMs,
  unstableSpreadMs = rhythmLatencyCalibrationUnstableSpreadMs,
}: {
  targets: RhythmTargetEvent[];
  taps: RhythmLatencyCalibrationTap[];
  status?: "not-started" | "collecting";
  minimumSamples?: number;
  outlierWindowMs?: number;
  unstableSpreadMs?: number;
}): RhythmLatencyCalibrationResult => {
  if (status === "not-started") {
    return {
      status: "not-started",
      sampleCount: 0,
      acceptedSampleCount: 0,
      rejectedOutlierCount: 0,
      offsetMs: null,
      stabilityHint: "not-enough-data",
      samples: [],
    };
  }

  const samples = taps.flatMap((tap) => {
    const nearestTarget = targets.reduce<RhythmTargetEvent | null>((best, target) => {
      if (!best) return target;
      return Math.abs(tap.timestampMs - target.targetTimeMs) <
        Math.abs(tap.timestampMs - best.targetTimeMs)
        ? target
        : best;
    }, null);

    if (!nearestTarget) return [];

    return [
      {
        tapId: tap.id,
        targetIndex: nearestTarget.targetIndex,
        tapTimeMs: tap.timestampMs,
        targetTimeMs: nearestTarget.targetTimeMs,
        offsetMs: tap.timestampMs - nearestTarget.targetTimeMs,
      },
    ];
  });

  const acceptedSamples = samples.filter(
    (sample) => Math.abs(sample.offsetMs) <= outlierWindowMs,
  );
  const rejectedOutlierCount = samples.length - acceptedSamples.length;

  if (acceptedSamples.length < minimumSamples) {
    return {
      status: taps.length === 0 ? "collecting" : "insufficient-samples",
      sampleCount: samples.length,
      acceptedSampleCount: acceptedSamples.length,
      rejectedOutlierCount,
      offsetMs: null,
      stabilityHint: "not-enough-data",
      samples,
    };
  }

  const offsets = acceptedSamples.map((sample) => sample.offsetMs);
  const offsetMs = median(offsets);
  const spreadMs = Math.max(...offsets) - Math.min(...offsets);
  const isStable = spreadMs <= unstableSpreadMs;

  return {
    status: isStable ? "estimated" : "unstable",
    sampleCount: samples.length,
    acceptedSampleCount: acceptedSamples.length,
    rejectedOutlierCount,
    offsetMs,
    stabilityHint: isStable ? "stable" : "unstable",
    samples,
  };
};

export const hasRhythmLatencyCalibrationScoringFields = (value: object) =>
  ["score", "grade", "pass", "fail", "accuracyPercentage", "assessment"].some(
    (fieldName) => fieldName in value,
  );
