import assert from "node:assert/strict";

import {
  adaptScreenPianoNoteEventsToNoteIds,
  createScreenPianoActivityNoteOn,
} from "../lib/activity/pianoNoteEventActivityAdapter";
import { normalizeNoteEventV1, type NoteEventV1 } from "../lib/music/noteEvent";

const originId = "piano-learning:p110:attempt-1";
const pointerEvent = createScreenPianoActivityNoteOn({
  originId,
  sequence: 0,
  producer: "screen-piano",
  note: 60,
  velocity: 0.65,
  atMs: 12.5,
});
const keyboardEvent = createScreenPianoActivityNoteOn({
  originId,
  sequence: 1,
  producer: "computer-keyboard",
  note: 62,
  velocity: 0.7,
  atMs: 20,
});

assert.equal(pointerEvent.source.producer, "screen-piano");
assert.equal(pointerEvent.source.transport, "none");
assert.equal(pointerEvent.time.timebase, "monotonic-ms");
assert.equal(pointerEvent.eventId, `${originId}:event-0`);
assert.deepEqual(
  adaptScreenPianoNoteEventsToNoteIds([pointerEvent, keyboardEvent]),
  ["C4", "D4"],
  "活动答案必须由标准 note-on 事件按顺序派生",
);

const webMidiEvent = normalizeNoteEventV1({
  ...pointerEvent,
  eventId: `${originId}:event-2`,
  sequence: 2,
  source: {
    producer: "web-midi",
    transport: "usb",
    verification: "android-device-type",
    deviceSessionId: "web-device-1",
  },
});
assert.equal(webMidiEvent.source.transport, "unknown");
assert.deepEqual(
  adaptScreenPianoNoteEventsToNoteIds([pointerEvent, webMidiEvent as NoteEventV1]),
  ["C4"],
  "当前屏幕钢琴活动不得把 MIDI、回放或其他事件写入答案",
);

console.log("piano note event activity adapter tests passed");
