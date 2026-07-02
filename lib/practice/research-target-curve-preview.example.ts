import {
  RESEARCH_TARGET_PITCH_CURVE_DIAGNOSTIC_SOURCE,
  type ResearchTargetPitchCurveDiagnostic,
  type ResearchTargetPitchCurveSegmentDiagnostic,
} from "../research/local-audio-decode/research-target-pitch-curve-diagnostics";

const segments = [
  {
    segmentIndex: 0,
    startTimeSeconds: 0,
    endTimeSeconds: 0.82,
    durationSeconds: 0.82,
    targetFrequencyHz: 261.63,
    targetNoteLabel: "diagnostic label: C4-like",
    diagnosticConfidence: "normal",
    sourceFrameCount: 17,
    bridgedNullFrameCount: 0,
  },
  {
    segmentIndex: 1,
    startTimeSeconds: 0.96,
    endTimeSeconds: 1.64,
    durationSeconds: 0.68,
    targetFrequencyHz: 293.66,
    targetNoteLabel: "diagnostic label: D4-like",
    diagnosticConfidence: "normal",
    sourceFrameCount: 13,
    bridgedNullFrameCount: 1,
  },
  {
    segmentIndex: 2,
    startTimeSeconds: 1.86,
    endTimeSeconds: 2.4,
    durationSeconds: 0.54,
    targetFrequencyHz: 329.63,
    targetNoteLabel: "diagnostic label: E4-like",
    diagnosticConfidence: "low",
    sourceFrameCount: 7,
    bridgedNullFrameCount: 3,
  },
] satisfies ResearchTargetPitchCurveSegmentDiagnostic[];

export const researchTargetCurvePreviewExample = {
  curveId: "synthetic-practice-research-preview-p16b",
  source: RESEARCH_TARGET_PITCH_CURVE_DIAGNOSTIC_SOURCE,
  summary: {
    segmentCount: segments.length,
    totalDurationSeconds: 2.4,
    lowConfidenceSegmentCount: segments.filter(
      (segment) => segment.diagnosticConfidence === "low",
    ).length,
  },
  segments,
} satisfies ResearchTargetPitchCurveDiagnostic;
