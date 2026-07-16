"use client";

import { useId } from "react";

import {
  midiToScientificNote,
  splitReliablePitchCurveSegments,
  type RealtimePitchCurvePoint,
} from "../../lib/practice/realtimePitchCurve";
import type { LocalVocalExerciseEvent } from "../../lib/practice/localVocalExercise";

const WIDTH = 720;
const HEIGHT = 340;
const LEFT = 54;
const RIGHT = 18;
const TOP = 18;
const BOTTOM = 34;
const MIN_MIDI = 48;
const MAX_MIDI = 84;

const yForMidi = (midi: number) => TOP + (MAX_MIDI - midi) / (MAX_MIDI - MIN_MIDI) * (HEIGHT - TOP - BOTTOM);

type Props = {
  points: RealtimePitchCurvePoint[];
  windowSeconds: number;
  targetMidi: number;
  targetEvents?: LocalVocalExerciseEvent[];
  targetStartedAtMs?: number | null;
};

export function RealtimePitchCurveChart({ points, windowSeconds, targetMidi, targetEvents = [], targetStartedAtMs = null }: Props) {
  const titleId = useId();
  const latestTimestamp = points.at(-1)?.timestampMs ?? 0;
  const windowMs = windowSeconds * 1_000;
  const windowEnd = Math.max(windowMs, latestTimestamp);
  const windowStart = windowEnd - windowMs;
  const plotWidth = WIDTH - LEFT - RIGHT;
  const xForTime = (timestampMs: number) => LEFT + (timestampMs - windowStart) / windowMs * plotWidth;
  const segments = splitReliablePitchCurveSegments(points, windowStart, windowEnd);
  const targetY = yForMidi(targetMidi);

  return (
    <figure className="mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950" aria-labelledby={titleId}>
      <figcaption id={titleId} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3 text-xs text-slate-300">
        <span className="font-bold text-white">最近 {windowSeconds} 秒音高曲线</span>
        <span>实线：可靠人声　断线：不足以判断　虚线：目标音</span>
      </figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`实时音高曲线，纵轴 C3 到 C6，目标音 ${midiToScientificNote(targetMidi)}`} className="block h-auto w-full">
        <rect width={WIDTH} height={HEIGHT} fill="#020617" />
        {Array.from({ length: MAX_MIDI - MIN_MIDI + 1 }, (_, index) => MIN_MIDI + index).map((midi) => {
          const y = yForMidi(midi);
          const isC = midi % 12 === 0;
          return <g key={midi}><line x1={LEFT} x2={WIDTH - RIGHT} y1={y} y2={y} stroke={isC ? "#475569" : "#1e293b"} strokeWidth={isC ? 1.2 : 0.6} /><text x={LEFT - 8} y={y + 4} textAnchor="end" fill={isC ? "#e2e8f0" : "#64748b"} fontSize={isC ? 13 : 9}>{midiToScientificNote(midi)}</text></g>;
        })}
        {Array.from({ length: 5 }, (_, index) => index).map((index) => {
          const x = LEFT + index / 4 * plotWidth;
          const remaining = ((4 - index) / 4 * windowSeconds).toFixed(index === 4 ? 0 : 1);
          return <g key={index}><line x1={x} x2={x} y1={TOP} y2={HEIGHT - BOTTOM} stroke="#334155" strokeWidth="0.8" /><text x={x} y={HEIGHT - 10} textAnchor={index === 0 ? "start" : index === 4 ? "end" : "middle"} fill="#94a3b8" fontSize="11">{index === 4 ? "现在" : `-${remaining}s`}</text></g>;
        })}
        <line x1={LEFT} x2={WIDTH - RIGHT} y1={targetY} y2={targetY} stroke="#f59e0b" strokeWidth="2" strokeDasharray="8 6" />
        <text x={WIDTH - RIGHT - 4} y={targetY - 6} textAnchor="end" fill="#fbbf24" fontSize="12" fontWeight="700">目标 {midiToScientificNote(targetMidi)}</text>
        {targetStartedAtMs !== null ? targetEvents.map((event) => {
          const start = targetStartedAtMs + event.startSeconds * 1_000;
          const end = start + event.durationSeconds * 1_000;
          if (end < windowStart || start > windowEnd || event.midi < MIN_MIDI || event.midi > MAX_MIDI) return null;
          const x = Math.max(LEFT, xForTime(start));
          const right = Math.min(WIDTH - RIGHT, xForTime(end));
          return <rect key={`target-${event.index}`} x={x} y={yForMidi(event.midi) - 5} width={Math.max(2, right - x)} height="10" rx="5" fill="#a3e635" opacity="0.75" />;
        }) : null}
        {segments.map((segment, index) => {
          const pointsValue = segment.map((point) => `${xForTime(point.timestampMs).toFixed(1)},${yForMidi(point.midi).toFixed(1)}`).join(" ");
          return <polyline key={`${segment[0]?.timestampMs ?? index}-${index}`} points={pointsValue} fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />;
        })}
        <line x1={WIDTH - RIGHT} x2={WIDTH - RIGHT} y1={TOP} y2={HEIGHT - BOTTOM} stroke="#f8fafc" strokeWidth="2" />
        {segments.at(-1)?.at(-1) ? <circle cx={xForTime(segments.at(-1)!.at(-1)!.timestampMs)} cy={yForMidi(segments.at(-1)!.at(-1)!.midi)} r="5" fill="#f8fafc" /> : null}
      </svg>
    </figure>
  );
}
