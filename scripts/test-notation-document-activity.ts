import assert from "node:assert/strict";

import {
  checkNotationDocumentAnswer,
  createNotationDocumentActivityDefinition,
} from "../lib/activity/notationDocumentActivityAdapter";
import {
  completeActivityCheck,
  createActivitySession,
  restartActivityAttempt,
  submitActivityAnswer,
} from "../lib/activity/activitySession";
import {
  createScoreDocumentFromNotationTarget,
  getScoreDocumentPresentation,
} from "../lib/music/scoreDocument";
import type { NotationTemporaryPracticeTarget } from "../lib/practice/localNotationDraftPracticeTarget";

const target: NotationTemporaryPracticeTarget = {
  id: "temporary-notation-target-1000",
  mode: "sight-singing",
  status: "active",
  localOnly: true,
  sessionOnly: true,
  nonScoring: true,
  temporary: true,
  createdAtMs: 1000,
  draftFingerprint: "confirmed-draft-1",
  sourceDescription: "独立手动草稿",
  timeSignature: "4/4",
  events: [
    { id: "note-1", type: "note", pitch: "C4", duration: "quarter", measure: 1 },
    { id: "rest-1", type: "rest", pitch: null, duration: "quarter", measure: 1 },
    { id: "note-2", type: "note", pitch: "C5", duration: "half", measure: 2 },
  ],
  warnings: [],
};

const document = createScoreDocumentFromNotationTarget(target);
assert.equal(document.schemaVersion, "score-document-v1");
assert.equal(document.documentKind, "notation-fragment");
assert.equal(document.documentId, "local.score-document.confirmed-draft-1");
assert.equal(document.revision, 1);
assert.equal(document.reviewState, "confirmed");
assert.deepEqual(
  document.parts[0].staves[0].voices[0].measures.map((measure) => measure.measureNumber),
  [1, 2],
);
assert.notEqual(
  document.parts[0].staves[0].voices[0].measures[0].events[0],
  target.events[0],
  "the confirmed document must clone source events",
);

assert.deepEqual(getScoreDocumentPresentation(document, "staff-notation"), [
  { measureNumber: 1, tokens: ["C4", "四分休止符"] },
  { measureNumber: 2, tokens: ["C5 —"] },
]);
assert.deepEqual(getScoreDocumentPresentation(document, "numbered-notation"), [
  { measureNumber: 1, tokens: ["1", "0"] },
  { measureNumber: 2, tokens: ["1· —"] },
]);
assert.throws(
  () => createScoreDocumentFromNotationTarget({ ...target, status: "stale" }),
  /仍有效/,
);

const definition = createNotationDocumentActivityDefinition({
  document,
  mode: "staff-notation",
});
assert.deepEqual(definition.allowedInputModes, ["staff-notation"]);
assert.deepEqual(definition.target.expectedAnswer, {
  mode: "staff-notation",
  documentId: document.documentId,
  revision: 1,
});
assert.equal(definition.assessmentMode, "non-scoring");
assert.equal(definition.source.reviewState, "confirmed");
assert.equal("score" in definition, false);

let session = createActivitySession(definition, "notation-document-session");
assert.equal(session.lifecycle, "ready");
session = submitActivityAnswer(
  definition,
  session,
  {
    mode: "staff-notation",
    documentId: document.documentId,
    revision: document.revision,
  },
  session.revision,
);
session = completeActivityCheck(
  session,
  checkNotationDocumentAnswer({
    document,
    mode: "staff-notation",
    answer: session.answer,
  }),
  session.revision,
);
assert.equal(session.lifecycle, "checked");
assert.equal(session.checkEvidence?.state, "consistent");
assert.equal("score" in session, false);

session = restartActivityAttempt(session, session.revision);
assert.equal(session.lifecycle, "ready");
assert.equal(session.answer, undefined);
assert.equal(session.attemptNumber, 2);

assert.equal(
  checkNotationDocumentAnswer({
    document,
    mode: "staff-notation",
    answer: {
      mode: "staff-notation",
      documentId: document.documentId,
      revision: 2,
    },
  }).state,
  "different",
);
assert.equal(
  checkNotationDocumentAnswer({
    document,
    mode: "numbered-notation",
    answer: undefined,
  }).state,
  "insufficient",
);

console.log("P114k notation document activity tests passed.");
