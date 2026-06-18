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
};

export type SyntheticPitchBenchmarkResult = {
  targetFrequencyHz: number;
  estimatedFrequencyHz: number;
  centsError: number;
  nearestNote: string;
  confidence: number;
  passed: boolean;
  toleranceCents: number;
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
}: Omit<SyntheticPitchBenchmarkCase, "toleranceCents">): PitchAudioBufferLike => {
  const length = Math.max(0, Math.floor(durationSeconds * sampleRate));
  const samples = new Float32Array(length);

  for (let sampleIndex = 0; sampleIndex < length; sampleIndex += 1) {
    const timeSeconds = sampleIndex / sampleRate;
    const sineSample = Math.sin(2 * Math.PI * frequencyHz * timeSeconds);
    const noiseSample =
      noiseAmount > 0
        ? createDeterministicNoiseSample(sampleIndex) * noiseAmount
        : 0;
    samples[sampleIndex] = amplitude * sineSample + noiseSample;
  }

  return {
    length,
    numberOfChannels: 1,
    sampleRate,
    getChannelData: (channelIndex: number) => {
      if (channelIndex !== 0) {
        throw new Error("Synthetic pitch benchmark buffer only has one channel.");
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
    passed: Math.abs(centsError) <= benchmarkCase.toleranceCents,
    toleranceCents: benchmarkCase.toleranceCents,
  };
};
