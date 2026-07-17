import assert from "node:assert/strict";

import {
  appendPianoPerformanceEvent,
  createPianoPerformanceRecorder,
  createPianoPlaybackSchedule,
  finalizePianoPerformance,
  parsePianoPerformanceLibrary,
  serializePianoPerformanceLibrary,
} from "../lib/piano/pianoPerformance";

let recorder = createPianoPerformanceRecorder(1_000);
recorder = appendPianoPerformanceEvent(recorder, { type: "note-on", keyId: "c4", note: 60, velocity: 0.7 }, 1_100);
recorder = appendPianoPerformanceEvent(recorder, { type: "pedal", down: true }, 1_150);
recorder = appendPianoPerformanceEvent(recorder, { type: "note-on", keyId: "c3", note: 48, velocity: 0.5 }, 1_200);
recorder = appendPianoPerformanceEvent(recorder, { type: "note-off", keyId: "c4", note: 60 }, 1_300);
recorder = appendPianoPerformanceEvent(recorder, { type: "pedal", down: false }, 1_350);
recorder = appendPianoPerformanceEvent(recorder, { type: "note-off", keyId: "c3", note: 48 }, 1_400);
const performance = finalizePianoPerformance({ recorder, id: "take-1", name: "  第一遍  ", createdAt: "2026-07-17T00:00:00.000Z", nowMs: 1_500, transpose: 2 });
assert.ok(performance);
assert.equal(performance.name, "第一遍");
assert.equal(performance.durationMs, 500);
assert.equal(performance.transpose, 2);
assert.equal(performance.events.at(-1)?.type, "all-notes-off");

const full = createPianoPlaybackSchedule({ performance });
assert.equal(full[0].delayMs, 100);
assert.equal(full.at(-1)?.delayMs, 500);
const fastLoop = createPianoPlaybackSchedule({ performance, fromMs: 150, toMs: 400, rate: 1.5 });
assert.equal(fastLoop[0].type, "note-on", "held C4 is restored at loop A");
assert.equal(fastLoop[0].delayMs, 0);
assert.equal(fastLoop.at(-1)?.delayMs, 250 / 1.5);
const lowerOnly = createPianoPlaybackSchedule({ performance, voiceFilter: "lower" });
assert.equal(lowerOnly.some((event) => (event.type === "note-on" || event.type === "note-off") && event.note >= 60), false);

const serialized = serializePianoPerformanceLibrary([performance]);
assert.deepEqual(parsePianoPerformanceLibrary(serialized), [performance]);
assert.deepEqual(parsePianoPerformanceLibrary("broken"), []);
assert.deepEqual(parsePianoPerformanceLibrary(JSON.stringify([{ schemaVersion: 1, id: "bad" }])), []);
assert.deepEqual(parsePianoPerformanceLibrary(JSON.stringify([{ ...performance, durationMs: -1 }])), []);
assert.equal(finalizePianoPerformance({ recorder: createPianoPerformanceRecorder(0), id: "empty", name: "", createdAt: "", nowMs: 10 }), null);

console.log("Piano performance tests passed.");
