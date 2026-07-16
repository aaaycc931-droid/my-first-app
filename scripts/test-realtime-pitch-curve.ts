import assert from "node:assert/strict";

import type { RealtimePitchFrameAnalysis } from "../lib/practice/pitchEstimate.js";
import {
  appendRealtimePitchCurvePoint,
  frequencyToMidi,
  midiToScientificNote,
  splitReliablePitchCurveSegments,
} from "../lib/practice/realtimePitchCurve.js";

const analysis = (state: RealtimePitchFrameAnalysis["state"], frequencyHz: number | null): RealtimePitchFrameAnalysis => ({
  state,
  rms: state === "quiet" ? 0 : 0.2,
  confidence: state === "reliable" ? 0.95 : 0.2,
  frequencyHz,
  nearestNote: state === "reliable" ? "A4" : null,
  centsOffset: state === "reliable" ? 0 : null,
});

assert.ok(Math.abs((frequencyToMidi(440) ?? 0) - 69) < 1e-9);
assert.equal(frequencyToMidi(0), null);
assert.equal(midiToScientificNote(60), "C4");
assert.equal(midiToScientificNote(70), "A♯4");

let points = appendRealtimePitchCurvePoint([], analysis("reliable", 440), 1_000);
points = appendRealtimePitchCurvePoint(points, analysis("reliable", 446), 1_050);
points = appendRealtimePitchCurvePoint(points, analysis("uncertain", 430), 1_100);
points = appendRealtimePitchCurvePoint(points, analysis("reliable", 392), 1_150);
const segments = splitReliablePitchCurveSegments(points, 0, 2_000);
assert.equal(segments.length, 2, "不可靠帧必须使曲线断线");
assert.equal(segments[0]?.length, 2);
assert.equal(segments[1]?.length, 1);

points = appendRealtimePitchCurvePoint(points, analysis("reliable", 440), 40_000, 30_000);
assert.equal(points.length, 1, "超过保留窗口的历史帧必须清理");

const withGap = [
  ...points,
  ...appendRealtimePitchCurvePoint([], analysis("reliable", 440), 40_250),
];
assert.equal(splitReliablePitchCurveSegments(withGap, 39_000, 41_000).length, 2, "采样间隙不得跨空白连线");

console.log("Realtime pitch curve model tests passed.");
