import assert from "node:assert/strict";

import type { ActivityAnswer } from "../lib/activity/activityAnswer";
import { adaptMelodyDictationQuestionToActivity } from "../lib/activity/legacyLocalActivityAdapter";
import {
  adaptMelodyStaffNotationAnswerToActivityEvidence,
  createMelodyStaffNotationAnswer,
  enableMelodyStaffNotationInput,
} from "../lib/activity/melodyStaffNotationActivityAdapter";
import { createScoreDocumentFromMelodyStaffNotationDraft } from "../lib/music/scoreDocument";
import type {
  EarTrainingMelodyNoteId,
  LocalEarTrainingMelodyQuestion,
} from "../lib/practice/localEarTrainingMelodyDictation";
import {
  canConfirmMelodyStaffNotationDraft,
  checkMelodyStaffNotationDraft,
  clearMelodyStaffNotationDraft,
  confirmMelodyStaffNotationDraft,
  createMelodyStaffNotationDraft,
  getMelodyStaffNotationDraftFingerprint,
  setMelodyStaffNotationDraftNote,
  validateMelodyStaffNotationDraft,
} from "../lib/practice/localMelodyStaffNotationDraft";

const question = (noteIds: string[]): LocalEarTrainingMelodyQuestion => ({
  id: `test-${noteIds.join("-")}`,
  variantId: `melody:test-${noteIds.join("-")}`,
  difficulty: "挑战",
  sequence: 0,
  melody: {
    id: `test-${noteIds.join("-")}`,
    label: "测试三音旋律",
    noteIds,
    explanation: "测试旋律说明。",
  },
});

const exactQuestion = question(["c4", "f-sharp-4", "c4"]);
const definition = enableMelodyStaffNotationInput(
  adaptMelodyDictationQuestionToActivity(exactQuestion),
);
assert.equal(definition.family, "melody-dictation");
assert.deepEqual(definition.allowedInputModes, ["choice", "staff-notation"]);

let draft = createMelodyStaffNotationDraft({
  question: exactQuestion,
  attemptId: "attempt-1",
  playbackQualificationId: "qualification-1",
});
assert.equal(validateMelodyStaffNotationDraft(draft).status, "invalid");
assert.throws(() => setMelodyStaffNotationDraftNote(draft, -1, "c4"), /位置/);
assert.throws(
  () => setMelodyStaffNotationDraftNote(draft, 0, "invalid-note" as EarTrainingMelodyNoteId),
  /不支持的音高/,
);
const initialRevision = draft.revision;
draft = setMelodyStaffNotationDraftNote(draft, 0, "c4");
assert.equal(draft.revision, initialRevision + 1);
draft = setMelodyStaffNotationDraftNote(draft, 1, "f-sharp-4");
assert.equal(draft.revision, initialRevision + 2);
draft = setMelodyStaffNotationDraftNote(draft, 2, "c4");
assert.equal(draft.revision, initialRevision + 3);
assert.deepEqual(draft.noteIds, ["c4", "f-sharp-4", "c4"], "F♯ 与重复音必须无损保留");
assert.equal(validateMelodyStaffNotationDraft(draft).status, "valid");
draft = checkMelodyStaffNotationDraft(draft);
assert.equal(draft.reviewState, "checked");
assert.equal(draft.checkedFingerprint, getMelodyStaffNotationDraftFingerprint(draft));
assert.equal(canConfirmMelodyStaffNotationDraft(draft), true);

const edited = setMelodyStaffNotationDraftNote(draft, 2, "c5");
assert.equal(edited.reviewState, "draft");
assert.equal(edited.checkedFingerprint, null);
assert.equal(canConfirmMelodyStaffNotationDraft(edited), false);

draft = confirmMelodyStaffNotationDraft(draft);
assert.equal(draft.reviewState, "confirmed");
const document = createScoreDocumentFromMelodyStaffNotationDraft({ question: exactQuestion, draft });
assert.deepEqual(
  createScoreDocumentFromMelodyStaffNotationDraft({ question: exactQuestion, draft }),
  document,
  "同一确认草稿必须产生稳定文档身份与内容",
);
assert.notStrictEqual(
  document.parts[0].staves[0].voices[0].measures[0].events,
  draft.noteIds,
  "确认文档事件不能共享草稿音符数组引用",
);
assert.equal(document.documentKind, "melody-dictation-answer");
assert.equal(document.revision, draft.revision);
assert.equal(document.source.attemptId, "attempt-1");
assert.equal(document.source.playbackQualificationId, "qualification-1");
assert.deepEqual(
  document.parts[0].staves[0].voices[0].measures[0].events.map((event) => event.noteId),
  ["c4", "f-sharp-4", "c4"],
);
const answer = createMelodyStaffNotationAnswer(document);
const documentEvents = document.parts[0].staves[0].voices[0].measures[0].events;
const withDocumentEvents = (
  events: typeof documentEvents,
): typeof document => ({
  ...document,
  parts: [{
    ...document.parts[0],
    staves: [{
      ...document.parts[0].staves[0],
      voices: [{
        ...document.parts[0].staves[0].voices[0],
        measures: [{
          ...document.parts[0].staves[0].voices[0].measures[0],
          events,
        }],
      }],
    }],
  }],
});
const exactEvidence = adaptMelodyStaffNotationAnswerToActivityEvidence({
  definition,
  question: exactQuestion,
  document,
  answer,
  attemptId: "attempt-1",
  playbackQualificationId: "qualification-1",
});
assert.equal(exactEvidence.state, "consistent");
assert.equal(exactEvidence.assessmentMode, "non-scoring");
for (const field of ["score", "grade", "pass", "fail", "accuracyPercentage"]) {
  assert.equal(field in exactEvidence, false);
}

