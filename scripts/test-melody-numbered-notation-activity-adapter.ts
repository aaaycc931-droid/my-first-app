import assert from "node:assert/strict";

import type { ActivityAnswer } from "../lib/activity/activityAnswer";
import { adaptMelodyDictationQuestionToActivity } from "../lib/activity/legacyLocalActivityAdapter";
import {
  adaptMelodyNumberedNotationAnswerToActivityEvidence,
  createMelodyNumberedNotationAnswer,
  enableMelodyNumberedNotationInput,
} from "../lib/activity/melodyNumberedNotationActivityAdapter";
import {
  createScoreDocumentFromMelodyNumberedNotationDraft,
  createScoreDocumentFromMelodyStaffNotationDraft,
} from "../lib/music/scoreDocument";
import type { LocalEarTrainingMelodyQuestion } from "../lib/practice/localEarTrainingMelodyDictation";
import {
  MELODY_NUMBERED_NOTATION_CONTEXT,
  canConfirmMelodyNumberedNotationDraft,
  checkMelodyNumberedNotationDraft,
  clearMelodyNumberedNotationDraft,
  confirmMelodyNumberedNotationDraft,
  createMelodyNumberedNotationDraft,
  getMelodyNumberedNotationDraftFingerprint,
  getMelodyNumberedNotationPresentation,
  setMelodyNumberedNotationDraftNote,
  validateMelodyNumberedNotationDraft,
} from "../lib/practice/localMelodyNumberedNotationDraft";
import {
  checkMelodyStaffNotationDraft,
  confirmMelodyStaffNotationDraft,
  createMelodyStaffNotationDraft,
  setMelodyStaffNotationDraftNote,
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

assert.deepEqual(getMelodyNumberedNotationPresentation("c4"), {
  degree: 1, accidental: "natural", octave: "base", optionLabel: "1（C4）",
});
assert.deepEqual(getMelodyNumberedNotationPresentation("f4"), {
  degree: 4, accidental: "natural", octave: "base", optionLabel: "4（F4）",
});
assert.deepEqual(getMelodyNumberedNotationPresentation("f-sharp-4"), {
  degree: 4, accidental: "sharp", octave: "base", optionLabel: "升 4（F♯4）",
});
assert.deepEqual(getMelodyNumberedNotationPresentation("c5"), {
  degree: 1, accidental: "natural", octave: "upper", optionLabel: "高音 1（C5）",
});
assert.deepEqual(
  (["c4", "d4", "e4", "f4", "f-sharp-4", "g4", "a4", "b4", "c5"] as const)
    .map((noteId) => getMelodyNumberedNotationPresentation(noteId).degree),
  [1, 2, 3, 4, 4, 5, 6, 7, 1],
);

const exactQuestion = question(["c4", "f-sharp-4", "c4"]);
const definition = enableMelodyNumberedNotationInput(
  adaptMelodyDictationQuestionToActivity(exactQuestion),
);
assert.deepEqual(definition.allowedInputModes, ["choice", "numbered-notation"]);

let draft = createMelodyNumberedNotationDraft({
  question: exactQuestion,
  attemptId: "attempt-1",
  playbackQualificationId: "qualification-1",
});
assert.equal(draft.representationContext, MELODY_NUMBERED_NOTATION_CONTEXT);
assert.equal(validateMelodyNumberedNotationDraft(draft).status, "invalid");
(["c4", "f-sharp-4", "c4"] as const).forEach((noteId, position) => {
  draft = setMelodyNumberedNotationDraftNote(draft, position, noteId);
});
assert.deepEqual(draft.noteIds, ["c4", "f-sharp-4", "c4"]);
draft = checkMelodyNumberedNotationDraft(draft);
assert.equal(draft.checkedFingerprint, getMelodyNumberedNotationDraftFingerprint(draft));
assert.equal(canConfirmMelodyNumberedNotationDraft(draft), true);
const edited = setMelodyNumberedNotationDraftNote(draft, 2, "c5");
assert.equal(edited.reviewState, "draft");
assert.equal(edited.checkedFingerprint, null);
draft = confirmMelodyNumberedNotationDraft(draft);

const document = createScoreDocumentFromMelodyNumberedNotationDraft({ question: exactQuestion, draft });
assert.equal(document.documentKind, "melody-dictation-numbered-answer");
assert.equal(document.meter, "unmetered");
assert.deepEqual(
  document.parts[0].staves[0].voices[0].measures[0].events.map((event) => event.noteId),
  ["c4", "f-sharp-4", "c4"],
);
const serializedDocument = JSON.stringify(document);
assert.doesNotMatch(serializedDocument, /optionLabel|degree|accidental|octave|高音|升 4/);
const answer = createMelodyNumberedNotationAnswer(document);
const forgedEventDocument = {
  ...document,
  parts: [{
    ...document.parts[0],
    staves: [{
      ...document.parts[0].staves[0],
      voices: [{
        ...document.parts[0].staves[0].voices[0],
        measures: [{
          ...document.parts[0].staves[0].voices[0].measures[0],
          events: document.parts[0].staves[0].voices[0].measures[0].events.map(
            (event, index) => index === 0 ? { ...event, noteId: "c5" as const } : event,
          ),
        }],
      }],
    }],
  }],
} as unknown as typeof document;
const evidence = adaptMelodyNumberedNotationAnswerToActivityEvidence({
  definition,
  question: exactQuestion,
  document,
  answer,
  attemptId: "attempt-1",
  playbackQualificationId: "qualification-1",
});
assert.equal(evidence.state, "consistent");
assert.equal(evidence.assessmentMode, "non-scoring");
for (const field of ["score", "grade", "pass", "fail", "accuracyPercentage"]) {
  assert.equal(field in evidence, false);
}

const differentQuestion = question(["c4", "f-sharp-4", "c5"]);
let differentDraft = createMelodyNumberedNotationDraft({
  question: differentQuestion,
  attemptId: "attempt-2",
  playbackQualificationId: "qualification-2",
});
(["c5", "f-sharp-4", "c4"] as const).forEach((noteId, position) => {
  differentDraft = setMelodyNumberedNotationDraftNote(differentDraft, position, noteId);
});
differentDraft = confirmMelodyNumberedNotationDraft(checkMelodyNumberedNotationDraft(differentDraft));
const differentDocument = createScoreDocumentFromMelodyNumberedNotationDraft({ question: differentQuestion, draft: differentDraft });
assert.equal(adaptMelodyNumberedNotationAnswerToActivityEvidence({
  definition: enableMelodyNumberedNotationInput(adaptMelodyDictationQuestionToActivity(differentQuestion)),
  question: differentQuestion,
  document: differentDocument,
  answer: createMelodyNumberedNotationAnswer(differentDocument),
  attemptId: "attempt-2",
  playbackQualificationId: "qualification-2",
}).state, "different");

let staffDraft = createMelodyStaffNotationDraft({
  question: exactQuestion,
  attemptId: "attempt-1",
  playbackQualificationId: "qualification-1",
});
(["c4", "f-sharp-4", "c4"] as const).forEach((noteId, position) => {
  staffDraft = setMelodyStaffNotationDraftNote(staffDraft, position, noteId);
});
staffDraft = confirmMelodyStaffNotationDraft(checkMelodyStaffNotationDraft(staffDraft));
const staffDocument = createScoreDocumentFromMelodyStaffNotationDraft({ question: exactQuestion, draft: staffDraft });
assert.equal(adaptMelodyNumberedNotationAnswerToActivityEvidence({
  definition,
  question: exactQuestion,
  document: staffDocument,
  answer,
  attemptId: "attempt-1",
  playbackQualificationId: "qualification-1",
}).state, "insufficient", "五线谱文档不得冒充简谱答案");

const insufficientCases: Array<Parameters<typeof adaptMelodyNumberedNotationAnswerToActivityEvidence>[0]> = [
  { definition, question: exactQuestion, document: null, answer, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
  { definition, question: exactQuestion, document, answer: undefined, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
  { definition, question: exactQuestion, document, answer: { ...answer, revision: answer.revision + 1 }, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
  { definition, question: exactQuestion, document, answer: { mode: "staff-notation", documentId: answer.documentId, revision: answer.revision }, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
  { definition, question: exactQuestion, document, answer, attemptId: "foreign-attempt", playbackQualificationId: "qualification-1" },
  { definition, question: exactQuestion, document, answer, attemptId: "attempt-1", playbackQualificationId: "foreign-qualification" },
  { definition, question: exactQuestion, document: { ...document, documentId: "forged-document" }, answer, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
  { definition, question: exactQuestion, document: { ...document, source: { ...document.source, draftFingerprint: "forged-fingerprint" } }, answer, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
  { definition, question: exactQuestion, document: { ...document, source: { ...document.source, representationContext: "forged-context" as never } }, answer, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
  { definition, question: exactQuestion, document: forgedEventDocument, answer, attemptId: "attempt-1", playbackQualificationId: "qualification-1" },
];
for (const candidate of insufficientCases) {
  assert.equal(adaptMelodyNumberedNotationAnswerToActivityEvidence(candidate).state, "insufficient");
}

assert.throws(
  () => createScoreDocumentFromMelodyNumberedNotationDraft({ question: exactQuestion, draft: edited }),
  /通过检查并明确确认/,
);
const cleared = clearMelodyNumberedNotationDraft(draft);
assert.equal(cleared.reviewState, "cleared");
assert.deepEqual(cleared.noteIds, [null, null, null]);

console.log("melody numbered notation activity adapter tests passed.");
