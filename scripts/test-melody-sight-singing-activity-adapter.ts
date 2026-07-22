import assert from "node:assert/strict";

import {
  adaptMelodySightSingingActivityEvidence,
  createMelodySightSingingActivityDefinition,
  type MelodySightSingingAnalysisBinding,
} from "../lib/activity/melodySightSingingActivityAdapter";
import { createLocalMelodyImitationTimeline } from "../lib/practice/localMelodyImitation";
import {
  createLocalMelodySightSingingTarget,
  getLocalMelodySightSingingP113Targets,
} from "../lib/practice/localMelodySightSinging";
import type {
  OfflineNoteAlignmentResult,
  OfflineNoteSegment,
  OfflineTargetEvidence,
} from "../lib/practice/offlineNoteAlignment";

const timeline = createLocalMelodyImitationTimeline({
  question: {
    id: "sight-singing-question-7",
    variantId: "sight-singing-variant-7",
    difficulty: "基础",
    sequence: 7,
    melody: { id: "repeat-fifth", label: "test", noteIds: ["c4", "g4", "g4"], explanation: "test" },
  },
  bpm: 100,
});
const target = createLocalMelodySightSingingTarget({ timeline });
const alignmentTargets = getLocalMelodySightSingingP113Targets(target);
const definition = createMelodySightSingingActivityDefinition(target);

assert.equal(definition.family, "melody-sight-singing");
assert.deepEqual(definition.allowedInputModes, ["microphone"]);
assert.equal(definition.assessmentMode, "non-scoring");
assert.deepEqual(definition.target.checkPolicy.requiredTargetIds, alignmentTargets.map((item) => item.targetId));

const binding: MelodySightSingingAnalysisBinding = {
  definitionActivityId: definition.activityId,
  questionVariantId: target.variantId,
  visiblePresentationId: target.visiblePresentationId,
  timedTargetId: target.timedTargetId,
  countInRunId: "count-in-run-1",
  attemptId: "sight-singing-session:attempt:1",
  recordingId: "recording-1",
  recordingPlaybackQualificationId: "recording-playback-qualification-1",
  analysisRunId: "analysis-run-1",
  algorithmVersion: "offline-note-alignment-v1",
};

const targetEvidence = (
  index: number,
  state: OfflineTargetEvidence["state"],
): OfflineTargetEvidence => {
  const item = alignmentTargets[index]!;
  const reliable = state === "close" || state === "high" || state === "low";
  const assigned = state !== "missing";
  return {
    target: {
      targetId: item.targetId,
      index,
      phraseIndex: 0,
      label: item.label,
      midi: item.midi,
      startMs: item.startMs,
      endMs: item.endMs,
    },
    segmentId: assigned ? `segment-${index}` : null,
    state,
    detectedNote: reliable ? item.label : null,
    medianCents: reliable ? state === "high" ? 62 : state === "low" ? -61 : 3 : null,
    lowCents: reliable ? -5 : null,
    highCents: reliable ? 8 : null,
    timingOffsetMs: reliable ? 12 : null,
    confidence: reliable ? "high" : null,
    phases: [],
    reason: reliable ? "可靠逐音证据" : "无法可靠解释",
  };
};

const segmentForEvidence = (evidence: OfflineTargetEvidence): OfflineNoteSegment | null => {
  if (evidence.segmentId === null) return null;
  const rejected = evidence.state === "unreliable";
  return {
    segmentId: evidence.segmentId,
    startMs: evidence.target.startMs,
    endMs: evidence.target.endMs,
    durationMs: evidence.target.endMs - evidence.target.startMs,
    voicedFrameCount: rejected ? 2 : 20,
    bridgedFrameCount: 0,
    medianFrequencyHz: 261.63,
    medianMidi: evidence.target.midi,
    minMidi: evidence.target.midi,
    maxMidi: evidence.target.midi,
    medianFrameConfidence: rejected ? 0.4 : 0.92,
    confidence: rejected ? "low" : "high",
    state: rejected ? "rejected" : "usable",
    reason: rejected ? "置信度不足" : "可靠片段",
    frames: [],
  };
};

