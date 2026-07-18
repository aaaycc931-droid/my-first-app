"use client";

import { useMemo, useState } from "react";

import type { OfflinePitchFrame } from "../../lib/practice/offlinePitchAnalysis";
import { useOfflinePitchAnalysis } from "./useOfflinePitchAnalysis";

const trajectoryPoints = (frames: readonly OfflinePitchFrame[]) => {
  const voiced = frames.filter((frame) => frame.state === "voiced" && frame.midi !== null);
  if (voiced.length < 2) return "";
  const minMidi = Math.min(...voiced.map((frame) => frame.midi as number));
  const maxMidi = Math.max(...voiced.map((frame) => frame.midi as number));
  const lastIndex = Math.max(1, frames.length - 1);
  return voiced.map((frame) => {
    const x = (frame.index / lastIndex) * 100;
    const y = maxMidi === minMidi ? 50 : 88 - (((frame.midi as number) - minMidi) / (maxMidi - minMidi)) * 76;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
};

export function OfflinePitchAnalysisPanel({
  recording,
  onBeforeAnalyze,
}: {
  recording: Blob | null;
  onBeforeAnalyze: () => void;
}) {
  const analysis = useOfflinePitchAnalysis(recording);
  const [confirmingRecording, setConfirmingRecording] = useState<Blob | null>(null);
  const confirming = recording !== null && confirmingRecording === recording;
  const points = useMemo(() => analysis.state.result ? trajectoryPoints(analysis.state.result.frames) : "", [analysis.state]);

  const confirmAnalyze = () => {
    setConfirmingRecording(null);
    onBeforeAnalyze();
    void analysis.analyze();
  };

  const stateCopy = !recording
    ? "等待本次录音"
    : analysis.state.status === "processing"
      ? "正在本机解码与分析…"
      : analysis.state.status === "ready"
        ? "本地分析已完成"
        : analysis.state.status === "error"
          ? "本地分析未完成"
          : "录音可供检查后分析";

  return (
    <section className="mt-4 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4" aria-labelledby="offline-pitch-analysis-title">
      <h3 id="offline-pitch-analysis-title" className="font-black text-fuchsia-950">录音停止后的本地多候选分析</h3>
      <p className="mt-1 text-sm leading-6 text-fuchsia-900">只有确认后才在本机解码本次录音。分析比较自相关与 McLeod 候选，保留拒答、连续轨迹和八度抑制证据；不上传、不使用目标音吸附，也不是正式评分或 P113 逐音对齐。</p>
      <p className="mt-2 text-sm font-bold text-fuchsia-950" role="status" aria-live="polite">状态：{stateCopy}</p>
      {!confirming ? (
        <button type="button" disabled={!recording || analysis.state.status === "processing"} onClick={() => setConfirmingRecording(recording)} className="mt-3 min-h-11 rounded-xl bg-fuchsia-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">检查并准备分析本次录音</button>
      ) : (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3" role="alert">
          <p className="text-sm font-bold text-amber-950">确认停止麦克风，并只在本机解码最多 30 秒录音？新录音或丢弃会让本结果失效。</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={confirmAnalyze} className="min-h-10 rounded-lg bg-fuchsia-800 px-3 text-sm font-bold text-white">确认开始本地分析</button>
            <button type="button" onClick={() => setConfirmingRecording(null)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold">取消</button>
          </div>
        </div>
      )}
      {analysis.state.status === "error" ? <p className="mt-3 rounded-xl border border-amber-300 bg-white p-3 text-sm text-amber-950" role="alert">{analysis.state.error}</p> : null}
      {analysis.state.status === "ready" ? (
        <div className="mt-4 rounded-xl border border-fuchsia-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-slate-500">代表音高</p><p className="font-black text-slate-950">{analysis.state.result.summary.representativeNote ?? "无法判断"}{analysis.state.result.summary.representativeFrequencyHz ? ` · ${analysis.state.result.summary.representativeFrequencyHz.toFixed(1)} Hz` : ""}</p></div>
            <div><p className="text-xs text-slate-500">可靠覆盖</p><p className="font-black text-slate-950">{(analysis.state.result.summary.voicedRatio * 100).toFixed(1)}% · {analysis.state.result.summary.voicedFrames}/{analysis.state.result.summary.totalFrames} 帧</p></div>
            <div><p className="text-xs text-slate-500">候选一致</p><p className="font-black text-slate-950">{analysis.state.result.summary.engineAgreementRatio === null ? "无可比帧" : `${(analysis.state.result.summary.engineAgreementRatio * 100).toFixed(1)}%`}</p></div>
            <div><p className="text-xs text-slate-500">本机处理</p><p className="font-black text-slate-950">{analysis.state.processingMs.toFixed(0)} ms · RTF {analysis.state.realtimeFactor.toFixed(3)}</p></div>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600">标准 PCM：16 kHz 单声道，{analysis.state.result.pcm.durationSeconds.toFixed(2)} 秒；拒答 {analysis.state.result.summary.rejectedFrames} 帧，八度修正 {analysis.state.result.summary.octaveAdjustedFrames} 帧，输入削波样本 {(analysis.state.result.pcm.diagnostics.clippedSampleRatio * 100).toFixed(2)}%。</p>
          {points ? <svg viewBox="0 0 100 100" role="img" aria-label="录音后连续音高轨迹，不含目标评分" className="mt-3 h-36 w-full rounded-lg bg-slate-950 p-2" preserveAspectRatio="none"><polyline points={points} fill="none" stroke="#e879f9" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg> : <p className="mt-3 text-sm text-slate-700">可靠帧不足，保留“无法判断”，不强行生成轨迹。</p>}
          <button type="button" onClick={analysis.clear} className="mt-3 min-h-10 rounded-lg border border-rose-300 px-3 text-sm font-bold text-rose-800">清除本次分析结果</button>
        </div>
      ) : null}
    </section>
  );
}
