import type { MetronomeConfig } from "../metronome/metronomeConfig";
import type { AudioOnsetDetectionResult } from "./audioOnsetDetection";
import {
  createRhythmTargetPattern,
  getRhythmTapFeedback,
  rhythmTargetPatternLabels,
  type RhythmTargetPattern,
  type RhythmTapEvent,
  type RhythmTapFeedbackCategory,
} from "./rhythmTapFeedback";

export type AudioOnsetRhythmAlignmentMode = "recording-start" | "first-onset";

export type AudioOnsetRhythmFeedbackItem = {
  category: Exclude<RhythmTapFeedbackCategory, "not-started" | "waiting-for-taps">;
  targetTimeMs: number | null;
  onsetTimeMs: number | null;
  adjustedOnsetTimeMs: number | null;
  offsetMs: number | null;
  onsetStrength: number | null;
  targetIndex: number | null;
  pattern: RhythmTargetPattern;
  diagnosticNote: string;
};

export type AudioOnsetRhythmAlignmentDiagnostics = {
  mode: AudioOnsetRhythmAlignmentMode;
  alignmentOffsetMs: number;
  firstOnsetTimeMs: number | null;
  firstTargetTimeMs: number | null;
  latencyOffsetAppliedMs: number;
  diagnosticNote: string;
};

export type AudioOnsetRhythmFeedbackResult = {
  alignmentMode: AudioOnsetRhythmAlignmentMode;
  targetPattern: RhythmTargetPattern;
  targetPatternLabel: string;
  onsetCount: number;
  matchedCount: number;
  missedCount: number;
  extraCount: number;
  feedbackItems: AudioOnsetRhythmFeedbackItem[];
  diagnosticSummary: string;
  warnings: string[];
  latencyOffsetAppliedMs: number;
  alignmentOffsetMs: number;
  firstOnsetTimeMs: number | null;
  firstTargetTimeMs: number | null;
  alignmentDiagnostics: AudioOnsetRhythmAlignmentDiagnostics;
  nonScoringBoundary: string;
};

export const audioOnsetRhythmFeedbackBoundary =
  "Diagnostic practice feedback only; not a score, grade, pass/fail result, accuracy percentage, final result, or formal assessment.";

export const convertAudioOnsetsToRhythmTapEvents = (
  onsetResult: AudioOnsetDetectionResult | null | undefined,
  alignmentOffsetMs = 0,
): RhythmTapEvent[] =>
  (onsetResult?.candidates ?? []).map((candidate, index) => ({
    id: index + 1,
    timestampMs: candidate.onsetTimeMs - alignmentOffsetMs,
    phase: "practice",
  }));

const getItemNote = (category: AudioOnsetRhythmFeedbackItem["category"]) => {
  if (category === "close") return "Detected onset is close to the target event.";
  if (category === "early") return "Detected onset is before the target event.";
  if (category === "late") return "Detected onset is after the target event.";
  if (category === "missed") return "No detected onset matched this target event.";
  return "Detected onset did not match a target event.";
};

