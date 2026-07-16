import assert from "node:assert/strict";

import {
  analyzeRealtimePitchFrame,
  REALTIME_PITCH_FRAME_SIZE,
} from "../lib/practice/pitchEstimate";

const sampleRate = 48_000;
const sine = (frequencyHz: number, amplitude = 0.4) => Float32Array.from(
  { length: REALTIME_PITCH_FRAME_SIZE },
  (_, index) => amplitude * Math.sin(2 * Math.PI * frequencyHz * index / sampleRate),
);

const a4 = analyzeRealtimePitchFrame(sine(440), sampleRate);
assert.equal(a4.state, "reliable");
assert.equal(a4.nearestNote, "A4");
assert.ok(Math.abs(a4.centsOffset ?? 100) < 3);
assert.ok((a4.confidence ?? 0) >= 0.72);

const quiet = analyzeRealtimePitchFrame(new Float32Array(REALTIME_PITCH_FRAME_SIZE), sampleRate);
assert.equal(quiet.state, "quiet");
assert.equal(quiet.nearestNote, null);

const tooShort = analyzeRealtimePitchFrame(new Float32Array(512), sampleRate);
assert.equal(tooShort.state, "uncertain");
assert.equal(tooShort.frequencyHz, null);

const outsideVoiceRange = analyzeRealtimePitchFrame(sine(1_100), sampleRate);
assert.equal(outsideVoiceRange.state, "out-of-range");
assert.equal(outsideVoiceRange.nearestNote, null);

console.log("Realtime pitch frame tests passed.");
