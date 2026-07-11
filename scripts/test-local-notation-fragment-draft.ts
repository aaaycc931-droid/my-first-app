import assert from "node:assert/strict";
import {
  addNotationDraftEvent,
  canCreateNotationValidation,
  canCreatePracticeTargetFromNotationDraft,
  changeNotationDraftTimeSignature,
  clearNotationFragmentDraft,
  confirmNotationDraftWithCurrentSource,
  convertNotationDraftToIndependent,
  createNotationFragmentDraft,
  deleteNotationDraftEvent,
  getNotationDraftStatus,
  isAllowedDuration,
  isAllowedPitch,
  isAllowedTimeSignature,
  markNotationDraftChecked,
  maxNotationDraftEvents,
  reconcileNotationDraftSource,
  resetNotationFragmentDraft,
  updateNotationDraftEvent,
} from "../lib/practice/localNotationFragmentDraft";

assert.equal(isAllowedTimeSignature("2/4"), true);
assert.equal(isAllowedTimeSignature("5/4"), false);
assert.equal(isAllowedPitch("C4"), true);
assert.equal(isAllowedPitch("D5"), false);
assert.equal(isAllowedDuration("half"), true);
assert.equal(isAllowedDuration("whole"), false);

let draft = createNotationFragmentDraft();
draft = addNotationDraftEvent(draft, { type: "note", pitch: "C4", duration: "quarter", measure: 1 });
draft = addNotationDraftEvent(draft, { type: "rest", duration: "quarter", measure: 1 });
assert.equal(draft.events.length, 2);
assert.equal(draft.events[1].pitch, null);
assert.equal(getNotationDraftStatus(draft), "draft");

draft = markNotationDraftChecked(draft);
assert.equal(draft.checked, true);
draft = updateNotationDraftEvent(draft, draft.events[0].id, { type: "note", pitch: "D4", duration: "eighth", measure: 2 });
assert.equal(draft.checked, false);
assert.equal(draft.events[0].pitch, "D4");
draft = markNotationDraftChecked(draft);
draft = changeNotationDraftTimeSignature(draft, "3/4");
assert.equal(draft.checked, false);

draft = deleteNotationDraftEvent(draft, draft.events[1].id);
assert.equal(draft.events.length, 1);

for (let index = draft.events.length; index < maxNotationDraftEvents + 2; index += 1) {
  draft = addNotationDraftEvent(draft, { type: "note", pitch: "E4", duration: "half", measure: 1 });
}
assert.equal(draft.events.length, maxNotationDraftEvents);

let sourcedDraft = createNotationFragmentDraft({ mode: "visual-reference", sourceId: "image-a" });
sourcedDraft = addNotationDraftEvent(sourcedDraft, { type: "note", pitch: "F4", duration: "quarter", measure: 1 });
sourcedDraft = markNotationDraftChecked(sourcedDraft);
sourcedDraft = reconcileNotationDraftSource(sourcedDraft, "image-b");
assert.equal(getNotationDraftStatus(sourcedDraft), "stale");
assert.equal(sourcedDraft.checked, false);
sourcedDraft = convertNotationDraftToIndependent(sourcedDraft);
assert.equal(sourcedDraft.source.mode, "independent");
assert.equal(sourcedDraft.checked, false);
assert.equal(getNotationDraftStatus(sourcedDraft), "draft");
sourcedDraft = confirmNotationDraftWithCurrentSource(sourcedDraft, "image-b");
assert.equal(sourcedDraft.checked, false);

let cleared = clearNotationFragmentDraft(sourcedDraft);
assert.equal(cleared.events.length, 0);
assert.equal(getNotationDraftStatus(cleared), "cleared");
let reset = resetNotationFragmentDraft(cleared.source);
assert.equal(reset.events.length, 0);
assert.equal(reset.checked, false);
assert.equal(reset.timeSignature, "4/4");

assert.equal(canCreateNotationValidation(), false);
assert.equal(canCreatePracticeTargetFromNotationDraft(), false);

console.log("local notation fragment draft tests passed");
