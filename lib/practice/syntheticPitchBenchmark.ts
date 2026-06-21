import {
  estimateLocalPitch,
  type PitchAudioBufferLike,
  type PitchEstimateResult,
} from "./pitchEstimate";

export type SyntheticPitchBenchmarkCase = {
  frequencyHz: number;
  durationSeconds: number;
  sampleRate: number;
  amplitude: number;
  toleranceCents: number;
  noiseAmount?: number;
  frequencyEndHz?: number;
  vibratoDepthCents?: number;
  vibratoRateHz?: number;
  harmonics?: { multiple: number; amplitudeRatio: number }[];
};

export type SyntheticNoPitchBenchmarkExpectedErrorKind =
  | "no-usable-pitch-frames"
  | "too-short";

export type SyntheticPitchBenchmarkResult = {
  targetFrequencyHz: number;
  estimatedFrequencyHz: number;
  centsError: number;
  nearestNote: string;
  confidence: number;
  framesAnalyzed: number;
  validPitchFrames: number;
  frameFrequencyMinHz: number;
  frameFrequencyMedianHz: number;
  frameFrequencyMaxHz: number;
  frequencyEndHz?: number;
  vibratoDepthCents?: number;
  vibratoRateHz?: number;
  passed: boolean;
  toleranceCents: number;
};

export type SyntheticNoPitchBenchmarkCase = {
  caseName: string;
  durationSeconds: number;
  sampleRate: number;
  expectedErrorKind: SyntheticNoPitchBenchmarkExpectedErrorKind;
};

export type SyntheticNoPitchBenchmarkResult = {
  caseName: string;
  passed: boolean;
  expectedErrorKind: SyntheticNoPitchBenchmarkExpectedErrorKind;
  actualErrorMessage: string | null;
  durationSeconds: number;
  sampleRate: number;
};

const calculateCentsError = (
  estimatedFrequencyHz: number,
  targetFrequencyHz: number,
) => 1200 * Math.log2(estimatedFrequencyHz / targetFrequencyHz);

const createDeterministicNoiseSample = (sampleIndex: number) => {
  const noiseValue = Math.sin(sampleIndex * 12.9898) * 43758.5453;

  return (noiseValue - Math.floor(noiseValue)) * 2 - 1;
};

export const createSyntheticPitchBuffer = ({
  frequencyHz,
  durationSeconds,
  sampleRate,
  amplitude,
  noiseAmount = 0,
  frequencyEndHz,
  vibratoDepthCents,
  vibratoRateHz,
  harmonics,
}: Omit<
  SyntheticPitchBenchmarkCase,
  "toleranceCents"
>): PitchAudioBufferLike => {
  const length = Math.max(0, Math.floor(durationSeconds * sampleRate));
  const samples = new Float32Array(length);

  for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
    const timeSeconds = sampleIndex / sampleRate;
    const progress = durationSeconds > 0 ? timeSeconds / durationSeconds : 0;
    const driftFrequencyHz =
      frequencyEndHz === undefined
        ? frequencyHz
        : frequencyHz + (frequencyEndHz - frequencyHz) * progress;
    const vibratoMultiplier =
      vibratoDepthCents === undefined || vibratoRateHz === undefined
        ? 1
        : 2 **
          ((vibratoDepthCents *
            Math.sin(2 * Math.PI * vibratoRateHz * timeSeconds)) /
            1200);
    const instantaneousFrequencyHz = driftFrequencyHz * vibratoMultiplier;
    const sineSample = Math.sin(
      2 * Math.PI * instantaneousFrequencyHz * timeSeconds,
    );
    const harmonicSample = (harmonics ?? []).reduce(
      (sum, harmonic) =>
        sum +
        harmonic.amplitudeRatio *
          Math.sin(
            2 *
              Math.PI *
              instantaneousFrequencyHz *
              harmonic.multiple *
              timeSeconds,
          ),
      0,
    );
    const noiseSample =
      noiseAmount > 0
        ? createDeterministicNoiseSample(sampleIndex) * noiseAmount
        : 0;
    samples[sampleIndex] =
      amplitude * (sineSample + harmonicSample) + noiseSample;
  }

  return {
    length,
    numberOfChannels: 1,
    sampleRate,
    getChannelData: (channelIndex: number) => {
      if (channelIndex !== 0) {
        throw new Error(
          "Synthetic pitch benchmark buffer only has one channel.",
        );
      }

      return samples;
    },
  };
};

