import assert from "node:assert/strict";

import { getLocalVocalTargetFeedback } from "../lib/practice/localVocalTargetFeedback.js";
import type { LocalVocalExerciseEvent } from "../lib/practice/localVocalExercise.js";
import type { RealtimePitchCurvePoint } from "../lib/practice/realtimePitchCurve.js";

const target: LocalVocalExerciseEvent = { index: 0, loop: 0, midi: 69, frequencyHz: 440, startSeconds: 0, durationSeconds: 1 };
const point = (midi: number | null, state: RealtimePitchCurvePoint["state"] = "reliable"): RealtimePitchCurvePoint => ({ timestampMs: 1_500, midi, state, confidence: state === "reliable" ? 0.95 : 0.2 });

assert.equal(getLocalVocalTargetFeedback([], [target], 1_000).state, "waiting");
assert.equal(getLocalVocalTargetFeedback([point(null, "uncertain")], [target], 1_000).state, "unreliable");
assert.equal(getLocalVocalTargetFeedback([point(69.2)], [target], 1_000).state, "close");
assert.equal(getLocalVocalTargetFeedback([point(69.6)], [target], 1_000).state, "high");
assert.equal(getLocalVocalTargetFeedback([point(68.5)], [target], 1_000).state, "low");
assert.equal(getLocalVocalTargetFeedback([{ ...point(69), timestampMs: 2_500 }], [target], 1_000).state, "waiting");

console.log("Local vocal target feedback tests passed.");
