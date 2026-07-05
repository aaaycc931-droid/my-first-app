import type { LocalTargetPitchCurveDraft } from "./localTargetPitchCurveDraft";

export type LocalTargetPitchCurveDraftReviewMode = "full-draft" | "voiced-span" | "manual-frame-range";

export type LocalTargetPitchCurveDraftReviewSelection = {
  mode: LocalTargetPitchCurveDraftReviewMode;
  manualStartFrame: number;
  manualEndFrame: number;
};

export type LocalTargetPitchCurveDraftSelectedDiagnostics = {
  draftOnly: boolean;
  needsReview: boolean;
  mode: LocalTargetPitchCurveDraftReviewMode;
  requestedStartFrame: number;
  requestedEndFrame: number;
  selectedStartFrame: number | null;
  selectedEndFrame: number | null;
  selectedFrameCount: number;
  selectedVoicedFrameCount: number;
  selectedVoicedCoverageRatio: number;
  selectedFirstVoicedFrame: number | null;
  selectedLastVoicedFrame: number | null;
  selectedFrequencyMinHz: number | null;
  selectedFrequencyMedianHz: number | null;
  selectedFrequencyMaxHz: number | null;
  selectedDurationMs: number;
  warnings: string[];
};

const boundaryWarnings = [
  "This is a review preview only; review is required before practice integration.",
  "Not a final target, not an official transcription, and not scoring.",
  "Confidence and coverage are diagnostic only.",
  "Browser-local and session-only; no upload, no cloud, no account, and no database.",
] as const;

export const createDefaultLocalTargetPitchCurveDraftReviewSelection = (): LocalTargetPitchCurveDraftReviewSelection => ({
  mode: "full-draft",
  manualStartFrame: 0,
  manualEndFrame: 0,
});

const clampFrameIndex = (frameIndex: number, frameCount: number) => {
  if (frameCount <= 0) {
    return 0;
  }

  if (!Number.isFinite(frameIndex)) {
    return 0;
  }

  return Math.min(Math.max(Math.round(frameIndex), 0), frameCount - 1);
};

const median = (values: number[]) => {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

export const getLocalTargetPitchCurveDraftSelectedDiagnostics = (
  draft: LocalTargetPitchCurveDraft | null,
  selection: LocalTargetPitchCurveDraftReviewSelection,
): LocalTargetPitchCurveDraftSelectedDiagnostics => {
  const warnings: string[] = [...boundaryWarnings];

  if (!draft || draft.frameCount <= 0) {
    warnings.push("No local draft frames are available for review selection.");
    return {
      draftOnly: draft?.draftOnly ?? false,
      needsReview: draft?.needsReview ?? false,
      mode: selection.mode,
      requestedStartFrame: selection.manualStartFrame,
      requestedEndFrame: selection.manualEndFrame,
      selectedStartFrame: null,
      selectedEndFrame: null,
      selectedFrameCount: 0,
      selectedVoicedFrameCount: 0,
      selectedVoicedCoverageRatio: 0,
      selectedFirstVoicedFrame: null,
      selectedLastVoicedFrame: null,
      selectedFrequencyMinHz: null,
      selectedFrequencyMedianHz: null,
      selectedFrequencyMaxHz: null,
      selectedDurationMs: 0,
      warnings,
    };
  }

  if (!draft.draftOnly) {
    warnings.push("Draft-only boundary flag is not set; keep this selection out of practice integration.");
  }

  if (!draft.needsReview) {
    warnings.push("Needs-review boundary flag is not set; keep this selection in review preview only.");
  }

  const voicedFrames = draft.frames.filter((frame) => frame.voiced && frame.frequencyHz !== null && Number.isFinite(frame.frequencyHz));
  let startFrame = 0;
  let endFrame = draft.frameCount - 1;
  let requestedStartFrame = startFrame;
  let requestedEndFrame = endFrame;

  if (selection.mode === "voiced-span") {
    if (voicedFrames.length > 0) {
      startFrame = voicedFrames[0].frameIndex;
      endFrame = voicedFrames[voicedFrames.length - 1].frameIndex;
    } else {
      warnings.push("No voiced frames found; review selection falls back to the full draft range.");
    }
    requestedStartFrame = startFrame;
    requestedEndFrame = endFrame;
  }

  if (selection.mode === "manual-frame-range") {
    requestedStartFrame = selection.manualStartFrame;
    requestedEndFrame = selection.manualEndFrame;
    const clampedStartFrame = clampFrameIndex(selection.manualStartFrame, draft.frameCount);
    const clampedEndFrame = clampFrameIndex(selection.manualEndFrame, draft.frameCount);

    if (clampedStartFrame !== selection.manualStartFrame || clampedEndFrame !== selection.manualEndFrame) {
      warnings.push("Manual frame range was clamped to the available draft frame boundaries.");
    }

    if (clampedStartFrame > clampedEndFrame) {
      warnings.push("Manual start frame was after end frame; selection falls back to the full draft range.");
      startFrame = 0;
      endFrame = draft.frameCount - 1;
    } else {
      startFrame = clampedStartFrame;
      endFrame = clampedEndFrame;
    }
  }

  const selectedFrames = draft.frames.filter((frame) => frame.frameIndex >= startFrame && frame.frameIndex <= endFrame);
  const selectedVoicedFrames = selectedFrames.filter((frame) => frame.voiced && frame.frequencyHz !== null && Number.isFinite(frame.frequencyHz));
  const selectedFrequencies = selectedVoicedFrames.map((frame) => frame.frequencyHz as number);

  if (selectedVoicedFrames.length === 0) {
    warnings.push("Selected range has no voiced frames; frequency diagnostics are unavailable.");
  }

  const selectedStart = selectedFrames[0] ?? null;
  const selectedEnd = selectedFrames[selectedFrames.length - 1] ?? null;
  const selectedDurationMs = selectedStart && selectedEnd
    ? Math.max(0, selectedEnd.timeMs - selectedStart.timeMs + (draft.diagnostics.hopSize / draft.sampleRate) * 1000)
    : 0;

  return {
    draftOnly: draft.draftOnly,
    needsReview: draft.needsReview,
    mode: selection.mode,
    requestedStartFrame,
    requestedEndFrame,
    selectedStartFrame: startFrame,
    selectedEndFrame: endFrame,
    selectedFrameCount: selectedFrames.length,
    selectedVoicedFrameCount: selectedVoicedFrames.length,
    selectedVoicedCoverageRatio: selectedFrames.length > 0 ? selectedVoicedFrames.length / selectedFrames.length : 0,
    selectedFirstVoicedFrame: selectedVoicedFrames[0]?.frameIndex ?? null,
    selectedLastVoicedFrame: selectedVoicedFrames[selectedVoicedFrames.length - 1]?.frameIndex ?? null,
    selectedFrequencyMinHz: selectedFrequencies.length > 0 ? Math.min(...selectedFrequencies) : null,
    selectedFrequencyMedianHz: selectedFrequencies.length > 0 ? median(selectedFrequencies) : null,
    selectedFrequencyMaxHz: selectedFrequencies.length > 0 ? Math.max(...selectedFrequencies) : null,
    selectedDurationMs,
    warnings,
  };
};
