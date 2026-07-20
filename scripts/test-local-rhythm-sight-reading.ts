import assert from "node:assert/strict";

import {
  adaptRhythmSightReadingFeedbackToEvidence,
  createRhythmSightReadingActivityDefinition,
} from "../lib/activity/rhythmSightReadingActivityAdapter";
import { createLocalEarTrainingRhythmQuestion } from "../lib/practice/localEarTrainingRhythm";
import {
  createLocalRhythmSightReadingTargets,
  getLocalRhythmSightReadingDurationMs,
  getLocalRhythmSightReadingOnsetLabel,
  hasLocalRhythmSightReadingAssessmentFields,
} from "../lib/practice/localRhythmSightReading";
import { getRhythmTapFeedback } from "../lib/rhythm/rhythmTapFeedback";

const question = createLocalEarTrainingRhythmQuestion({
  difficulty: "基础",
  sequence: 1,
  variantId: "rhythm:front-dense",
  catalogMode: "expanded-local-v2",
});
const targets = createLocalRhythmSightReadingTargets({ question, practiceStartTimeMs: 1_000 });
assert.deepEqual(targets.map((target) => Math.round(target.targetTimeMs)), [1_000, 1_357, 1_714, 2_071, 2_429, 3_143]);
assert.equal(targets.every((target) => target.pattern === "sight-reading-question"), true);
assert.equal(targets.every((target) => target.phase === "practice"), true);
assert.equal(getLocalRhythmSightReadingDurationMs(question), 2_858);
assert.equal(getLocalRhythmSightReadingOnsetLabel(0), "第 1 拍");
assert.equal(getLocalRhythmSightReadingOnsetLabel(0.5), "第 1 拍 + 1/2");
assert.equal(getLocalRhythmSightReadingOnsetLabel(1 / 3), "第 1 拍 + 1/3");

const definition = createRhythmSightReadingActivityDefinition(question);
assert.equal(definition.family, "rhythm-sight-reading");
assert.deepEqual(definition.allowedInputModes, ["tap"]);
assert.equal(definition.assessmentMode, "non-scoring");
assert.equal(definition.source.reviewState, "confirmed");
assert.equal(definition.target.expectedAnswer.mode, "tap");
assert.equal(hasLocalRhythmSightReadingAssessmentFields(definition), false);

const closeFeedback = getRhythmTapFeedback({
  targets,
  taps: targets.map((target, index) => ({ id: index + 1, timestampMs: target.targetTimeMs + 30, phase: "practice" })),
  phase: "stopped",
  nowMs: 5_000,
});
assert.equal(adaptRhythmSightReadingFeedbackToEvidence(closeFeedback).state, "consistent");
assert.equal(closeFeedback.feedback.every((item) => item.category === "close"), true);

const differentFeedback = getRhythmTapFeedback({
  targets,
  taps: [{ id: 1, timestampMs: targets[0]!.targetTimeMs + 140, phase: "practice" }],
  phase: "stopped",
  nowMs: 5_000,
});
assert.equal(adaptRhythmSightReadingFeedbackToEvidence(differentFeedback).state, "different");
assert.equal(
  differentFeedback.feedback.some((item) => ["late", "missed"].includes(item.category)),
  true,
);

const insufficient = getRhythmTapFeedback({ targets, taps: [], phase: "stopped", nowMs: 5_000 });
assert.equal(adaptRhythmSightReadingFeedbackToEvidence(insufficient).state, "insufficient");
for (const value of [targets[0]!, closeFeedback, differentFeedback, insufficient]) {
  assert.equal(hasLocalRhythmSightReadingAssessmentFields(value), false);
}

console.log("local rhythm sight-reading tests passed");
