import {
  DIAGNOSTIC_MAX_FREQUENCY_HZ,
  DIAGNOSTIC_MIN_FREQUENCY_HZ,
  isValidDiagnosticFrequencyEstimate,
  smoothDiagnosticFrequencies,
  summarizeDiagnosticFrequencies,
} from "../lib/research/local-audio-decode/pitch-frame-diagnostics";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function generateSineFrequencyEstimate(frequencyHz: number) {
  const sampleRate = 44100;
  const frameSize = 2048;
  const samples = new Float32Array(frameSize);

  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate);
  }

  let bestLag = 0;
  let bestCorrelation = 0;
  const minLag = Math.floor(sampleRate / DIAGNOSTIC_MAX_FREQUENCY_HZ);
  const maxLag = Math.min(
    Math.floor(sampleRate / DIAGNOSTIC_MIN_FREQUENCY_HZ),
    frameSize - 1,
  );

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    let energyA = 0;
    let energyB = 0;

    for (let index = 0; index < frameSize - lag; index += 1) {
      const sampleA = samples[index] ?? 0;
      const sampleB = samples[index + lag] ?? 0;
      correlation += sampleA * sampleB;
      energyA += sampleA * sampleA;
      energyB += sampleB * sampleB;
    }

    const normalizedCorrelation =
      energyA > 0 && energyB > 0
        ? correlation / Math.sqrt(energyA * energyB)
        : 0;

    if (normalizedCorrelation > bestCorrelation) {
      bestCorrelation = normalizedCorrelation;
      bestLag = lag;
    }
  }

  return bestLag === 0 ? Number.NaN : sampleRate / bestLag;
}

const silenceSummary = summarizeDiagnosticFrequencies([]);
assert(silenceSummary.frequencyMinHz === null, "silence should not set min");
assert(
  silenceSummary.frequencyMedianHz === null,
  "silence should not set median",
);
assert(silenceSummary.frequencyMaxHz === null, "silence should not set max");

const a4LikeEstimate = generateSineFrequencyEstimate(440);
assert(
  isValidDiagnosticFrequencyEstimate(a4LikeEstimate),
  `A4-like estimate should remain valid, got ${a4LikeEstimate}`,
);

const filteredSummary = summarizeDiagnosticFrequencies([
  Number.NaN,
  Number.POSITIVE_INFINITY,
  -440,
  0,
  DIAGNOSTIC_MIN_FREQUENCY_HZ - 1,
  220,
  440,
  DIAGNOSTIC_MAX_FREQUENCY_HZ + 1,
]);

assert(filteredSummary.frequencyMinHz === 220, "invalid values should not set min");
assert(
  filteredSummary.frequencyMedianHz === 330,
  "invalid values should not set median",
);
assert(filteredSummary.frequencyMaxHz === 440, "invalid values should not set max");

const cleanSmoothedFrequencies = smoothDiagnosticFrequencies([220, 221, 222]);
assert(
  cleanSmoothedFrequencies[0] === 220 &&
    cleanSmoothedFrequencies[1] === 221 &&
    cleanSmoothedFrequencies[2] === 222,
  "clean valid frequencies should remain stable after tiny median smoothing",
);

const outlierSmoothedFrequencies = smoothDiagnosticFrequencies([440, 880, 441]);
assert(
  outlierSmoothedFrequencies[1] === 441,
  "one-frame valid diagnostic outlier should be reduced by median smoothing",
);

const nullableSmoothedFrequencies = smoothDiagnosticFrequencies([
  440,
  null,
  880,
]);
assert(
  nullableSmoothedFrequencies[1] === null,
  "null frames should remain null after smoothing",
);
assert(
  nullableSmoothedFrequencies[0] === 440 &&
    nullableSmoothedFrequencies[2] === 880,
  "smoothing should not cross unvoiced gaps",
);

const invalidSmoothedFrequencies = smoothDiagnosticFrequencies([
  DIAGNOSTIC_MIN_FREQUENCY_HZ - 1,
  Number.NaN,
  DIAGNOSTIC_MAX_FREQUENCY_HZ + 1,
]);
assert(
  invalidSmoothedFrequencies.every((frequency) => frequency === null),
  "invalid and out-of-range frames should remain excluded after smoothing",
);

const silenceSmoothedFrequencies = smoothDiagnosticFrequencies([
  null,
  null,
  null,
]);
assert(
  silenceSmoothedFrequencies.every((frequency) => frequency === null),
  "smoothing should not create valid pitch from silence",
);

const smoothedSummary = summarizeDiagnosticFrequencies(
  outlierSmoothedFrequencies.filter(
    (frequency): frequency is number => frequency !== null,
  ),
);
assert(
  smoothedSummary.frequencyMedianHz === 441,
  "summary should use valid diagnostic frequencies after smoothing",
);

console.log("local audio decode pitch diagnostic guard synthetic checks passed");
