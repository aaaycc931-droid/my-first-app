import assert from "node:assert/strict";

import { validateAnalysisEvidence } from "../lib/activity/analysisEvidence";
import { adaptOfflineNoteAlignmentEvidence } from "../lib/activity/offlineNoteAlignmentEvidenceAdapter";
import type { OfflineNoteAlignmentResult } from "../lib/practice/offlineNoteAlignment";

const result = {
  version: "offline-note-alignment-v1",
  sourceAnalysisVersion: "offline-pitch-multicandidate-v1",
  segments: [],
  targetEvidence: [
    {
      target: { targetId: "n1", index: 0, phraseIndex: 0, label: "A4", midi: 69, startMs: 0, endMs: 500 },
      segmentId: "offline-segment-1", state: "close", detectedNote: "A4", medianCents: 4,
      lowCents: -3, highCents: 9, timingOffsetMs: 12, confidence: "high", phases: [], reason: "可靠证据",
    },
    {
      target: { targetId: "n2", index: 1, phraseIndex: 0, label: "B4", midi: 71, startMs: 500, endMs: 1000 },
      segmentId: null, state: "unreliable", detectedNote: "A4", medianCents: -190,
      lowCents: -220, highCents: -170, timingOffsetMs: 20, confidence: "low", phases: [], reason: "置信度不足",
    },
  ],
  phraseEvidence: [{ phraseIndex: 0, targetCount: 2, reliableCount: 1, missingCount: 0, unreliableCount: 1, medianCents: 4, medianTimingOffsetMs: 12, state: "partial", reason: "局部证据" }],
  extraSegmentIds: [],
  summary: { segmentCount: 1, usableSegmentCount: 1, rejectedSegmentCount: 0, targetCount: 2, alignedTargetCount: 1, missingTargetCount: 0, unreliableTargetCount: 1, extraSegmentCount: 0 },
  alignmentReason: "test",
} as OfflineNoteAlignmentResult;

const evidence = adaptOfflineNoteAlignmentEvidence("attempt-1", result);
assert.equal(evidence.length, 3);
assert.match(evidence[0]!.evidenceId, /^attempt-1:offline-note-alignment-v1:note:n1$/);
assert.equal(evidence[0]!.metrics?.detectedNote, "A4");
assert.equal(evidence[1]!.state, "rejected");
assert.equal(evidence[1]!.metrics, undefined, "rejected evidence must clear detected pitch assertions");
assert.notEqual(
  evidence[0]!.evidenceId,
  adaptOfflineNoteAlignmentEvidence("attempt-2", result)[0]!.evidenceId,
  "evidence ids must be namespaced by attempt",
);
assert.throws(() => validateAnalysisEvidence({ ...evidence[1]!, metrics: { detectedNote: "A4" } }), /不得携带/);

console.log("P114 analysis evidence adapter tests passed.");
