import assert from "node:assert/strict";
import { parseResearchTargetCurveHandoffJson } from "../lib/practice/research-target-curve-handoff-json";
import { RESEARCH_TARGET_PITCH_CURVE_DIAGNOSTIC_SOURCE } from "../lib/research/local-audio-decode/research-target-pitch-curve-diagnostics";

type DiagnosticInput = {
  curveId: string;
  source: string;
  segments: Array<Record<string, unknown>>;
  summary: {
    segmentCount: number;
    totalDurationSeconds: number;
    lowConfidenceSegmentCount: number;
  };
};

function baseDiagnostic(): DiagnosticInput {
  return {
    curveId: "synthetic-research-diagnostic",
    source: RESEARCH_TARGET_PITCH_CURVE_DIAGNOSTIC_SOURCE,
    segments: [],
    summary: {
      segmentCount: 0,
      totalDurationSeconds: 0,
      lowConfidenceSegmentCount: 0,
    },
  };
}

function segment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    segmentIndex: 0,
    startTimeSeconds: 0,
    endTimeSeconds: 0.5,
    durationSeconds: 0.5,
    targetFrequencyHz: 440,
    diagnosticConfidence: "normal",
    sourceFrameCount: 5,
    bridgedNullFrameCount: 0,
    ...overrides,
  };
}

function parse(value: unknown) {
  return parseResearchTargetCurveHandoffJson(JSON.stringify(value));
}

function assertErrorCode(value: unknown, errorCode: string): void {
  const result = typeof value === "string" ? parseResearchTargetCurveHandoffJson(value) : parse(value);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errorCode, errorCode);
  }
}

assertErrorCode("   ", "empty-input");
assertErrorCode("{not json", "invalid-json");
assertErrorCode({ source: RESEARCH_TARGET_PITCH_CURVE_DIAGNOSTIC_SOURCE }, "invalid-shape");
assertErrorCode({ ...baseDiagnostic(), source: "other-source" }, "unsupported-source");

const emptyResult = parse(baseDiagnostic());
assert.equal(emptyResult.ok, true);
if (emptyResult.ok) {
  assert.deepEqual(emptyResult.diagnostic.segments, []);
}

const oneSegment = baseDiagnostic();
oneSegment.segments = [segment()];
oneSegment.summary = {
  segmentCount: 1,
  totalDurationSeconds: 0.5,
  lowConfidenceSegmentCount: 0,
};
assert.equal(parse(oneSegment).ok, true);

const multiSegment = baseDiagnostic();
multiSegment.segments = [
  segment({ segmentIndex: 0, diagnosticConfidence: "normal" }),
  segment({ segmentIndex: 1, startTimeSeconds: 0.5, endTimeSeconds: 1, diagnosticConfidence: "low" }),
];
multiSegment.summary = {
  segmentCount: 2,
  totalDurationSeconds: 1,
  lowConfidenceSegmentCount: 1,
};
assert.equal(parse(multiSegment).ok, true);

assert.equal(parse({ ...oneSegment, segments: [segment({ diagnosticConfidence: "normal" })] }).ok, true);
const lowOnly = { ...oneSegment, segments: [segment({ diagnosticConfidence: "low" })], summary: { ...oneSegment.summary, lowConfidenceSegmentCount: 1 } };
assert.equal(parse(lowOnly).ok, true);
assertErrorCode({ ...oneSegment, segments: [segment({ diagnosticConfidence: "high" })] }, "unsupported-confidence");
assertErrorCode({ ...oneSegment, segments: [segment({ diagnosticConfidence: "medium" })] }, "unsupported-confidence");
assertErrorCode(
  JSON.stringify(oneSegment).replace('"durationSeconds":0.5', '"durationSeconds":1e309'),
  "invalid-number",
);
assertErrorCode({ ...oneSegment, segments: [segment({ targetFrequencyHz: -1 })] }, "invalid-number");
const missingField = segment();
delete missingField.startTimeSeconds;
assertErrorCode({ ...oneSegment, segments: [missingField] }, "invalid-number");
assert.equal(parse({ ...oneSegment, segments: [segment({ targetNoteLabel: undefined })] }).ok, true);
assert.equal(parse({ ...oneSegment, segments: [segment({ targetNoteLabel: "A4" })] }).ok, true);
assertErrorCode({ ...oneSegment, summary: { ...oneSegment.summary, segmentCount: 2 } }, "invalid-shape");
assertErrorCode({ ...lowOnly, summary: { ...lowOnly.summary, lowConfidenceSegmentCount: 0 } }, "invalid-shape");

const mutableInput = oneSegment;
const before = JSON.stringify(mutableInput);
const mutableResult = parse(mutableInput);
assert.equal(mutableResult.ok, true);
assert.equal(JSON.stringify(mutableInput), before);
if (mutableResult.ok) {
  mutableResult.diagnostic.segments[0].targetFrequencyHz = 220;
  assert.equal(mutableInput.segments[0].targetFrequencyHz, 440);
}

for (const invalidValue of [
  "",
  "{",
  { ...oneSegment, segments: [segment({ diagnosticConfidence: "high" })] },
  { ...oneSegment, segments: [segment({ targetFrequencyHz: -1 })] },
]) {
  const result = typeof invalidValue === "string" ? parseResearchTargetCurveHandoffJson(invalidValue) : parse(invalidValue);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.doesNotMatch(result.message, /score|grade|pass|fail|correct|wrong/i);
  }
}

console.log("practice research target curve handoff JSON synthetic tests passed");