export const getAudioOnsetRhythmFeedback = ({
  onsetResult,
  config,
  pattern = "quarter-note-pulse",
  barCount = 2,
  alignmentMode = "recording-start",
  latencyOffsetMs = 0,
}: {
  onsetResult: AudioOnsetDetectionResult | null | undefined;
  config: MetronomeConfig;
  pattern?: RhythmTargetPattern;
  barCount?: number;
  alignmentMode?: AudioOnsetRhythmAlignmentMode;
  latencyOffsetMs?: number;
}): AudioOnsetRhythmFeedbackResult => {
  const targets = createRhythmTargetPattern({
    config,
    practiceStartTimeMs: 0,
    barCount,
    pattern,
  });
  const candidates = onsetResult?.candidates ?? [];
  const firstOnsetTimeMs = candidates[0]?.onsetTimeMs ?? null;
  const firstTargetTimeMs = targets[0]?.targetTimeMs ?? null;
  const alignmentOffsetMs =
    alignmentMode === "first-onset" &&
    firstOnsetTimeMs !== null &&
    firstTargetTimeMs !== null
      ? firstOnsetTimeMs - firstTargetTimeMs
      : 0;
  // Apply alignment first, then pass the session latency offset into tap feedback.
  // The tap helper subtracts latencyOffsetMs from already-aligned onset times.
  const taps = convertAudioOnsetsToRhythmTapEvents(onsetResult, alignmentOffsetMs);
  const onsetByTapId = new Map(
    candidates.map((candidate, index) => [
      index + 1,
      candidate,
    ]),
  );
  const lastTargetTimeMs = targets[targets.length - 1]?.targetTimeMs ?? 0;
  const nowMs = Math.max(
    onsetResult?.durationMs ?? 0,
    lastTargetTimeMs + 181,
  );
  const tapFeedback = getRhythmTapFeedback({
    targets,
    taps,
    phase: "practice",
    nowMs,
    latencyOffsetMs,
  });
  const feedbackItems = tapFeedback.feedback.map((item) => {
    const onset = item.tapId === null ? null : onsetByTapId.get(item.tapId) ?? null;
    const category = item.category as AudioOnsetRhythmFeedbackItem["category"];
    return {
      category,
      targetTimeMs: item.targetTimeMs,
      onsetTimeMs: onset?.onsetTimeMs ?? null,
      adjustedOnsetTimeMs: item.tapTimeMs,
      offsetMs: item.offsetMs,
      onsetStrength: onset?.strength ?? null,
      targetIndex: item.targetIndex,
      pattern,
      diagnosticNote: getItemNote(category),
    };
  });
  const missedCount = feedbackItems.filter((item) => item.category === "missed").length;
  const extraCount = feedbackItems.filter((item) => item.category === "extra").length;
  const matchedCount = feedbackItems.filter((item) =>
    item.category === "close" || item.category === "early" || item.category === "late",
  ).length;
  const alignmentDiagnostics: AudioOnsetRhythmAlignmentDiagnostics = {
    mode: alignmentMode,
    alignmentOffsetMs,
    firstOnsetTimeMs,
    firstTargetTimeMs,
    latencyOffsetAppliedMs: latencyOffsetMs,
    diagnosticNote:
      alignmentMode === "first-onset"
        ? "First-onset alignment maps the first detected onset to the first target and can hide late-start behavior."
        : "Recording-start alignment keeps detected onsets relative to the start of the local recording.",
  };

  const warnings = [
    ...(onsetResult?.warnings ?? []),
    alignmentMode === "first-onset"
      ? "First-onset alignment maps the first detected onset to the first target event; this can hide late-start recording offset."
      : "This assumes recording timing aligns with the target timeline.",
    "This is diagnostic practice feedback, not a score.",
    "No pass/fail, grade, or accuracy percentage.",
    "No upload / cloud / AI.",
    "Voice and sustained instruments may need future tuning.",
  ];

  if (!onsetResult || (onsetResult.candidates ?? []).length === 0) {
    warnings.unshift(
      alignmentMode === "first-onset"
        ? "No onset candidates available; first-onset alignment falls back to no alignment offset."
        : "No onset candidates available for rhythm feedback yet.",
    );
  }

  if (alignmentMode === "first-onset") {
    warnings.push(
      "First-onset alignment changes timing interpretation and is a research / diagnostic practice option only.",
    );
  }

  return {
    alignmentMode,
    targetPattern: pattern,
    targetPatternLabel: rhythmTargetPatternLabels[pattern],
    onsetCount: onsetResult?.onsetCount ?? 0,
    matchedCount,
    missedCount,
    extraCount,
    feedbackItems,
    diagnosticSummary:
      taps.length === 0
        ? "Waiting for detected audio onsets before onset-based rhythm feedback."
        : `Aligned ${taps.length} detected onset candidate${taps.length === 1 ? "" : "s"} to ${targets.length} ${rhythmTargetPatternLabels[pattern]} target event${targets.length === 1 ? "" : "s"} using ${alignmentMode} alignment (alignment offset ${Math.round(alignmentOffsetMs)}ms); diagnostic only, not rhythm scoring.`,
    warnings,
    latencyOffsetAppliedMs: latencyOffsetMs,
    alignmentOffsetMs,
    firstOnsetTimeMs,
    firstTargetTimeMs,
    alignmentDiagnostics,
    nonScoringBoundary: audioOnsetRhythmFeedbackBoundary,
  };
};

export const hasAudioOnsetRhythmFeedbackScoringFields = (value: object) =>
  [
    "score",
    "grade",
    "pass",
    "fail",
    "accuracyPercentage",
    "finalResult",
    "assessment",
  ].some((fieldName) => fieldName in value);
