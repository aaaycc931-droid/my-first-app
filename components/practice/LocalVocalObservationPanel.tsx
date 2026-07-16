"use client";

import { useId, useMemo } from "react";

import { analyzeLocalVocalObservation } from "../../lib/practice/localVocalObservation";
import { midiToScientificNote, type RealtimePitchCurvePoint } from "../../lib/practice/realtimePitchCurve";

const signed = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(0)}`;

export function LocalVocalObservationPanel({ points, label = "最近可用片段" }: { points: RealtimePitchCurvePoint[]; label?: string }) {
  const observation = useMemo(() => analyzeLocalVocalObservation(points), [points]);
  const titleId = useId();
  const endingDirection = observation.ending.state === "available"
    ? observation.ending.direction === "rising" ? "向上" : observation.ending.direction === "falling" ? "向下" : "变化较小"
    : null;

  return (
    <section className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4" aria-labelledby={titleId}>
      <p className="text-xs font-bold tracking-wide text-sky-700">{label} · 最多最近 30 秒</p>
      <h2 id={titleId} className="mt-1 text-lg font-black text-sky-950">本次音高观察（非评分）</h2>
      <p className="mt-1 text-sm leading-6 text-sky-900">以下内容由本机可靠音高帧估算，只帮助回看练声，不是分数、等级、通过判断、声部鉴定或医学建议。</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl bg-white p-3"><h3 className="font-bold text-slate-950">观察音高分布</h3>{observation.range.state === "available" ? <p className="mt-1 text-sm text-slate-700">可靠帧主要分布在 {midiToScientificNote(observation.range.lowMidi)}–{midiToScientificNote(observation.range.highMidi)}，跨度约 {observation.range.spanSemitones.toFixed(1)} 半音。</p> : <p className="mt-1 text-sm text-slate-600">{observation.range.reason}</p>}<p className="mt-1 text-xs text-slate-500">只代表本段采集范围，不代表完整音域、极限或声部。</p></article>
        <article className="rounded-xl bg-white p-3"><h3 className="font-bold text-slate-950">持续音短期波动</h3>{observation.stability.state === "available" ? <p className="mt-1 text-sm text-slate-700">连续 { (observation.stability.segmentDurationMs / 1_000).toFixed(1) } 秒片段的典型短期波动约 {observation.stability.robustDeviationCents.toFixed(0)} 音分。</p> : <p className="mt-1 text-sm text-slate-600">{observation.stability.reason}</p>}<p className="mt-1 text-xs text-slate-500">这是去除整体缓慢趋势后的观察值，不评价好坏。</p></article>
        <article className="rounded-xl bg-white p-3"><h3 className="font-bold text-slate-950">周期性音高摆动候选</h3>{observation.periodic.state === "available" ? <p className="mt-1 text-sm text-slate-700">观察到疑似周期性摆动：约 {observation.periodic.rateHz.toFixed(1)} 次/秒，P10–P90 宽度约 {observation.periodic.widthCents.toFixed(0)} 音分。</p> : <p className="mt-1 text-sm text-slate-600">{observation.periodic.reason}</p>}<p className="mt-1 text-xs text-slate-500">探索性候选，不判断颤音是否标准、自然或健康。</p></article>
        <article className="rounded-xl bg-white p-3"><h3 className="font-bold text-slate-950">尾部音高走向</h3>{observation.ending.state === "available" ? <p className="mt-1 text-sm text-slate-700">末段音高{endingDirection}，估计变化 {signed(observation.ending.slopeCentsPerSecond)} 音分/秒。</p> : <p className="mt-1 text-sm text-slate-600">{observation.ending.reason}</p>}<p className="mt-1 text-xs text-slate-500">只描述音高走向，不推断音量、气息或声带状态。</p></article>
      </div>
      <details className="mt-3 text-xs text-sky-900"><summary className="cursor-pointer font-bold">数据说明</summary><p className="mt-2">可靠帧 {observation.evidence.reliablePointCount} 个，连续可靠时长约 {(observation.evidence.reliableDurationMs / 1_000).toFixed(1)} 秒，时间覆盖约 {(observation.evidence.reliableCoverage * 100).toFixed(0)}%，片段 {observation.evidence.segmentCount} 个，算法版本 {observation.algorithmVersion}。自动观察仍需 P104 真实人声与真机校准。</p></details>
    </section>
  );
}
