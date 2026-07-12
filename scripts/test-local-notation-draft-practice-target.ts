import assert from "node:assert/strict";

import {
  canCreateNotationTemporaryPracticeTarget,
  createNotationTemporaryPracticeTarget,
  getNotationTemporaryPracticeTargetDisabledReason,
  reconcileNotationTemporaryPracticeTarget,
} from "../lib/practice/localNotationDraftPracticeTarget";
import {
  addNotationDraftEvent,
  createNotationFragmentDraft,
  markNotationDraftChecked,
  updateNotationDraftEvent,
} from "../lib/practice/localNotationFragmentDraft";
import { validateNotationDraftMeasures } from "../lib/practice/localNotationDraftValidation";

const quarterNote = { type: "note" as const, pitch: "C4" as const, duration: "quarter" as const, measure: 1 as const };

let draft = createNotationFragmentDraft();
for (let index = 0; index < 4; index += 1) draft = addNotationDraftEvent(draft, quarterNote);
for (let index = 0; index < 4; index += 1) {
  draft = addNotationDraftEvent(draft, { ...quarterNote, pitch: "D4", measure: 2 });
}

assert.equal(canCreateNotationTemporaryPracticeTarget(draft, null), false);
assert.match(getNotationTemporaryPracticeTargetDisabledReason(draft, null), /检查/);

draft = markNotationDraftChecked(draft);
const validation = validateNotationDraftMeasures(draft);
assert.ok(validation);
assert.equal(validation.status, "valid");
assert.equal(canCreateNotationTemporaryPracticeTarget(draft, validation), true);

const target = createNotationTemporaryPracticeTarget(draft, validation, "sight-singing", 100);
assert.ok(target);
assert.equal(target.status, "active");
assert.equal(target.events.length, 8);
assert.equal(target.mode, "sight-singing");
assert.equal(target.sessionOnly, true);
assert.equal(target.localOnly, true);
assert.equal(target.nonScoring, true);

const changedDraft = updateNotationDraftEvent(draft, draft.events[0].id, {
  ...quarterNote,
  duration: "half",
});
const staleTarget = reconcileNotationTemporaryPracticeTarget(target, changedDraft, validation);
assert.equal(staleTarget?.status, "stale");

const invalidValidation = validateNotationDraftMeasures(markNotationDraftChecked(changedDraft));
assert.ok(invalidValidation);
assert.equal(invalidValidation.status, "invalid");
assert.equal(createNotationTemporaryPracticeTarget(changedDraft, invalidValidation, "rhythm"), null);
assert.match(getNotationTemporaryPracticeTargetDisabledReason(changedDraft, invalidValidation), /校验/);

const clearedValidationTarget = reconcileNotationTemporaryPracticeTarget(target, draft, null);
assert.equal(clearedValidationTarget?.status, "stale");

console.log("local notation draft practice target tests passed");
