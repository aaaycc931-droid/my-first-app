"use client";

import type {
  AudioOnsetRhythmAlignmentMode,
  AudioOnsetRhythmFeedbackResult,
} from "../../lib/rhythm/audioOnsetRhythmFeedback";

type AudioOnsetRhythmFeedbackPanelProps = {
  rhythmFeedback: AudioOnsetRhythmFeedbackResult;
  alignmentMode: AudioOnsetRhythmAlignmentMode;
  onAlignmentModeChange: (alignmentMode: AudioOnsetRhythmAlignmentMode) => void;
  onFocusCandidate: (candidateIndex: number) => void;
};

export function AudioOnsetRhythmFeedbackPanel({
  rhythmFeedback,
  alignmentMode,
  onAlignmentModeChange,
  onFocusCandidate,
}: AudioOnsetRhythmFeedbackPanelProps) {
  return (
    <div className="mt-5 rounded-2xl border border-orange-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">
            Use detected onsets for rhythm feedback
          </p>
          <h3 className="mt-1 text-xl font-bold text-orange-950">
            Audio-derived non-scoring rhythm feedback bridge
          </h3>
          <p className="mt-2 text-sm leading-6 text-orange-900">
            Current target pattern: {rhythmFeedback.targetPatternLabel}. Alignment mode: {rhythmFeedback.alignmentMode}.
          </p>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <label className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-orange-950">
              <span className="flex items-center gap-2 font-semibold">
                <input
                  type="radio"
                  name="audio-onset-alignment-mode"
                  value="recording-start"
                  checked={alignmentMode === "recording-start"}
                  onChange={() => onAlignmentModeChange("recording-start")}
                />
                Recording start
              </span>
              <span className="mt-1 block text-orange-800">
                Assumes recording starts on the target timeline.
              </span>
            </label>
            <label className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-orange-950">
              <span className="flex items-center gap-2 font-semibold">
                <input
                  type="radio"
                  name="audio-onset-alignment-mode"
                  value="first-onset"
                  checked={alignmentMode === "first-onset"}
                  onChange={() => onAlignmentModeChange("first-onset")}
                />
                First detected onset
              </span>
              <span className="mt-1 block text-orange-800">
                Aligns the first detected onset to the first target event. This can hide late-start recording offset and changes timing interpretation.
              </span>
            </label>
          </div>
        </div>
        <AudioOnsetFeedbackSummary rhythmFeedback={rhythmFeedback} />
      </div>

      <AudioOnsetAlignmentDiagnostics rhythmFeedback={rhythmFeedback} />

      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
        {rhythmFeedback.nonScoringBoundary}
      </p>
      <p className="mt-3 text-sm leading-6 text-orange-900">
        {rhythmFeedback.diagnosticSummary}
      </p>

      <AudioOnsetFeedbackList
        rhythmFeedback={rhythmFeedback}
        onFocusCandidate={onFocusCandidate}
      />

      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-orange-800">
        {rhythmFeedback.warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
        <li>Session latency offset is optional and temporary; it is not a persistent calibration profile.</li>
      </ul>
    </div>
  );
}

function AudioOnsetFeedbackSummary({
  rhythmFeedback,
}: {
  rhythmFeedback: AudioOnsetRhythmFeedbackResult;
}) {
  return (
    <div className="rounded-2xl bg-orange-50 p-3 text-sm text-orange-950 ring-1 ring-orange-100">
      <p className="font-semibold">Summary</p>
      <p className="mt-1">
        onsets {rhythmFeedback.onsetCount} · matched {rhythmFeedback.matchedCount} · missed {rhythmFeedback.missedCount} · extra {rhythmFeedback.extraCount}
      </p>
      <p className="mt-1">
        alignment offset {Math.round(rhythmFeedback.alignmentOffsetMs)}ms · latency estimate applied {Math.round(rhythmFeedback.latencyOffsetAppliedMs)}ms
      </p>
    </div>
  );
}

function AudioOnsetAlignmentDiagnostics({
  rhythmFeedback,
}: {
  rhythmFeedback: AudioOnsetRhythmFeedbackResult;
}) {
  const diagnostics = rhythmFeedback.alignmentDiagnostics;

  return (
    <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">
      <p className="font-bold">Alignment diagnostics</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <span>mode {diagnostics.mode}</span>
        <span>offset {Math.round(diagnostics.alignmentOffsetMs)}ms</span>
        <span>first onset {diagnostics.firstOnsetTimeMs === null ? "—" : `${Math.round(diagnostics.firstOnsetTimeMs)}ms`}</span>
        <span>first target {diagnostics.firstTargetTimeMs === null ? "—" : `${Math.round(diagnostics.firstTargetTimeMs)}ms`}</span>
        <span>latency offset applied {Math.round(diagnostics.latencyOffsetAppliedMs)}ms</span>
        <span>origin marker {diagnostics.originMarkerId ?? "—"}</span>
      </div>
      <p className="mt-2 text-orange-800">{diagnostics.diagnosticNote}</p>
    </div>
  );
}

function AudioOnsetFeedbackList({
  rhythmFeedback,
  onFocusCandidate,
}: {
  rhythmFeedback: AudioOnsetRhythmFeedbackResult;
  onFocusCandidate: (candidateIndex: number) => void;
}) {
  if (rhythmFeedback.feedbackItems.length === 0) {
    return (
      <p className="mt-3 text-sm text-orange-800">
        Waiting for detected onset candidates from the latest local recording.
      </p>
    );
  }

  return (
    <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
      {rhythmFeedback.feedbackItems.slice(0, 12).map((item, index) => (
        <li
          key={`${item.category}-${item.targetIndex ?? "extra"}-${item.onsetTimeMs ?? index}`}
          className="rounded-xl bg-orange-50 p-3 text-orange-900"
        >
          <span className="font-bold">{item.category}</span>
          {item.targetTimeMs !== null ? (
            <span className="ml-2">target {Math.round(item.targetTimeMs)}ms</span>
          ) : null}
          {item.onsetCandidateIndex !== null ? (
            <button type="button" onClick={() => onFocusCandidate(item.onsetCandidateIndex!)} className="ml-2 font-semibold underline decoration-orange-300">candidate #{item.onsetCandidateIndex + 1}</button>
          ) : null}
          {item.onsetTimeMs !== null ? (
            <span className="ml-2">raw onset {Math.round(item.onsetTimeMs)}ms</span>
          ) : null}
          {item.adjustedOnsetTimeMs !== null ? (
            <span className="ml-2">aligned onset {Math.round(item.adjustedOnsetTimeMs)}ms</span>
          ) : null}
          {item.offsetMs !== null ? (
            <span className="ml-2">offset {Math.round(item.offsetMs)}ms</span>
          ) : null}
          <span className="mt-1 block text-orange-800">{item.diagnosticNote}</span>
        </li>
      ))}
    </ul>
  );
}
