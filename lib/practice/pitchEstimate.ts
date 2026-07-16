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
  frameFrequencyRangeCents: number;
  firstHalfMedianFrequencyHz: number;
  secondHalfMedianFrequencyHz: number;
  firstToSecondHalfDriftCents: number;
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
  minFrequencyHz = REALTIME_PITCH_MIN_HZ,
  maxFrequencyHz = REALTIME_PITCH_MAX_HZ,
) => {
  const minLag = Math.floor(sampleRate / maxFrequencyHz);
  const maxLag = Math.min(Math.ceil(sampleRate / minFrequencyHz), frameSize - 1);
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

  return interpolatedLag > 0
    ? { frequencyHz: sampleRate / interpolatedLag, confidence: currentCorrelation }
    : null;
};

export type RealtimePitchFrameAnalysis = {
  state: "quiet" | "uncertain" | "out-of-range" | "reliable";
  rms: number;
  confidence: number;
  frequencyHz: number | null;
  nearestNote: string | null;
  centsOffset: number | null;
};

export const REALTIME_PITCH_FRAME_SIZE = 4096;
export const REALTIME_PITCH_MIN_HZ = 80;
export const REALTIME_PITCH_MAX_HZ = 1000;
export const REALTIME_PITCH_MIN_RMS = 0.015;
export const REALTIME_PITCH_MIN_CONFIDENCE = 0.72;

/**
 * Analyzes one in-memory microphone frame. This is diagnostic, non-scoring
 * output and deliberately returns an explicit unreliable state instead of
 * forcing every frame into a note name.
 */
export const analyzeRealtimePitchFrame = (
  samples: Float32Array,
  sampleRate: number,
): RealtimePitchFrameAnalysis => {
  if (samples.length < REALTIME_PITCH_FRAME_SIZE || !Number.isFinite(sampleRate) || sampleRate <= 0) {
    return { state: "uncertain", rms: 0, confidence: 0, frequencyHz: null, nearestNote: null, centsOffset: null };
  }
  const rms = calculateRms(samples, 0, REALTIME_PITCH_FRAME_SIZE);
  if (rms < REALTIME_PITCH_MIN_RMS) {
    return { state: "quiet", rms, confidence: 0, frequencyHz: null, nearestNote: null, centsOffset: null };
  }
  const estimate = estimateFrameFrequency(samples, 0, REALTIME_PITCH_FRAME_SIZE, sampleRate, 60, 1200);
  if (!estimate || !Number.isFinite(estimate.frequencyHz)) {
    return { state: "uncertain", rms, confidence: 0, frequencyHz: null, nearestNote: null, centsOffset: null };
  }
  if (estimate.frequencyHz < REALTIME_PITCH_MIN_HZ || estimate.frequencyHz > REALTIME_PITCH_MAX_HZ) {
    return { state: "out-of-range", rms, confidence: estimate.confidence, frequencyHz: estimate.frequencyHz, nearestNote: null, centsOffset: null };
  }
  if (estimate.confidence < REALTIME_PITCH_MIN_CONFIDENCE) {
    return { state: "uncertain", rms, confidence: estimate.confidence, frequencyHz: estimate.frequencyHz, nearestNote: null, centsOffset: null };
  }
  const note = getNearestPitchNote(estimate.frequencyHz);
  return {
    state: "reliable",
    rms,
    confidence: estimate.confidence,
    frequencyHz: estimate.frequencyHz,
    nearestNote: note.nearestNote,
    centsOffset: note.centsOffset,
  };
};

const calculateMedian = (values: number[]) => {
  const sortedValues = [...values].sort((first, second) => first - second);
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 0) {
    return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
  }

  return sortedValues[middleIndex];
};

const calculatePitchMidi = (frequency: number) =>
  69 + 12 * Math.log2(frequency / 440);

const calculateCentsDifference = (frequency: number, referenceFrequency: number) =>
  1200 * Math.log2(frequency / referenceFrequency);

