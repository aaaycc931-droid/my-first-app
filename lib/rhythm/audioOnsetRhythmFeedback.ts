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
  onsetCandidateIndex: number | null;
  markerId: string;
};

export type AudioOnsetRhythmTargetMarker = {
  markerId: string;
  targetIndex: number;
  targetTimeMs: number;
  pattern: RhythmTargetPattern;
  alignmentMode: AudioOnsetRhythmAlignmentMode;
  diagnosticLabel: string;
};

export type AudioOnsetRhythmTimelineMarker = {
  markerId: string;
  category: AudioOnsetRhythmFeedbackItem["category"];
  targetIndex: number | null;
  onsetCandidateIndex: number | null;
  targetTimeMs: number | null;
  onsetTimeMs: number | null;
  adjustedOnsetTimeMs: number | null;
  displayTimeMs: number;
  diagnosticLabel: string;
};

export type AudioOnsetRhythmAlignmentDiagnostics = {
  mode: AudioOnsetRhythmAlignmentMode;
  alignmentOffsetMs: number;
  firstOnsetTimeMs: number | null;
  firstTargetTimeMs: number | null;
  firstOnsetCandidateIndex: number | null;
  originMarkerId: string | null;
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
  targetMarkers: AudioOnsetRhythmTargetMarker[];
  timelineMarkers: AudioOnsetRhythmTimelineMarker[];
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

export const audioOnsetRhythmMarkerLegendItems = [
  { key: "candidate", label: "Candidate marker", shortLabel: "C", description: "Detected onset candidate from browser-local audio strength." },
  { key: "target", label: "Rhythm target marker", shortLabel: "T", description: "Expected rhythm event from the selected target pattern." },
  { key: "close", label: "Close", shortLabel: "C", description: "Detected onset is close to a target event." },
  { key: "early", label: "Early", shortLabel: "E", description: "Detected onset is before a target event." },
  { key: "late", label: "Late", shortLabel: "L", description: "Detected onset is after a target event." },
  { key: "missed", label: "Missed", shortLabel: "M", description: "Target event has no matched detected onset." },
  { key: "extra", label: "Extra", shortLabel: "X", description: "Detected onset did not match a target event." },
  { key: "first-onset-origin", label: "First-onset origin", shortLabel: "O", description: "First detected onset used as the origin in first-onset alignment mode." },
  { key: "threshold", label: "Threshold reference", shortLabel: "TH", description: "Dashed reference line for the selected sensitivity preset." },
] as const;

export const audioOnsetRhythmCompactMarkerLabels = {
  close: "C",
  early: "E",
  late: "L",
  missed: "M",
  extra: "X",
  target: "T",
  candidate: "C",
  firstOnsetOrigin: "O",
  threshold: "TH",
} as const;

export type AudioOnsetRhythmMarkerDensitySummary = {
  candidateCount: number;
  targetCount: number;
  feedbackMarkerCount: number;
  missedCount: number;
  extraCount: number;
  totalMarkerCount: number;
  isDense: boolean;
  compactModeNote: string;
};

export const getAudioOnsetRhythmMarkerDensitySummary = ({
  candidateCount,
  targetCount,
  feedbackMarkerCount,
  missedCount,
  extraCount,
  densityThreshold = 18,
}: {
  candidateCount: number;
  targetCount: number;
  feedbackMarkerCount: number;
  missedCount: number;
  extraCount: number;
  densityThreshold?: number;
}): AudioOnsetRhythmMarkerDensitySummary => {
  const totalMarkerCount = candidateCount + targetCount + feedbackMarkerCount;
  const isDense = totalMarkerCount >= densityThreshold;

  return {
    candidateCount,
    targetCount,
    feedbackMarkerCount,
    missedCount,
    extraCount,
    totalMarkerCount,
    isDense,
    compactModeNote: isDense
      ? "Dense diagnostic marker view uses compact labels and the legend for readability."
      : "Diagnostic marker density is within the regular compact preview range.",
  };
};

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
  const feedbackItems = tapFeedback.feedback.map((item, feedbackIndex) => {
    const onsetCandidateIndex = item.tapId === null ? null : item.tapId - 1;
    const onset = onsetCandidateIndex === null ? null : onsetByTapId.get(item.tapId!) ?? null;
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
      onsetCandidateIndex,
      markerId: `feedback-${feedbackIndex}-${category}-${item.targetIndex ?? "extra"}-${onsetCandidateIndex ?? "missed"}`,
    };
  });

  const targetMarkers: AudioOnsetRhythmTargetMarker[] = targets.map((target) => ({
    markerId: `target-${target.targetIndex}`,
    targetIndex: target.targetIndex,
    targetTimeMs: target.targetTimeMs,
    pattern,
    alignmentMode,
    diagnosticLabel: `${rhythmTargetPatternLabels[pattern]} target ${target.targetIndex + 1}; diagnostic reference only.`,
  }));
  const timelineMarkers: AudioOnsetRhythmTimelineMarker[] = feedbackItems.map((item) => ({
    markerId: item.markerId,
    category: item.category,
    targetIndex: item.targetIndex,
    onsetCandidateIndex: item.onsetCandidateIndex,
    targetTimeMs: item.targetTimeMs,
    onsetTimeMs: item.onsetTimeMs,
    adjustedOnsetTimeMs: item.adjustedOnsetTimeMs,
    displayTimeMs: item.adjustedOnsetTimeMs ?? item.targetTimeMs ?? item.onsetTimeMs ?? 0,
    diagnosticLabel: item.diagnosticNote,
  }));
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
    firstOnsetCandidateIndex: firstOnsetTimeMs === null ? null : 0,
    originMarkerId: alignmentMode === "first-onset" && firstOnsetTimeMs !== null ? "candidate-0" : null,
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
    targetMarkers,
    timelineMarkers,
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
