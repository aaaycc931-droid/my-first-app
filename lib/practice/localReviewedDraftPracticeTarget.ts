import type { LocalTargetPitchCurveDraftSelectedDiagnostics } from "./localTargetPitchCurveDraftReviewControls";

export type LocalReviewedDraftPracticeTarget = {
  source: "local-target-pitch-curve-draft-review";
  localOnly: true;
  sessionOnly: true;
  draftOnly: true;
  reviewedSelectionOnly: true;
  nonScoring: true;
  temporary: true;
  createdAtMs: number;
  selectedStartFrameIndex: number;
  selectedEndFrameIndex: number;
  selectedFrameCount: number;
  selectedVoicedFrameCount: number;
  selectedVoicedCoverage: number;
  referenceFrequencyHz: number | null;
  frequencyMinHz: number | null;
  frequencyMedianHz: number | null;
  frequencyMaxHz: number | null;
  startTimeSec: number | null;
  endTimeSec: number | null;
  durationSec: number | null;
  warnings: string[];
};

const boundaryWarnings = [
  "Temporary reviewed draft practice target only; user-created from the selected review range.",
  "Reference pitch is draft-derived from selected voiced median frequency; it is not a complete melody.",
  "Non-scoring diagnostic only: not accuracy, not a grade, and not pass/fail.",
  "Not a final target and not an official transcription.",
  "Browser-local and session-only; no upload, no cloud, no account, no database, and no library persistence.",
] as const;

export const canCreateLocalReviewedDraftPracticeTarget = (
  diagnostics: LocalTargetPitchCurveDraftSelectedDiagnostics,
): boolean =>
  diagnostics.draftOnly &&
  diagnostics.needsReview &&
  diagnostics.selectedStartFrame !== null &&
  diagnostics.selectedEndFrame !== null &&
  diagnostics.selectedFrameCount > 0 &&
  diagnostics.selectedVoicedFrameCount > 0 &&
  diagnostics.selectedFrequencyMedianHz !== null &&
  Number.isFinite(diagnostics.selectedFrequencyMedianHz);

export const createLocalReviewedDraftPracticeTarget = (
  diagnostics: LocalTargetPitchCurveDraftSelectedDiagnostics,
  createdAtMs = Date.now(),
): LocalReviewedDraftPracticeTarget | null => {
  if (!canCreateLocalReviewedDraftPracticeTarget(diagnostics)) {
    return null;
  }

  const durationSec = diagnostics.selectedDurationMs / 1000;

  return {
    source: "local-target-pitch-curve-draft-review",
    localOnly: true,
    sessionOnly: true,
    draftOnly: true,
    reviewedSelectionOnly: true,
    nonScoring: true,
    temporary: true,
    createdAtMs,
    selectedStartFrameIndex: diagnostics.selectedStartFrame as number,
    selectedEndFrameIndex: diagnostics.selectedEndFrame as number,
    selectedFrameCount: diagnostics.selectedFrameCount,
    selectedVoicedFrameCount: diagnostics.selectedVoicedFrameCount,
    selectedVoicedCoverage: diagnostics.selectedVoicedCoverageRatio,
    referenceFrequencyHz: diagnostics.selectedFrequencyMedianHz,
    frequencyMinHz: diagnostics.selectedFrequencyMinHz,
    frequencyMedianHz: diagnostics.selectedFrequencyMedianHz,
    frequencyMaxHz: diagnostics.selectedFrequencyMaxHz,
    startTimeSec: null,
    endTimeSec: null,
    durationSec: Number.isFinite(durationSec) ? durationSec : null,
    warnings: [...boundaryWarnings, ...diagnostics.warnings],
  };
};