const differentQuestion = question(["c4", "f-sharp-4", "c5"]);
let differentDraft = createMelodyStaffNotationDraft({
  question: differentQuestion,
  attemptId: "attempt-2",
  playbackQualificationId: "qualification-2",
});
(["c5", "f-sharp-4", "c4"] as const).forEach((noteId, position) => {
  differentDraft = setMelodyStaffNotationDraftNote(differentDraft, position, noteId);
});
differentDraft = confirmMelodyStaffNotationDraft(checkMelodyStaffNotationDraft(differentDraft));
const differentDocument = createScoreDocumentFromMelodyStaffNotationDraft({
  question: differentQuestion,
  draft: differentDraft,
});
const differentDefinition = enableMelodyStaffNotationInput(
  adaptMelodyDictationQuestionToActivity(differentQuestion),
);
assert.equal(adaptMelodyStaffNotationAnswerToActivityEvidence({
  definition: differentDefinition,
  question: differentQuestion,
  document: differentDocument,
  answer: createMelodyStaffNotationAnswer(differentDocument),
  attemptId: "attempt-2",
  playbackQualificationId: "qualification-2",
}).state, "different");

const insufficientCases: Array<{
  document: typeof document | null;
  answer: ActivityAnswer | undefined;
  attemptId: string;
  playbackQualificationId: string;
}> = [
  { document: null, answer, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
  { document, answer: undefined, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
  { document, answer: { ...answer, revision: answer.revision + 1 }, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
  { document, answer, attemptId: "foreign-attempt", playbackQualificationId: "qualification-1" },
  { document, answer, attemptId: "attempt-1", playbackQualificationId: "foreign-qualification" },
  { document: { ...document, documentId: "forged-document" }, answer, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
  { document: { ...document, source: { ...document.source, draftFingerprint: "forged-fingerprint" } }, answer, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
  { document: { ...document, source: { ...document.source, draftId: "forged-draft" } }, answer, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
  { document: { ...document, revision: document.revision + 1 }, answer, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
  { document: withDocumentEvents([...documentEvents].reverse()), answer, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
  {
    document: withDocumentEvents(documentEvents.map((event, index) => ({
      ...event,
      position: (index === 2 ? 1 : index) as 0 | 1 | 2,
    }))),
    answer,
    attemptId: "attempt-1",
    playbackQualificationId: "qualification-1",
  },
];
for (const candidate of insufficientCases) {
  assert.equal(adaptMelodyStaffNotationAnswerToActivityEvidence({
    definition,
    question: exactQuestion,
    ...candidate,
  }).state, "insufficient");
}

assert.throws(
  () => createScoreDocumentFromMelodyStaffNotationDraft({ question: exactQuestion, draft: edited }),
  /通过检查并明确确认/,
);
assert.throws(
  () => createScoreDocumentFromMelodyStaffNotationDraft({ question: differentQuestion, draft }),
  /当前题目/,
);
const malformedLengthDraft = {
  ...draft,
  noteIds: ["c4", "d4"],
} as unknown as typeof draft;
assert.equal(validateMelodyStaffNotationDraft(malformedLengthDraft).status, "invalid");

let isolationDraft = createMelodyStaffNotationDraft({
  question: exactQuestion,
  attemptId: "attempt-isolation",
  playbackQualificationId: "qualification-isolation",
});
(["c4", "f-sharp-4", "c5"] as const).forEach((noteId, position) => {
  isolationDraft = setMelodyStaffNotationDraftNote(isolationDraft, position, noteId);
});
isolationDraft = confirmMelodyStaffNotationDraft(checkMelodyStaffNotationDraft(isolationDraft));
const isolationDocument = createScoreDocumentFromMelodyStaffNotationDraft({
  question: exactQuestion,
  draft: isolationDraft,
});
const mutableDraftNotes = isolationDraft.noteIds as unknown as Array<EarTrainingMelodyNoteId | null>;
mutableDraftNotes[0] = "a4";
assert.deepEqual(
  isolationDocument.parts[0].staves[0].voices[0].measures[0].events.map((event) => event.noteId),
  ["c4", "f-sharp-4", "c5"],
  "冻结文档必须与后续草稿数组突变隔离",
);
const cleared = clearMelodyStaffNotationDraft(draft);
assert.equal(cleared.reviewState, "cleared");
assert.deepEqual(cleared.noteIds, [null, null, null]);
assert.equal(cleared.checkedFingerprint, null);

console.log("melody staff notation activity adapter tests passed.");
