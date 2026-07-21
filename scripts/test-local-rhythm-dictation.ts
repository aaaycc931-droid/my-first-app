import assert from "node:assert/strict";

import {
  checkRhythmDictationScoreDocument,
  createRhythmDictationActivityDefinition,
} from "../lib/activity/rhythmDictationActivityAdapter";
import { createScoreDocumentFromRhythmDictationDraft } from "../lib/music/scoreDocument";
import { createLocalEarTrainingRhythmQuestion } from "../lib/practice/localEarTrainingRhythm";
import {
  canConfirmRhythmDictationDraft,
  checkRhythmDictationDraft,
  clearRhythmDictationDraft,
  confirmRhythmDictationDraft,
  createRhythmDictationDraft,
  getRhythmDictationDocumentId,
  getRhythmDictationDraftFingerprint,
  getRhythmDictationInputGrid,
  hasRhythmDictationAssessmentFields,
  toggleRhythmDictationDraftOnset,
  validateRhythmDictationDraft,
} from "../lib/practice/localRhythmDictation";

const question = createLocalEarTrainingRhythmQuestion({
  difficulty: "基础",
  sequence: 0,
  variantId: "rhythm:front-dense",
  catalogMode: "expanded-local-v2",
});

let draft = createRhythmDictationDraft(question, "attempt-1");
assert.equal(validateRhythmDictationDraft(draft).status, "invalid");
assert.throws(
  () => createScoreDocumentFromRhythmDictationDraft({ question, draft }),
  /完整校验并确认/,
);

question.pattern.onsetBeats.forEach((onset) => {
  draft = toggleRhythmDictationDraftOnset(draft, onset);
});
assert.deepEqual(draft.onsetBeats, question.pattern.onsetBeats);
assert.equal(validateRhythmDictationDraft(draft).status, "valid");

draft = checkRhythmDictationDraft(draft);
assert.equal(draft.reviewState, "checked");
assert.equal(canConfirmRhythmDictationDraft(draft), true);

const editedDraft = toggleRhythmDictationDraftOnset(draft, 0.5);
assert.equal(editedDraft.reviewState, "draft");
assert.equal(editedDraft.checkedFingerprint, null);
assert.equal(canConfirmRhythmDictationDraft(editedDraft), false);

draft = confirmRhythmDictationDraft(draft);
assert.equal(draft.reviewState, "confirmed");
const document = createScoreDocumentFromRhythmDictationDraft({ question, draft });
assert.equal(document.schemaVersion, "score-document-v1");
assert.equal(document.documentKind, "rhythm-dictation");
assert.equal(document.reviewState, "confirmed");
assert.equal(document.localOnly, true);
assert.equal(document.sessionOnly, true);
assert.deepEqual(
  document.parts[0].staves[0].voices[0].measures[0].events.map((event) => event.onsetBeat),
  question.pattern.onsetBeats,
);

const definition = createRhythmDictationActivityDefinition(question);
assert.equal(definition.family, "rhythm-dictation");
assert.equal(definition.assessmentMode, "non-scoring");
assert.deepEqual(definition.allowedInputModes, ["staff-notation"]);
assert.deepEqual(definition.target.expectedAnswer, {
  mode: "staff-notation",
  documentId: getRhythmDictationDocumentId({
    question,
    onsetBeats: question.pattern.onsetBeats,
  }),
  revision: 1,
});
const answer = {
  mode: "staff-notation" as const,
  documentId: document.documentId,
  revision: document.revision,
};
assert.equal(checkRhythmDictationScoreDocument({
  question,
  document,
  answer,
}).state, "consistent");
assert.equal(checkRhythmDictationScoreDocument({
  question,
  document,
  answer: { ...answer, revision: 2 },
}).state, "insufficient");

let equivalentDraft = createRhythmDictationDraft(question, "attempt-3");
question.pattern.onsetBeats.forEach((onset) => {
  equivalentDraft = toggleRhythmDictationDraftOnset(equivalentDraft, onset);
});
equivalentDraft = confirmRhythmDictationDraft(checkRhythmDictationDraft(equivalentDraft));
const equivalentDocument = createScoreDocumentFromRhythmDictationDraft({
  question,
  draft: equivalentDraft,
});
assert.deepEqual(
  equivalentDocument,
  document,
  "immutable content-addressed documents must not vary by attempt provenance",
);
const reversedDocument = createScoreDocumentFromRhythmDictationDraft({
  question,
  draft: {
    ...draft,
    onsetBeats: [...draft.onsetBeats].reverse(),
  },
});
assert.deepEqual(
  reversedDocument,
  document,
  "canonical content addressing must not vary by source event order",
);

const forgedOnsets = [-1, 0, 0];
const forgedDraft = {
  ...draft,
  onsetBeats: forgedOnsets,
  checkedFingerprint: getRhythmDictationDraftFingerprint({
    ...draft,
    onsetBeats: forgedOnsets,
  }),
};
assert.throws(
  () => createScoreDocumentFromRhythmDictationDraft({ question, draft: forgedDraft }),
  /完整校验/,
);

let differentDraft = createRhythmDictationDraft(question, "attempt-2");
[0, 1, 2, 2.5, 3].forEach((onset) => {
  differentDraft = toggleRhythmDictationDraftOnset(differentDraft, onset);
});
differentDraft = confirmRhythmDictationDraft(checkRhythmDictationDraft(differentDraft));
const differentDocument = createScoreDocumentFromRhythmDictationDraft({
  question,
  draft: differentDraft,
});
const differentEvidence = checkRhythmDictationScoreDocument({
  question,
  document: differentDocument,
  answer: {
    mode: "staff-notation",
    documentId: differentDocument.documentId,
    revision: differentDocument.revision,
  },
});
assert.equal(differentEvidence.state, "different");
assert.match(differentEvidence.explanation, /目标中有而草稿未标记/);
assert.match(differentEvidence.explanation, /草稿额外标记/);

const challengeQuestion = createLocalEarTrainingRhythmQuestion({
  difficulty: "挑战",
  sequence: 0,
  variantId: "rhythm:opening-triplet:bpm-96",
  catalogMode: "expanded-local-v2",
});
const challengeGrid = getRhythmDictationInputGrid("挑战");
challengeQuestion.pattern.onsetBeats.forEach((onset) => {
  assert.ok(challengeGrid.some((candidate) => Math.abs(candidate - onset) < 0.001));
});
assert.throws(
  () => createScoreDocumentFromRhythmDictationDraft({
    question: challengeQuestion,
    draft,
  }),
  /当前题目/,
);

const cleared = clearRhythmDictationDraft(draft);
assert.equal(cleared.reviewState, "cleared");
assert.deepEqual(cleared.onsetBeats, []);
assert.equal(hasRhythmDictationAssessmentFields(definition), false);
assert.equal(hasRhythmDictationAssessmentFields(document), false);

console.log("local rhythm dictation tests passed");
