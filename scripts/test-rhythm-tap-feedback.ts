import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createCountInBeatGrid,
  createMetronomeSubdivisionGrid,
} from "../lib/metronome/metronomeGrid";
import { getNonScoringImportedTargetPitchFeedback } from "../lib/practice/nonScoringImportedTargetPitchFeedback";
import {
  createQuarterPulseTargetPattern,
  createRhythmTargetPattern,
  getRhythmTapFeedback,
  hasRhythmScoringFields,
  type RhythmTapEvent,
} from "../lib/rhythm/rhythmTapFeedback";

const config = {
  bpm: 120,
  meter: "4/4" as const,
  countIn: { enabled: true, bars: 1 as const },
  subdivision: "eighth" as const,
};
const targets = createQuarterPulseTargetPattern({
  config,
  practiceStartTimeMs: 1000,
  barCount: 1,
});
assert.equal(targets.length, 4);
assert.deepEqual(
  targets.map((target) => target.targetTimeMs),
  [1000, 1500, 2000, 2500],
);
assert.deepEqual(
  targets.map((target) => target.pattern),
  [
    "quarter-note-pulse",
    "quarter-note-pulse",
    "quarter-note-pulse",
    "quarter-note-pulse",
  ],
);
assert.deepEqual(
  targets.map((target) => target.subdivisionIndex),
  [0, 0, 0, 0],
);

const eighthTargets = createRhythmTargetPattern({
  config,
  practiceStartTimeMs: 1000,
  barCount: 1,
  pattern: "eighth-note-pulse",
});
assert.equal(eighthTargets.length, 8);
assert.deepEqual(
  eighthTargets.map((target) => target.targetTimeMs),
  [1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750],
);
assert.deepEqual(
  eighthTargets.map((target) => target.scheduledTimeSeconds),
  [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75],
);
assert.deepEqual(
  eighthTargets.map((target) => target.beatNumber),
  [1, 1, 2, 2, 3, 3, 4, 4],
);
assert.deepEqual(
  eighthTargets.map((target) => target.subdivisionIndex),
  [0, 1, 0, 1, 0, 1, 0, 1],
);
assert.equal(eighthTargets[1]?.pattern, "eighth-note-pulse");
assert.equal(eighthTargets[1]?.subdivisionCountPerBeat, 2);
assert.equal(eighthTargets[1]?.phase, "practice");
assert.equal(eighthTargets[1]?.targetIndex, 1);

const close = getRhythmTapFeedback({
  targets: [targets[0]],
  taps: [{ id: 1, timestampMs: 1040, phase: "practice" }],
  phase: "practice",
  nowMs: 1100,
});
assert.equal(close.feedback[0]?.category, "close");
const early = getRhythmTapFeedback({
  targets: [targets[0]],
  taps: [{ id: 2, timestampMs: 880, phase: "practice" }],
  phase: "practice",
  nowMs: 1200,
});
assert.equal(early.feedback[0]?.category, "early");
const late = getRhythmTapFeedback({
  targets: [targets[0]],
  taps: [{ id: 3, timestampMs: 1130, phase: "practice" }],
  phase: "practice",
  nowMs: 1200,
});
assert.equal(late.feedback[0]?.category, "late");

assert.equal(
  getRhythmTapFeedback({
    targets: [eighthTargets[1]],
    taps: [{ id: 6, timestampMs: 1280, phase: "practice" }],
    phase: "practice",
    nowMs: 1320,
  }).feedback[0]?.category,
  "close",
);
assert.equal(
  getRhythmTapFeedback({
    targets: [eighthTargets[1]],
    taps: [{ id: 7, timestampMs: 1130, phase: "practice" }],
    phase: "practice",
    nowMs: 1450,
  }).feedback[0]?.category,
  "early",
);
assert.equal(
  getRhythmTapFeedback({
    targets: [eighthTargets[1]],
    taps: [{ id: 8, timestampMs: 1390, phase: "practice" }],
    phase: "practice",
    nowMs: 1450,
  }).feedback[0]?.category,
  "late",
);
assert.equal(
  getRhythmTapFeedback({
    targets: [eighthTargets[1]],
    taps: [{ id: 9, timestampMs: 1700, phase: "practice" }],
    phase: "practice",
    nowMs: 1500,
  }).feedback.some((item) => item.category === "missed"),
  true,
);
assert.equal(
  getRhythmTapFeedback({
    targets: [eighthTargets[1]],
    taps: [{ id: 10, timestampMs: 1700, phase: "practice" }],
    phase: "practice",
    nowMs: 1500,
  }).feedback.some((item) => item.category === "extra"),
  true,
);

const waiting = getRhythmTapFeedback({
  targets,
  taps: [],
  phase: "practice",
  nowMs: 1000,
});
assert.equal(waiting.status, "waiting-for-taps");
const missedWithTapElsewhere = getRhythmTapFeedback({
  targets: [targets[0]],
  taps: [{ id: 4, timestampMs: 1500, phase: "practice" }],
  phase: "practice",
  nowMs: 1300,
});
assert.equal(
  missedWithTapElsewhere.feedback.some((item) => item.category === "missed"),
  true,
);
assert.equal(
  missedWithTapElsewhere.feedback.some((item) => item.category === "extra"),
  true,
);

const countInTap: RhythmTapEvent = {
  id: 5,
  timestampMs: 900,
  phase: "count-in",
};
const countInIgnored = getRhythmTapFeedback({
  targets: [targets[0]],
  taps: [countInTap],
  phase: "practice",
  nowMs: 1200,
});
assert.equal(countInIgnored.tapCount, 0);
assert.equal(countInIgnored.status, "waiting-for-taps");
assert.equal(
  getRhythmTapFeedback({
    targets: [targets[0]],
    taps: [{ id: 11, timestampMs: 1000, phase: "count-in" }],
    phase: "count-in",
    nowMs: 1000,
  }).feedback.length,
  0,
);

for (const item of [close, early, late, missedWithTapElsewhere, waiting]) {
  assert.equal(hasRhythmScoringFields(item), false);
  item.feedback.forEach((feedback) =>
    assert.equal(hasRhythmScoringFields(feedback), false),
  );
}
assert.equal(hasRhythmScoringFields(eighthTargets[0] ?? {}), false);

const practicePage = readFileSync("app/practice/page.tsx", "utf8");
assert.match(practicePage, /四分音符脉冲/);
assert.match(practicePage, /八分音符脉冲/);
assert.match(practicePage, /仅提供不评分的练习反馈/);
assert.match(practicePage, /模式：/);
assert.doesNotMatch(practicePage, /accuracyPercentage/);

assert.equal(createCountInBeatGrid({ config, startTimeSeconds: 0 }).length, 4);
assert.equal(
  createMetronomeSubdivisionGrid({ config, startTimeSeconds: 0, beatCount: 1 })
    .length,
  2,
);
const importedFeedback = getNonScoringImportedTargetPitchFeedback({
  targetFrequencyHz: 261.63,
  estimatedFrequencyHz: 261.63,
  confidence: 0.8,
  validPitchFrames: 12,
});
assert.equal("score" in importedFeedback, false);
