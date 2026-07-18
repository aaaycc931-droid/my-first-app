import assert from "node:assert/strict";

import { normalizeNoteEventV1, validateNoteEventV1, type NoteEventV1 } from "../lib/music/noteEvent";

const webNoteOn: NoteEventV1 = {
  schemaVersion: "note-event-v1",
  eventId: " web-midi-session-1:1 ",
  sequence: 1,
  time: { schemaVersion: "musical-time-v1", timebase: "monotonic-ms", originId: "dom-performance-1", positionMs: 12.5 },
  source: { producer: "web-midi", transport: "usb", verification: "android-device-type", deviceSessionId: " web-midi-session-1 " },
  type: "note-on",
  note: 60,
  velocity: 127 / 127,
  channel: 0,
};
assert.throws(() => validateNoteEventV1(webNoteOn), /Web MIDI 无法验证/);
const normalizedWeb = normalizeNoteEventV1(webNoteOn);
assert.deepEqual(normalizedWeb.source, {
  producer: "web-midi",
  transport: "unknown",
  verification: "unverified",
  deviceSessionId: "web-midi-session-1",
});
assert.equal(normalizedWeb.eventId, "web-midi-session-1:1");

const zeroVelocity = normalizeNoteEventV1({ ...webNoteOn, eventId: "web-midi-session-1:2", sequence: 2, velocity: 0 });
assert.equal(zeroVelocity.type, "note-off");

const sustain = normalizeNoteEventV1({
  ...webNoteOn,
  eventId: "web-midi-session-1:3",
  sequence: 3,
  type: "sustain",
  value: 63 / 127,
  down: true,
  channel: 18,
});
assert.equal(sustain.type, "sustain");
if (sustain.type !== "sustain") throw new Error("sustain narrowing failed");
assert.equal(sustain.down, false);
assert.equal(sustain.channel, 15);

const androidUsb = validateNoteEventV1({
  ...normalizedWeb,
  eventId: "android-midi-session-1:1",
  source: { producer: "android-midi", transport: "usb", verification: "android-device-type", deviceSessionId: "android-midi-session-1" },
});
assert.equal(androidUsb.source.transport, "usb");
assert.throws(() => validateNoteEventV1({
  ...androidUsb,
  source: { ...androidUsb.source, verification: "unverified" },
}), /原生设备类型验证/);

const screenAllOff = normalizeNoteEventV1({
  schemaVersion: "note-event-v1",
  eventId: "screen-session-1:9",
  sequence: 9,
  time: { schemaVersion: "musical-time-v1", timebase: "monotonic-ms", originId: "dom-performance-1", positionMs: 50 },
  source: { producer: "screen-piano", transport: "usb", verification: "unverified", deviceSessionId: "fake" },
  type: "all-notes-off",
  channel: null,
});
assert.deepEqual(screenAllOff.source, {
  producer: "screen-piano",
  transport: "none",
  verification: "not-applicable",
  deviceSessionId: null,
});
assert.equal(screenAllOff.type, "all-notes-off");

assert.throws(() => validateNoteEventV1({ ...normalizedWeb, channel: 16 }), /0–15/);
assert.throws(() => validateNoteEventV1({ ...normalizedWeb, source: { ...normalizedWeb.source, deviceSessionId: null } }), /设备会话/);
assert.throws(() => validateNoteEventV1({ ...normalizedWeb, type: "pitch-bend" } as never), /类型无效/);
assert.throws(() => validateNoteEventV1({
  ...screenAllOff,
  source: { ...screenAllOff.source, producer: "mystery-input" },
} as never), /生产者无效/);

console.log("NoteEventV1 tests passed.");