export const createSilentSyntheticPitchBuffer = ({
  durationSeconds,
  sampleRate,
}: Pick<
  SyntheticNoPitchBenchmarkCase,
  "durationSeconds" | "sampleRate"
>): PitchAudioBufferLike => {
  const length = Math.max(0, Math.floor(durationSeconds * sampleRate));
  const samples = new Float32Array(length);

  return {
    length,
    numberOfChannels: 1,
    sampleRate,
    getChannelData: (channelIndex: number) => {
      if (channelIndex !== 0) {
        throw new Error(
          "Synthetic pitch benchmark buffer only has one channel.",
        );
      }

      return samples;
    },
  };
};

export const runSyntheticPitchBenchmarkCase = (
  benchmarkCase: SyntheticPitchBenchmarkCase,
): SyntheticPitchBenchmarkResult => {
  const syntheticBuffer = createSyntheticPitchBuffer(benchmarkCase);
  const estimate: PitchEstimateResult = estimateLocalPitch(syntheticBuffer);
  const centsError = calculateCentsError(
    estimate.estimatedFrequencyHz,
    benchmarkCase.frequencyHz,
  );

  return {
    targetFrequencyHz: benchmarkCase.frequencyHz,
    estimatedFrequencyHz: estimate.estimatedFrequencyHz,
    centsError,
    nearestNote: estimate.nearestNote,
    confidence: estimate.confidence,
    framesAnalyzed: estimate.framesAnalyzed,
    validPitchFrames: estimate.validPitchFrames,
    frameFrequencyMinHz: estimate.frameFrequencyMinHz,
    frameFrequencyMedianHz: estimate.frameFrequencyMedianHz,
    frameFrequencyMaxHz: estimate.frameFrequencyMaxHz,
    frequencyEndHz: benchmarkCase.frequencyEndHz,
    vibratoDepthCents: benchmarkCase.vibratoDepthCents,
    vibratoRateHz: benchmarkCase.vibratoRateHz,
    passed: Math.abs(centsError) <= benchmarkCase.toleranceCents,
    toleranceCents: benchmarkCase.toleranceCents,
  };
};

const isExpectedNoPitchError = (
  errorMessage: string,
  expectedErrorKind: SyntheticNoPitchBenchmarkExpectedErrorKind,
) => {
  if (expectedErrorKind === "too-short") {
    return errorMessage.includes("Recording is too short");
  }

  return errorMessage.includes("No usable pitch frames were found");
};

export const runSyntheticNoPitchBenchmarkCase = (
  benchmarkCase: SyntheticNoPitchBenchmarkCase,
): SyntheticNoPitchBenchmarkResult => {
  const syntheticBuffer = createSilentSyntheticPitchBuffer(benchmarkCase);

  try {
    estimateLocalPitch(syntheticBuffer);

    return {
      caseName: benchmarkCase.caseName,
      passed: false,
      expectedErrorKind: benchmarkCase.expectedErrorKind,
      actualErrorMessage: null,
      durationSeconds: benchmarkCase.durationSeconds,
      sampleRate: benchmarkCase.sampleRate,
    };
  } catch (error) {
    const actualErrorMessage =
      error instanceof Error ? error.message : "Unknown pitch benchmark error.";

    return {
      caseName: benchmarkCase.caseName,
      passed: isExpectedNoPitchError(
        actualErrorMessage,
        benchmarkCase.expectedErrorKind,
      ),
      expectedErrorKind: benchmarkCase.expectedErrorKind,
      actualErrorMessage,
      durationSeconds: benchmarkCase.durationSeconds,
      sampleRate: benchmarkCase.sampleRate,
    };
  }
};
