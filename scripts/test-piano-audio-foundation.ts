import assert from "node:assert/strict";

import {
  BoundedPianoSampleCache,
  selectPianoSampleZone,
  type PianoSampleZone,
} from "../lib/piano/pianoAudioProvider";
import {
  DEFAULT_PIANO_POLYPHONY,
  PIANO_NOTE_EVENT_PROTOCOL_VERSION,
  createPianoVoiceAllocatorState,
  normalizePianoNoteEvent,
  reducePianoNoteEvent,
} from "../lib/piano/pianoNoteEvents";

assert.equal(PIANO_NOTE_EVENT_PROTOCOL_VERSION, "piano-note-events-v1");
assert.equal(DEFAULT_PIANO_POLYPHONY, 32);
assert.deepEqual(
  normalizePianoNoteEvent({ type: "note-on", note: 140, velocity: 2, channel: 20, atMs: -1 }),
  { type: "note-on", note: 127, velocity: 1, channel: 15, atMs: 0 },
);

let state = createPianoVoiceAllocatorState();
for (let index = 0; index < DEFAULT_PIANO_POLYPHONY; index += 1) {
  state = reducePianoNoteEvent(state, {
    type: "note-on", note: 36 + index, velocity: 0.5, channel: 0, atMs: index,
  });
}
assert.equal(state.voices.length, 32);
state = reducePianoNoteEvent(state, { type: "note-off", note: 36, channel: 0, atMs: 40 });
assert.equal(state.voices.length, 31);
state = reducePianoNoteEvent(state, { type: "pedal", down: true, channel: 0, atMs: 41 });
state = reducePianoNoteEvent(state, { type: "note-off", note: 37, channel: 0, atMs: 42 });
assert.equal(state.voices.find((voice) => voice.note === 37)?.sustained, true);
state = reducePianoNoteEvent(state, { type: "pedal", down: false, channel: 0, atMs: 43 });
assert.equal(state.voices.some((voice) => voice.note === 37), false);

let smallState = createPianoVoiceAllocatorState();
smallState = reducePianoNoteEvent(smallState, { type: "note-on", note: 60, velocity: 1, channel: 0, atMs: 1 }, 2);
smallState = reducePianoNoteEvent(smallState, { type: "note-on", note: 62, velocity: 1, channel: 0, atMs: 2 }, 2);
smallState = reducePianoNoteEvent(smallState, { type: "note-on", note: 64, velocity: 1, channel: 0, atMs: 3 }, 2);
assert.deepEqual(smallState.voices.map((voice) => voice.note), [62, 64]);
smallState = reducePianoNoteEvent(smallState, { type: "all-notes-off", atMs: 4 }, 2);
assert.deepEqual(smallState.voices, []);

const cache = new BoundedPianoSampleCache<string>(2);
assert.equal(cache.set("a", "A"), null);
assert.equal(cache.set("b", "B"), null);
assert.equal(cache.get("a"), "A");
assert.equal(cache.set("c", "C"), "b");
assert.equal(cache.get("b"), undefined);
assert.equal(cache.size, 2);
cache.clear();
assert.equal(cache.size, 0);

const zones: PianoSampleZone[] = [
  { id: "c4-soft", rootMidi: 60, minMidi: 57, maxMidi: 63, minVelocity: 0, maxVelocity: 0.49, assetPath: "c4-soft.ogg", gain: 1 },
  { id: "c4-loud", rootMidi: 60, minMidi: 57, maxMidi: 63, minVelocity: 0.5, maxVelocity: 1, assetPath: "c4-loud.ogg", gain: 0.8 },
];
assert.equal(selectPianoSampleZone(zones, 61, 0.2)?.id, "c4-soft");
assert.equal(selectPianoSampleZone(zones, 61, 0.8)?.id, "c4-loud");
assert.equal(selectPianoSampleZone(zones, 80, 0.8), null);

console.log("Piano audio provider and note-event foundation tests passed.");
