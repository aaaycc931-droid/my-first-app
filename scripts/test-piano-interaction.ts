import assert from "node:assert/strict";

import { getFullPianoKeys } from "../lib/piano/localPianoKeyboard";
import {
  getPianoKeyVisibleLabel,
  getPianoStressTestKeyIds,
  midiToScientificNoteName,
  splitFullPianoRows,
  transposePianoKeys,
} from "../lib/piano/pianoInteraction";

const keys = getFullPianoKeys();
assert.equal(keys.length, 88);
assert.equal(midiToScientificNoteName(21), "A0");
assert.equal(midiToScientificNoteName(60), "C4");
assert.equal(midiToScientificNoteName(108), "C8");

const upOctave = transposePianoKeys(keys, 12);
assert.equal(upOctave.length, 88);
assert.equal(upOctave[0].id, keys[0].id, "physical key identity remains stable");
assert.equal(upOctave[0].midi, 33);
assert.equal(upOctave[0].soundingNoteName, "A1");
assert.match(upOctave[0].accessibleLabel, /移调后发出 A1/);
assert.equal(transposePianoKeys(keys, 99)[0].midi, 33, "transpose clamps to one octave");

assert.equal(getPianoKeyVisibleLabel(upOctave[0], "scientific"), "A1");
assert.equal(getPianoKeyVisibleLabel(upOctave[0], "fixed-solfege"), "la");
assert.equal(getPianoKeyVisibleLabel(upOctave[0], "hidden"), "");

assert.deepEqual(splitFullPianoRows(keys, "single").map((row) => row.length), [88]);
assert.deepEqual(splitFullPianoRows(keys, "double").map((row) => row.length), [39, 49]);
const transposedRows = splitFullPianoRows(upOctave, "double");
assert.equal(transposedRows[0].at(-1)?.noteName, "B3", "row split follows physical keys");
assert.equal(transposedRows[1][0]?.noteName, "C4");

const stressIds = getPianoStressTestKeyIds(keys);
assert.equal(stressIds.length, 32);
assert.equal(new Set(stressIds).size, 32);

console.log("Piano interaction tests passed.");
