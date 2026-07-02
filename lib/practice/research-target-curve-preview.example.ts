export type PracticeResearchTargetCurveDiagnosticPreviewSegment = {
  segmentIndex: number;
  startTimeSeconds: number;
  endTimeSeconds: number;
  durationSeconds: number;
  targetFrequencyHz: number;
  targetNoteLabel?: string;
  diagnosticConfidence: "high" | "medium" | "low";
  sourceFrameCount: number;
  bridgedNullFrameCount: number;
};

export type PracticeResearchTargetCurveDiagnosticPreviewExample = {
  curveId: string;
  source: string;
  summary: {
    segmentCount: number;
    totalDurationSeconds: number;
    lowConfidenceSegmentCount: number;
  };
  segments: PracticeResearchTargetCurveDiagnosticPreviewSegment[];
};

const segments: PracticeResearchTargetCurveDiagnosticPreviewSegment[] = [
  {
    segmentIndex: 0,
    startTimeSeconds: 0,
    endTimeSeconds: 0.82,
    durationSeconds: 0.82,
    targetFrequencyHz: 261.63,
    targetNoteLabel: "diagnostic label: C4-like",
    diagnosticConfidence: "high",
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
    diagnosticConfidence: "medium",
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
];

export const researchTargetCurvePreviewExample: PracticeResearchTargetCurveDiagnosticPreviewExample = {
  curveId: "synthetic-practice-research-preview-p16b",
  source:
    "Synthetic / fake / hand-authored example; non-audio-derived and not from WAV, user recording, metadata.local.json, storage, API, upload, database, or account data.",
  summary: {
    segmentCount: segments.length,
    totalDurationSeconds: 2.4,
    lowConfidenceSegmentCount: segments.filter(
      (segment) => segment.diagnosticConfidence === "low",
    ).length,
  },
  segments,
};
