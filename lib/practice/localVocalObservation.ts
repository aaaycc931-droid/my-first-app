import type { RealtimePitchCurvePoint } from "./realtimePitchCurve";

export const LOCAL_VOCAL_OBSERVATION_VERSION = "local-vocal-observation-v1" as const;
const MAX_GAP_MS = 180;
const MIN_CONFIDENCE = 0.7;

type ReliablePoint = RealtimePitchCurvePoint & { midi: number };
export type ObservationState = "available" | "insufficient-data" | "mixed-pitch" | "ambiguous";

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

const percentile = (values: number[], ratio: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const position = Math.min(sorted.length - 1, Math.max(0, ratio * (sorted.length - 1)));
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};

const linearSlope = (points: ReliablePoint[]) => {
  const start = points[0]?.timestampMs ?? 0;
  const xs = points.map((point) => (point.timestampMs - start) / 1_000);
  const xMean = xs.reduce((sum, value) => sum + value, 0) / Math.max(1, xs.length);
  const yMean = points.reduce((sum, point) => sum + point.midi, 0) / Math.max(1, points.length);
  const denominator = xs.reduce((sum, value) => sum + (value - xMean) ** 2, 0);
  if (denominator === 0) return 0;
  return points.reduce((sum, point, index) => sum + (xs[index] - xMean) * (point.midi - yMean), 0) / denominator;
};

const normalizeReliablePoints = (points: readonly RealtimePitchCurvePoint[]) => {
  const byTimestamp = new Map<number, ReliablePoint>();
  for (const point of points) {
    if (point.state !== "reliable" || !Number.isFinite(point.timestampMs) || !Number.isFinite(point.midi) || point.midi === null || !Number.isFinite(point.confidence) || point.confidence < MIN_CONFIDENCE || point.midi < 36 || point.midi > 96) continue;
    const existing = byTimestamp.get(point.timestampMs);
    if (!existing || point.confidence > existing.confidence) byTimestamp.set(point.timestampMs, { ...point, midi: point.midi });
  }
  const sorted = Array.from(byTimestamp.values()).sort((left, right) => left.timestampMs - right.timestampMs);
  return sorted.filter((point, index) => {
    const previous = sorted[index - 1];
    const next = sorted[index + 1];
    if (!previous || !next || point.timestampMs - previous.timestampMs > MAX_GAP_MS || next.timestampMs - point.timestampMs > MAX_GAP_MS) return true;
    return !(Math.abs(point.midi - previous.midi) > 3 && Math.abs(point.midi - next.midi) > 3 && Math.abs(previous.midi - next.midi) < 1);
  });
};

const splitSegments = (points: ReliablePoint[]) => {
  const segments: ReliablePoint[][] = [];
  let active: ReliablePoint[] = [];
  for (const point of points) {
    const previous = active[active.length - 1];
    if (previous && (point.timestampMs - previous.timestampMs > MAX_GAP_MS || Math.abs(point.midi - previous.midi) >= 0.8)) {
      if (active.length > 0) segments.push(active);
      active = [];
    }
    active.push(point);
  }
  if (active.length > 0) segments.push(active);
  return segments;
};

const durationOf = (points: ReliablePoint[]) => points.length > 1 ? points[points.length - 1].timestampMs - points[0].timestampMs : 0;
const unavailable = (reason: string) => ({ state: "insufficient-data" as const, reason });

