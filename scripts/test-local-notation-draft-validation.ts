import assert from "node:assert/strict";

import {
  addNotationDraftEvent,
  changeNotationDraftTimeSignature,
  clearNotationFragmentDraft,
  createNotationFragmentDraft,
  markNotationDraftChecked,
  reconcileNotationDraftSource,
  updateNotationDraftEvent,
} from "../lib/practice/localNotationFragmentDraft";
import {
  canRunNotationDraftValidation,
  getExpectedQuarterBeatsPerMeasure,
  getNotationDraftValidationDisabledReason,
  reconcileNotationDraftValidation,
  validateNotationDraftMeasures,
} from "../lib/practice/localNotationDraftValidation";

assert.equal(getExpectedQuarterBeatsPerMeasure("2/4"), 2);
assert.equal(getExpectedQuarterBeatsPerMeasure("3/4"), 3);
assert.equal(getExpectedQuarterBeatsPerMeasure("4/4"), 4);

let twoFourDraft = createNotationFragmentDraft();
twoFourDraft = changeNotationDraftTimeSignature(twoFourDraft, "2/4");
for (const measure of [1, 2] as const) {
  twoFourDraft = addNotationDraftEvent(twoFourDraft, { type: "note", pitch: "C4", duration: "quarter", measure });
  twoFourDraft = addNotationDraftEvent(twoFourDraft, { type: "note", pitch: "D4", duration: "eighth", measure });
  twoFourDraft = addNotationDraftEvent(twoFourDraft, { type: "note", pitch: "E4", duration: "eighth", measure });
}
twoFourDraft = markNotationDraftChecked(twoFourDraft);
const validTwoFour = validateNotationDraftMeasures(twoFourDraft);
assert.ok(validTwoFour);
assert.equal(validTwoFour.status, "valid");
assert.deepEqual(validTwoFour.measures.map((measure) => measure.actualQuarterBeats), [2, 2]);

let draft = createNotationFragmentDraft();
assert.equal(canRunNotationDraftValidation(draft), false);
assert.match(getNotationDraftValidationDisabledReason(draft) ?? "", /先创建/);
assert.equal(validateNotationDraftMeasures(draft), null);

for (const measure of [1, 2] as const) {
  draft = addNotationDraftEvent(draft, { type: "note", pitch: "C4", duration: "half", measure });
  draft = addNotationDraftEvent(draft, { type: "rest", duration: "quarter", measure });
}
assert.equal(canRunNotationDraftValidation(draft), false);
assert.match(getNotationDraftValidationDisabledReason(draft) ?? "", /标记为已检查/);

draft = markNotationDraftChecked(draft);
const underfilled = validateNotationDraftMeasures(draft);
assert.ok(underfilled);
assert.equal(underfilled.status, "invalid");
assert.deepEqual(underfilled.measures.map((measure) => measure.state), ["underfilled", "underfilled"]);
assert.deepEqual(underfilled.measures.map((measure) => measure.actualQuarterBeats), [3, 3]);
assert.equal(underfilled.canProceedToStageE, false);

draft = addNotationDraftEvent(draft, { type: "note", pitch: "D4", duration: "quarter", measure: 1 });
draft = addNotationDraftEvent(draft, { type: "note", pitch: "E4", duration: "quarter", measure: 2 });
const staleAfterEdit = reconcileNotationDraftValidation(underfilled, draft);
assert.equal(staleAfterEdit?.status, "stale");
assert.equal(staleAfterEdit?.canProceedToStageE, false);
assert.equal(canRunNotationDraftValidation(draft), false);

draft = markNotationDraftChecked(draft);
const valid = validateNotationDraftMeasures(draft);
assert.ok(valid);
assert.equal(valid.status, "valid");
assert.deepEqual(valid.measures.map((measure) => measure.state), ["valid", "valid"]);
assert.equal(valid.canProceedToStageE, true);

draft = changeNotationDraftTimeSignature(draft, "3/4");
assert.equal(reconcileNotationDraftValidation(valid, draft)?.status, "stale");
draft = markNotationDraftChecked(draft);
const overfilled = validateNotationDraftMeasures(draft);
assert.ok(overfilled);
assert.equal(overfilled.status, "invalid");
assert.deepEqual(overfilled.measures.map((measure) => measure.state), ["overfilled", "overfilled"]);

const firstEvent = draft.events[0];
draft = updateNotationDraftEvent(draft, firstEvent.id, { ...firstEvent, duration: "quarter" });
assert.equal(reconcileNotationDraftValidation(overfilled, draft)?.status, "stale");

let visualDraft = createNotationFragmentDraft({ mode: "visual-reference", sourceId: "source-a" });
visualDraft = addNotationDraftEvent(visualDraft, { type: "note", pitch: "C4", duration: "half", measure: 1 });
visualDraft = markNotationDraftChecked(visualDraft);
const staleSource = reconcileNotationDraftSource(visualDraft, "source-b");
assert.equal(canRunNotationDraftValidation(staleSource), false);
assert.match(getNotationDraftValidationDisabledReason(staleSource) ?? "", /参考图片已变更/);

const cleared = clearNotationFragmentDraft(draft);
assert.equal(canRunNotationDraftValidation(cleared), false);
assert.equal(reconcileNotationDraftValidation(overfilled, cleared)?.status, "stale");

console.log("local notation draft validation tests passed");