const alignment = (states: readonly OfflineTargetEvidence["state"][]): OfflineNoteAlignmentResult => {
  const evidence = states.map((state, index) => targetEvidence(index, state));
  const segments = evidence.flatMap((item) => {
    const segment = segmentForEvidence(item);
    return segment ? [segment] : [];
  });
  const reliableCount = evidence.filter((item) =>
    item.state === "close" || item.state === "high" || item.state === "low",
  ).length;
  return {
    version: "offline-note-alignment-v1",
    sourceAnalysisVersion: "offline-pitch-multicandidate-v1",
    segments,
    targetEvidence: evidence,
    phraseEvidence: [],
    extraSegmentIds: [],
    summary: {
      segmentCount: segments.length,
      usableSegmentCount: reliableCount,
      rejectedSegmentCount: states.filter((state) => state === "unreliable").length,
      targetCount: 3,
      alignedTargetCount: reliableCount,
      missingTargetCount: states.filter((state) => state === "missing").length,
      unreliableTargetCount: states.filter((state) => state === "unreliable").length,
      extraSegmentCount: 0,
    },
    alignmentReason: "ordered test alignment",
  };
};

const adapt = (
  result: OfflineNoteAlignmentResult,
  currentBinding = binding,
  capturedBinding = binding,
) => adaptMelodySightSingingActivityEvidence({
  definition,
  target,
  currentBinding,
  capturedBinding,
  result,
});

const close = adapt(alignment(["close", "close", "close"]));
assert.equal(close.checkEvidence.state, "consistent");
assert.equal(close.checkEvidence.assessmentMode, "non-scoring");
assert.ok(close.answer?.mode === "microphone");
assert.equal(close.evidence.length, 3);
assert.deepEqual(close.evidence.map((item) => item.targetId), alignmentTargets.map((item) => item.targetId));
for (const evidence of close.evidence) {
  assert.equal(evidence.assessmentMode, "non-scoring");
  for (const identity of Object.values(binding)) assert.ok(evidence.evidenceId.includes(identity));
}

for (const states of [
  ["high", "close", "close"],
  ["close", "low", "close"],
] as const) {
  const bundle = adapt(alignment(states));
  assert.equal(bundle.checkEvidence.state, "different");
  assert.equal(bundle.checkEvidence.assessmentMode, "non-scoring");
}

for (const states of [
  ["close", "missing", "close"],
  ["unreliable", "close", "close"],
  ["missing", "missing", "missing"],
] as const) {
  const bundle = adapt(alignment(states));
  assert.equal(bundle.checkEvidence.state, "insufficient");
  assert.equal(bundle.checkEvidence.assessmentMode, "non-scoring");
  assert.ok(bundle.answer, "lawful missing or unreliable positions remain explicit evidence references");
  assert.equal(bundle.evidence.length, 3);
}

for (const field of [
  "definitionActivityId",
  "questionVariantId",
  "visiblePresentationId",
  "timedTargetId",
  "countInRunId",
  "attemptId",
  "recordingId",
  "recordingPlaybackQualificationId",
  "analysisRunId",
  "algorithmVersion",
] as const) {
  const stale = { ...binding, [field]: `${binding[field]}:stale` };
  const bundle = adapt(alignment(["close", "close", "close"]), binding, stale);
  assert.equal(bundle.checkEvidence.state, "insufficient", `${field} mismatch must fail closed`);
  assert.equal(bundle.answer, null);
  assert.deepEqual(bundle.evidence, []);
}

const valid = alignment(["close", "close", "close"]);
const reordered = { ...valid, targetEvidence: [valid.targetEvidence[1]!, valid.targetEvidence[0]!, valid.targetEvidence[2]!] };
const reorderedBundle = adapt(reordered);
assert.equal(reorderedBundle.checkEvidence.state, "insufficient");
assert.equal(reorderedBundle.answer, null);
assert.deepEqual(reorderedBundle.evidence, []);

const missingPosition = { ...valid, targetEvidence: valid.targetEvidence.slice(0, 2) };
const missingPositionBundle = adapt(missingPosition);
assert.equal(missingPositionBundle.checkEvidence.state, "insufficient");
assert.equal(missingPositionBundle.answer, null);
assert.deepEqual(missingPositionBundle.evidence, []);