export const analyzeLocalVocalObservation = (source: readonly RealtimePitchCurvePoint[]) => {
  const points = normalizeReliablePoints(source);
  const segments = splitSegments(points);
  const reliableDurationMs = segments.reduce((sum, segment) => sum + durationOf(segment), 0);
  const longest = [...segments].sort((left, right) => durationOf(right) - durationOf(left))[0] ?? [];
  const totalTimes = source.map((point) => point.timestampMs).filter(Number.isFinite);
  const totalDurationMs = totalTimes.length > 1 ? Math.max(...totalTimes) - Math.min(...totalTimes) : 0;
  const reliableCoverage = totalDurationMs > 0 ? Math.min(1, reliableDurationMs / totalDurationMs) : 0;
  const range = points.length >= 20 && reliableDurationMs >= 1_500
    ? (() => {
        const lowMidi = percentile(points.map((point) => point.midi), 0.1);
        const highMidi = percentile(points.map((point) => point.midi), 0.9);
        return { state: "available" as const, lowMidi, highMidi, spanSemitones: highMidi - lowMidi };
      })()
    : unavailable("可靠人声不足 1.5 秒，暂不显示观察范围。");

  const longestDurationMs = durationOf(longest);
  const longestSpan = longest.length > 0 ? percentile(longest.map((point) => point.midi), 0.9) - percentile(longest.map((point) => point.midi), 0.1) : 0;
  const stability = longest.length < 25 || longestDurationMs < 1_500
    ? unavailable("需要至少 1.5 秒的连续可靠长音。")
      : longestSpan > 1.5
        ? { state: "mixed-pitch" as const, reason: "片段包含明显换音，不把旋律变化解释为长音波动。" }
        : (() => {
            const slope = linearSlope(longest);
            const start = longest[0].timestampMs;
            const residuals = longest.map((point) => (point.midi - (longest[0].midi + slope * ((point.timestampMs - start) / 1_000))) * 100);
            const center = median(residuals);
            const robustDeviationCents = 1.4826 * median(residuals.map((value) => Math.abs(value - center)));
            return { state: "available" as const, robustDeviationCents, segmentDurationMs: longestDurationMs };
          })();

  let periodic: { state: "available"; rateHz: number; widthCents: number; strength: number } | { state: "insufficient-data" | "ambiguous"; reason: string };
  if (longest.length < 40 || longestDurationMs < 2_500) periodic = unavailable("需要至少 2.5 秒的连续可靠长音，才观察周期性音高摆动。");
  else {
    const slope = linearSlope(longest);
    const start = longest[0].timestampMs;
    const residuals = longest.map((point) => (point.midi - (longest[0].midi + slope * ((point.timestampMs - start) / 1_000))) * 100);
    const centered = residuals.map((value) => value - median(residuals));
    const upwardCrossings: number[] = [];
    for (let index = 1; index < centered.length; index += 1) if (centered[index - 1] <= 0 && centered[index] > 0) upwardCrossings.push(longest[index].timestampMs);
    const periods = upwardCrossings.slice(1).map((time, index) => time - upwardCrossings[index]).filter((value) => value > 0);
    const periodMs = median(periods);
    const rateHz = periodMs > 0 ? 1_000 / periodMs : 0;
    const sampleIntervalMs = median(longest.slice(1).map((point, index) => point.timestampMs - longest[index].timestampMs));
    const lag = periodMs > 0 && sampleIntervalMs > 0 ? Math.max(1, Math.round(periodMs / sampleIntervalMs)) : 0;
    const energy = centered.reduce((sum, value) => sum + value * value, 0);
    const correlation = lag > 0 ? centered.slice(lag).reduce((sum, value, index) => sum + value * centered[index], 0) / Math.max(1, energy) : 0;
    const widthCents = percentile(centered, 0.9) - percentile(centered, 0.1);
    periodic = periods.length >= 3 && rateHz >= 3 && rateHz <= 8 && widthCents >= 15 && widthCents <= 200 && correlation >= 0.45
      ? { state: "available", rateHz, widthCents, strength: correlation }
      : { state: "ambiguous", reason: "本窗口未观察到清晰、连续的周期性音高摆动候选。" };
  }

  const sourceEndMs = totalTimes.length > 0 ? Math.max(...totalTimes) : 0;
  const lastSegment = segments[segments.length - 1] ?? [];
  const lastReliableMs = lastSegment[lastSegment.length - 1]?.timestampMs ?? 0;
  const tail = lastSegment.filter((point) => point.timestampMs >= lastReliableMs - 1_000);
  let ending: { state: "available"; direction: "rising" | "falling" | "level"; slopeCentsPerSecond: number; durationMs: number } | { state: "insufficient-data" | "ambiguous"; reason: string };
  if (tail.length < 10 || durationOf(tail) < 600 || sourceEndMs - lastReliableMs > 300) ending = unavailable("末段连续可靠人声不足 0.6 秒。");
  else {
    const slopeCentsPerSecond = linearSlope(tail) * 100;
    const third = Math.max(1, Math.floor(tail.length / 3));
    const changeCents = (median(tail.slice(-third).map((point) => point.midi)) - median(tail.slice(0, third).map((point) => point.midi))) * 100;
    if (Math.abs(slopeCentsPerSecond) < 15 && Math.abs(changeCents) < 15) ending = { state: "available", direction: "level", slopeCentsPerSecond, durationMs: durationOf(tail) };
    else if (Math.abs(slopeCentsPerSecond) >= 25 && Math.abs(changeCents) >= 20 && Math.sign(slopeCentsPerSecond) === Math.sign(changeCents)) ending = { state: "available", direction: slopeCentsPerSecond > 0 ? "rising" : "falling", slopeCentsPerSecond, durationMs: durationOf(tail) };
    else ending = { state: "ambiguous", reason: "末段变化方向不够一致，暂不判断上行或下行。" };
  }

  return {
    algorithmVersion: LOCAL_VOCAL_OBSERVATION_VERSION,
    evidence: { reliablePointCount: points.length, reliableDurationMs, reliableCoverage, segmentCount: segments.length },
    range,
    stability,
    periodic,
    ending,
  };
};
