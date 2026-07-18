"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  OfflineNoteAlignmentResult,
  OfflineNoteSegment,
  OfflineTargetEvidence,
} from "../../lib/practice/offlineNoteAlignment";

const centsCopy = (value: number | null) => value === null
  ? "无法判断"
  : `${value >= 0 ? "+" : ""}${value.toFixed(0)} cents`;

const rangeCopy = (low: number | null, high: number | null) => low === null || high === null
  ? "范围不足"
  : `${low >= 0 ? "+" : ""}${low.toFixed(0)} ～ ${high >= 0 ? "+" : ""}${high.toFixed(0)} cents`;

const evidenceStateCopy: Record<OfflineTargetEvidence["state"], string> = {
  close: "接近目标",
  high: "整体偏高",
  low: "整体偏低",
  missing: "未找到可靠演唱",
  unreliable: "局部证据不足",
};

export function OfflineNoteAlignmentEvidencePanel({
  recording,
  result,
  onBeforePlay,
}: {
  recording: Blob;
  result: OfflineNoteAlignmentResult;
  onBeforePlay: () => void;
}) {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState("");
  const playbackRef = useRef<HTMLAudioElement | null>(null);
  const playbackUrlRef = useRef<string | null>(null);
  const playbackTimerRef = useRef<number | null>(null);
  const segmentById = useMemo(
    () => new Map(result.segments.map((segment) => [segment.segmentId, segment])),
    [result.segments],
  );

  const stopPlayback = useCallback(() => {
    if (playbackTimerRef.current !== null) window.clearTimeout(playbackTimerRef.current);
    playbackTimerRef.current = null;
    const audio = playbackRef.current;
    playbackRef.current = null;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
    if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
    playbackUrlRef.current = null;
    setPlayingSegmentId(null);
  }, []);

  useEffect(() => () => {
    if (playbackTimerRef.current !== null) window.clearTimeout(playbackTimerRef.current);
    playbackRef.current?.pause();
    if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
  }, []);

  const playSegment = async (segment: OfflineNoteSegment) => {
    if (playingSegmentId === segment.segmentId) {
      stopPlayback();
      return;
    }
    stopPlayback();
    onBeforePlay();
    setSelectedSegmentId(segment.segmentId);
    setPlaybackError("");
    try {
      const url = URL.createObjectURL(recording);
      const audio = new Audio(url);
      playbackUrlRef.current = url;
      playbackRef.current = audio;
      audio.currentTime = Math.max(0, segment.startMs / 1_000);
      audio.onended = stopPlayback;
      audio.onerror = () => {
        stopPlayback();
        setPlaybackError("无法回放这个本机片段；分析证据仍可查看。请重新录制后重试。");
      };
      await audio.play();
      setPlayingSegmentId(segment.segmentId);
      playbackTimerRef.current = window.setTimeout(stopPlayback, Math.max(100, segment.durationMs));
    } catch {
      stopPlayback();
      setPlaybackError("系统阻止了片段回放；分析证据仍可查看。请再次点击或重新录制。");
    }
  };

  return (
    <section className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-4" aria-labelledby="offline-note-evidence-title">
      <h4 id="offline-note-evidence-title" className="font-black text-cyan-950">逐音与逐句证据（非评分）</h4>
      <p className="mt-1 text-sm leading-6 text-cyan-900">{result.alignmentReason}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">检测片段</p><p className="font-black text-slate-950">{result.summary.usableSegmentCount} 可用 · {result.summary.rejectedSegmentCount} 拒答</p></div>
        <div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">目标证据</p><p className="font-black text-slate-950">{result.summary.alignedTargetCount}/{result.summary.targetCount || "—"}</p></div>
        <div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">缺唱/不足</p><p className="font-black text-slate-950">{result.summary.missingTargetCount} / {result.summary.unreliableTargetCount}</p></div>
        <div className="rounded-lg bg-white p-3"><p className="text-xs text-slate-500">额外片段</p><p className="font-black text-slate-950">{result.summary.extraSegmentCount}</p></div>
      </div>

      {result.targetEvidence.length === 0 ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">本次录音没有绑定已确认练声目标。已保留 {result.summary.usableSegmentCount} 个可用片段，但不会猜测目标音或生成逐音结论。</div>
      ) : (
        <>
          <div className="mt-4 grid gap-3" aria-label="逐音证据列表">
            {result.targetEvidence.map((evidence) => {
              const segment = evidence.segmentId ? segmentById.get(evidence.segmentId) ?? null : null;
              const selected = segment?.segmentId === selectedSegmentId;
              return (
                <article key={evidence.target.targetId} className={`rounded-xl border bg-white p-3 ${selected ? "border-cyan-600 ring-2 ring-cyan-200" : "border-cyan-100"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="font-black text-slate-950">第 {evidence.target.index + 1} 音 · 目标 {evidence.target.label}</p><p className="mt-1 text-sm font-bold text-cyan-900">{evidenceStateCopy[evidence.state]}</p></div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{evidence.confidence ? `${evidence.confidence} 置信` : "无法定置信"}</span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div><dt className="text-xs text-slate-500">检测音</dt><dd className="font-bold text-slate-900">{evidence.detectedNote ?? "无法判断"}</dd></div>
                    <div><dt className="text-xs text-slate-500">中位偏差</dt><dd className="font-bold text-slate-900">{centsCopy(evidence.medianCents)}</dd></div>
                    <div><dt className="text-xs text-slate-500">稳定范围</dt><dd className="font-bold text-slate-900">{rangeCopy(evidence.lowCents, evidence.highCents)}</dd></div>
                    <div><dt className="text-xs text-slate-500">音头偏移</dt><dd className="font-bold text-slate-900">{evidence.timingOffsetMs === null ? "无法判断" : `${evidence.timingOffsetMs >= 0 ? "+" : ""}${evidence.timingOffsetMs.toFixed(0)} ms`}</dd></div>
                  </dl>
                  {evidence.phases.length > 0 ? <div className="mt-3 grid gap-2 sm:grid-cols-3">{evidence.phases.map((phase) => <div key={phase.phase} className="rounded-lg bg-slate-50 p-2 text-sm"><p className="font-bold text-slate-900">{phase.label}</p><p className="text-slate-700">{centsCopy(phase.medianCents)}</p><p className="text-xs text-slate-500">{rangeCopy(phase.lowCents, phase.highCents)}</p></div>)}</div> : null}
                  <p className="mt-3 text-sm leading-6 text-slate-700">{evidence.reason}</p>
                  {segment ? <button type="button" onClick={() => void playSegment(segment)} className="mt-3 min-h-10 rounded-lg border border-cyan-300 bg-white px-3 text-sm font-bold text-cyan-900" aria-pressed={playingSegmentId === segment.segmentId}>{playingSegmentId === segment.segmentId ? "停止片段回放" : "回放本次片段并定位复练"}</button> : null}
                </article>
              );
            })}
          </div>

          <div className="mt-4 grid gap-2" aria-label="逐句证据列表">
            {result.phraseEvidence.map((phrase) => (
              <article key={phrase.phraseIndex} className="rounded-xl border border-violet-200 bg-white p-3 text-sm">
                <p className="font-black text-violet-950">第 {phrase.phraseIndex + 1} 句 · {phrase.state === "available" ? "证据完整" : phrase.state === "partial" ? "部分可判断" : "无法判断"}</p>
                <p className="mt-1 text-slate-700">可靠 {phrase.reliableCount}/{phrase.targetCount} 音 · 缺唱 {phrase.missingCount} · 局部不足 {phrase.unreliableCount}</p>
                <p className="mt-1 text-slate-700">中位音高 {centsCopy(phrase.medianCents)} · 中位音头偏移 {phrase.medianTimingOffsetMs === null ? "无法判断" : `${phrase.medianTimingOffsetMs >= 0 ? "+" : ""}${phrase.medianTimingOffsetMs.toFixed(0)} ms`}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{phrase.reason}</p>
              </article>
            ))}
          </div>
        </>
      )}
      {selectedSegmentId ? <p className="mt-3 rounded-lg bg-white p-3 text-sm font-bold text-cyan-950" role="status">已定位片段。听完后可重新开始实时反馈并录制；旧分析不会被当作新尝试。</p> : null}
      {playbackError ? <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{playbackError}</p> : null}
      <p className="mt-3 text-xs leading-5 text-cyan-800">证据版本 {result.version}，来源轨迹 {result.sourceAnalysisVersion}。没有用单个总百分比掩盖缺唱、拒答、错音或节拍偏移。</p>
    </section>
  );
}
