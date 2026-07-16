import assert from "node:assert/strict";

import { analyzeLocalVocalObservation } from "../lib/practice/localVocalObservation.js";
import type { RealtimePitchCurvePoint } from "../lib/practice/realtimePitchCurve.js";

const reliableSeries = (count: number, midiAt: (seconds: number, index: number) => number, stepMs = 50): RealtimePitchCurvePoint[] => Array.from({ length: count }, (_, index) => ({
  timestampMs: index * stepMs,
  midi: midiAt(index * stepMs / 1_000, index),
  state: "reliable",
  confidence: 0.92,
}));

const empty = analyzeLocalVocalObservation([]);
assert.equal(empty.range.state, "insufficient-data");
assert.equal(empty.stability.state, "insufficient-data");
assert.equal(empty.periodic.state, "insufficient-data");
assert.equal(empty.ending.state, "insufficient-data");

const stable = analyzeLocalVocalObservation(reliableSeries(60, () => 69));
assert.equal(stable.range.state, "available");
assert.equal(stable.stability.state, "available");
assert.ok(stable.stability.state === "available" && stable.stability.robustDeviationCents < 0.01);
assert.equal(stable.periodic.state, "ambiguous");
assert.equal(stable.ending.state, "available");
assert.equal(stable.ending.state === "available" && stable.ending.direction, "level");

const outlierPoints = reliableSeries(60, () => 69);
outlierPoints[30] = { ...outlierPoints[30], midi: 81 };
const outlier = analyzeLocalVocalObservation(outlierPoints);
assert.ok(outlier.range.state === "available" && outlier.range.spanSemitones < 0.01, "单帧八度尖峰不得扩大观察范围");

const periodic = analyzeLocalVocalObservation(reliableSeries(80, (seconds) => 69 + 0.35 * Math.sin(2 * Math.PI * 5 * seconds)));
assert.equal(periodic.periodic.state, "available");
assert.ok(periodic.periodic.state === "available" && Math.abs(periodic.periodic.rateHz - 5) < 0.2);
assert.ok(periodic.periodic.state === "available" && periodic.periodic.widthCents > 40);

const rising = analyzeLocalVocalObservation(reliableSeries(60, (seconds) => 69 + 0.6 * seconds));
assert.equal(rising.ending.state, "available");
assert.equal(rising.ending.state === "available" && rising.ending.direction, "rising");
assert.ok(rising.ending.state === "available" && rising.ending.slopeCentsPerSecond > 50);

const interrupted = analyzeLocalVocalObservation([
  ...reliableSeries(20, () => 69),
  ...reliableSeries(20, () => 69).map((point) => ({ ...point, timestampMs: point.timestampMs + 2_000 })),
]);
assert.ok(interrupted.evidence.segmentCount >= 2);
assert.equal(interrupted.stability.state, "insufficient-data");

const invalid = analyzeLocalVocalObservation([
  { timestampMs: Number.NaN, midi: 69, state: "reliable", confidence: 1 },
  { timestampMs: 0, midi: Number.POSITIVE_INFINITY, state: "reliable", confidence: 1 },
  { timestampMs: 50, midi: 69, state: "uncertain", confidence: 1 },
]);
assert.equal(invalid.evidence.reliablePointCount, 0);

const serialized = JSON.stringify(periodic);
for (const forbidden of ["score", "grade", "pass", "fail", "accuracy", "medical", "vocalType"]) assert.equal(serialized.includes(forbidden), false);
assert.equal(serialized.includes("NaN"), false);

console.log("Local vocal observation diagnostics tests passed.");
