import assert from "node:assert/strict";

import { decodePianoMidiMessage, midiPointerToken } from "../lib/piano/pianoMidi";

assert.deepEqual(decodePianoMidiMessage([0x90, 60, 127]), {
  type: "note-on", note: 60, velocity: 1, channel: 1,
});
assert.deepEqual(decodePianoMidiMessage([0x92, 48, 64]), {
  type: "note-on", note: 48, velocity: 64 / 127, channel: 3,
});
assert.deepEqual(decodePianoMidiMessage([0x80, 60, 1]), {
  type: "note-off", note: 60, channel: 1,
});
assert.deepEqual(decodePianoMidiMessage([0x90, 60, 0]), {
  type: "note-off", note: 60, channel: 1,
});
assert.deepEqual(decodePianoMidiMessage([0xb1, 64, 127]), {
  type: "pedal", down: true, channel: 2,
});
assert.deepEqual(decodePianoMidiMessage([0xb1, 64, 63]), {
  type: "pedal", down: false, channel: 2,
});
assert.equal(decodePianoMidiMessage([0xb0, 1, 127]), null);
assert.equal(decodePianoMidiMessage([0xfe]), null);
assert.equal(midiPointerToken("usb-1", 2, 60), "midi-usb-1-2-60");

console.log("Piano MIDI tests passed.");
