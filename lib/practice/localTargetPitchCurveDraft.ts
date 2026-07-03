export type LocalTargetPitchCurveDraftStatus = "draft" | "empty" | "invalid";

/**
 * A browser-local estimated draft frame for P38 review/correction.
 * frequencyHz may be null when the frame is diagnostically unvoiced or unreliable.
 * voiced and confidence are diagnostic hints only; confidence is not a score.
 */
export type LocalTargetPitchCurveDraftFrame = {
  frameIndex: number;
  timeMs: number;
  frequencyHz: number | null;
  confidence: number;
  voiced: boolean;
};

export type LocalTargetPitchCurveDraftDiagnostics = {
  frameSize: number;
  hopSize: number;
  minFrequencyHz: number;
  maxFrequencyHz: number;
  rmsSilenceThreshold: number;
  analysisKind: "browser-local-autocorrelation-diagnostic";
  nonScoring: true;
};

/**
 * Draft-only, browser-local target pitch curve metadata.
 *
 * This output is intentionally not a final target, official melody, formal
 * transcription, score, grade, pass/fail result, or accuracy percentage. P38 may
 * consume frames for review/correction, but review should happen before any
 * formal scoring or safe practice integration treats reviewed data as a target.
 */
export type LocalTargetPitchCurveDraft = {
  draftOnly: true;
  needsReview: true;
  status: LocalTargetPitchCurveDraftStatus;
  sampleRate: number;
  durationMs: number;
  frameCount: number;
  voicedFrameCount: number;
  unvoicedFrameCount: number;
  frames: LocalTargetPitchCurveDraftFrame[];
  frequencyMinHz: number | null;
  frequencyMedianHz: number | null;
  frequencyMaxHz: number | null;
  warnings: string[];
  diagnostics: LocalTargetPitchCurveDraftDiagnostics;
};

export type LocalTargetPitchCurveDraftOptions = {
  frameSize?: number;
  hopSize?: number;
  minFrequencyHz?: number;
  maxFrequencyHz?: number;
  rmsSilenceThreshold?: number;
  minConfidence?: number;
};

const defaultWarnings = [
  "Draft target pitch curve only; this is diagnostic and needs review before formal practice use.",
  "Best for clean vocal guide, humming, or a single melody instrument.",
  "Full mixed songs may be unreliable and are deferred to future private cloud song analysis.",
  "No score, grade, pass/fail, accuracy percentage, or formal assessment is produced.",
] as const;

const defaultFrameSize = 2048;
const defaultHopSize = 512;
const defaultMinFrequencyHz = 80;
const defaultMaxFrequencyHz = 1000;
const defaultRmsSilenceThreshold = 0.01;
const defaultMinConfidence = 0.55;

const toFiniteSampleArray = (samples: Float32Array | number[]) =>
  Array.from(samples, (sample) => (Number.isFinite(sample) ? Number(sample) : 0));

const calculateRms = (samples: number[], startIndex: number, frameSize: number) => {
  let sum = 0;
  for (let index = 0; index < frameSize; index += 1) {
    const sample = samples[startIndex + index] ?? 0;
    sum += sample * sample;
  }
  return Math.sqrt(sum / frameSize);
};

const calculateMedian = (values: number[]) => {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const estimateFramePitch = (
  samples: number[],
  startIndex: number,
  frameSize: number,
  sampleRate: number,
  minFrequencyHz: number,
  maxFrequencyHz: number,
) => {
  const minLag = Math.max(1, Math.floor(sampleRate / maxFrequencyHz));
  const maxLag = Math.min(frameSize - 2, Math.ceil(sampleRate / minFrequencyHz));
  const correlations: number[] = [];
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    let currentEnergy = 0;
    let delayedEnergy = 0;

    for (let index = 0; index < frameSize - lag; index += 1) {
      const current = samples[startIndex + index] ?? 0;
      const delayed = samples[startIndex + index + lag] ?? 0;
      correlation += current * delayed;
      currentEnergy += current * current;
      delayedEnergy += delayed * delayed;
    }

    const normalized = currentEnergy > 0 && delayedEnergy > 0
      ? correlation / Math.sqrt(currentEnergy * delayedEnergy)
      : 0;
    correlations.push(normalized);
    bestCorrelation = Math.max(bestCorrelation, normalized);
  }

  const strongPeakThreshold = Math.max(0.45, bestCorrelation * 0.9);
  let bestLag = 0;
  let selectedCorrelation = 0;

  for (let index = 1; index < correlations.length - 1; index += 1) {
    const previous = correlations[index - 1];
    const current = correlations[index];
    const next = correlations[index + 1];
    if (current >= strongPeakThreshold && current > previous && current >= next) {
      bestLag = minLag + index;
      selectedCorrelation = current;
      break;
    }
  }

  if (bestLag === 0 && bestCorrelation >= strongPeakThreshold) {
    const bestIndex = correlations.indexOf(bestCorrelation);
    bestLag = minLag + bestIndex;
    selectedCorrelation = bestCorrelation;
  }

  return bestLag > 0
    ? { frequencyHz: sampleRate / bestLag, confidence: Math.max(0, Math.min(1, selectedCorrelation)) }
    : null;
};

