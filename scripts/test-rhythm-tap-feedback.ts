import assert from "node:assert/strict";
import {
  createCountInBeatGrid,
  createMetronomeSubdivisionGrid,
} from "../lib/metronome/metronomeGrid";
import { getNonScoringImportedTargetPitchFeedback } from "../lib/practice/nonScoringImportedTargetPitchFeedback";
import {
  createQuarterPulseTargetPattern,
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
  ["quarter-pulse", "quarter-pulse", "quarter-pulse", "quarter-pulse"],
);

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

for (const item of [close, early, late, missedWithTapElsewhere, waiting]) {
  assert.equal(hasRhythmScoringFields(item), false);
  item.feedback.forEach((feedback) =>
    assert.equal(hasRhythmScoringFields(feedback), false),
  );
}

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
