import type { LocalTargetPitchCurveDraft } from "./localTargetPitchCurveDraft";

export type LocalTargetPitchCurveDraftReviewPreview = {
  status: LocalTargetPitchCurveDraft["status"] | "missing";
  draftOnly: boolean;
  needsReview: boolean;
  frameCount: number;
  voicedFrameCount: number;
  unvoicedFrameCount: number;
  voicedCoverageRatio: number;
  firstVoicedFrameTimeMs: number | null;
  lastVoicedFrameTimeMs: number | null;
  frequencyMinHz: number | null;
  frequencyMedianHz: number | null;
  frequencyMaxHz: number | null;
  estimatedRangeLabel: string;
  warnings: string[];
  diagnostics: {
    browserLocal: true;
    sessionOnly: true;
    nonScoring: true;
    reviewPreviewOnly: true;
    importedTargetPracticeFlowConnected: false;
  };
};

const reviewBoundaryWarnings = [
  "Review required before practice integration; this preview is not a final target.",
  "Draft only: not an official transcription, not scoring, and not an accuracy result.",
] as const;

const formatFrequency = (frequencyHz: number | null) =>
  frequencyHz === null || !Number.isFinite(frequencyHz)
    ? null
    : `${frequencyHz.toFixed(1)} Hz`;

export const createLocalTargetPitchCurveDraftReviewPreview = (
  draft: LocalTargetPitchCurveDraft | null,
): LocalTargetPitchCurveDraftReviewPreview => {
  if (!draft) {
    return {
      status: "missing",
      draftOnly: false,
      needsReview: false,
      frameCount: 0,
      voicedFrameCount: 0,
      unvoicedFrameCount: 0,
      voicedCoverageRatio: 0,
      firstVoicedFrameTimeMs: null,
      lastVoicedFrameTimeMs: null,
      frequencyMinHz: null,
      frequencyMedianHz: null,
      frequencyMaxHz: null,
      estimatedRangeLabel: "No voiced pitch range available",
      warnings: [
        "No local target pitch curve draft exists yet.",
        ...reviewBoundaryWarnings,
      ],
      diagnostics: {
        browserLocal: true,
        sessionOnly: true,
        nonScoring: true,
        reviewPreviewOnly: true,
        importedTargetPracticeFlowConnected: false,
      },
    };
  }

  const voicedFrames = draft.frames.filter(
    (frame) => frame.voiced && frame.frequencyHz !== null && Number.isFinite(frame.frequencyHz),
  );
  const firstVoicedFrame = voicedFrames[0] ?? null;
  const lastVoicedFrame = voicedFrames[voicedFrames.length - 1] ?? null;
  const minLabel = formatFrequency(draft.frequencyMinHz);
  const medianLabel = formatFrequency(draft.frequencyMedianHz);
  const maxLabel = formatFrequency(draft.frequencyMaxHz);

  return {
    status: draft.status,
    draftOnly: draft.draftOnly,
    needsReview: draft.needsReview,
    frameCount: draft.frameCount,
    voicedFrameCount: draft.voicedFrameCount,
    unvoicedFrameCount: draft.unvoicedFrameCount,
    voicedCoverageRatio: draft.frameCount > 0 ? draft.voicedFrameCount / draft.frameCount : 0,
    firstVoicedFrameTimeMs: firstVoicedFrame?.timeMs ?? null,
    lastVoicedFrameTimeMs: lastVoicedFrame?.timeMs ?? null,
    frequencyMinHz: draft.frequencyMinHz,
    frequencyMedianHz: draft.frequencyMedianHz,
    frequencyMaxHz: draft.frequencyMaxHz,
    estimatedRangeLabel: minLabel && medianLabel && maxLabel
      ? `${minLabel} min · ${medianLabel} median · ${maxLabel} max`
      : "No voiced pitch range available",
    warnings: [...draft.warnings, ...reviewBoundaryWarnings],
    diagnostics: {
      browserLocal: true,
      sessionOnly: true,
      nonScoring: true,
      reviewPreviewOnly: true,
      importedTargetPracticeFlowConnected: false,
    },
  };
};
