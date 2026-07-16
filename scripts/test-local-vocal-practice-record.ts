import assert from "node:assert/strict";

import { createLocalVocalPracticeRecord, LOCAL_VOCAL_RECORDING_MAX_BYTES, serializeLocalVocalPracticeRecord } from "../mobile/src/runtime/localVocalPracticeStorage.js";

const points = Array.from({ length: 620 }, (_, index) => ({ timestampMs: index * 50, midi: 69, state: "reliable" as const, confidence: 0.9 }));
const blob = new Blob(["voice"], { type: "audio/webm" });
const record = createLocalVocalPracticeRecord({ note: `  ${"练".repeat(220)}  `, targetLabel: "五声音型", targetMidi: 69, curvePoints: points, recording: blob, now: new Date("2026-07-16T00:00:00.000Z"), id: "record-1" });
assert.equal(record.id, "record-1");
assert.equal(record.schemaVersion, 1);
assert.equal(record.targetMidi, 69);
assert.equal(record.curvePoints.length, 600);
assert.equal(record.note.length, 200);
assert.equal(record.recording, blob);
const exported = serializeLocalVocalPracticeRecord(record);
assert.match(exported, /"schemaVersion": 1/);
assert.match(exported, /"recordingIncluded": true/);
assert.ok(!exported.includes("voice"));
assert.throws(() => createLocalVocalPracticeRecord({ note: "", targetLabel: "自由", targetMidi: 69, curvePoints: [], recording: null, id: "empty" }), /没有可保存/);
assert.throws(() => createLocalVocalPracticeRecord({ note: "", targetLabel: "自由", targetMidi: 69, curvePoints: [], recording: new Blob([new Uint8Array(LOCAL_VOCAL_RECORDING_MAX_BYTES + 1)]), id: "large" }), /超过 5 MB/);
assert.throws(() => createLocalVocalPracticeRecord({ note: "", targetLabel: "自由", targetMidi: 90, curvePoints: points, recording: null, id: "target" }), /目标参考音/);
console.log("Local vocal practice record tests passed.");
