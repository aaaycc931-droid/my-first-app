export type AudioOnsetDiagnosticConfidence = "low" | "medium" | "high";

export type AudioOnsetCandidate = {
  onsetTimeMs: number;
  frameIndex: number;
  strength: number;
  energy: number;
  threshold: number;
  confidence: AudioOnsetDiagnosticConfidence;
  diagnosticLabel: string;
  aboveThreshold: boolean;
};

export type AudioOnsetDetectionResult = {
  sampleRate: number;
  durationMs: number;
  frameSize: number;
  hopSize: number;
  onsetCount: number;
  candidates: AudioOnsetCandidate[];
  diagnosticSummary: string;
  warnings: string[];
};

export type AudioOnsetDetectionOptions = {
  frameSize?: number;
  hopSize?: number;
  minOnsetGapMs?: number;
  thresholdMultiplier?: number;
  minimumEnergy?: number;
  minimumStrength?: number;
};

const defaultFrameSize = 1024;
const defaultHopSize = 256;
const defaultMinOnsetGapMs = 90;
const defaultThresholdMultiplier = 2.8;
const defaultMinimumEnergy = 0.015;
const defaultMinimumStrength = 0.012;

const sanitizePositiveInteger = (
  value: number | undefined,
  fallback: number,
) =>
  Number.isFinite(value) && value !== undefined && value > 0
    ? Math.floor(value)
    : fallback;

const mean = (values: number[]) =>
  values.length > 0
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;

const standardDeviation = (values: number[], average: number) =>
  values.length > 0
    ? Math.sqrt(
        values.reduce((total, value) => total + (value - average) ** 2, 0) /
          values.length,
      )
    : 0;

const confidenceForRatio = (strength: number, threshold: number) => {
  if (threshold <= 0) return "low";
  const ratio = strength / threshold;
  if (ratio >= 2) return "high";
  if (ratio >= 1.25) return "medium";
  return "low";
};

export const detectAudioOnsets = (
  samples: Float32Array | number[],
  sampleRate: number,
  options: AudioOnsetDetectionOptions = {},
): AudioOnsetDetectionResult => {
  const frameSize = sanitizePositiveInteger(
    options.frameSize,
    defaultFrameSize,
  );
  const hopSize = sanitizePositiveInteger(options.hopSize, defaultHopSize);
  const warnings: string[] = [];

  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    return {
      sampleRate: 0,
      durationMs: 0,
      frameSize,
      hopSize,
      onsetCount: 0,
      candidates: [],
      diagnosticSummary: "Audio onset detection skipped: invalid sample rate.",
      warnings: [
        "Invalid sampleRate; returning empty browser-local diagnostic result.",
      ],
    };
  }

  if (!samples || samples.length === 0) {
    return {
      sampleRate,
      durationMs: 0,
      frameSize,
      hopSize,
      onsetCount: 0,
      candidates: [],
      diagnosticSummary: "Audio onset detection skipped: empty samples.",
      warnings: [
        "Empty samples; returning empty browser-local diagnostic result.",
      ],
    };
  }

  const durationMs = (samples.length / sampleRate) * 1000;
  const frameCount = Math.max(
    1,
    Math.floor((samples.length - 1) / hopSize) + 1,
  );
  const energies = Array.from({ length: frameCount }, (_, frameIndex) => {
    const start = frameIndex * hopSize;
    const end = Math.min(start + frameSize, samples.length);
    let squaredSum = 0;
    for (let index = start; index < end; index += 1) {
      const sample = samples[index] ?? 0;
      squaredSum += sample * sample;
    }
    return end > start ? Math.sqrt(squaredSum / (end - start)) : 0;
  });

  const strengths = energies.map((energy, index) =>
    index === 0
      ? Math.max(0, energy)
      : Math.max(0, energy - energies[index - 1]),
  );
  const averageStrength = mean(strengths);
  const strengthDeviation = standardDeviation(strengths, averageStrength);
  const minimumStrength = options.minimumStrength ?? defaultMinimumStrength;
  const threshold = Math.max(
    minimumStrength,
    averageStrength +
      strengthDeviation *
        (options.thresholdMultiplier ?? defaultThresholdMultiplier),
  );
  const minimumEnergy = options.minimumEnergy ?? defaultMinimumEnergy;
  const minGapFrames = Math.max(
    1,
    Math.ceil(
      (((options.minOnsetGapMs ?? defaultMinOnsetGapMs) / 1000) * sampleRate) /
        hopSize,
    ),
  );

  const candidates: AudioOnsetCandidate[] = [];
  let lastAcceptedFrameIndex = Number.NEGATIVE_INFINITY;

  strengths.forEach((strength, frameIndex) => {
    const energy = energies[frameIndex] ?? 0;
    const aboveThreshold = strength >= threshold && energy >= minimumEnergy;
    if (!aboveThreshold) return;
    if (frameIndex - lastAcceptedFrameIndex < minGapFrames) return;
    lastAcceptedFrameIndex = frameIndex;
    const confidence = confidenceForRatio(strength, threshold);
    candidates.push({
      onsetTimeMs: ((frameIndex * hopSize) / sampleRate) * 1000,
      frameIndex,
      strength,
      energy,
      threshold,
      confidence,
      diagnosticLabel: `${confidence} diagnostic onset candidate`,
      aboveThreshold,
    });
  });

  if (candidates.length === 0) {
    warnings.push("No onset candidates crossed the diagnostic threshold.");
  }

  return {
    sampleRate,
    durationMs,
    frameSize,
    hopSize,
    onsetCount: candidates.length,
    candidates,
    diagnosticSummary: `Detected ${candidates.length} browser-local onset candidate${candidates.length === 1 ? "" : "s"}; diagnostic only, not rhythm scoring.`,
    warnings,
  };
};

export const hasAudioOnsetScoringFields = (value: object) =>
  ["score", "grade", "pass", "fail", "accuracyPercentage", "assessment"].some(
    (fieldName) => fieldName in value,
  );
