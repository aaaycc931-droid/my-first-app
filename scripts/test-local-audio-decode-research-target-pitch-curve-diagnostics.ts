import assert from "node:assert/strict";

import type { NoteLikeSegmentDiagnostic } from "../lib/research/local-audio-decode/note-like-segment-diagnostics";
import {
  convertNoteLikeSegmentsToResearchTargetPitchCurveDiagnostic,
  RESEARCH_TARGET_PITCH_CURVE_DIAGNOSTIC_SOURCE,
} from "../lib/research/local-audio-decode/research-target-pitch-curve-diagnostics";

function createNoteLikeSegmentDiagnostic(
  overrides: Partial<NoteLikeSegmentDiagnostic> = {},
): NoteLikeSegmentDiagnostic {
  return {
    startTimeSeconds: 0,
    endTimeSeconds: 0.5,
    durationSeconds: 0.5,
    representativeFrequencyHz: 440,
    nearestNoteName: "A4",
    frameCount: 5,
    voicedFrameCount: 5,
    bridgedNullFrameCount: 0,
    minFrequencyHz: 438,
    medianFrequencyHz: 440,
    maxFrequencyHz: 442,
    diagnosticConfidence: "normal",
    ...overrides,
  };
}

const emptyCurve = convertNoteLikeSegmentsToResearchTargetPitchCurveDiagnostic([]);
assert.equal(emptyCurve.curveId, "research-local-audio-decode-note-like-segments");
assert.equal(emptyCurve.source, RESEARCH_TARGET_PITCH_CURVE_DIAGNOSTIC_SOURCE);
assert.deepEqual(emptyCurve.segments, []);
assert.deepEqual(emptyCurve.summary, {
  segmentCount: 0,
  totalDurationSeconds: 0,
  lowConfidenceSegmentCount: 0,
});

const oneInput = [createNoteLikeSegmentDiagnostic()];
const oneInputBeforeConversion = JSON.stringify(oneInput);
const oneSegmentCurve =
  convertNoteLikeSegmentsToResearchTargetPitchCurveDiagnostic(oneInput);
assert.equal(oneSegmentCurve.segments.length, 1);
assert.deepEqual(oneSegmentCurve.segments[0], {
  segmentIndex: 0,
  startTimeSeconds: 0,
  endTimeSeconds: 0.5,
  durationSeconds: 0.5,
  targetFrequencyHz: 440,
  targetNoteLabel: "A4",
  diagnosticConfidence: "normal",
  sourceFrameCount: 5,
  bridgedNullFrameCount: 0,
});
assert.equal(JSON.stringify(oneInput), oneInputBeforeConversion);

const missingNearestNoteCurve =
  convertNoteLikeSegmentsToResearchTargetPitchCurveDiagnostic([
    createNoteLikeSegmentDiagnostic({ nearestNoteName: undefined }),
  ]);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    missingNearestNoteCurve.segments[0],
    "targetNoteLabel",
  ),
  false,
);
assert.equal(missingNearestNoteCurve.segments[0].targetNoteLabel, undefined);

const multipleSegments = [
  createNoteLikeSegmentDiagnostic({
    startTimeSeconds: 1,
    endTimeSeconds: 1.25,
    durationSeconds: 0.25,
    representativeFrequencyHz: 261.63,
    nearestNoteName: "C4",
    frameCount: 3,
    bridgedNullFrameCount: 1,
  }),
  createNoteLikeSegmentDiagnostic({
    startTimeSeconds: 0,
    endTimeSeconds: 0.75,
    durationSeconds: 0.75,
    representativeFrequencyHz: 329.63,
    nearestNoteName: "E4",
    frameCount: 4,
    bridgedNullFrameCount: 0,
    diagnosticConfidence: "low",
  }),
  createNoteLikeSegmentDiagnostic({
    startTimeSeconds: 2,
    endTimeSeconds: 3.5,
    durationSeconds: 1.5,
    representativeFrequencyHz: 392,
    nearestNoteName: undefined,
    frameCount: 8,
    bridgedNullFrameCount: 2,
  }),
];
const multipleSegmentsBeforeConversion = JSON.stringify(multipleSegments);
const multipleSegmentCurve =
  convertNoteLikeSegmentsToResearchTargetPitchCurveDiagnostic(multipleSegments);
assert.deepEqual(
  multipleSegmentCurve.segments.map((segment) => segment.startTimeSeconds),
  [1, 0, 2],
);
assert.deepEqual(
  multipleSegmentCurve.segments.map((segment) => segment.segmentIndex),
  [0, 1, 2],
);
assert.equal(multipleSegmentCurve.segments[0].targetFrequencyHz, 261.63);
assert.equal(multipleSegmentCurve.segments[0].targetNoteLabel, "C4");
assert.equal(multipleSegmentCurve.segments[1].targetFrequencyHz, 329.63);
assert.equal(multipleSegmentCurve.segments[1].targetNoteLabel, "E4");
assert.equal(multipleSegmentCurve.segments[1].diagnosticConfidence, "low");
assert.equal(multipleSegmentCurve.segments[2].targetFrequencyHz, 392);
assert.equal(
  Object.prototype.hasOwnProperty.call(
    multipleSegmentCurve.segments[2],
    "targetNoteLabel",
  ),
  false,
);
assert.deepEqual(multipleSegmentCurve.summary, {
  segmentCount: 3,
  totalDurationSeconds: 2.5,
  lowConfidenceSegmentCount: 1,
});
assert.equal(JSON.stringify(multipleSegments), multipleSegmentsBeforeConversion);

assert.ok(multipleSegmentCurve.curveId.startsWith("research-"));
assert.equal(
  multipleSegmentCurve.source,
  "local-audio-decode-note-like-segments",
);

console.log(
  "local-audio-decode research target pitch curve diagnostics synthetic checks passed",
);
