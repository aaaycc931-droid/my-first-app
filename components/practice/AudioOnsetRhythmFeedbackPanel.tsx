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
            使用检测到的起音生成节奏反馈
          </p>
          <h3 className="mt-1 text-xl font-bold text-orange-950">
            音频来源的不评分节奏反馈桥
          </h3>
          <p className="mt-2 text-sm leading-6 text-orange-900">
            当前目标模式： {rhythmFeedback.targetPatternLabel}. 对齐模式： {rhythmFeedback.alignmentMode}.
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
                录音开始
              </span>
              <span className="mt-1 block text-orange-800">
                假设录音从目标时间线开始。
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
                首个检测到的起音
              </span>
              <span className="mt-1 block text-orange-800">
                将首个检测到的起音对齐到第一个目标事件。这可能隐藏录音起步偏晚的问题，并改变时序解读。
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
        <li>当前会话延迟偏移是可选且临时的；它不是持久校准档案。</li>
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
      <p className="font-semibold">摘要</p>
      <p className="mt-1">
        起音 {rhythmFeedback.onsetCount} · 已匹配 {rhythmFeedback.matchedCount} · 漏掉 {rhythmFeedback.missedCount} · 额外 {rhythmFeedback.extraCount}
      </p>
      <p className="mt-1">
        对齐偏移 {Math.round(rhythmFeedback.alignmentOffsetMs)}ms · 已应用延迟估计 {Math.round(rhythmFeedback.latencyOffsetAppliedMs)}ms
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
      <p className="font-bold">对齐诊断</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <span>模式 {diagnostics.mode}</span>
        <span>偏移 {Math.round(diagnostics.alignmentOffsetMs)}ms</span>
        <span>首个起音 {diagnostics.firstOnsetTimeMs === null ? "—" : `${Math.round(diagnostics.firstOnsetTimeMs)}ms`}</span>
        <span>首个目标 {diagnostics.firstTargetTimeMs === null ? "—" : `${Math.round(diagnostics.firstTargetTimeMs)}ms`}</span>
        <span>已应用延迟偏移 {Math.round(diagnostics.latencyOffsetAppliedMs)}ms</span>
        <span>原点标记 {diagnostics.originMarkerId ?? "—"}</span>
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
        正在等待最新本地录音中的起音候选。
      </p>
    );
  }

  return (
    <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
      {rhythmFeedback.feedbackItems.slice(0, 12).map((item, index) => (
        <li
          key={`${item.category}-${item.targetIndex ?? "额外"}-${item.onsetTimeMs ?? index}`}
          className="rounded-xl bg-orange-50 p-3 text-orange-900"
        >
          <span className="font-bold">{item.category}</span>
          {item.targetTimeMs !== null ? (
            <span className="ml-2">目标 {Math.round(item.targetTimeMs)}ms</span>
          ) : null}
          {item.onsetCandidateIndex !== null ? (
            <button type="button" onClick={() => onFocusCandidate(item.onsetCandidateIndex!)} className="ml-2 font-semibold underline decoration-orange-300">候选 #{item.onsetCandidateIndex + 1}</button>
          ) : null}
          {item.onsetTimeMs !== null ? (
            <span className="ml-2">原始起音 {Math.round(item.onsetTimeMs)}ms</span>
          ) : null}
          {item.adjustedOnsetTimeMs !== null ? (
            <span className="ml-2">已对齐起音 {Math.round(item.adjustedOnsetTimeMs)}ms</span>
          ) : null}
          {item.offsetMs !== null ? (
            <span className="ml-2">偏移 {Math.round(item.offsetMs)}ms</span>
          ) : null}
          <span className="mt-1 block text-orange-800">{item.diagnosticNote}</span>
        </li>
      ))}
    </ul>
  );
}