const filterFrameFrequencyOutliers = (frameFrequencies: number[]) => {
  if (frameFrequencies.length < 5) {
    return frameFrequencies;
  }

  const frameFrequencyMin = Math.min(...frameFrequencies);
  const frameFrequencyMax = Math.max(...frameFrequencies);
  const octaveSpreadRatio = 2;

  if (
    frameFrequencies.length >= 10 &&
    frameFrequencyMax / frameFrequencyMin > octaveSpreadRatio
  ) {
    return frameFrequencies.slice(0, Math.floor(frameFrequencies.length / 2));
  }

  const roundedMidiCounts = new Map<number, number>();

  for (const frequency of frameFrequencies) {
    const roundedMidi = Math.round(calculatePitchMidi(frequency));
    roundedMidiCounts.set(roundedMidi, (roundedMidiCounts.get(roundedMidi) ?? 0) + 1);
  }

  let selectedMidi: number | null = null;
  let selectedMidiCount = 0;

  for (const [roundedMidi, count] of Array.from(roundedMidiCounts.entries())) {
    if (count > selectedMidiCount) {
      selectedMidi = roundedMidi;
      selectedMidiCount = count;
    }
  }

  if (selectedMidi === null || selectedMidiCount < 3) {
    return frameFrequencies;
  }

  const selectedMidiCenterFrequency = 440 * 2 ** ((selectedMidi - 69) / 12);
  const maxAllowedCentsFromSelectedMidi = 65;
  const filteredFrameFrequencies = frameFrequencies.filter(
    (frequency) =>
      Math.abs(
        calculateCentsDifference(frequency, selectedMidiCenterFrequency),
      ) <= maxAllowedCentsFromSelectedMidi,
  );

  return filteredFrameFrequencies.length > 0
    ? filteredFrameFrequencies
    : frameFrequencies;
};

export const getNearestPitchNote = (frequency: number) => {
  const midiFloat = calculatePitchMidi(frequency);
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

    const frameEstimate = estimateFrameFrequency(
      monoSamples,
      startIndex,
      frameSize,
      audioBuffer.sampleRate,
    );

    const frequency = frameEstimate?.frequencyHz ?? null;
    if (frequency !== null && frequency >= 80 && frequency <= 1000) {
      frameFrequencies.push(frequency);
    }
  }

  if (framesAnalyzed === 0 || frameFrequencies.length === 0) {
    throw new Error(
      "No usable pitch frames were found. Try a louder, steadier single note.",
    );
  }

  const robustFrameFrequencies = filterFrameFrequencyOutliers(frameFrequencies);
  const estimatedFrequencyHz = calculateMedian(robustFrameFrequencies);
  const frameFrequencyMinHz = Math.min(...robustFrameFrequencies);
  const frameFrequencyMaxHz = Math.max(...robustFrameFrequencies);
  const frameFrequencyRangeCents = calculateCentsDifference(
    frameFrequencyMaxHz,
    frameFrequencyMinHz,
  );
  const halfFrameCount = Math.floor(robustFrameFrequencies.length / 2);
  const firstHalfFrameFrequencies = robustFrameFrequencies.slice(
    0,
    Math.max(1, halfFrameCount),
  );
  const secondHalfFrameFrequencies = robustFrameFrequencies.slice(
    Math.max(1, halfFrameCount),
  );
  const firstHalfMedianFrequencyHz = calculateMedian(firstHalfFrameFrequencies);
  const secondHalfMedianFrequencyHz = calculateMedian(
    secondHalfFrameFrequencies.length > 0
      ? secondHalfFrameFrequencies
      : firstHalfFrameFrequencies,
  );
  const firstToSecondHalfDriftCents = calculateCentsDifference(
    secondHalfMedianFrequencyHz,
    firstHalfMedianFrequencyHz,
  );
  const { nearestNote, centsOffset } =
    getNearestPitchNote(estimatedFrequencyHz);

  return {
    estimatedFrequencyHz,
    nearestNote,
    centsOffset,
    confidence: robustFrameFrequencies.length / framesAnalyzed,
    framesAnalyzed,
    validPitchFrames: robustFrameFrequencies.length,
    frameFrequencyMinHz,
    frameFrequencyMedianHz: estimatedFrequencyHz,
    frameFrequencyMaxHz,
    frameFrequencyRangeCents,
    firstHalfMedianFrequencyHz,
    secondHalfMedianFrequencyHz,
    firstToSecondHalfDriftCents,
  };
};
