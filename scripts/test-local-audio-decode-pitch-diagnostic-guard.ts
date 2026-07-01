import {
  DIAGNOSTIC_MAX_FREQUENCY_HZ,
  DIAGNOSTIC_MIN_FREQUENCY_HZ,
  isValidDiagnosticFrequencyEstimate,
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

console.log("local audio decode pitch diagnostic guard synthetic checks passed");