const spoofedTargetBundle = adaptMelodySightSingingActivityEvidence({
  definition,
  target: { ...target, timedTargetId: `${target.timedTargetId}:spoofed` },
  currentBinding: binding,
  capturedBinding: binding,
  result: valid,
});
assert.equal(spoofedTargetBundle.checkEvidence.state, "insufficient");
assert.equal(spoofedTargetBundle.answer, null);
assert.deepEqual(spoofedTargetBundle.evidence, []);

const scoringDefinitionBundle = adaptMelodySightSingingActivityEvidence({
  definition: { ...definition, assessmentMode: "scored" as "non-scoring" },
  target,
  currentBinding: binding,
  capturedBinding: binding,
  result: valid,
});
assert.equal(scoringDefinitionBundle.checkEvidence.state, "insufficient");
assert.equal(scoringDefinitionBundle.answer, null);
assert.deepEqual(scoringDefinitionBundle.evidence, []);

const extraSegment: OfflineNoteSegment = {
  ...valid.segments[0]!,
  segmentId: "extra-segment",
  startMs: 2_000,
  endMs: 2_400,
  durationMs: 400,
};
const lawfulExtra = {
  ...valid,
  segments: [...valid.segments, extraSegment],
  extraSegmentIds: ["extra-segment"],
  summary: {
    ...valid.summary,
    segmentCount: valid.summary.segmentCount + 1,
    usableSegmentCount: valid.summary.usableSegmentCount + 1,
    extraSegmentCount: 1,
  },
};
const lawfulExtraBundle = adapt(lawfulExtra);
assert.equal(lawfulExtraBundle.checkEvidence.state, "insufficient");
assert.equal(lawfulExtraBundle.checkEvidence.assessmentMode, "non-scoring");
assert.ok(lawfulExtraBundle.answer, "a lawful extra segment remains current-attempt evidence");
assert.equal(lawfulExtraBundle.evidence.length, 3);

const contradictoryExtra = {
  ...valid,
  extraSegmentIds: ["extra-segment"],
  summary: { ...valid.summary, extraSegmentCount: 1 },
};
const contradictoryExtraBundle = adapt(contradictoryExtra);
assert.equal(contradictoryExtraBundle.checkEvidence.state, "insufficient");
assert.equal(contradictoryExtraBundle.answer, null);
assert.deepEqual(contradictoryExtraBundle.evidence, []);

for (const [result, field] of [
  [alignment(["close", "close", "close"]), "alignedTargetCount"],
  [alignment(["missing", "close", "close"]), "missingTargetCount"],
  [alignment(["unreliable", "close", "close"]), "unreliableTargetCount"],
  [alignment(["unreliable", "close", "close"]), "rejectedSegmentCount"],
] as const) {
  const contradictory = {
    ...result,
    summary: { ...result.summary, [field]: result.summary[field] + 1 },
  };
  const bundle = adapt(contradictory);
  assert.equal(bundle.checkEvidence.state, "insufficient", `${field} contradiction must fail closed`);
  assert.equal(bundle.answer, null);
  assert.deepEqual(bundle.evidence, []);
}

const duplicatedAssignment = alignment(["close", "close", "close"]);
const duplicatedSegmentId = {
  ...duplicatedAssignment,
  targetEvidence: duplicatedAssignment.targetEvidence.map((item, index) =>
    index === 1 ? { ...item, segmentId: duplicatedAssignment.targetEvidence[0]!.segmentId } : item,
  ),
};
const duplicatedSegmentBundle = adapt(duplicatedSegmentId);
assert.equal(duplicatedSegmentBundle.checkEvidence.state, "insufficient");
assert.equal(duplicatedSegmentBundle.answer, null);
assert.deepEqual(duplicatedSegmentBundle.evidence, []);

const nonMonotonicAssignment = alignment(["close", "close", "close"]);
const reversedSegmentIds = {
  ...nonMonotonicAssignment,
  targetEvidence: nonMonotonicAssignment.targetEvidence.map((item, index, items) => ({
    ...item,
    segmentId: items[items.length - 1 - index]!.segmentId,
  })),
};
const nonMonotonicBundle = adapt(reversedSegmentIds);
assert.equal(nonMonotonicBundle.checkEvidence.state, "insufficient");
assert.equal(nonMonotonicBundle.answer, null);
assert.deepEqual(nonMonotonicBundle.evidence, []);

console.log("P117e melody sight-singing Activity adapter tests passed.");
