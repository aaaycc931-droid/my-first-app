import assert from "node:assert/strict";

import {
  createLocalVocalPracticeRecord,
  LOCAL_VOCAL_RECORDING_MAX_BYTES,
  serializeLocalVocalPracticeRecord,
  type LocalVocalPracticeRecordRepository,
} from "../lib/practice/localVocalPracticeRecord.js";

const points = Array.from({ length: 620 }, (_, index) => ({ timestampMs: index * 50, midi: 69, state: "reliable" as const, confidence: 0.9 }));
const blob = new Blob(["voice"], { type: "audio/webm" });
const record = createLocalVocalPracticeRecord({ note: `  ${"练".repeat(220)}  `, targetLabel: "五声音型", targetMidi: 69, curvePoints: points, recording: blob, now: new Date("2026-07-16T00:00:00.000Z"), id: "record-1" });
assert.equal(record.id, "record-1");
assert.equal(record.schemaVersion, 1);
assert.equal(record.targetMidi, 69);
assert.equal(record.curvePoints.length, 600);
assert.equal(record.note.length, 200);
assert.equal(record.recording, blob);
assert.notEqual(record.curvePoints[0], points[20]);
points[20]!.midi = 60;
assert.equal(record.curvePoints[0]?.midi, 69);
const repositoryContract: LocalVocalPracticeRecordRepository = {
  list: async () => [record],
  save: async () => undefined,
  remove: async () => undefined,
  clear: async () => undefined,
};
assert.equal(typeof repositoryContract.list, "function");
assert.equal(typeof repositoryContract.save, "function");
assert.equal(typeof repositoryContract.remove, "function");
assert.equal(typeof repositoryContract.clear, "function");
const exported = serializeLocalVocalPracticeRecord(record);
assert.match(exported, /"schemaVersion": 1/);
assert.match(exported, /"recordingIncluded": true/);
assert.ok(!exported.includes("voice"));
assert.equal(
  createLocalVocalPracticeRecord({
    note: "",
    targetLabel: "目".repeat(100),
    targetMidi: 69,
    curvePoints: points,
    recording: null,
    id: "label",
  }).targetLabel.length,
  80,
);
assert.throws(() => createLocalVocalPracticeRecord({ note: "", targetLabel: "自由", targetMidi: 69, curvePoints: [], recording: null, id: "empty" }), /没有可保存/);
assert.throws(() => createLocalVocalPracticeRecord({ note: "", targetLabel: "自由", targetMidi: 69, curvePoints: [], recording: new Blob([new Uint8Array(LOCAL_VOCAL_RECORDING_MAX_BYTES + 1)]), id: "large" }), /超过 5 MB/);
assert.throws(() => createLocalVocalPracticeRecord({ note: "", targetLabel: "自由", targetMidi: 90, curvePoints: points, recording: null, id: "target" }), /目标参考音/);
console.log("Local vocal practice record tests passed.");
