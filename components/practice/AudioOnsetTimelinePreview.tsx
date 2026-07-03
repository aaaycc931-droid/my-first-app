"use client";

import type { AudioOnsetDetectionResult } from "../../lib/rhythm/audioOnsetDetection";
import {
  audioOnsetRhythmCompactMarkerLabels,
  audioOnsetRhythmMarkerLegendItems,
  type AudioOnsetRhythmFeedbackResult,
  type AudioOnsetRhythmMarkerDensitySummary,
} from "../../lib/rhythm/audioOnsetRhythmFeedback";

type AudioOnsetTimelinePreviewProps = {
  onsetResult: AudioOnsetDetectionResult;
  rhythmFeedback: AudioOnsetRhythmFeedbackResult;
  markerDensitySummary: AudioOnsetRhythmMarkerDensitySummary;
  timelineDurationMs: number;
  focusedCandidateIndex: number | null;
  onFocusCandidate: (candidateIndex: number | null) => void;
};

export function AudioOnsetTimelinePreview({
  onsetResult,
  rhythmFeedback,
  markerDensitySummary,
  timelineDurationMs,
  focusedCandidateIndex,
  onFocusCandidate,
}: AudioOnsetTimelinePreviewProps) {
  const visualMax = Math.max(
    onsetResult.maxStrength,
    onsetResult.threshold,
    0.0001,
  );
  const thresholdPositionPercent = Math.min(
    95,
    Math.max(8, (onsetResult.threshold / visualMax) * 100),
  );

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-orange-200 lg:col-span-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-bold text-orange-950">
            Onset strength timeline preview
          </p>
          <p className="mt-1 text-orange-800">
            Diagnostic preview only, not a score. Bars show local onset strength,
            the dashed reference shows threshold, markers show detected onset
            candidates, target markers show the current rhythm pattern, and
            feedback labels explain close / early / late / missed / extra
            relationships.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-orange-800">
          <span className="rounded-full bg-orange-50 px-3 py-1">
            preset {onsetResult.sensitivityPreset}
          </span>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-800">
            pattern {rhythmFeedback.targetPatternLabel}
          </span>
          <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-800">
            alignment {rhythmFeedback.alignmentMode}
          </span>
        </div>
      </div>
      {onsetResult.timeline.length > 0 ? (
        <div className="mt-4">
          <div className="mb-3 grid gap-2 rounded-2xl bg-orange-50 p-3 text-xs text-orange-900 sm:grid-cols-3 lg:grid-cols-6">
            <span>Candidates: {markerDensitySummary.candidateCount}</span>
            <span>Targets: {markerDensitySummary.targetCount}</span>
            <span>Feedback markers: {markerDensitySummary.feedbackMarkerCount}</span>
            <span>Missed: {markerDensitySummary.missedCount}</span>
            <span>Extra: {markerDensitySummary.extraCount}</span>
            <span>Total markers: {markerDensitySummary.totalMarkerCount}</span>
          </div>
          <div
            className="relative flex h-36 items-end gap-px overflow-hidden rounded-2xl border border-orange-200 bg-orange-50 px-2 pb-4 pt-3"
            aria-label="Onset strength timeline diagnostic preview; diagnostic markers only; no pass fail grade or percentage result"
          >
            {onsetResult.timeline.map((point) => {
              const barHeightPercent = Math.max(
                2,
                Math.min(100, (point.onsetStrength / visualMax) * 100),
              );
              return (
                <div
                  key={`${point.frameIndex}-${point.timeMs}`}
                  className={`relative flex-1 rounded-t-sm ${
                    point.isCandidate && point.candidateIndex === focusedCandidateIndex
                      ? "bg-purple-700 ring-2 ring-purple-300"
                      : point.isCandidate
                        ? "bg-orange-700"
                        : "bg-orange-300"
                  }`}
                  style={{ height: `${barHeightPercent}%` }}
                  title={`time ${point.timeMs.toFixed(0)}ms · strength ${point.onsetStrength.toFixed(4)} · threshold ${point.threshold.toFixed(4)}${point.isCandidate ? " · detected onset candidate" : ""}`}
                >
                  {point.isCandidate ? (
                    <button
                      type="button"
                      aria-label={`Focus onset candidate ${point.candidateIndex ?? 0}`}
                      onClick={() => onFocusCandidate(point.candidateIndex ?? null)}
                      className={`absolute -top-4 left-1/2 h-4 w-1 -translate-x-1/2 rounded-full ${
                        point.candidateIndex === focusedCandidateIndex
                          ? "bg-purple-800"
                          : "bg-orange-950"
                      }`}
                    />
                  ) : null}
                </div>
              );
            })}
            <div
              className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-red-500"
              style={{ bottom: `${thresholdPositionPercent}%` }}
            />
            {rhythmFeedback.targetMarkers.map((marker) => (
              <span
                key={marker.markerId}
                className="pointer-events-none absolute top-2 h-[calc(100%-1rem)] w-0.5 bg-sky-600"
                style={{ left: `${Math.min(98, Math.max(2, (marker.targetTimeMs / timelineDurationMs) * 100))}%` }}
                title={marker.diagnosticLabel}
              >
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-sky-700 px-1 text-[10px] font-bold text-white">
                  {audioOnsetRhythmCompactMarkerLabels.target}{marker.targetIndex + 1}
                </span>
              </span>
            ))}
            {rhythmFeedback.timelineMarkers.map((marker) => (
              <span
                key={marker.markerId}
                className={`pointer-events-none absolute bottom-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm ${
                  marker.category === "missed"
                    ? "bg-red-100 text-red-800"
                    : marker.category === "extra"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-white text-orange-900"
                }`}
                style={{ left: `${Math.min(94, Math.max(2, (marker.displayTimeMs / timelineDurationMs) * 100))}%` }}
                title={marker.diagnosticLabel}
              >
                {audioOnsetRhythmCompactMarkerLabels[marker.category]}{marker.onsetCandidateIndex !== null ? marker.onsetCandidateIndex + 1 : ""}
              </span>
            ))}
            {rhythmFeedback.alignmentDiagnostics.originMarkerId ? (
              <span
                className="pointer-events-none absolute top-8 rounded-full bg-purple-700 px-2 py-1 text-[10px] font-bold text-white"
                style={{ left: `${Math.min(94, Math.max(2, ((rhythmFeedback.firstOnsetTimeMs ?? 0) / timelineDurationMs) * 100))}%` }}
              >
                {audioOnsetRhythmCompactMarkerLabels.firstOnsetOrigin} origin
              </span>
            ) : null}
            <span
              className="pointer-events-none absolute right-3 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-red-700 shadow-sm"
              style={{ bottom: `${thresholdPositionPercent}%` }}
            >
              threshold {onsetResult.threshold.toFixed(4)}
            </span>
          </div>
          <p className="mt-2 text-orange-800">
            Click a candidate marker or list item to highlight its session-only
            marker ID. Blue T markers are current rhythm targets for {rhythmFeedback.targetPatternLabel};
            compact feedback chips use C / E / L / M / X labels explained
            below. These are diagnostic markers only, not scoring labels,
            grades, pass/fail, or accuracy percentages.
          </p>
          <p className={`mt-2 rounded-xl p-3 text-xs font-semibold ${markerDensitySummary.isDense ? "bg-purple-50 text-purple-800" : "bg-orange-50 text-orange-800"}`}>
            {markerDensitySummary.compactModeNote}
          </p>
          <AudioOnsetMarkerLegend />
          <p className="mt-2 text-orange-800">
            {onsetResult.isTimelineDownsampled
              ? `Timeline preview is downsampled to ${onsetResult.timelinePointCount}/${onsetResult.timelineSourcePointCount} frame points for safe rendering.`
              : `Timeline preview shows ${onsetResult.timelinePointCount} frame points.`}
            {" "}Duration {onsetResult.durationMs.toFixed(0)}ms.
          </p>
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-orange-50 p-3 text-orange-800">
          No onset timeline yet. Detect onsets from latest local recording to
          preview onset strength. This remains browser-local diagnostic preview.
        </p>
      )}
    </div>
  );
}

function AudioOnsetMarkerLegend() {
  return (
    <div className="mt-3 rounded-2xl border border-orange-200 bg-white p-3">
      <p className="font-bold text-orange-950">Compact marker legend</p>
      <p className="mt-1 text-xs text-orange-800">
        These are diagnostic markers for preview only. They do not mean
        pass/fail, grade, or a formal result. Audio stays browser-local; no
        upload / cloud / AI.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {audioOnsetRhythmMarkerLegendItems.map((item) => (
          <div key={item.key} className="rounded-xl bg-orange-50 p-2 text-xs text-orange-900">
            <span className="mr-2 inline-flex min-w-6 justify-center rounded-full bg-white px-2 py-0.5 font-bold text-orange-950 ring-1 ring-orange-200">
              {item.shortLabel}
            </span>
            <span className="font-bold">{item.label}</span>
            <p className="mt-1 text-orange-800">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
