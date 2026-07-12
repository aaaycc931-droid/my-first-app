import assert from "node:assert/strict";

import {
  addNotationDraftEvent,
  canCreatePracticeTargetFromNotationDraft,
  changeNotationDraftTimeSignature,
  clearNotationFragmentDraft,
  confirmNotationDraftWithCurrentSource,
  convertNotationDraftToIndependent,
  createNotationFragmentDraft,
  deleteNotationDraftEvent,
  getNotationDraftStatus,
  markNotationDraftChecked,
  maxNotationDraftEvents,
  reconcileNotationDraftSource,
  resetNotationFragmentDraft,
  updateNotationDraftEvent,
} from "../lib/practice/localNotationFragmentDraft";
import {
  copyMockRecognitionDraftToManualDraft,
  createMockRecognitionDraft,
} from "../lib/practice/localMockRecognitionDraft";

let draft = createNotationFragmentDraft();
assert.equal(getNotationDraftStatus(draft), "empty");

draft = addNotationDraftEvent(draft, { type: "note", pitch: "C4", duration: "quarter", measure: 1 });
draft = addNotationDraftEvent(draft, { type: "rest", duration: "quarter", measure: 1 });
assert.equal(draft.events.length, 2);
assert.equal(draft.events[1].type, "rest");

for (let index = draft.events.length; index < maxNotationDraftEvents; index += 1) {
  draft = addNotationDraftEvent(draft, { type: "note", pitch: "D4", duration: "eighth", measure: 2 });
}
const atLimit = draft;
assert.equal(atLimit.events.length, maxNotationDraftEvents);
assert.equal(
  addNotationDraftEvent(atLimit, { type: "note", pitch: "E4", duration: "quarter", measure: 1 }).events.length,
  maxNotationDraftEvents,
);

draft = markNotationDraftChecked(atLimit);
assert.equal(draft.checked, true);
draft = updateNotationDraftEvent(draft, draft.events[0].id, { type: "note", pitch: "G4", duration: "half", measure: 2 });
assert.equal(draft.checked, false);
assert.equal(draft.events[0].pitch, "G4");

draft = markNotationDraftChecked(draft);
assert.equal(draft.checked, true);
draft = deleteNotationDraftEvent(draft, draft.events[0].id);
assert.equal(draft.checked, false);
assert.equal(draft.events.length, maxNotationDraftEvents - 1);

draft = markNotationDraftChecked(draft);
draft = changeNotationDraftTimeSignature(draft, "3/4");
assert.equal(draft.checked, false);
assert.equal(draft.timeSignature, "3/4");

draft = confirmNotationDraftWithCurrentSource(draft, "source-a");
draft = markNotationDraftChecked(draft);
const staleAfterReplace = reconcileNotationDraftSource(draft, "source-b");
assert.equal(staleAfterReplace.stale, true);
assert.equal(staleAfterReplace.checked, false);
assert.equal(getNotationDraftStatus(staleAfterReplace), "stale");

const staleAfterClear = reconcileNotationDraftSource(draft, null);
assert.equal(staleAfterClear.stale, true);
assert.equal(staleAfterClear.checked, false);

const independentAfterStale = convertNotationDraftToIndependent(staleAfterReplace);
assert.equal(independentAfterStale.source.mode, "independent");
assert.equal(independentAfterStale.stale, false);
assert.equal(independentAfterStale.checked, false);

const cleared = clearNotationFragmentDraft(independentAfterStale);
assert.equal(cleared.events.length, 0);
assert.equal(cleared.checked, false);
assert.equal(getNotationDraftStatus(cleared), "cleared");

const reset = resetNotationFragmentDraft({ mode: "visual-reference", sourceId: "source-b" });
assert.equal(reset.events.length, 0);
assert.equal(reset.checked, false);
assert.equal(reset.source.mode, "visual-reference");
assert.equal(getNotationDraftStatus(reset), "cleared");

const importedFromMock = copyMockRecognitionDraftToManualDraft(createMockRecognitionDraft("source-c"));
assert.ok(importedFromMock);
assert.equal(importedFromMock.checked, false);
assert.equal(importedFromMock.stale, false);
assert.equal(importedFromMock.source.mode, "independent");

assert.equal(canCreatePracticeTargetFromNotationDraft(), false);

console.log("local notation fragment draft regression tests passed");
