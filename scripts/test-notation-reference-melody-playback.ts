import { strict as assert } from "node:assert";

import { getNotationReferenceMelodyPlaybackDurationSeconds, getNotationReferenceMelodyPlaybackPlan } from "../lib/practice/notationReferenceMelodyPlayback";
import type { NotationDraftEvent } from "../lib/practice/localNotationFragmentDraft";

const events: NotationDraftEvent[] = [
  { id: "one", type: "note", pitch: "C4", duration: "quarter", measure: 1 },
  { id: "two", type: "rest", pitch: null, duration: "quarter", measure: 1 },
  { id: "three", type: "note", pitch: "E4", duration: "half", measure: 2 },
  { id: "four", type: "note", pitch: "G4", duration: "eighth", measure: 2 },
];

const plan = getNotationReferenceMelodyPlaybackPlan(events);
assert.equal(plan.length, 4);
assert.equal(plan[0].offsetSeconds, 0);
assert.equal(plan[0].durationSeconds, 0.6);
assert.equal(plan[0].frequencyHz, 261.625565);
assert.equal(plan[1].offsetSeconds, 0.6);
assert.equal(plan[1].frequencyHz, null, "rests must reserve time but not schedule a tone");
assert.equal(plan[2].offsetSeconds, 1.2);
assert.equal(plan[2].durationSeconds, 1.2);
assert.equal(plan[3].offsetSeconds, 2.4);
assert.equal(plan[3].durationSeconds, 0.3);
assert.ok(Math.abs(getNotationReferenceMelodyPlaybackDurationSeconds(events) - 2.7) < 0.000001);
assert.deepEqual(getNotationReferenceMelodyPlaybackPlan([]), []);
assert.equal(getNotationReferenceMelodyPlaybackDurationSeconds([]), 0);

const slowPlan = getNotationReferenceMelodyPlaybackPlan(events, 0.75);
assert.ok(Math.abs(slowPlan[0].durationSeconds - 0.8) < 0.000001);
assert.ok(Math.abs(slowPlan[1].offsetSeconds - 0.8) < 0.000001);
assert.ok(Math.abs(slowPlan[2].offsetSeconds - 1.6) < 0.000001);
assert.ok(Math.abs(getNotationReferenceMelodyPlaybackDurationSeconds(events, 0.75) - 3.6) < 0.000001);

console.log("notation reference melody playback tests passed");
