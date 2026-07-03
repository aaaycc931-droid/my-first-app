export type AudioOnsetDiagnosticConfidence = "low" | "medium" | "high";
export type AudioOnsetSensitivityPreset = "balanced" | "sensitive" | "conservative";

export type AudioOnsetSensitivityConfig = {
  preset: AudioOnsetSensitivityPreset;
  thresholdMultiplier: number;
  minOnsetGapMs: number;
  minimumEnergy: number;
  minimumStrength: number;
  description: string;
};

export type AudioOnsetTimelinePoint = {
  timeMs: number;
  frameIndex: number;
  onsetStrength: number;
  energy: number;
  threshold: number;
  isCandidate: boolean;
  candidateIndex?: number;
  aboveThreshold: boolean;
  sensitivityPreset: AudioOnsetSensitivityPreset;
};

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
  sensitivityPreset: AudioOnsetSensitivityPreset;
  sensitivityDescription: string;
  thresholdMultiplier: number;
  minimumEnergy: number;
  minimumStrength: number;
  minOnsetGapMs: number;
  threshold: number;
  averageStrength: number;
  strengthDeviation: number;
  maxStrength: number;
  timeline: AudioOnsetTimelinePoint[];
  timelinePointCount: number;
  timelineSourcePointCount: number;
  timelineMaxPoints: number;
  isTimelineDownsampled: boolean;
};

export type AudioOnsetDetectionOptions = {
  sensitivityPreset?: AudioOnsetSensitivityPreset | string;
  frameSize?: number;
  hopSize?: number;
  minOnsetGapMs?: number;
  thresholdMultiplier?: number;
  minimumEnergy?: number;
  minimumStrength?: number;
  maxTimelinePoints?: number;
};

const defaultFrameSize = 1024;
const defaultHopSize = 256;
const defaultMinOnsetGapMs = 90;
const defaultThresholdMultiplier = 2.8;
const defaultMinimumEnergy = 0.015;
const defaultMinimumStrength = 0.012;
export const defaultAudioOnsetTimelineMaxPoints = 300;

export const audioOnsetSensitivityPresets: Record<
  AudioOnsetSensitivityPreset,
  AudioOnsetSensitivityConfig
> = {
  balanced: {
    preset: "balanced",
    thresholdMultiplier: defaultThresholdMultiplier,
    minOnsetGapMs: defaultMinOnsetGapMs,
    minimumEnergy: defaultMinimumEnergy,
    minimumStrength: defaultMinimumStrength,
    description: "Balanced default for browser-local diagnostic onset detection.",
  },
  sensitive: {
    preset: "sensitive",
    thresholdMultiplier: 1.9,
    minOnsetGapMs: 70,
    minimumEnergy: 0.008,
    minimumStrength: 0.006,
    description: "More likely to detect weak onsets; may add extra candidates.",
  },
  conservative: {
    preset: "conservative",
    thresholdMultiplier: 3.6,
    minOnsetGapMs: 120,
    minimumEnergy: 0.025,
    minimumStrength: 0.02,
    description: "More likely to reduce extra candidates; may miss weak onsets.",
  },
};

export const getAudioOnsetSensitivityConfig = (
  preset: AudioOnsetDetectionOptions["sensitivityPreset"] = "balanced",
): AudioOnsetSensitivityConfig =>
  preset === "sensitive" || preset === "conservative" || preset === "balanced"
    ? audioOnsetSensitivityPresets[preset]
    : audioOnsetSensitivityPresets.balanced;

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

const clampTimelineMaxPoints = (value: number | undefined) => {
  const sanitized = sanitizePositiveInteger(value, defaultAudioOnsetTimelineMaxPoints);
  return Math.max(1, sanitized);
};

const confidenceForRatio = (strength: number, threshold: number) => {
  if (threshold <= 0) return "low";
  const ratio = strength / threshold;
  if (ratio >= 2) return "high";
  if (ratio >= 1.25) return "medium";
  return "low";
};

