import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  calculatePitchBenchmarkMetrics,
  evaluatePitchBenchmark,
  PITCH_BENCHMARK_PROTOCOL_VERSION,
  type PitchBenchmarkCase,
  type PitchBenchmarkInput,
} from "../lib/benchmark/pitchBenchmarkProtocol";

const createCase = (
  id: string,
  split: PitchBenchmarkCase["split"],
  sourceType: PitchBenchmarkCase["sourceType"],
  referenceFrequencyHz: number | null,
  estimatedFrequencyHz: number | null,
): PitchBenchmarkCase => ({
  id,
  split,
  sourceType,
  participantToken: sourceType === "real-voice" ? "participant-anonymous-01" : null,
  consentRecordToken: sourceType === "real-voice" ? "consent-record-01" : null,
  authorizedForBenchmark: true,
  referenceVoiced: referenceFrequencyHz !== null,
  referenceFrequencyHz,
  strata: {
    range: sourceType === "no-pitch" ? "not-applicable" : "mid",
    dynamics: sourceType === "no-pitch" ? "not-applicable" : "medium",
    technique: sourceType === "no-pitch" ? "not-applicable" : "stable",
    noise: sourceType === "no-pitch" ? "not-applicable" : "quiet",
    deviceClass: sourceType === "real-voice" ? "phone-microphone" : "generated-in-memory",
  },
  annotation: { annotatorCount: 2, adjudicatedWhenDisputed: true },
  result: {
    predictedVoiced: estimatedFrequencyHz !== null,
    frequencyHz: estimatedFrequencyHz,
    durationSeconds: 1,
    processingMs: 200,
  },
});

const input: PitchBenchmarkInput = {
  protocolVersion: PITCH_BENCHMARK_PROTOCOL_VERSION,
  benchmarkId: "p111-test-run",
  run: {
    commitSha: "a".repeat(40),
    engineId: "autocorrelation-baseline",
    engineVersion: "v1",
    parametersSha256: "b".repeat(64),
    deviceProfile: "node-test-runtime",
    labelsSealedBeforeRun: true,
    engineFrozenBeforeBlindRun: true,
  },
  governance: {
    rawAudioLocalOnly: true,
    containsDirectIdentifiers: false,
    consentRecordsStoredSeparately: true,
    splitsAssignedBeforeRun: true,
  },
  cases: [
    createCase("tuning-1", "tuning", "synthetic", 440, 440),
    createCase("development-1", "development", "instrument", 220, 220),
    createCase("blind-voice-1", "acceptance-blind", "real-voice", 440, 440),
    createCase("blind-no-pitch-1", "acceptance-blind", "no-pitch", null, null),
  ],
};

const result = evaluatePitchBenchmark(input);
assert.equal(result.checks.find((check) => check.id === "protocol")?.passed, true);
assert.equal(result.checks.find((check) => check.id === "blind-isolation")?.passed, true);
assert.equal(result.checks.find((check) => check.id === "privacy")?.passed, true);
assert.equal(result.blindMetrics.voicedF1, 1);
assert.equal(result.blindMetrics.rawPitchAccuracy50Cents, 1);
assert.equal(result.blindMetrics.p95RealtimeFactor, 0.2);
assert.equal(result.blindRealVoiceMetrics.sampleCount, 1);
assert.equal(result.blindVoiceBoundaryMetrics.sampleCount, 2);
assert.equal(result.p104Ready, false);
assert.equal(result.professionalReady, false);
assert.ok(result.stratifiedMetrics.some((row) => row.dimension === "sourceType" && row.value === "real-voice"));

const octaveAndVoicingMetrics = calculatePitchBenchmarkMetrics([
  createCase("octave", "acceptance-blind", "real-voice", 220, 440),
  createCase("missed", "acceptance-blind", "real-voice", 440, null),
  createCase("false-voiced", "acceptance-blind", "no-pitch", null, 440),
]);
assert.equal(octaveAndVoicingMetrics.octaveErrorRatePercent, 50);
assert.equal(octaveAndVoicingMetrics.rawPitchAccuracy50Cents, 0);
assert.equal(octaveAndVoicingMetrics.rawChromaAccuracy50Cents, 0.5);
assert.equal(octaveAndVoicingMetrics.voicedPrecision, 0.5);
assert.equal(octaveAndVoicingMetrics.voicedRecall, 0.5);
assert.equal(octaveAndVoicingMetrics.voicedF1, 0.5);

const unsafe = structuredClone(input);
unsafe.governance.containsDirectIdentifiers = true;
unsafe.run.labelsSealedBeforeRun = false;
unsafe.cases[2].annotation.annotatorCount = 1;
unsafe.cases[3].id = unsafe.cases[2].id;
unsafe.cases[1].authorizedForBenchmark = false;
const unsafeResult = evaluatePitchBenchmark(unsafe);
for (const id of ["privacy", "blind-isolation", "case-validity", "real-voice-governance"]) {
  assert.equal(unsafeResult.checks.find((check) => check.id === id)?.passed, false);
}

const example = JSON.parse(
  readFileSync("local-fixtures/pitch-benchmark/benchmark.example.json", "utf8"),
) as PitchBenchmarkInput;
const exampleResult = evaluatePitchBenchmark(example);
assert.equal(exampleResult.p104Ready, false);
assert.equal(exampleResult.professionalReady, false);
assert.equal(exampleResult.checks.find((check) => check.id === "blind-isolation")?.passed, false);
assert.equal(exampleResult.checks.find((check) => check.id === "real-voice-governance")?.passed, false);

console.log("P111 pitch benchmark protocol tests passed.");
