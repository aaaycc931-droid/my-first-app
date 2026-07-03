import assert from "node:assert/strict";
import {
  getBeatDurationSeconds,
  sanitizeMetronomeBpm,
  sanitizeMetronomeConfig,
} from "../lib/metronome/metronomeConfig";
import {
  createMetronomeBeatGrid,
  hasRhythmAssessmentFields,
  isStrongBeat,
} from "../lib/metronome/metronomeGrid";
import { getNonScoringImportedTargetPitchFeedback } from "../lib/practice/nonScoringImportedTargetPitchFeedback";

assert.equal(getBeatDurationSeconds(120), 0.5);
assert.equal(getBeatDurationSeconds(60), 1);

assert.equal(sanitizeMetronomeBpm(Number.NaN), 72);
assert.equal(sanitizeMetronomeBpm(10), 30);
assert.equal(sanitizeMetronomeBpm(999), 240);
assert.deepEqual(
  sanitizeMetronomeConfig({ bpm: Number.NaN, meter: "9/8" as never }),
  {
    bpm: 72,
    meter: "4/4",
  },
);

const twoFourGrid = createMetronomeBeatGrid({
  config: { bpm: 120, meter: "2/4" },
  startTimeSeconds: 10,
  beatCount: 4,
});
assert.deepEqual(
  twoFourGrid.map(({ barNumber, beatNumber, isStrongBeat }) => ({
    barNumber,
    beatNumber,
    isStrongBeat,
  })),
  [
    { barNumber: 1, beatNumber: 1, isStrongBeat: true },
    { barNumber: 1, beatNumber: 2, isStrongBeat: false },
    { barNumber: 2, beatNumber: 1, isStrongBeat: true },
    { barNumber: 2, beatNumber: 2, isStrongBeat: false },
  ],
);
assert.deepEqual(
  twoFourGrid.map((beat) => beat.scheduledTimeSeconds),
  [10, 10.5, 11, 11.5],
);

const threeFourGrid = createMetronomeBeatGrid({
  config: { bpm: 60, meter: "3/4" },
  startTimeSeconds: 0,
  beatCount: 4,
});
assert.deepEqual(
  threeFourGrid.map(({ barNumber, beatNumber, isStrongBeat }) => ({
    barNumber,
    beatNumber,
    isStrongBeat,
  })),
  [
    { barNumber: 1, beatNumber: 1, isStrongBeat: true },
    { barNumber: 1, beatNumber: 2, isStrongBeat: false },
    { barNumber: 1, beatNumber: 3, isStrongBeat: false },
    { barNumber: 2, beatNumber: 1, isStrongBeat: true },
  ],
);

const fourFourGrid = createMetronomeBeatGrid({
  config: { bpm: 90, meter: "4/4" },
  startTimeSeconds: 2,
  beatCount: 5,
});
assert.deepEqual(
  fourFourGrid.map(({ barNumber, beatNumber }) => ({ barNumber, beatNumber })),
  [
    { barNumber: 1, beatNumber: 1 },
    { barNumber: 1, beatNumber: 2 },
    { barNumber: 1, beatNumber: 3 },
    { barNumber: 1, beatNumber: 4 },
    { barNumber: 2, beatNumber: 1 },
  ],
);

assert.equal(isStrongBeat(1), true);
assert.equal(isStrongBeat(2), false);
assert.equal(fourFourGrid.some(hasRhythmAssessmentFields), false);

const importedFeedbackBefore = getNonScoringImportedTargetPitchFeedback({
  targetFrequencyHz: 261.63,
  estimatedFrequencyHz: 261.63,
  confidence: 0.8,
  validPitchFrames: 12,
});
createMetronomeBeatGrid({
  config: { bpm: 120, meter: "4/4" },
  startTimeSeconds: 0,
  beatCount: 8,
});
const importedFeedbackAfter = getNonScoringImportedTargetPitchFeedback({
  targetFrequencyHz: 261.63,
  estimatedFrequencyHz: 261.63,
  confidence: 0.8,
  validPitchFrames: 12,
});
assert.deepEqual(importedFeedbackAfter, importedFeedbackBefore);

console.log("metronome foundation tests passed");