export const createAudioOnsetTimeline = ({
  energies,
  strengths,
  threshold,
  hopSize,
  sampleRate,
  candidates,
  sensitivityPreset,
  maxPoints = defaultAudioOnsetTimelineMaxPoints,
}: {
  energies: number[];
  strengths: number[];
  threshold: number;
  hopSize: number;
  sampleRate: number;
  candidates: AudioOnsetCandidate[];
  sensitivityPreset: AudioOnsetSensitivityPreset;
  maxPoints?: number;
}): AudioOnsetTimelinePoint[] => {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || strengths.length === 0) {
    return [];
  }

  const safeMaxPoints = clampTimelineMaxPoints(maxPoints);
  const candidateByFrameIndex = new Map(
    candidates.map((candidate, candidateIndex) => [
      candidate.frameIndex,
      { candidate, candidateIndex },
    ]),
  );
  const selectedFrameIndexes = new Set<number>();

  if (strengths.length <= safeMaxPoints) {
    strengths.forEach((_, frameIndex) => selectedFrameIndexes.add(frameIndex));
  } else {
    const stride = strengths.length / safeMaxPoints;
    for (let pointIndex = 0; pointIndex < safeMaxPoints; pointIndex += 1) {
      selectedFrameIndexes.add(Math.min(strengths.length - 1, Math.floor(pointIndex * stride)));
    }
    candidateByFrameIndex.forEach((_, frameIndex) => selectedFrameIndexes.add(frameIndex));
  }

  const sortedFrameIndexes = Array.from(selectedFrameIndexes).sort((left, right) => left - right);
  const limitedFrameIndexes = sortedFrameIndexes.length <= safeMaxPoints
    ? sortedFrameIndexes
    : sortedFrameIndexes.filter((frameIndex) => candidateByFrameIndex.has(frameIndex)).slice(0, safeMaxPoints);

  return limitedFrameIndexes.map((frameIndex) => {
    const candidateEntry = candidateByFrameIndex.get(frameIndex);
    const onsetStrength = strengths[frameIndex] ?? 0;
    const energy = energies[frameIndex] ?? 0;
    return {
      timeMs: ((frameIndex * hopSize) / sampleRate) * 1000,
      frameIndex,
      onsetStrength,
      energy,
      threshold,
      isCandidate: Boolean(candidateEntry),
      ...(candidateEntry ? { candidateIndex: candidateEntry.candidateIndex } : {}),
      aboveThreshold: candidateEntry?.candidate.aboveThreshold ?? onsetStrength >= threshold,
      sensitivityPreset,
    };
  });
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
  const sensitivityConfig = getAudioOnsetSensitivityConfig(options.sensitivityPreset);
  if (
    options.sensitivityPreset !== undefined &&
    options.sensitivityPreset !== sensitivityConfig.preset
  ) {
    warnings.push("Unknown sensitivity preset; using balanced diagnostic defaults.");
  }

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
        ...warnings,
        "Invalid sampleRate; returning empty browser-local diagnostic result.",
      ],
      sensitivityPreset: sensitivityConfig.preset,
      sensitivityDescription: sensitivityConfig.description,
      thresholdMultiplier: options.thresholdMultiplier ?? sensitivityConfig.thresholdMultiplier,
      minimumEnergy: options.minimumEnergy ?? sensitivityConfig.minimumEnergy,
      minimumStrength: options.minimumStrength ?? sensitivityConfig.minimumStrength,
      minOnsetGapMs: options.minOnsetGapMs ?? sensitivityConfig.minOnsetGapMs,
      threshold: 0,
      averageStrength: 0,
      strengthDeviation: 0,
      maxStrength: 0,
      timeline: [],
      timelinePointCount: 0,
      timelineSourcePointCount: 0,
      timelineMaxPoints: clampTimelineMaxPoints(options.maxTimelinePoints),
      isTimelineDownsampled: false,
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
        ...warnings,
        "Empty samples; returning empty browser-local diagnostic result.",
      ],
      sensitivityPreset: sensitivityConfig.preset,
      sensitivityDescription: sensitivityConfig.description,
      thresholdMultiplier: options.thresholdMultiplier ?? sensitivityConfig.thresholdMultiplier,
      minimumEnergy: options.minimumEnergy ?? sensitivityConfig.minimumEnergy,
      minimumStrength: options.minimumStrength ?? sensitivityConfig.minimumStrength,
      minOnsetGapMs: options.minOnsetGapMs ?? sensitivityConfig.minOnsetGapMs,
      threshold: 0,
      averageStrength: 0,
      strengthDeviation: 0,
      maxStrength: 0,
      timeline: [],
      timelinePointCount: 0,
      timelineSourcePointCount: 0,
      timelineMaxPoints: clampTimelineMaxPoints(options.maxTimelinePoints),
      isTimelineDownsampled: false,
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
  const minimumStrength = options.minimumStrength ?? sensitivityConfig.minimumStrength;
  const threshold = Math.max(
    minimumStrength,
    averageStrength +
      strengthDeviation *
        (options.thresholdMultiplier ?? sensitivityConfig.thresholdMultiplier),
  );
  const minimumEnergy = options.minimumEnergy ?? sensitivityConfig.minimumEnergy;
  const minGapFrames = Math.max(
    1,
    Math.ceil(
      (((options.minOnsetGapMs ?? sensitivityConfig.minOnsetGapMs) / 1000) * sampleRate) /
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

  const thresholdMultiplier =
    options.thresholdMultiplier ?? sensitivityConfig.thresholdMultiplier;
  const minOnsetGapMs = options.minOnsetGapMs ?? sensitivityConfig.minOnsetGapMs;
  const maxStrength = strengths.length > 0 ? Math.max(...strengths) : 0;
  const timelineMaxPoints = clampTimelineMaxPoints(options.maxTimelinePoints);
  const timeline = createAudioOnsetTimeline({
    energies,
    strengths,
    threshold,
    hopSize,
    sampleRate,
    candidates,
    sensitivityPreset: sensitivityConfig.preset,
    maxPoints: timelineMaxPoints,
  });
  const isTimelineDownsampled = strengths.length > timeline.length;

  return {
    sampleRate,
    durationMs,
    frameSize,
    hopSize,
    onsetCount: candidates.length,
    candidates,
    diagnosticSummary: `Detected ${candidates.length} browser-local onset candidate${candidates.length === 1 ? "" : "s"} with ${sensitivityConfig.preset} sensitivity; threshold ${threshold.toFixed(4)}, max strength ${maxStrength.toFixed(4)}; timeline preview ${isTimelineDownsampled ? "downsampled" : "full"} to ${timeline.length}/${strengths.length} point${strengths.length === 1 ? "" : "s"}; diagnostic only, not rhythm scoring.`,
    warnings,
    sensitivityPreset: sensitivityConfig.preset,
    sensitivityDescription: sensitivityConfig.description,
    thresholdMultiplier,
    minimumEnergy,
    minimumStrength,
    minOnsetGapMs,
    threshold,
    averageStrength,
    strengthDeviation,
    maxStrength,
    timeline,
    timelinePointCount: timeline.length,
    timelineSourcePointCount: strengths.length,
    timelineMaxPoints,
    isTimelineDownsampled,
  };
};

export const hasAudioOnsetScoringFields = (value: object) =>
  ["score", "grade", "pass", "fail", "accuracyPercentage", "assessment"].some(
    (fieldName) => fieldName in value,
  );
