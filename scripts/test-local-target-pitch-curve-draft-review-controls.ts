import assert from "node:assert/strict";

import { createLocalTargetPitchCurveDraft, type LocalTargetPitchCurveDraft } from "../lib/practice/localTargetPitchCurveDraft";
import {
  createDefaultLocalTargetPitchCurveDraftReviewSelection,
  getLocalTargetPitchCurveDraftSelectedDiagnostics,
} from "../lib/practice/localTargetPitchCurveDraftReviewControls";

const sampleRate = 8000;
const makeSine = (frequencyHz: number, durationSeconds: number) => {
  const samples = new Float32Array(Math.floor(sampleRate * durationSeconds));
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate) * 0.5;
  }
  return samples;
};

const draft = createLocalTargetPitchCurveDraft(makeSine(440, 1), sampleRate, { frameSize: 512, hopSize: 256 });
const full = getLocalTargetPitchCurveDraftSelectedDiagnostics(draft, createDefaultLocalTargetPitchCurveDraftReviewSelection());
assert.equal(full.draftOnly, true);
assert.equal(full.needsReview, true);
assert.equal(full.selectedFrameCount, draft.frameCount);
assert.equal(full.selectedVoicedFrameCount, draft.voicedFrameCount);
assert.equal(full.selectedVoicedCoverageRatio, draft.voicedFrameCount / draft.frameCount);
assert.equal(full.selectedFirstVoicedFrame, draft.frames.find((frame) => frame.voiced)?.frameIndex ?? null);
assert.equal(full.selectedLastVoicedFrame, [...draft.frames].reverse().find((frame) => frame.voiced)?.frameIndex ?? null);
assert.ok(full.selectedFrequencyMinHz !== null);
assert.ok(full.selectedFrequencyMedianHz !== null);
assert.ok(full.selectedFrequencyMaxHz !== null);
assert.ok(full.selectedDurationMs > 0);

const voicedSpan = getLocalTargetPitchCurveDraftSelectedDiagnostics(draft, {
  mode: "voiced-span",
  manualStartFrame: 0,
  manualEndFrame: 0,
});
assert.equal(voicedSpan.selectedStartFrame, full.selectedFirstVoicedFrame);
assert.equal(voicedSpan.selectedEndFrame, full.selectedLastVoicedFrame);

const manual = getLocalTargetPitchCurveDraftSelectedDiagnostics(draft, {
  mode: "manual-frame-range",
  manualStartFrame: 1,
  manualEndFrame: 3,
});
assert.equal(manual.selectedStartFrame, 1);
assert.equal(manual.selectedEndFrame, 3);
assert.equal(manual.selectedFrameCount, 3);

const clamped = getLocalTargetPitchCurveDraftSelectedDiagnostics(draft, {
  mode: "manual-frame-range",
  manualStartFrame: -10,
  manualEndFrame: draft.frameCount + 10,
});
assert.equal(clamped.selectedStartFrame, 0);
assert.equal(clamped.selectedEndFrame, draft.frameCount - 1);
assert.ok(clamped.warnings.some((warning) => warning.includes("clamped")));

const reversed = getLocalTargetPitchCurveDraftSelectedDiagnostics(draft, {
  mode: "manual-frame-range",
  manualStartFrame: 5,
  manualEndFrame: 2,
});
assert.equal(reversed.selectedStartFrame, 0);
assert.equal(reversed.selectedEndFrame, draft.frameCount - 1);
assert.ok(reversed.warnings.some((warning) => warning.includes("falls back")));

const silentDraft = createLocalTargetPitchCurveDraft(new Float32Array(sampleRate), sampleRate, { frameSize: 512, hopSize: 256 });
const silentVoicedSpan = getLocalTargetPitchCurveDraftSelectedDiagnostics(silentDraft, {
  mode: "voiced-span",
  manualStartFrame: 0,
  manualEndFrame: 0,
});
assert.equal(silentVoicedSpan.selectedVoicedFrameCount, 0);
assert.equal(silentVoicedSpan.selectedFrequencyMinHz, null);
assert.equal(silentVoicedSpan.selectedFirstVoicedFrame, null);
assert.ok(silentVoicedSpan.warnings.some((warning) => warning.includes("No voiced frames")));

const payload = JSON.stringify(full);
for (const forbidden of ["accuracy", "grade", "pass", "fail", "finalTarget", "officialTranscription"]) {
  assert.equal(Object.prototype.hasOwnProperty.call(full, forbidden), false);
  assert.equal(payload.includes(`"${forbidden}"`), false);
}

const missing = getLocalTargetPitchCurveDraftSelectedDiagnostics(null as LocalTargetPitchCurveDraft | null, createDefaultLocalTargetPitchCurveDraftReviewSelection());
assert.equal(missing.selectedFrameCount, 0);
assert.equal(missing.draftOnly, false);
assert.equal(missing.needsReview, false);

console.log("local target pitch curve draft review controls tests passed");