export const createLocalTargetPitchCurveDraft = (
  channelData: Float32Array | number[],
  sampleRate: number,
  options: LocalTargetPitchCurveDraftOptions = {},
): LocalTargetPitchCurveDraft => {
  const frameSize = Math.max(32, Math.floor(options.frameSize ?? defaultFrameSize));
  const hopSize = Math.max(1, Math.floor(options.hopSize ?? defaultHopSize));
  const minFrequencyHz = options.minFrequencyHz ?? defaultMinFrequencyHz;
  const maxFrequencyHz = options.maxFrequencyHz ?? defaultMaxFrequencyHz;
  const rmsSilenceThreshold = options.rmsSilenceThreshold ?? defaultRmsSilenceThreshold;
  const minConfidence = options.minConfidence ?? defaultMinConfidence;
  const diagnostics: LocalTargetPitchCurveDraftDiagnostics = {
    frameSize,
    hopSize,
    minFrequencyHz,
    maxFrequencyHz,
    rmsSilenceThreshold,
    analysisKind: "browser-local-autocorrelation-diagnostic",
    nonScoring: true,
  };

  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || channelData.length === 0) {
    return {
      draftOnly: true,
      needsReview: true,
      status: "invalid",
      sampleRate: Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 0,
      durationMs: 0,
      frameCount: 0,
      voicedFrameCount: 0,
      unvoicedFrameCount: 0,
      frames: [],
      frequencyMinHz: null,
      frequencyMedianHz: null,
      frequencyMaxHz: null,
      warnings: [...defaultWarnings, "Invalid sample rate or empty samples; no draft frames were generated."],
      diagnostics,
    };
  }

  const samples = toFiniteSampleArray(channelData);
  const durationMs = (samples.length / sampleRate) * 1000;
  const frameCount = Math.max(1, Math.floor(Math.max(0, samples.length - frameSize) / hopSize) + 1);
  const frames: LocalTargetPitchCurveDraftFrame[] = [];

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const startIndex = frameIndex * hopSize;
    const rms = calculateRms(samples, startIndex, frameSize);
    const estimate = rms >= rmsSilenceThreshold
      ? estimateFramePitch(samples, startIndex, frameSize, sampleRate, minFrequencyHz, maxFrequencyHz)
      : null;
    const voiced = Boolean(estimate && estimate.confidence >= minConfidence);

    frames.push({
      frameIndex,
      timeMs: (startIndex / sampleRate) * 1000,
      frequencyHz: voiced && estimate ? estimate.frequencyHz : null,
      confidence: estimate?.confidence ?? 0,
      voiced,
    });
  }

  const voicedFrequencies = frames
    .map((frame) => frame.frequencyHz)
    .filter((frequency): frequency is number => frequency !== null && Number.isFinite(frequency));
  const voicedFrameCount = voicedFrequencies.length;

  return {
    draftOnly: true,
    needsReview: true,
    status: voicedFrameCount > 0 ? "draft" : "empty",
    sampleRate,
    durationMs,
    frameCount: frames.length,
    voicedFrameCount,
    unvoicedFrameCount: frames.length - voicedFrameCount,
    frames,
    frequencyMinHz: voicedFrameCount ? Math.min(...voicedFrequencies) : null,
    frequencyMedianHz: voicedFrameCount ? calculateMedian(voicedFrequencies) : null,
    frequencyMaxHz: voicedFrameCount ? Math.max(...voicedFrequencies) : null,
    warnings: [...defaultWarnings],
    diagnostics,
  };
};
