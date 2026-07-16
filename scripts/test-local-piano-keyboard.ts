import assert from "node:assert/strict";

import {
  DEFAULT_LOCAL_PIANO_RANGE_ID,
  LOCAL_PIANO_RANGE_IDS,
  MAX_LOCAL_PIANO_ACTIVE_KEYS,
  clampLocalPianoVolume,
  createLocalPianoKeyboardState,
  getLocalPianoKeys,
  pressLocalPianoKey,
  releaseLocalPianoPointer,
  resetLocalPianoKeyboard,
  setLocalPianoSustain,
  setLocalPianoVolume,
} from "../lib/piano/localPianoKeyboard";

assert.equal(DEFAULT_LOCAL_PIANO_RANGE_ID, "C4-C5");
for (const rangeId of LOCAL_PIANO_RANGE_IDS) {
  const keys = getLocalPianoKeys(rangeId);
  assert.equal(keys.length, 13, `${rangeId} should have thirteen chromatic keys`);
  assert.equal(new Set(keys.map((key) => key.id)).size, 13);
  assert.equal(keys.filter((key) => key.keyType === "white").length, 8);
  assert.equal(keys.filter((key) => key.keyType === "black").length, 5);
  assert.deepEqual(
    keys.filter((key) => key.keyType === "black").map((key) => key.whiteKeyIndex),
    [0, 1, 3, 4, 5],
  );
  keys.forEach((key, index) => {
    if (index > 0) {
      assert.equal(key.midi, keys[index - 1].midi + 1);
      assert.ok(key.frequencyHz > keys[index - 1].frequencyHz);
    }
    assert.match(key.accessibleLabel, /[黑白]键/);
  });
}

const middleRange = getLocalPianoKeys("C4-C5");
assert.equal(middleRange[0].midi, 60);
assert.match(middleRange[0].accessibleLabel, /中央 C/);
const a4 = middleRange.find((key) => key.noteName === "A4");
assert.ok(a4);
assert.ok(Math.abs(a4.frequencyHz - 440) < 0.001);
assert.match(
  middleRange.find((key) => key.noteName === "C#4")?.accessibleLabel ?? "",
  /升 C4，黑键/,
);

assert.equal(clampLocalPianoVolume(-1), 0);
assert.equal(clampLocalPianoVolume(2), 1);
assert.equal(clampLocalPianoVolume(Number.NaN), 0.7);
let state = createLocalPianoKeyboardState(2);
assert.equal(state.volume, 1);
assert.equal(setLocalPianoVolume(state, 1), state);
state = setLocalPianoVolume(state, 0.35);
assert.equal(state.volume, 0.35);

state = pressLocalPianoKey(state, 1, "c4");
state = pressLocalPianoKey(state, 2, "c4");
assert.deepEqual(state.activeKeyIds, ["c4"]);
assert.equal(Object.keys(state.pointers).length, 2);
state = releaseLocalPianoPointer(state, 1);
assert.deepEqual(state.activeKeyIds, ["c4"], "another pointer still holds the key");
state = releaseLocalPianoPointer(state, 2);
assert.deepEqual(state.activeKeyIds, []);

state = setLocalPianoSustain(state, true);
state = pressLocalPianoKey(state, "KeyA", "c4");
state = releaseLocalPianoPointer(state, "KeyA");
assert.deepEqual(state.activeKeyIds, ["c4"]);
assert.deepEqual(state.latchedKeyIds, ["c4"]);
state = pressLocalPianoKey(state, "KeyS", "c4");
assert.deepEqual(state.latchedKeyIds, [], "pressing a sustained key holds it again");
state = releaseLocalPianoPointer(state, "KeyS");
assert.deepEqual(state.latchedKeyIds, ["c4"]);
state = setLocalPianoSustain(state, false);
assert.deepEqual(state.activeKeyIds, []);
assert.deepEqual(state.latchedKeyIds, []);

state = createLocalPianoKeyboardState();
for (let index = 0; index < MAX_LOCAL_PIANO_ACTIVE_KEYS; index += 1) {
  state = pressLocalPianoKey(state, index, `key-${index}`);
}
assert.equal(state.activeKeyIds.length, MAX_LOCAL_PIANO_ACTIVE_KEYS);
const fullState = state;
state = pressLocalPianoKey(state, 99, "ninth-key");
assert.equal(state, fullState, "the ninth unique active key should be rejected");
assert.equal(state.pointers["pointer:99"], undefined);
state = pressLocalPianoKey(state, 100, "key-0");
assert.equal(state.activeKeyIds.length, MAX_LOCAL_PIANO_ACTIVE_KEYS);
assert.equal(state.pointers["pointer:100"], "key-0", "an active key accepts another pointer");

const reset = resetLocalPianoKeyboard(state);
assert.deepEqual(reset.activeKeyIds, []);
assert.deepEqual(reset.latchedKeyIds, []);
assert.deepEqual(reset.pointers, {});
assert.equal(reset.volume, state.volume);
assert.equal(reset.sustainEnabled, state.sustainEnabled);
assert.equal(resetLocalPianoKeyboard(reset), reset, "reset should be idempotent");
assert.equal(releaseLocalPianoPointer(reset, "missing"), reset);

console.log("Local piano keyboard tests passed.");
