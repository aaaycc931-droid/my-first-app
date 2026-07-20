import assert from "node:assert/strict";

import {
  adaptRhythmImitationFeedbackToEvidence,
  createRhythmImitationActivityDefinition,
} from "../lib/activity/rhythmImitationActivityAdapter";
import { createLocalEarTrainingRhythmQuestion } from "../lib/practice/localEarTrainingRhythm";
import {
  createLocalRhythmImitationTargets,
  getLocalRhythmImitationDurationMs,
  hasLocalRhythmImitationAssessmentFields,
} from "../lib/practice/localRhythmImitation";
import { getRhythmTapFeedback } from "../lib/rhythm/rhythmTapFeedback";

const question = createLocalEarTrainingRhythmQuestion({
  difficulty: "挑战",
  sequence: 0,
  variantId: "rhythm:opening-triplet:bpm-96",
  catalogMode: "expanded-local-v2",
});
const targets = createLocalRhythmImitationTargets({ question, practiceStartTimeMs: 2_000 });
assert.equal(targets.length, question.pattern.onsetBeats.length);
assert.deepEqual(
  targets.map((target) => Math.round(target.targetTimeMs - 2_000)),
  question.pattern.onsetBeats.map((beat) => Math.round(beat * 60_000 / question.bpm)),
);
assert.equal(targets.every((target) => target.phase === "practice"), true);
assert.equal(getLocalRhythmImitationDurationMs(question), Math.ceil(240_000 / question.bpm));

const definition = createRhythmImitationActivityDefinition(question);
assert.equal(definition.family, "rhythm-imitation");
assert.deepEqual(definition.allowedInputModes, ["tap"]);
assert.equal(definition.assessmentMode, "non-scoring");
assert.equal(definition.source.reviewState, "confirmed");
assert.equal(definition.target.expectedAnswer.mode, "tap");
assert.equal(hasLocalRhythmImitationAssessmentFields(definition), false);

const close = getRhythmTapFeedback({
  targets,
  taps: targets.map((target, index) => ({ id: index + 1, timestampMs: target.targetTimeMs + 20, phase: "practice" })),
  phase: "stopped",
  nowMs: 8_000,
});
assert.equal(adaptRhythmImitationFeedbackToEvidence(close).state, "consistent");

const different = getRhythmTapFeedback({
  targets,
  taps: [{ id: 1, timestampMs: targets[0]!.targetTimeMs + 180, phase: "practice" }],
  phase: "stopped",
  nowMs: 8_000,
});
assert.equal(adaptRhythmImitationFeedbackToEvidence(different).state, "different");

const insufficient = getRhythmTapFeedback({ targets, taps: [], phase: "stopped", nowMs: 8_000 });
assert.equal(adaptRhythmImitationFeedbackToEvidence(insufficient).state, "insufficient");
for (const value of [targets[0]!, close, different, insufficient]) {
  assert.equal(hasLocalRhythmImitationAssessmentFields(value), false);
}

console.log("local rhythm imitation tests passed");
