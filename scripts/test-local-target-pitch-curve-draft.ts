import assert from "node:assert/strict";

import { createLocalTargetPitchCurveDraft } from "../lib/practice/localTargetPitchCurveDraft";
import { createLocalMelodyGuideFileSummary, applyLocalMelodyGuideDecodedMetadata } from "../lib/practice/localMelodyGuideAudio";
import { detectAudioOnsets } from "../lib/rhythm/audioOnsetDetection";
import { getAudioOnsetRhythmFeedback } from "../lib/rhythm/audioOnsetRhythmFeedback";
import { getRhythmTapFeedback } from "../lib/rhythm/rhythmTapFeedback";
import { getRhythmLatencyCalibration } from "../lib/rhythm/rhythmLatencyCalibration";
import { createMetronomeBeatGrid } from "../lib/metronome/metronomeGrid";
import { getNonScoringImportedTargetPitchFeedback } from "../lib/practice/nonScoringImportedTargetPitchFeedback";

const sampleRate = 8000;
const makeSine = (frequencyHz: number, durationSeconds: number) => {
  const samples = new Float32Array(Math.floor(sampleRate * durationSeconds));
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate) * 0.5;
  }
  return samples;
};

const silence = createLocalTargetPitchCurveDraft(new Float32Array(sampleRate), sampleRate, {
  frameSize: 512,
  hopSize: 256,
});
assert.equal(silence.status, "empty");
assert.equal(silence.voicedFrameCount, 0);
assert.equal(silence.unvoicedFrameCount, silence.frameCount);

const sine440 = createLocalTargetPitchCurveDraft(makeSine(440, 1), sampleRate, {
  frameSize: 512,
  hopSize: 256,
});
assert.equal(sine440.status, "draft");
assert.ok(sine440.voicedFrameCount > 0);
assert.ok(sine440.frequencyMedianHz !== null && Math.abs(sine440.frequencyMedianHz - 440) < 25);

const first = makeSine(220, 0.5);
const second = makeSine(440, 0.5);
const twoSection = new Float32Array(first.length + second.length);
twoSection.set(first, 0);
twoSection.set(second, first.length);
const twoSectionDraft = createLocalTargetPitchCurveDraft(twoSection, sampleRate, {
  frameSize: 512,
  hopSize: 256,
});
const earlyVoiced = twoSectionDraft.frames.filter((frame) => frame.voiced && frame.timeMs < 400);
const lateVoiced = twoSectionDraft.frames.filter((frame) => frame.voiced && frame.timeMs > 560);
assert.ok(earlyVoiced.some((frame) => frame.frequencyHz !== null && frame.frequencyHz >= 200 && frame.frequencyHz <= 250));
assert.ok(lateVoiced.some((frame) => frame.frequencyHz !== null && frame.frequencyHz >= 400 && frame.frequencyHz <= 480));

const invalid = createLocalTargetPitchCurveDraft([], 0);
assert.equal(invalid.status, "invalid");
assert.equal(invalid.frameCount, 0);
assert.ok(invalid.warnings.some((warning) => warning.includes("Invalid sample rate")));

assert.equal(Math.round(sine440.durationMs), 1000);
assert.equal(sine440.frameCount, Math.floor((sampleRate - 512) / 256) + 1);
assert.ok(sine440.frequencyMinHz !== null && sine440.frequencyMedianHz !== null && sine440.frequencyMaxHz !== null);
assert.ok(sine440.frequencyMinHz <= sine440.frequencyMedianHz);
assert.ok(sine440.frequencyMedianHz <= sine440.frequencyMaxHz);
assert.ok(sine440.warnings.some((warning) => warning.includes("Draft target pitch curve")));
assert.ok(sine440.warnings.some((warning) => warning.includes("clean vocal")));
assert.ok(sine440.warnings.some((warning) => warning.includes("Full mixed songs")));

const forbiddenFields = ["score", "grade", "pass", "fail", "accuracyPercentage", "assessment"];
const draftPayload = JSON.stringify(sine440);
for (const field of forbiddenFields) {
  assert.equal(Object.prototype.hasOwnProperty.call(sine440, field), false);
  assert.equal(draftPayload.includes(`"${field}"`), false);
}

const source = applyLocalMelodyGuideDecodedMetadata(
  createLocalMelodyGuideFileSummary({ name: "guide.wav", type: "audio/wav", size: 1024 }),
  { decodedDurationSeconds: 1, sampleRate, channelCount: 1 },
);
const sourcePayload = JSON.stringify(source);
for (const field of ["pcm", "channelData", "AudioBuffer", "samples"]) {
  assert.equal(Object.prototype.hasOwnProperty.call(source, field), false);
  assert.equal(sourcePayload.includes(field), false);
}

const onsetInput = new Float32Array(1024);
onsetInput[128] = 1;
const onsetResult = detectAudioOnsets(onsetInput, sampleRate, { frameSize: 64, hopSize: 32 });
assert.equal(typeof onsetResult.onsetCount, "number");
assert.equal(getAudioOnsetRhythmFeedback({
  onsetResult,
  config: { bpm: 72, meter: "4/4", countIn: { enabled: false, bars: 0 }, subdivision: "quarter" },
  pattern: "quarter-note-pulse",
  barCount: 1,
  alignmentMode: "recording-start",
  latencyOffsetMs: 0,
}).timelineMarkers.length >= 0, true);
assert.equal(getRhythmTapFeedback({ targets: [], taps: [], phase: "idle", nowMs: 0, latencyOffsetMs: 0 }).status, "not-started");
assert.equal(getRhythmLatencyCalibration({ targets: [], taps: [] }).offsetMs, null);
assert.equal(createMetronomeBeatGrid({ config: { bpm: 72, meter: "4/4", countIn: { enabled: false, bars: 0 }, subdivision: "quarter" }, startTimeSeconds: 0, beatCount: 4 }).length, 4);
assert.equal(getNonScoringImportedTargetPitchFeedback({ targetFrequencyHz: 440, estimatedFrequencyHz: 440, confidence: 0.8, validPitchFrames: 10 }).title.includes("Non-scoring"), true);

console.log("local target pitch curve draft tests passed");
