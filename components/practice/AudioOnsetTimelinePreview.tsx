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
            起音强度时间线预览
          </p>
          <p className="mt-1 text-orange-800">
            仅诊断预览，不是分数。柱状条显示本地起音强度，虚线参考显示阈值，标记显示检测到的起音候选，目标标记显示当前节奏模式，反馈标签说明接近 / 偏早 / 偏晚 / 漏掉 / 额外的关系。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-orange-800">
          <span className="rounded-full bg-orange-50 px-3 py-1">
            预设 {onsetResult.sensitivityPreset}
          </span>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-800">
            模式 {rhythmFeedback.targetPatternLabel}
          </span>
          <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-800">
            对齐 {rhythmFeedback.alignmentMode}
          </span>
        </div>
      </div>
      {onsetResult.timeline.length > 0 ? (
        <div className="mt-4">
          <div className="mb-3 grid gap-2 rounded-2xl bg-orange-50 p-3 text-xs text-orange-900 sm:grid-cols-3 lg:grid-cols-6">
            <span>候选： {markerDensitySummary.candidateCount}</span>
            <span>目标： {markerDensitySummary.targetCount}</span>
            <span>反馈标记： {markerDensitySummary.feedbackMarkerCount}</span>
            <span>漏掉： {markerDensitySummary.missedCount}</span>
            <span>额外： {markerDensitySummary.extraCount}</span>
            <span>标记总数： {markerDensitySummary.totalMarkerCount}</span>
          </div>
          <div
            className="relative flex h-36 items-end gap-px overflow-hidden rounded-2xl border border-orange-200 bg-orange-50 px-2 pb-4 pt-3"
            aria-label="起音强度时间线诊断预览；仅诊断标记；没有通过失败等级或百分比结果"
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
                  title={`时间 ${point.timeMs.toFixed(0)}ms · 强度 ${point.onsetStrength.toFixed(4)} · 阈值 ${point.threshold.toFixed(4)}${point.isCandidate ? " · 检测到的起音候选" : ""}`}
                >
                  {point.isCandidate ? (
                    <button
                      type="button"
                      aria-label={`聚焦起音候选 ${point.candidateIndex ?? 0}`}
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
                {audioOnsetRhythmCompactMarkerLabels.firstOnsetOrigin} 原点
              </span>
            ) : null}
            <span
              className="pointer-events-none absolute right-3 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-red-700 shadow-sm"
              style={{ bottom: `${thresholdPositionPercent}%` }}
            >
              阈值 {onsetResult.threshold.toFixed(4)}
            </span>
          </div>
          <p className="mt-2 text-orange-800">
            点击候选标记或列表项可高亮其仅当前会话的标记 ID。蓝色 T 标记是当前节奏目标： {rhythmFeedback.targetPatternLabel};
            紧凑反馈标签使用下方说明的 C / E / L / M / X 标签。这些只是诊断标记，不是评分标签、等级、通过/失败或准确率百分比。
          </p>
          <p className={`mt-2 rounded-xl p-3 text-xs font-semibold ${markerDensitySummary.isDense ? "bg-purple-50 text-purple-800" : "bg-orange-50 text-orange-800"}`}>
            {markerDensitySummary.compactModeNote}
          </p>
          <AudioOnsetMarkerLegend />
          <p className="mt-2 text-orange-800">
            {onsetResult.isTimelineDownsampled
              ? `时间线预览已降采样为 ${onsetResult.timelinePointCount}/${onsetResult.timelineSourcePointCount} 个帧点以安全渲染。`
              : `时间线预览显示 ${onsetResult.timelinePointCount} 个帧点。`}
            {" "}时长 {onsetResult.durationMs.toFixed(0)}ms.
          </p>
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-orange-50 p-3 text-orange-800">
          还没有起音时间线。请从最新本地录音检测起音，以预览起音强度。这仍是浏览器本地诊断预览。
        </p>
      )}
    </div>
  );
}

function AudioOnsetMarkerLegend() {
  return (
    <div className="mt-3 rounded-2xl border border-orange-200 bg-white p-3">
      <p className="font-bold text-orange-950">紧凑标记图例</p>
      <p className="mt-1 text-xs text-orange-800">
        这些只是用于预览的诊断标记。它们不表示通过/失败、等级或正式结果。音频保留在浏览器本地；不上传 / 不使用云端 / 不调用 AI。
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
