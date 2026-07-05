import assert from "node:assert/strict";

import { createLocalTargetPitchCurveDraft } from "../lib/practice/localTargetPitchCurveDraft";
import {
  createDefaultLocalTargetPitchCurveDraftReviewSelection,
  getLocalTargetPitchCurveDraftSelectedDiagnostics,
} from "../lib/practice/localTargetPitchCurveDraftReviewControls";
import {
  canCreateLocalReviewedDraftPracticeTarget,
  createLocalReviewedDraftPracticeTarget,
} from "../lib/practice/localReviewedDraftPracticeTarget";

const makeSine = (
  frequencyHz: number,
  seconds: number,
  sampleRate = 44_100,
) => {
  const samples = new Float32Array(Math.floor(seconds * sampleRate));
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] =
      Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate) * 0.7;
  }
  return samples;
};

const sampleRate = 44_100;
const draft = createLocalTargetPitchCurveDraft(
  makeSine(440, 1, sampleRate),
  sampleRate,
  {
    frameSize: 512,
    hopSize: 256,
  },
);
const diagnostics = getLocalTargetPitchCurveDraftSelectedDiagnostics(
  draft,
  createDefaultLocalTargetPitchCurveDraftReviewSelection(),
);

assert.equal(canCreateLocalReviewedDraftPracticeTarget(diagnostics), true);
const target = createLocalReviewedDraftPracticeTarget(diagnostics, 123_456);
assert.ok(target);
assert.equal(target.source, "local-target-pitch-curve-draft-review");
assert.equal(target.localOnly, true);
assert.equal(target.sessionOnly, true);
assert.equal(target.draftOnly, true);
assert.equal(target.reviewedSelectionOnly, true);
assert.equal(target.nonScoring, true);
assert.equal(target.temporary, true);
assert.equal(target.createdAtMs, 123_456);
assert.equal(target.selectedStartFrameIndex, diagnostics.selectedStartFrame);
assert.equal(target.selectedEndFrameIndex, diagnostics.selectedEndFrame);
assert.equal(target.selectedFrameCount, diagnostics.selectedFrameCount);
assert.equal(
  target.selectedVoicedFrameCount,
  diagnostics.selectedVoicedFrameCount,
);
assert.equal(
  target.selectedVoicedCoverage,
  diagnostics.selectedVoicedCoverageRatio,
);
assert.equal(
  target.referenceFrequencyHz,
  diagnostics.selectedFrequencyMedianHz,
);
assert.equal(target.frequencyMinHz, diagnostics.selectedFrequencyMinHz);
assert.equal(target.frequencyMedianHz, diagnostics.selectedFrequencyMedianHz);
assert.equal(target.frequencyMaxHz, diagnostics.selectedFrequencyMaxHz);
assert.equal(target.startTimeSec, null);
assert.equal(target.endTimeSec, null);
assert.equal(target.durationSec, diagnostics.selectedDurationMs / 1000);
assert.ok(
  target.warnings.some((warning) =>
    warning.includes("Temporary reviewed draft practice target only"),
  ),
);
assert.ok(
  target.warnings.some((warning) => warning.includes("Not a final target")),
);
assert.ok(
  target.warnings.some((warning) =>
    warning.includes("Non-scoring diagnostic only"),
  ),
);
assert.ok(
  target.warnings.some((warning) =>
    warning.includes("no upload, no cloud, no account, no database"),
  ),
);

const silentDraft = createLocalTargetPitchCurveDraft(
  new Float32Array(sampleRate),
  sampleRate,
  {
    frameSize: 512,
    hopSize: 256,
  },
);
const silentDiagnostics = getLocalTargetPitchCurveDraftSelectedDiagnostics(
  silentDraft,
  createDefaultLocalTargetPitchCurveDraftReviewSelection(),
);
assert.equal(
  canCreateLocalReviewedDraftPracticeTarget(silentDiagnostics),
  false,
);
assert.equal(createLocalReviewedDraftPracticeTarget(silentDiagnostics), null);

const serializedTarget = JSON.stringify(target).toLowerCase();
[
  "finaltarget",
  "officialtranscription",
  "scorepercent",
  "accuracygrade",
  "passfail",
  "libraryid",
  "uploadurl",
  "databaseid",
].forEach((forbidden) => {
  assert.equal(
    serializedTarget.includes(forbidden.toLowerCase()),
    false,
    `${forbidden} should not appear`,
  );
});

console.log("local reviewed draft practice target tests passed");
