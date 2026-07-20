import assert from "node:assert/strict";

import { validateActivityDefinition } from "../lib/activity/activityDefinition";
import {
  adaptLocalIntervalImitationActivityEvidence,
  adaptLocalVocalMicrophoneActivityEvidence,
  createLocalIntervalImitationActivityDefinition,
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

const intervalExercise = generateLocalVocalExercise({
  ...DEFAULT_LOCAL_VOCAL_EXERCISE_CONFIG,
  patternId: "interval",
  rootMidi: 60,
  intervalSemitones: 7,
  direction: "ascending",
  loops: 1,
});
const intervalDefinition = createLocalIntervalImitationActivityDefinition({
  exercise: intervalExercise,
  comparisonVariantId: "interval-comparison:test",
  groupLabel: "第一组",
});
assert.equal(intervalDefinition.target.checkPolicy.requiredTargetIds.length, 3);
assert.equal("expectedAnswer" in intervalDefinition.target, false);
const intervalSession = createActivitySession(intervalDefinition, "interval-imitation-session");
const intervalAlignment = (states: OfflineTargetEvidence["state"][]): OfflineNoteAlignmentResult => ({
  ...alignment("close"),
  targetEvidence: intervalDefinition.target.checkPolicy.requiredTargetIds.map((targetId, index) => ({
    ...targetEvidence(states[index] ?? "missing"),
    target: { targetId, index, phraseIndex: 0, label: index === 1 ? "G4" : "C4", midi: index === 1 ? 67 : 60, startMs: index * 1_000, endMs: index * 1_000 + 820 },
    medianCents: states[index] === "high" ? 55 : states[index] === "low" ? -55 : states[index] === "close" ? 2 : null,
  })),
  summary: { ...alignment("close").summary, targetCount: 3, alignedTargetCount: states.filter((state) => state !== "missing" && state !== "unreliable").length },
});
const intervalClose = adaptLocalIntervalImitationActivityEvidence({ definition: intervalDefinition, attemptId: intervalSession.attemptId, result: intervalAlignment(["close", "close", "close"]) });
assert.equal(intervalClose.checkEvidence.state, "consistent");
assert.match(intervalClose.checkEvidence.explanation, /^接近/);
const intervalHigh = adaptLocalIntervalImitationActivityEvidence({ definition: intervalDefinition, attemptId: intervalSession.attemptId, result: intervalAlignment(["high", "close", "high"]) });
assert.equal(intervalHigh.checkEvidence.state, "different");
assert.match(intervalHigh.checkEvidence.explanation, /^偏高/);
const intervalLow = adaptLocalIntervalImitationActivityEvidence({ definition: intervalDefinition, attemptId: intervalSession.attemptId, result: intervalAlignment(["low", "close", "low"]) });
assert.match(intervalLow.checkEvidence.explanation, /^偏低/);
const intervalMissing = adaptLocalIntervalImitationActivityEvidence({ definition: intervalDefinition, attemptId: intervalSession.attemptId, result: intervalAlignment(["close", "missing", "close"]) });
assert.equal(intervalMissing.checkEvidence.state, "insufficient");
assert.match(intervalMissing.checkEvidence.explanation, /^证据不足/);
assert.equal(createLocalVocalMicrophoneAnswer({ definition: intervalDefinition, attemptId: `${intervalSession.sessionId}:attempt:2`, evidence: intervalClose.evidence }), null);
for (const forbidden of ["分数", "等级", "通过", "失败", "专业声乐评估"]) {
  assert.match(intervalDefinition.explanation, new RegExp(forbidden));
}

console.log("P114f local vocal microphone activity adapter tests passed.");
