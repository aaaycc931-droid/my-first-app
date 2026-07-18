import assert from "node:assert/strict";

import { validateActivityDefinition } from "../lib/activity/activityDefinition";
import {
  adaptLocalVocalMicrophoneActivityEvidence,
  createLocalVocalMicrophoneActivityDefinition,
  createLocalVocalMicrophoneAnswer,
} from "../lib/activity/localVocalMicrophoneActivityAdapter";
import { createActivitySession, submitActivityAnswer } from "../lib/activity/activitySession";
import { DEFAULT_LOCAL_VOCAL_EXERCISE_CONFIG, generateLocalVocalExercise } from "../lib/practice/localVocalExercise";
import type { OfflineNoteAlignmentResult, OfflineTargetEvidence } from "../lib/practice/offlineNoteAlignment";

const exercise = generateLocalVocalExercise({
  ...DEFAULT_LOCAL_VOCAL_EXERCISE_CONFIG,
  patternId: "single",
  rootMidi: 69,
  loops: 1,
});
const definition = createLocalVocalMicrophoneActivityDefinition(exercise);
assert.equal(definition.target.checkPolicy.kind, "analysis-evidence");
assert.equal("expectedAnswer" in definition.target, false, "evidence target must not contain a fake expected answer");
assert.deepEqual(definition.allowedInputModes, ["microphone"]);

const session = createActivitySession(definition, "microphone-session");
assert.equal(session.lifecycle, "ready", "built-in confirmed A4 target must enter practice directly");
const requiredTargetId = definition.target.checkPolicy.requiredTargetIds[0]!;

const targetEvidence = (state: OfflineTargetEvidence["state"]): OfflineTargetEvidence => ({
  target: { targetId: requiredTargetId, index: 0, phraseIndex: 0, label: "A4", midi: 69, startMs: 0, endMs: 2_000 },
  segmentId: state === "missing" ? null : "offline-segment-1",
  state,
  detectedNote: state === "missing" || state === "unreliable" ? null : state === "high" ? "A♯4" : "A4",
  medianCents: state === "missing" || state === "unreliable" ? null : state === "high" ? 58 : state === "low" ? -55 : 3,
  lowCents: state === "missing" || state === "unreliable" ? null : -4,
  highCents: state === "missing" || state === "unreliable" ? null : 8,
  timingOffsetMs: state === "missing" || state === "unreliable" ? null : 12,
  confidence: state === "missing" || state === "unreliable" ? null : "high",
  phases: [],
  reason: state === "missing" ? "没有找到可靠演唱" : state === "unreliable" ? "置信度不足" : "可靠证据",
});

const alignment = (state: OfflineTargetEvidence["state"]): OfflineNoteAlignmentResult => ({
  version: "offline-note-alignment-v1",
  sourceAnalysisVersion: "offline-pitch-multicandidate-v1",
  segments: [],
  targetEvidence: [targetEvidence(state)],
  phraseEvidence: [],
  extraSegmentIds: [],
  summary: {
    segmentCount: state === "missing" ? 0 : 1,
    usableSegmentCount: state === "missing" || state === "unreliable" ? 0 : 1,
    rejectedSegmentCount: state === "unreliable" ? 1 : 0,
    targetCount: 1,
    alignedTargetCount: state === "missing" || state === "unreliable" ? 0 : 1,
    missingTargetCount: state === "missing" ? 1 : 0,
    unreliableTargetCount: state === "unreliable" ? 1 : 0,
    extraSegmentCount: 0,
  },
  alignmentReason: "test",
});

const close = adaptLocalVocalMicrophoneActivityEvidence({ definition, attemptId: session.attemptId, result: alignment("close") });
assert.equal(close.checkEvidence.state, "consistent");
assert.deepEqual(close.answer, {
  mode: "microphone",
  analysisEvidenceIds: [`${session.attemptId}:offline-note-alignment-v1:note:${requiredTargetId}`],
});
const answering = submitActivityAnswer(definition, session, close.answer!, session.revision);
assert.equal(answering.lifecycle, "answering");

const high = adaptLocalVocalMicrophoneActivityEvidence({ definition, attemptId: session.attemptId, result: alignment("high") });
assert.equal(high.checkEvidence.state, "different");

for (const state of ["missing", "unreliable"] as const) {
  const bundle = adaptLocalVocalMicrophoneActivityEvidence({ definition, attemptId: session.attemptId, result: alignment(state) });
  assert.equal(bundle.checkEvidence.state, "insufficient");
  assert.ok(bundle.answer, `${state} still has an explicit rejected/missing evidence reference`);
  assert.equal(bundle.evidence[0]!.metrics, undefined, `${state} evidence must not retain detected-pitch assertions`);
}

assert.equal(createLocalVocalMicrophoneAnswer({
  definition,
  attemptId: "microphone-session:attempt:2",
  evidence: close.evidence,
}), null, "evidence from an old attempt must fail closed");
assert.equal(createLocalVocalMicrophoneAnswer({
  definition,
  attemptId: session.attemptId,
  evidence: [...close.evidence, close.evidence[0]!],
}), null, "duplicate evidence for one required target must fail closed");

const missingTargetResult = { ...alignment("close"), targetEvidence: [] };
const missingTarget = adaptLocalVocalMicrophoneActivityEvidence({ definition, attemptId: session.attemptId, result: missingTargetResult });
assert.equal(missingTarget.answer, null);
assert.equal(missingTarget.checkEvidence.state, "insufficient");

assert.throws(() => createLocalVocalMicrophoneActivityDefinition(generateLocalVocalExercise({
  ...DEFAULT_LOCAL_VOCAL_EXERCISE_CONFIG,
  patternId: "five-note",
  loops: 1,
})), /单次单音/);
assert.throws(() => createLocalVocalMicrophoneActivityDefinition(generateLocalVocalExercise({
  ...DEFAULT_LOCAL_VOCAL_EXERCISE_CONFIG,
  patternId: "single",
  rootMidi: 60,
  loops: 1,
})), /内置 A4/);

assert.throws(() => validateActivityDefinition({
  ...definition,
  target: { ...definition.target, checkPolicy: { ...definition.target.checkPolicy, requiredTargetIds: [] } },
}), /证据目标标识/);
assert.throws(() => validateActivityDefinition({ ...definition, allowedInputModes: ["choice"] }), /必须允许麦克风/);

console.log("P114f local vocal microphone activity adapter tests passed.");
