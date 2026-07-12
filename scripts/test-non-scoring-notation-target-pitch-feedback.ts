import assert from "node:assert/strict";

import {
  calculateNotationTargetPitchCentsDifference,
  getNonScoringNotationTargetPitchFeedback,
  getNotationTargetPitchFrequencyHz,
} from "../lib/practice/nonScoringNotationTargetPitchFeedback";

const c4 = getNotationTargetPitchFrequencyHz("C4");
assert.ok(c4);
assert.equal(getNotationTargetPitchFrequencyHz(null), null);
assert.equal(getNotationTargetPitchFrequencyHz("C5"), 523.251131);

assert.equal(
  getNonScoringNotationTargetPitchFeedback({
    targetFrequencyHz: null,
    estimatedFrequencyHz: c4,
    confidence: 0.8,
    validPitchFrames: 10,
  }).category,
  "no-target-data",
);

assert.equal(
  getNonScoringNotationTargetPitchFeedback({
    targetFrequencyHz: c4,
    estimatedFrequencyHz: c4,
    confidence: 0.2,
    validPitchFrames: 10,
  }).category,
  "no-reliable-pitch",
);

assert.equal(
  getNonScoringNotationTargetPitchFeedback({
    targetFrequencyHz: c4,
    estimatedFrequencyHz: c4,
    confidence: 0.8,
    validPitchFrames: 10,
  }).category,
  "close",
);

assert.equal(
  getNonScoringNotationTargetPitchFeedback({
    targetFrequencyHz: c4,
    estimatedFrequencyHz: c4 * 2 ** (40 / 1200),
    confidence: 0.8,
    validPitchFrames: 10,
  }).category,
  "above",
);

assert.equal(
  getNonScoringNotationTargetPitchFeedback({
    targetFrequencyHz: c4,
    estimatedFrequencyHz: c4 * 2 ** (-40 / 1200),
    confidence: 0.8,
    validPitchFrames: 10,
  }).category,
  "below",
);

assert.ok(Math.abs(calculateNotationTargetPitchCentsDifference(c4 * 2, c4) - 1200) < 0.0001);

console.log("non-scoring notation target pitch feedback tests passed");
