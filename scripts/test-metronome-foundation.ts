import assert from "node:assert/strict";
import {
  getBeatDurationSeconds,
  sanitizeCountInConfig,
  sanitizeMetronomeBpm,
  sanitizeMetronomeConfig,
  sanitizeMetronomeSubdivision,
} from "../lib/metronome/metronomeConfig";
import {
  createCountInBeatGrid,
  createMetronomeBeatGrid,
  createMetronomeSubdivisionGrid,
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
    countIn: { enabled: false, bars: 0 },
    subdivision: "quarter",
  },
);
assert.deepEqual(sanitizeCountInConfig({ enabled: true, bars: 9 as never }), {
  enabled: false,
  bars: 0,
});
assert.equal(sanitizeMetronomeSubdivision("thirty-second"), "quarter");

const twoFourGrid = createMetronomeBeatGrid({
  config: { bpm: 120, meter: "2/4" },
  startTimeSeconds: 10,
  beatCount: 4,
});
assert.deepEqual(
  twoFourGrid.map(({ phase, barNumber, beatNumber, isStrongBeat }) => ({
    phase,
    barNumber,
    beatNumber,
    isStrongBeat,
  })),
  [
    { phase: "practice", barNumber: 1, beatNumber: 1, isStrongBeat: true },
    { phase: "practice", barNumber: 1, beatNumber: 2, isStrongBeat: false },
    { phase: "practice", barNumber: 2, beatNumber: 1, isStrongBeat: true },
    { phase: "practice", barNumber: 2, beatNumber: 2, isStrongBeat: false },
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

const disabledCountIn = createCountInBeatGrid({
  config: { bpm: 120, meter: "4/4", countIn: { enabled: false, bars: 1 } },
  startTimeSeconds: 0,
});
assert.equal(disabledCountIn.length, 0);

const oneBarFourFourCountIn = createCountInBeatGrid({
  config: { bpm: 120, meter: "4/4", countIn: { enabled: true, bars: 1 } },
  startTimeSeconds: 1,
});
assert.equal(oneBarFourFourCountIn.length, 4);
assert.deepEqual(
  oneBarFourFourCountIn.map(
    ({ phase, countInBeatNumber, barNumber, beatNumber, isStrongBeat }) => ({
      phase,
      countInBeatNumber,
      barNumber,
      beatNumber,
      isStrongBeat,
    }),
  ),
  [
    {
      phase: "count-in",
      countInBeatNumber: 1,
      barNumber: 1,
      beatNumber: 1,
      isStrongBeat: true,
    },
    {
      phase: "count-in",
      countInBeatNumber: 2,
      barNumber: 1,
      beatNumber: 2,
      isStrongBeat: false,
    },
    {
      phase: "count-in",
      countInBeatNumber: 3,
      barNumber: 1,
      beatNumber: 3,
      isStrongBeat: false,
    },
    {
      phase: "count-in",
      countInBeatNumber: 4,
      barNumber: 1,
      beatNumber: 4,
      isStrongBeat: false,
    },
  ],
);

const oneBarThreeFourCountIn = createCountInBeatGrid({
  config: { bpm: 90, meter: "3/4", countIn: { enabled: true, bars: 1 } },
  startTimeSeconds: 0,
});
assert.equal(oneBarThreeFourCountIn.length, 3);
assert.equal(oneBarThreeFourCountIn[0]?.isStrongBeat, true);
assert.equal(oneBarThreeFourCountIn[1]?.isStrongBeat, false);
assert.notEqual(oneBarFourFourCountIn[0]?.phase, fourFourGrid[0]?.phase);

const eighthSubdivision = createMetronomeSubdivisionGrid({
  config: { bpm: 120, meter: "4/4", subdivision: "eighth" },
  startTimeSeconds: 10,
  beatCount: 2,
});
assert.equal(eighthSubdivision.length, 4);
assert.deepEqual(
  eighthSubdivision.map(
    ({
      subdivisionIndex,
      subdivisionCountPerBeat,
      isBeatLevelTick,
      isSubdivisionTick,
      scheduledTimeSeconds,
    }) => ({
      subdivisionIndex,
      subdivisionCountPerBeat,
      isBeatLevelTick,
      isSubdivisionTick,
      scheduledTimeSeconds,
    }),
  ),
  [
    {
      subdivisionIndex: 0,
      subdivisionCountPerBeat: 2,
      isBeatLevelTick: true,
      isSubdivisionTick: false,
      scheduledTimeSeconds: 10,
    },
    {
      subdivisionIndex: 1,
      subdivisionCountPerBeat: 2,
      isBeatLevelTick: false,
      isSubdivisionTick: true,
      scheduledTimeSeconds: 10.25,
    },
    {
      subdivisionIndex: 0,
      subdivisionCountPerBeat: 2,
      isBeatLevelTick: true,
      isSubdivisionTick: false,
      scheduledTimeSeconds: 10.5,
    },
    {
      subdivisionIndex: 1,
      subdivisionCountPerBeat: 2,
      isBeatLevelTick: false,
      isSubdivisionTick: true,
      scheduledTimeSeconds: 10.75,
    },
  ],
);

const sixteenthSubdivision = createMetronomeSubdivisionGrid({
  config: { bpm: 60, meter: "4/4", subdivision: "sixteenth" },
  startTimeSeconds: 0,
  beatCount: 1,
});
assert.equal(sixteenthSubdivision.length, 4);
assert.deepEqual(
  sixteenthSubdivision.map((tick) => tick.scheduledTimeSeconds),
  [0, 0.25, 0.5, 0.75],
);
assert.equal(sixteenthSubdivision[0]?.subdivisionCountPerBeat, 4);
assert.equal(sixteenthSubdivision[3]?.isSubdivisionTick, true);

assert.equal(isStrongBeat(1), true);
assert.equal(isStrongBeat(2), false);
assert.equal(fourFourGrid.some(hasRhythmAssessmentFields), false);
assert.equal(oneBarFourFourCountIn.some(hasRhythmAssessmentFields), false);
assert.equal(eighthSubdivision.some(hasRhythmAssessmentFields), false);

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
createCountInBeatGrid({
  config: { bpm: 120, meter: "4/4", countIn: { enabled: true, bars: 1 } },
  startTimeSeconds: 0,
});
createMetronomeSubdivisionGrid({
  config: { bpm: 120, meter: "4/4", subdivision: "eighth" },
  startTimeSeconds: 0,
  beatCount: 2,
});
const importedFeedbackAfter = getNonScoringImportedTargetPitchFeedback({
  targetFrequencyHz: 261.63,
  estimatedFrequencyHz: 261.63,
  confidence: 0.8,
  validPitchFrames: 12,
});
assert.deepEqual(importedFeedbackAfter, importedFeedbackBefore);

console.log("metronome foundation tests passed");
