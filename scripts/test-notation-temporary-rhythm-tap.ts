import assert from "node:assert/strict";

import { createNotationFragmentDraft, addNotationDraftEvent } from "../lib/practice/localNotationFragmentDraft";
import {
  createNotationTemporaryRhythmTapTargets,
  getNotationTemporaryRhythmTotalBeats,
  hasNotationTemporaryRhythmAssessmentFields,
} from "../lib/practice/notationTemporaryRhythmTap";

let draft = createNotationFragmentDraft();
draft = addNotationDraftEvent(draft, { type: "note", pitch: "C4", duration: "quarter", measure: 1 });
draft = addNotationDraftEvent(draft, { type: "rest", pitch: null, duration: "quarter", measure: 1 });
draft = addNotationDraftEvent(draft, { type: "note", pitch: "D4", duration: "half", measure: 1 });
draft = addNotationDraftEvent(draft, { type: "note", pitch: "E4", duration: "quarter", measure: 2 });

assert.equal(getNotationTemporaryRhythmTotalBeats(draft.events), 5);
const targets = createNotationTemporaryRhythmTapTargets({
  draft,
  config: { bpm: 120, meter: "2/4", countIn: { enabled: false, bars: 0 }, subdivision: "quarter" },
  practiceStartTimeMs: 1000,
});

assert.equal(targets.length, 3);
assert.deepEqual(targets.map((target) => target.notationEventIndex), [0, 2, 3]);
assert.deepEqual(targets.map((target) => target.targetTimeMs), [1000, 2000, 3000]);
assert.deepEqual(targets.map((target) => target.notationMeasure), [1, 1, 2]);
assert.equal(targets[1].subdivisionIndex, 0);
assert.equal(targets[2].barNumber, 2);
assert.equal(targets.every((target) => !hasNotationTemporaryRhythmAssessmentFields(target)), true);

let eighthDraft = createNotationFragmentDraft();
eighthDraft = addNotationDraftEvent(eighthDraft, { type: "note", pitch: "C4", duration: "eighth", measure: 1 });
eighthDraft = addNotationDraftEvent(eighthDraft, { type: "note", pitch: "D4", duration: "eighth", measure: 1 });
const eighthTargets = createNotationTemporaryRhythmTapTargets({
  draft: eighthDraft,
  config: { bpm: 120, meter: "4/4", countIn: { enabled: false, bars: 0 }, subdivision: "quarter" },
  practiceStartTimeMs: 0,
});
assert.deepEqual(eighthTargets.map((target) => target.targetTimeMs), [0, 250]);
assert.equal(eighthTargets[1].subdivisionIndex, 1);
assert.equal(eighthTargets[1].subdivisionCountPerBeat, 2);

const emptyTargets = createNotationTemporaryRhythmTapTargets({
  draft: { ...draft, events: [] },
  config: { bpm: 60, meter: "4/4", countIn: { enabled: false, bars: 0 }, subdivision: "quarter" },
  practiceStartTimeMs: 0,
});
assert.deepEqual(emptyTargets, []);

console.log("notation temporary rhythm tap tests passed");
