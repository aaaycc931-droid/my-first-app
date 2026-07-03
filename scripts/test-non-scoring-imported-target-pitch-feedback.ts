import assert from "node:assert/strict";

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

console.log("non-scoring imported target pitch feedback helper tests passed");
