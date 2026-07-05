import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCountInBeatGrid } from "../lib/metronome/metronomeGrid";
import { getNonScoringImportedTargetPitchFeedback } from "../lib/practice/nonScoringImportedTargetPitchFeedback";
import {
  createRhythmLatencyCalibrationTargets,
  getRhythmLatencyCalibration,
  hasRhythmLatencyCalibrationScoringFields,
} from "../lib/rhythm/rhythmLatencyCalibration";
import {
  createRhythmTargetPattern,
  getRhythmTapFeedback,
  hasRhythmScoringFields,
} from "../lib/rhythm/rhythmTapFeedback";

const config = {
  bpm: 120,
  meter: "4/4" as const,
  countIn: { enabled: true, bars: 1 as const },
  subdivision: "quarter" as const,
};

const calibrationTargets = createRhythmLatencyCalibrationTargets({
  config,
  calibrationStartTimeMs: 1000,
  barCount: 2,
});
assert.equal(calibrationTargets.length, 8);
assert.deepEqual(
  calibrationTargets.map((target) => target.targetTimeMs),
  [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500],
);
assert.deepEqual(
  calibrationTargets.map((target) => target.pattern),
  Array(8).fill("quarter-note-pulse"),
);

const insufficient = getRhythmLatencyCalibration({
  targets: calibrationTargets,
  taps: calibrationTargets.slice(0, 3).map((target, index) => ({
    id: index + 1,
    timestampMs: target.targetTimeMs + 35,
  })),
});
assert.equal(insufficient.status, "insufficient-samples");
assert.equal(insufficient.offsetMs, null);

const stable = getRhythmLatencyCalibration({
  targets: calibrationTargets,
  taps: calibrationTargets.map((target, index) => ({
    id: index + 1,
    timestampMs: target.targetTimeMs + [38, 40, 41, 39, 42, 42, 40, 41][index],
  })),
});
assert.equal(stable.status, "estimated");
assert.equal(stable.acceptedSampleCount, 8);
assert.equal(stable.rejectedOutlierCount, 0);
assert.equal(stable.offsetMs, 40.5);
assert.equal(stable.stabilityHint, "stable");

const outlierFiltered = getRhythmLatencyCalibration({
  targets: calibrationTargets,
  taps: calibrationTargets.map((target, index) => ({
    id: index + 1,
    timestampMs: target.targetTimeMs + [38, 40, 41, 39, 250, 42, 40, 41][index],
  })),
  minimumSamples: 7,
});
assert.equal(outlierFiltered.status, "estimated");
assert.equal(outlierFiltered.acceptedSampleCount, 7);
assert.equal(outlierFiltered.rejectedOutlierCount, 1);

const unstable = getRhythmLatencyCalibration({
  targets: calibrationTargets,
  taps: calibrationTargets.map((target, index) => ({
    id: index + 1,
    timestampMs: target.targetTimeMs + [-80, -45, -20, 0, 25, 55, 90, 110][index],
  })),
});
assert.equal(unstable.status, "unstable");
assert.equal(unstable.stabilityHint, "unstable");

const rhythmTargets = createRhythmTargetPattern({
  config,
  practiceStartTimeMs: 1000,
  barCount: 1,
  pattern: "quarter-note-pulse",
});
const unadjusted = getRhythmTapFeedback({
  targets: [rhythmTargets[0]],
  taps: [{ id: 1, timestampMs: 1120, phase: "practice" }],
  phase: "practice",
  nowMs: 1200,
});
const adjusted = getRhythmTapFeedback({
  targets: [rhythmTargets[0]],
  taps: [{ id: 1, timestampMs: 1120, phase: "practice" }],
  phase: "practice",
  nowMs: 1200,
  latencyOffsetMs: 40,
});
assert.equal(unadjusted.feedback[0]?.offsetMs, 120);
assert.equal(adjusted.feedback[0]?.offsetMs, 80);
assert.equal(adjusted.appliedLatencyOffsetMs, 40);

for (const value of [stable, stable.samples[0] ?? {}, adjusted]) {
  assert.equal(hasRhythmLatencyCalibrationScoringFields(value), false);
  assert.equal(hasRhythmScoringFields(value), false);
}

const eighthTargets = createRhythmTargetPattern({
  config,
  practiceStartTimeMs: 1000,
  barCount: 1,
  pattern: "eighth-note-pulse",
});
assert.equal(eighthTargets.length, 8);
assert.equal(
  getRhythmTapFeedback({
    targets: [eighthTargets[1]],
    taps: [{ id: 2, timestampMs: 1280, phase: "practice" }],
    phase: "practice",
    nowMs: 1320,
  }).feedback[0]?.category,
  "close",
);
assert.equal(
  getRhythmTapFeedback({
    targets: [rhythmTargets[0]],
    taps: [{ id: 3, timestampMs: 1000, phase: "count-in" }],
    phase: "practice",
    nowMs: 1200,
  }).tapCount,
  0,
);
assert.equal(createCountInBeatGrid({ config, startTimeSeconds: 0 }).length, 4);

const importedFeedback = getNonScoringImportedTargetPitchFeedback({
  targetFrequencyHz: 261.63,
  estimatedFrequencyHz: 261.63,
  confidence: 0.8,
  validPitchFrames: 12,
});
assert.equal("score" in importedFeedback, false);

const practicePage = readFileSync("app/practice/page.tsx", "utf8");
assert.match(practicePage, /点击延迟校准/);
assert.match(practicePage, /仅当前会话的校准/);
assert.match(practicePage, /不是节奏分数/);
assert.match(practicePage, /尚无麦克风起音检测/);
assert.match(practicePage, /应用当前会话延迟校准/);
assert.doesNotMatch(practicePage, /accuracyPercentage/);
