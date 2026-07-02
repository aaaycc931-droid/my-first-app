import type { NoteLikeSegmentDiagnostic } from "./note-like-segment-diagnostics";

export const RESEARCH_TARGET_PITCH_CURVE_DIAGNOSTIC_SOURCE =
  "local-audio-decode-note-like-segments" as const;

export type ResearchTargetPitchCurveDiagnosticSource =
  typeof RESEARCH_TARGET_PITCH_CURVE_DIAGNOSTIC_SOURCE;

export type ResearchTargetPitchCurveDiagnosticConfidence = "normal" | "low";

export type ResearchTargetPitchCurveSegmentDiagnostic = {
  segmentIndex: number;
  startTimeSeconds: number;
  endTimeSeconds: number;
  durationSeconds: number;
  targetFrequencyHz: number;
  targetNoteLabel?: string;
  diagnosticConfidence: ResearchTargetPitchCurveDiagnosticConfidence;
  sourceFrameCount: number;
  bridgedNullFrameCount: number;
};

export type ResearchTargetPitchCurveDiagnostic = {
  curveId: string;
  source: ResearchTargetPitchCurveDiagnosticSource;
  segments: ResearchTargetPitchCurveSegmentDiagnostic[];
  summary: {
    segmentCount: number;
    totalDurationSeconds: number;
    lowConfidenceSegmentCount: number;
  };
};

export function convertNoteLikeSegmentsToResearchTargetPitchCurveDiagnostic(
  noteLikeSegments: NoteLikeSegmentDiagnostic[],
): ResearchTargetPitchCurveDiagnostic {
  const segments = noteLikeSegments.map((segment, segmentIndex) => {
    const targetCurveSegment: ResearchTargetPitchCurveSegmentDiagnostic = {
      segmentIndex,
      startTimeSeconds: segment.startTimeSeconds,
      endTimeSeconds: segment.endTimeSeconds,
      durationSeconds: segment.durationSeconds,
      targetFrequencyHz: segment.representativeFrequencyHz,
      diagnosticConfidence: segment.diagnosticConfidence,
      sourceFrameCount: segment.frameCount,
      bridgedNullFrameCount: segment.bridgedNullFrameCount,
    };

    if (segment.nearestNoteName !== undefined) {
      targetCurveSegment.targetNoteLabel = segment.nearestNoteName;
    }

    return targetCurveSegment;
  });

  return {
    curveId: "research-local-audio-decode-note-like-segments",
    source: RESEARCH_TARGET_PITCH_CURVE_DIAGNOSTIC_SOURCE,
    segments,
    summary: {
      segmentCount: segments.length,
      totalDurationSeconds: segments.reduce(
        (totalDurationSeconds, segment) =>
          totalDurationSeconds + segment.durationSeconds,
        0,
      ),
      lowConfidenceSegmentCount: segments.filter(
        (segment) => segment.diagnosticConfidence === "low",
      ).length,
    },
  };
}
