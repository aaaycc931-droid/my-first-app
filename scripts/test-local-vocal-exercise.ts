import assert from "node:assert/strict";

import {
  DEFAULT_LOCAL_VOCAL_EXERCISE_CONFIG,
  generateLocalVocalExercise,
  localVocalExerciseManifest,
} from "../lib/practice/localVocalExercise.js";

assert.equal(localVocalExerciseManifest.length, 5);
assert.equal(new Set(localVocalExerciseManifest.map((pattern) => pattern.id)).size, 5);

const fiveNote = generateLocalVocalExercise(DEFAULT_LOCAL_VOCAL_EXERCISE_CONFIG);
assert.equal(fiveNote.manifestVersion, "v1");
assert.equal(fiveNote.events.length, 18);
assert.deepEqual(fiveNote.events.slice(0, 9).map((event) => event.midi), [60, 62, 64, 65, 67, 65, 64, 62, 60]);
assert.ok(Math.abs(fiveNote.events[0]!.frequencyHz - 261.6256) < 0.01);

const descendingInterval = generateLocalVocalExercise({ ...DEFAULT_LOCAL_VOCAL_EXERCISE_CONFIG, patternId: "interval", direction: "descending", intervalSemitones: 12, loops: 1 });
assert.deepEqual(descendingInterval.events.map((event) => event.midi), [60, 48, 60]);

const rootOnly = generateLocalVocalExercise({ ...DEFAULT_LOCAL_VOCAL_EXERCISE_CONFIG, patternId: "major-scale", referenceMode: "root-only", loops: 3 });
assert.equal(rootOnly.events.length, 45);
assert.equal(rootOnly.playbackEvents.length, 1);

assert.throws(() => generateLocalVocalExercise({ ...DEFAULT_LOCAL_VOCAL_EXERCISE_CONFIG, bpm: 181 }), /速度/);
assert.throws(() => generateLocalVocalExercise({ ...DEFAULT_LOCAL_VOCAL_EXERCISE_CONFIG, loops: 0 }), /循环/);
assert.throws(() => generateLocalVocalExercise({ ...DEFAULT_LOCAL_VOCAL_EXERCISE_CONFIG, rootMidi: 73 }), /根音/);

console.log("Local vocal exercise generator tests passed.");
