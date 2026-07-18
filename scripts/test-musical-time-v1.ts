import assert from "node:assert/strict";

import {
  normalizeMusicalTimeV1,
  shareMusicalTimebaseV1,
  validateMusicalTimeV1,
} from "../lib/music/musicalTime";

const monotonic = validateMusicalTimeV1({
  schemaVersion: "musical-time-v1",
  timebase: "monotonic-ms",
  originId: "web-session-1",
  positionMs: 125.5,
});
assert.equal(monotonic.positionMs, 125.5);
assert.deepEqual(normalizeMusicalTimeV1({ ...monotonic, positionMs: -2 }), { ...monotonic, positionMs: 0 });

const ticks = normalizeMusicalTimeV1({
  schemaVersion: "musical-time-v1",
  timebase: "score-ticks",
  originId: "score-1:r3",
  tick: 95.7,
  ticksPerQuarter: 479.6,
});
assert.equal(ticks.timebase, "score-ticks");
if (ticks.timebase !== "score-ticks") throw new Error("score timebase narrowing failed");
assert.equal(ticks.tick, 96);
assert.equal(ticks.ticksPerQuarter, 480);

const recording = validateMusicalTimeV1({
  schemaVersion: "musical-time-v1",
  timebase: "recording-relative-ms",
  originId: "recording-1",
  positionMs: 240,
});
const samples = validateMusicalTimeV1({
  schemaVersion: "musical-time-v1",
  timebase: "audio-samples",
  originId: "recording-1:pcm",
  sampleIndex: 16_000,
  sampleRate: 16_000,
});
assert.equal(recording.positionMs, 240);
assert.equal(samples.sampleIndex, 16_000);

assert.equal(shareMusicalTimebaseV1(monotonic, { ...monotonic, positionMs: 500 }), true);
assert.equal(shareMusicalTimebaseV1(monotonic, { ...monotonic, originId: "web-session-2" }), false);
assert.equal(shareMusicalTimebaseV1(monotonic, recording), false);
assert.throws(() => validateMusicalTimeV1({ ...monotonic, originId: "" }), /时间原点/);
assert.throws(() => validateMusicalTimeV1({ ...monotonic, positionMs: Number.NaN }), /非负有限数/);
assert.throws(() => validateMusicalTimeV1({ ...monotonic, timebase: "wall-clock" } as never), /时间域无效/);

console.log("MusicalTimeV1 tests passed.");
