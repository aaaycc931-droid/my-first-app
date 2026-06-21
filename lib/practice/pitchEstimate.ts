export type PitchEstimateResult = {
  estimatedFrequencyHz: number;
  nearestNote: string;
  centsOffset: number;
  confidence: number;
  framesAnalyzed: number;
  validPitchFrames: number;
  frameFrequencyMinHz: number;
  frameFrequencyMedianHz: number;
  frameFrequencyMaxHz: number;
};

export type PitchAudioBufferLike = {
  length: number;
  numberOfChannels: number;
  sampleRate: number;
  getChannelData(channelIndex: number): Float32Array;
};

const pitchNoteNames = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const calculateRms = (
  samples: Float32Array,
  startIndex: number,
  frameSize: number,
) => {
  let squaredSampleSum = 0;

  for (let index = 0; index < frameSize; index += 1) {
    const sample = samples[startIndex + index] ?? 0;
    squaredSampleSum += sample * sample;
  }

  return Math.sqrt(squaredSampleSum / frameSize);
};

const estimateFrameFrequency = (
  samples: Float32Array,
  startIndex: number,
  frameSize: number,
  sampleRate: number,
) => {
  const minLag = Math.floor(sampleRate / 1000);
  const maxLag = Math.min(Math.ceil(sampleRate / 80), frameSize - 1);
  const correlations: number[] = [];
  let bestCorrelation = -Infinity;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    let currentEnergy = 0;
    let delayedEnergy = 0;

    for (let index = 0; index < frameSize - lag; index += 1) {
      const currentSample = samples[startIndex + index];
      const delayedSample = samples[startIndex + index + lag];

      correlation += currentSample * delayedSample;
      currentEnergy += currentSample * currentSample;
      delayedEnergy += delayedSample * delayedSample;
    }

    const energyProduct = currentEnergy * delayedEnergy;
    const normalizedCorrelation =
      energyProduct > 0 ? correlation / Math.sqrt(energyProduct) : 0;

    correlations.push(normalizedCorrelation);
    bestCorrelation = Math.max(bestCorrelation, normalizedCorrelation);
  }

  const strongPeakThreshold = bestCorrelation * 0.9;
  let selectedLag = 0;

  for (let index = 1; index < correlations.length - 1; index += 1) {
    const previousCorrelation = correlations[index - 1];
    const currentCorrelation = correlations[index];
    const nextCorrelation = correlations[index + 1];

    if (
      currentCorrelation >= strongPeakThreshold &&
      currentCorrelation > previousCorrelation &&
      currentCorrelation >= nextCorrelation
    ) {
      selectedLag = minLag + index;
      break;
    }
  }

  if (selectedLag === 0) {
    return null;
  }

  const selectedIndex = selectedLag - minLag;
  const previousCorrelation = correlations[selectedIndex - 1];
  const currentCorrelation = correlations[selectedIndex];
  const nextCorrelation = correlations[selectedIndex + 1];
  const interpolationDenominator =
    previousCorrelation - 2 * currentCorrelation + nextCorrelation;
  const interpolatedLagOffset =
    interpolationDenominator !== 0
      ? (previousCorrelation - nextCorrelation) /
        (2 * interpolationDenominator)
      : 0;
  const interpolatedLag = selectedLag + interpolatedLagOffset;

  return interpolatedLag > 0 ? sampleRate / interpolatedLag : null;
};

const calculateMedian = (values: number[]) => {
  const sortedValues = [...values].sort((first, second) => first - second);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
  }

  return sortedValues[middleIndex];
};

export const getNearestPitchNote = (frequency: number) => {
  const midiFloat = 69 + 12 * Math.log2(frequency / 440);
  const nearestMidi = Math.round(midiFloat);
  const centsOffset = (midiFloat - nearestMidi) * 100;
  const octave = Math.floor(nearestMidi / 12) - 1;
  const noteName = pitchNoteNames[((nearestMidi % 12) + 12) % 12];

  return {
    nearestNote: `${noteName}${octave}`,
    centsOffset,
  };
};

export const estimateLocalPitch = (
  audioBuffer: PitchAudioBufferLike,
): PitchEstimateResult => {
  const frameSize = 4096;
  const hopSize = 2048;

  if (audioBuffer.length < frameSize) {
    throw new Error(
      "Recording is too short for local pitch estimation. Try recording a longer sustained note.",
    );
  }

  const monoSamples = new Float32Array(audioBuffer.length);

  for (
    let channelIndex = 0;
    channelIndex < audioBuffer.numberOfChannels;
    channelIndex += 1
  ) {
    const channelData = audioBuffer.getChannelData(channelIndex);

    for (
      let sampleIndex = 0;
      sampleIndex < audioBuffer.length;
      sampleIndex += 1
    ) {
      monoSamples[sampleIndex] +=
        channelData[sampleIndex] / audioBuffer.numberOfChannels;
    }
  }

  const frameFrequencies: number[] = [];
  let framesAnalyzed = 0;

  for (
    let startIndex = 0;
    startIndex + frameSize <= monoSamples.length;
    startIndex += hopSize
  ) {
    framesAnalyzed += 1;

    if (calculateRms(monoSamples, startIndex, frameSize) < 0.015) {
      continue;
    }

    const frequency = estimateFrameFrequency(
      monoSamples,
      startIndex,
      frameSize,
      audioBuffer.sampleRate,
    );

    if (frequency !== null && frequency >= 80 && frequency <= 1000) {
      frameFrequencies.push(frequency);
    }
  }

  if (framesAnalyzed === 0 || frameFrequencies.length === 0) {
    throw new Error(
      "No usable pitch frames were found. Try a louder, steadier single note.",
    );
  }

  const estimatedFrequencyHz = calculateMedian(frameFrequencies);
  const frameFrequencyMinHz = Math.min(...frameFrequencies);
  const frameFrequencyMaxHz = Math.max(...frameFrequencies);
  const { nearestNote, centsOffset } =
    getNearestPitchNote(estimatedFrequencyHz);

  return {
    estimatedFrequencyHz,
    nearestNote,
    centsOffset,
    confidence: frameFrequencies.length / framesAnalyzed,
    framesAnalyzed,
    validPitchFrames: frameFrequencies.length,
    frameFrequencyMinHz,
    frameFrequencyMedianHz: estimatedFrequencyHz,
    frameFrequencyMaxHz,
  };
};
