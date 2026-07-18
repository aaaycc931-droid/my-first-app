import assert from "node:assert/strict";

import {
  completeActivityCheck,
  createActivitySession,
  submitActivityAnswer,
} from "../lib/activity/activitySession";
import {
  adaptRhythmTapFeedbackToActivityEvidence,
  createNotationRhythmActivityDefinition,
  getRelativeNotationRhythmTapOnsetMs,
} from "../lib/activity/notationRhythmActivityAdapter";
import type { NotationTemporaryPracticeTarget } from "../lib/practice/localNotationDraftPracticeTarget";
import type { RhythmTapFeedbackSummary } from "../lib/rhythm/rhythmTapFeedback";

const target: NotationTemporaryPracticeTarget = {
  id: "temporary-notation-target-1000",
  mode: "rhythm",
  status: "active",
  localOnly: true,
  sessionOnly: true,
  nonScoring: true,
  temporary: true,
  createdAtMs: 1000,
  draftFingerprint: "draft-fingerprint-1",
  sourceDescription: "独立手动草稿",
  timeSignature: "4/4",
  events: [
    { id: "note-1", type: "note", pitch: "C4", duration: "quarter", measure: 1 },
    { id: "rest-1", type: "rest", pitch: null, duration: "quarter", measure: 1 },
    { id: "note-2", type: "note", pitch: "D4", duration: "half", measure: 1 },
  ],
  warnings: [],
};

const definition = createNotationRhythmActivityDefinition({ target, bpm: 120 });
assert.equal(definition.family, "rhythm-sight-reading");
assert.deepEqual(definition.allowedInputModes, ["tap"]);
assert.deepEqual(definition.target.expectedAnswer, { mode: "tap", onsetMs: [0, 1000] });
assert.equal(definition.assessmentMode, "non-scoring");
assert.equal(definition.source.reviewState, "confirmed");
assert.equal("score" in definition, false);

const sameDraftDefinition = createNotationRhythmActivityDefinition({
  target: { ...target, id: "temporary-notation-target-2000", createdAtMs: 2000 },
  bpm: 120,
});
assert.equal(
  sameDraftDefinition.activityId,
  definition.activityId,
  "session-only timestamps must not change the stable activity identity",
);
assert.equal(
  createNotationRhythmActivityDefinition({ target, bpm: 500 }).music?.tempoBpm,
  240,
);
assert.throws(
  () => createNotationRhythmActivityDefinition({ target: { ...target, status: "stale" }, bpm: 120 }),
  /已确认且仍有效/,
);
assert.equal(
  getRelativeNotationRhythmTapOnsetMs({ timestampMs: 2250, practiceStartTimeMs: 2000 }),
  250,
);
assert.equal(
  getRelativeNotationRhythmTapOnsetMs({ timestampMs: 1900, practiceStartTimeMs: 2000 }),
  0,
);

const summary = (
  overrides: Partial<RhythmTapFeedbackSummary>,
): RhythmTapFeedbackSummary => ({
  status: "waiting-for-taps",
  feedback: [],
  matchedTapCount: 0,
  targetCount: 2,
  tapCount: 0,
  closeToleranceMs: 80,
  matchWindowMs: 180,
  appliedLatencyOffsetMs: 0,
  alignmentEngineId: "monotonic-dynamic-programming-v1",
  ...overrides,
});

assert.equal(
  adaptRhythmTapFeedbackToActivityEvidence(summary({})).state,
  "insufficient",
);
const closeFeedback = [0, 1].map((targetIndex) => ({
  category: "close" as const,
  targetIndex,
  tapId: targetIndex + 1,
  targetTimeMs: targetIndex * 1000,
  tapTimeMs: targetIndex * 1000 + 20,
  offsetMs: 20,
  message: "接近目标。",
}));
const consistentEvidence = adaptRhythmTapFeedbackToActivityEvidence(
  summary({
    status: "close",
    feedback: closeFeedback,
    matchedTapCount: 2,
    tapCount: 2,
  }),
);
assert.equal(consistentEvidence.state, "consistent");
assert.equal(consistentEvidence.assessmentMode, "non-scoring");
assert.equal(
  adaptRhythmTapFeedbackToActivityEvidence(
    summary({
      status: "late",
      feedback: [{ ...closeFeedback[0], category: "late", offsetMs: 120 }],
      matchedTapCount: 1,
      tapCount: 1,
    }),
  ).state,
  "different",
);

let session = createActivitySession(definition, "notation-rhythm-session");
session = submitActivityAnswer(
  definition,
  session,
  { mode: "tap", onsetMs: [20, 1020] },
  session.revision,
);
session = completeActivityCheck(session, consistentEvidence, session.revision);
assert.equal(session.lifecycle, "checked");
assert.equal(session.checkEvidence?.state, "consistent");
assert.equal("score" in session, false);

console.log("P114c notation rhythm activity adapter tests passed.");
