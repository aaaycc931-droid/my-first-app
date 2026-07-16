import type { RealtimePitchFrameAnalysis } from "./pitchEstimate";

export type RealtimePitchCurvePoint = {
  timestampMs: number;
  midi: number | null;
  state: RealtimePitchFrameAnalysis["state"];
  confidence: number;
};

export type RealtimePitchCurveSegment = Array<RealtimePitchCurvePoint & { midi: number }>;

export const REALTIME_PITCH_CURVE_RETENTION_MS = 30_000;
export const REALTIME_PITCH_CURVE_GAP_MS = 180;

export const frequencyToMidi = (frequencyHz: number): number | null => {
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) return null;
  return 69 + 12 * Math.log2(frequencyHz / 440);
};

export const appendRealtimePitchCurvePoint = (
  points: RealtimePitchCurvePoint[],
  analysis: RealtimePitchFrameAnalysis,
  timestampMs: number,
  retentionMs = REALTIME_PITCH_CURVE_RETENTION_MS,
): RealtimePitchCurvePoint[] => {
  if (!Number.isFinite(timestampMs)) return points;
  const midi = analysis.state === "reliable" && analysis.frequencyHz !== null
    ? frequencyToMidi(analysis.frequencyHz)
    : null;
  const next = [...points, {
    timestampMs,
    midi,
    state: analysis.state,
    confidence: analysis.confidence,
  }];
  const cutoff = timestampMs - Math.max(1_000, retentionMs);
  return next.filter((point) => point.timestampMs >= cutoff);
};

export const splitReliablePitchCurveSegments = (
  points: RealtimePitchCurvePoint[],
  windowStartMs: number,
  windowEndMs: number,
): RealtimePitchCurveSegment[] => {
  const segments: RealtimePitchCurveSegment[] = [];
  let active: RealtimePitchCurveSegment = [];
  for (const point of points) {
    if (point.timestampMs < windowStartMs || point.timestampMs > windowEndMs) continue;
    const reliablePoint = point.state === "reliable" && point.midi !== null
      ? { ...point, midi: point.midi }
      : null;
    const previous = active.at(-1);
    if (!reliablePoint) {
      if (active.length > 0) segments.push(active);
      active = [];
      continue;
    }
    if (previous && reliablePoint.timestampMs - previous.timestampMs > REALTIME_PITCH_CURVE_GAP_MS) {
      segments.push(active);
      active = [];
    }
    active.push(reliablePoint);
  }
  if (active.length > 0) segments.push(active);
  return segments;
};

export const midiToScientificNote = (midi: number): string => {
  const rounded = Math.round(midi);
  const names = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  return `${names[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`;
};
