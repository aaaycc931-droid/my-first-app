import {
  midiToFrequencyHz,
  noteNameToFrequencyHz,
  noteNameToMidi,
} from "../lib/audio/noteFrequency.js";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const closeTo = (actual: number | null, expected: number) =>
  actual !== null && Math.abs(actual - expected) < 0.01;

assert(noteNameToMidi("C4") === 60, "C4 should map to MIDI 60");
assert(noteNameToMidi("F#4") === 66, "ASCII sharp should be supported");
assert(noteNameToMidi("G♭4") === 66, "Unicode flat should be supported");
assert(closeTo(noteNameToFrequencyHz("A4"), 440), "A4 should be 440 Hz");
assert(closeTo(midiToFrequencyHz(69), 440), "MIDI 69 should be 440 Hz");
assert(noteNameToFrequencyHz("not-a-note") === null, "invalid notes should fail safely");

console.log("note frequency tests passed");
