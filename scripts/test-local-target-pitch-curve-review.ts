import assert from "node:assert/strict";

import { createLocalTargetPitchCurveDraft } from "../lib/practice/localTargetPitchCurveDraft";
import { createLocalTargetPitchCurveDraftReviewPreview } from "../lib/practice/localTargetPitchCurveReview";
import { createLocalMelodyGuideFileSummary } from "../lib/practice/localMelodyGuideAudio";
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

const draft = createLocalTargetPitchCurveDraft(makeSine(440, 1), sampleRate, {
  frameSize: 512,
  hopSize: 256,
});
const preview = createLocalTargetPitchCurveDraftReviewPreview(draft);

assert.equal(preview.status, "draft");
assert.equal(preview.draftOnly, true);
assert.equal(preview.needsReview, true);
assert.equal(preview.frameCount, draft.frameCount);
assert.equal(preview.voicedFrameCount, draft.voicedFrameCount);
assert.equal(preview.unvoicedFrameCount, draft.unvoicedFrameCount);
assert.equal(preview.voicedCoverageRatio, draft.voicedFrameCount / draft.frameCount);
assert.equal(preview.firstVoicedFrameTimeMs, draft.frames.find((frame) => frame.voiced)?.timeMs ?? null);
assert.equal(preview.lastVoicedFrameTimeMs, [...draft.frames].reverse().find((frame) => frame.voiced)?.timeMs ?? null);
assert.ok(preview.estimatedRangeLabel.includes("min"));
assert.ok(preview.estimatedRangeLabel.includes("median"));
assert.ok(preview.estimatedRangeLabel.includes("max"));
assert.ok(preview.warnings.some((warning) => warning.includes("Review required before practice integration")));
assert.ok(preview.warnings.some((warning) => warning.includes("Draft only")));

const forbiddenPayload = JSON.stringify(preview);
for (const forbidden of ["score", "grade", "pass", "fail", "accuracyPercentage", "assessment"]) {
  assert.equal(Object.prototype.hasOwnProperty.call(preview, forbidden), false);
  assert.equal(forbiddenPayload.includes(`"${forbidden}"`), false);
}

const silence = createLocalTargetPitchCurveDraft(new Float32Array(sampleRate), sampleRate, {
  frameSize: 512,
  hopSize: 256,
});
const emptyPreview = createLocalTargetPitchCurveDraftReviewPreview(silence);
assert.equal(emptyPreview.status, "empty");
assert.equal(emptyPreview.voicedCoverageRatio, 0);
assert.equal(emptyPreview.firstVoicedFrameTimeMs, null);
assert.equal(emptyPreview.lastVoicedFrameTimeMs, null);
assert.equal(emptyPreview.estimatedRangeLabel, "No voiced pitch range available");

const missingPreview = createLocalTargetPitchCurveDraftReviewPreview(null);
assert.equal(missingPreview.status, "missing");
assert.equal(missingPreview.frameCount, 0);
assert.equal(missingPreview.diagnostics.browserLocal, true);
assert.equal(missingPreview.diagnostics.sessionOnly, true);
assert.equal(missingPreview.diagnostics.importedTargetPracticeFlowConnected, false);

const source = createLocalMelodyGuideFileSummary({ name: "guide.wav", type: "audio/wav", size: 1024 });
assert.equal(source.status, "selected");
const onsetResult = detectAudioOnsets(new Float32Array(1024), sampleRate, { frameSize: 64, hopSize: 32 });
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

console.log("local target pitch curve review preview tests passed");
