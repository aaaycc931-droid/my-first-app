import assert from "node:assert/strict";

import { evaluateAndroidP104Evidence, type AndroidP104EvidenceInput } from "../lib/release/androidP104Evidence.js";

const run = (tier: "low" | "mid" | "high") => ({ deviceLabel: `${tier}-android`, tier, androidVersion: "example", webViewVersion: "example", sampleRateHz: 48_000, offlineColdStartP95Ms: 2_900, microphoneToVisualP95Ms: 145, completed20CycleStability: true, installPassed: true, offlinePassed: true, microphonePassed: true, recordingPassed: true, storagePassed: true, observationPassed: true, lifecyclePassed: true });
const valid: AndroidP104EvidenceInput = { schemaVersion: 1, candidate: { versionName: "0.3.0", versionCode: 3, commitSha: "a".repeat(40), apkSha256: "b".repeat(64) }, pitchBenchmark: { syntheticOrInstrumentSamples: 200, realVoiceSamples: 100, participantCount: 20, deviceClassCount: 4, realVoiceMedianAbsoluteCents: 35, realVoiceP95AbsoluteCents: 100, realVoiceOctaveErrorRatePercent: 2, consentAndSourceRecorded: true, heldOutAcceptanceSet: true, coverageIncludesRangesDynamicsVibratoNoise: true }, androidRuns: [run("low"), run("mid"), run("high")], educationReview: { reviewerCount: 2, observationCopyApproved: true, thresholdsApproved: true } };

const eligible = evaluateAndroidP104Evidence(valid);
assert.equal(eligible.eligible, true);
assert.ok(eligible.checks.every((check) => check.passed));

const short = structuredClone(valid);
short.pitchBenchmark.realVoiceSamples = 99;
short.androidRuns[0].microphoneToVisualP95Ms = 151;
short.androidRuns[1].completed20CycleStability = false;
short.educationReview.reviewerCount = 1;
const blocked = evaluateAndroidP104Evidence(short);
assert.equal(blocked.eligible, false);
for (const id of ["real-voice-count", "visual-latency", "stability", "education"]) assert.equal(blocked.checks.find((check) => check.id === id)?.passed, false);
assert.equal(blocked.checks.some((check) => /undefined|NaN/.test(check.observed)), false);

console.log("Android P104 evidence gate tests passed.");
