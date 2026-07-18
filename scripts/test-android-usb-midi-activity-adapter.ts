import assert from "node:assert/strict";

import {
  adaptAndroidUsbMidiSequenceToEvidence,
  appendVerifiedAndroidUsbNoteId,
  createAndroidUsbMidiActivityDefinition,
} from "../lib/activity/androidUsbMidiActivityAdapter";
import { P110_ORIGINAL_PIANO_EXERCISE } from "../lib/piano/pianoLearningScore";
import type { NoteEventV1 } from "../lib/music/noteEvent";

const definition = createAndroidUsbMidiActivityDefinition(P110_ORIGINAL_PIANO_EXERCISE);
assert.deepEqual(definition.allowedInputModes, ["usb-midi"]);
assert.equal(definition.target.expectedAnswer.mode, "usb-midi");
if (definition.target.expectedAnswer.mode !== "usb-midi") throw new Error("USB MIDI answer mode 异常");
assert.deepEqual(definition.target.expectedAnswer.noteIds, ["C4", "D4", "E4", "G4", "E4", "D4", "C4", "C4"]);

const usbNote: NoteEventV1 = {
  schemaVersion: "note-event-v1",
  eventId: "attempt-1:session-1:event-0",
  sequence: 0,
  time: {
    schemaVersion: "musical-time-v1",
    timebase: "monotonic-ms",
    originId: "attempt-1:session-1",
    positionMs: 10,
  },
  source: {
    producer: "android-midi",
    transport: "usb",
    verification: "android-device-type",
    deviceSessionId: "session-1",
  },
  type: "note-on",
  note: 60,
  velocity: 1,
  channel: 0,
};
assert.deepEqual(appendVerifiedAndroidUsbNoteId([], usbNote), ["C4"]);
assert.deepEqual(appendVerifiedAndroidUsbNoteId([], usbNote, "other-session"), [], "旧设备会话不得进入当前尝试");
assert.deepEqual(appendVerifiedAndroidUsbNoteId([], { ...usbNote, type: "note-off" }), []);
assert.deepEqual(appendVerifiedAndroidUsbNoteId([], {
  ...usbNote,
  source: { ...usbNote.source, transport: "unknown", verification: "unverified" },
}), [], "未知传输不得进入 USB MIDI answer");
assert.deepEqual(appendVerifiedAndroidUsbNoteId([], {
  ...usbNote,
  source: { producer: "web-midi", transport: "unknown", verification: "unverified", deviceSessionId: "web-1" },
}), [], "Web MIDI 不得冒充 USB MIDI answer");

assert.equal(adaptAndroidUsbMidiSequenceToEvidence({ expectedNoteIds: ["C4"], actualNoteIds: [] }).state, "insufficient");
assert.equal(adaptAndroidUsbMidiSequenceToEvidence({ expectedNoteIds: ["C4"], actualNoteIds: ["C4"] }).state, "consistent");
assert.equal(adaptAndroidUsbMidiSequenceToEvidence({ expectedNoteIds: ["C4"], actualNoteIds: ["D4"] }).state, "different");

console.log("Android USB MIDI activity adapter tests passed.");
