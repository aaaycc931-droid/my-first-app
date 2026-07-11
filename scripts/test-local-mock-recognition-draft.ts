import assert from "node:assert/strict";
import {
  canCreatePracticeTargetFromMockRecognitionDraft,
  canCreateValidationFromMockRecognitionDraft,
  canGenerateMockRecognitionDraft,
  canUseMockRecognitionDraftAsCurrent,
  clearMockRecognitionDraft,
  copyMockRecognitionDraftToManualDraft,
  createMockRecognitionDraft,
  getMockRecognitionDraftStatus,
  markMockRecognitionDraftChecked,
  markMockRecognitionDraftUnchecked,
  reconcileMockRecognitionDraftSource,
  noSheetMusicSourceMockDraftReason,
} from "../lib/practice/localMockRecognitionDraft";
import { createNotationFragmentDraft, addNotationDraftEvent } from "../lib/practice/localNotationFragmentDraft";

assert.equal(canGenerateMockRecognitionDraft(null), false);
assert.equal(noSheetMusicSourceMockDraftReason.includes("请先选择一张本地乐谱图片"), true);
assert.equal(createMockRecognitionDraft(null), null);

const sourceA = "image-a";
let draft = createMockRecognitionDraft(sourceA);
assert.ok(draft);
assert.equal(draft.sourceType, "mock-data");
assert.equal(draft.sourceId, sourceA);
assert.equal(draft.timeSignature, "4/4");
assert.equal(draft.measureCount, 2);
assert.equal(draft.events.length, 5);
assert.equal(draft.events.some((event) => event.type === "rest"), true);
assert.equal(draft.events.some((event) => event.reliability !== "clear"), true);
assert.equal(draft.events.some((event) => event.reliability === "possibly-missing"), true);
assert.equal(getMockRecognitionDraftStatus(draft), "draft");
assert.equal(canUseMockRecognitionDraftAsCurrent(draft, sourceA), true);

draft = markMockRecognitionDraftChecked(draft)!;
assert.equal(draft.checked, true);
assert.equal(getMockRecognitionDraftStatus(draft), "checked");
draft = markMockRecognitionDraftUnchecked(draft)!;
assert.equal(draft.checked, false);

const staleByReplace = reconcileMockRecognitionDraftSource(draft, "image-b")!;
assert.equal(staleByReplace.stale, true);
assert.equal(staleByReplace.checked, false);
assert.equal(getMockRecognitionDraftStatus(staleByReplace), "stale");
assert.equal(canUseMockRecognitionDraftAsCurrent(staleByReplace, "image-b"), false);
assert.equal(copyMockRecognitionDraftToManualDraft(staleByReplace), null);

const staleByClear = reconcileMockRecognitionDraftSource(draft, null)!;
assert.equal(staleByClear.stale, true);
assert.equal(canUseMockRecognitionDraftAsCurrent(staleByClear, null), false);

const manual = copyMockRecognitionDraftToManualDraft(draft);
assert.ok(manual);
assert.equal(manual.events.length, draft.events.length);
assert.equal(manual.checked, false);
assert.equal(manual.stale, false);
assert.equal(manual.source.mode, "independent");
assert.equal(manual.timeSignature, "4/4");
assert.equal(manual.events[1].pitch, "D4");

let existingManual = createNotationFragmentDraft();
existingManual = addNotationDraftEvent(existingManual, { type: "note", pitch: "C4", duration: "quarter", measure: 1 });
const clearedMock = clearMockRecognitionDraft();
assert.equal(clearedMock, null);
assert.equal(existingManual.events.length, 1);
assert.equal(sourceA, "image-a");

const regenerated = createMockRecognitionDraft(sourceA)!;
assert.equal(regenerated.checked, false);
assert.notEqual(regenerated, draft);

assert.equal(canCreateValidationFromMockRecognitionDraft(), false);
assert.equal(canCreatePracticeTargetFromMockRecognitionDraft(), false);

console.log("local mock recognition draft tests passed");
