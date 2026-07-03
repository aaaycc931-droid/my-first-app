import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { getNonScoringImportedTargetPitchFeedback } from "../lib/practice/nonScoringImportedTargetPitchFeedback";

const reliablePitch = { confidence: 0.8, validPitchFrames: 12 };

assert.equal(
  getNonScoringImportedTargetPitchFeedback({
    targetFrequencyHz: 261.63,
    estimatedFrequencyHz: 261.63,
    ...reliablePitch,
  }).category,
  "close",
);

assert.equal(
  getNonScoringImportedTargetPitchFeedback({
    targetFrequencyHz: 261.63,
    estimatedFrequencyHz: 280,
    ...reliablePitch,
  }).category,
  "above",
);

assert.equal(
  getNonScoringImportedTargetPitchFeedback({
    targetFrequencyHz: 261.63,
    estimatedFrequencyHz: 240,
    ...reliablePitch,
  }).category,
  "below",
);

assert.equal(
  getNonScoringImportedTargetPitchFeedback({
    targetFrequencyHz: 261.63,
    estimatedFrequencyHz: null,
    confidence: null,
    validPitchFrames: 0,
  }).category,
  "no-reliable-pitch",
);

assert.equal(
  getNonScoringImportedTargetPitchFeedback({
    targetFrequencyHz: null,
    estimatedFrequencyHz: 261.63,
    ...reliablePitch,
  }).category,
  "no-target-data",
);

const practicePageSource = readFileSync("app/practice/page.tsx", "utf8");

assert.match(
  practicePageSource,
  /This feedback uses your latest local pitch estimate and the\s+currently selected imported segment\./,
);

assert.match(
  practicePageSource,
  /Record again after\s+switching segments for the clearest result\./,
);

assert.match(practicePageSource, /This is practice\s+feedback, not a score\./);

assert.match(
  practicePageSource,
  /const importedTargetPitchFeedbackMayBeStale =\n\s+Boolean\(pitchEstimateResult && selectedImportedSegment\) &&\n\s+pitchEstimateImportedSegmentKey !== selectedImportedSegmentKey;/,
);

assert.match(
  practicePageSource,
  /Segment changed after the latest local pitch estimate\.\s+Record again for the clearest feedback on this segment\./,
);

const freshnessWarningCopy =
  "Segment changed after the latest local pitch estimate. " +
  "Record again for the clearest feedback on this segment. " +
  "This is still non-scoring practice feedback.";

assert.doesNotMatch(
  freshnessWarningCopy,
  /\b(?:Score|Grade|Pass|Fail|Accuracy %|Final result|Assessment|Rating|Rhythm score|Sight-singing score)\b/,
);

console.log("non-scoring imported target pitch feedback helper tests passed");
