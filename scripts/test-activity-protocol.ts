import assert from "node:assert/strict";

import { ACTIVITY_FAMILIES, type ActivityDefinitionV1 } from "../lib/activity/activityDefinition";
import {
  checkChoiceActivityAnswer,
  createActivitySession,
  restartActivityAttempt,
  submitActivityAnswer,
} from "../lib/activity/activitySession";

assert.equal(ACTIVITY_FAMILIES.length, 14, "the protocol must enumerate all planned activity families");

const definition: ActivityDefinitionV1 = {
  schemaVersion: "activity-definition-v1",
  activityId: "local.single-pitch.pitch:c4",
  activityVersion: "1",
  contentVersion: "test-v1",
  family: "pitch-relation",
  title: "单音听辨",
  instructions: "选择音名",
  skillTags: ["单音"],
  difficulty: "foundation",
  assessmentMode: "non-scoring",
  source: { kind: "built-in", reviewState: "confirmed" },
  allowedInputModes: ["choice"],
  target: { targetId: "pitch:c4", label: "C4", expectedAnswer: { mode: "choice", optionIds: ["c4"] } },
  explanation: "参考音为 C4。",
};

let session = createActivitySession(definition, "session-1");
assert.equal(session.lifecycle, "ready");
session = submitActivityAnswer(definition, session, { mode: "choice", optionIds: ["d4"] }, session.revision);
session = checkChoiceActivityAnswer(definition, session, session.revision);
assert.equal(session.checkEvidence?.state, "different");
assert.equal(session.checkEvidence?.assessmentMode, "non-scoring");
assert.equal("score" in session, false);
assert.throws(() => restartActivityAttempt(session, 0), /状态已变化/);
const previousAttemptId = session.attemptId;
session = restartActivityAttempt(session, session.revision);
assert.notEqual(session.attemptId, previousAttemptId);
assert.equal(session.attemptNumber, 2);
assert.equal(session.answer, undefined);

const imported: ActivityDefinitionV1 = {
  ...definition,
  activityId: "imported-draft",
  source: { kind: "imported", reviewState: "draft" },
};
assert.equal(createActivitySession(imported, "session-2").lifecycle, "preview");
assert.throws(
  () => submitActivityAnswer(definition, session, { mode: "microphone", analysisEvidenceIds: ["e1"] }, session.revision),
  /不允许/,
);

const orderedDefinition: ActivityDefinitionV1 = {
  ...definition,
  activityId: "local.melody.ordered",
  target: {
    targetId: "melody:c4-d4-c4",
    label: "C4 → D4 → C4",
    expectedAnswer: { mode: "choice", optionIds: ["c4", "d4", "c4"] },
    answerPolicy: { choiceOrder: "ordered" },
  },
};
let ordered = createActivitySession(orderedDefinition, "session-ordered");
ordered = submitActivityAnswer(
  orderedDefinition,
  ordered,
  { mode: "choice", optionIds: ["c4", "c4", "d4"] },
  ordered.revision,
);
ordered = checkChoiceActivityAnswer(orderedDefinition, ordered, ordered.revision);
assert.equal(ordered.checkEvidence?.state, "different", "melody answers must preserve order and repeated notes");

const unorderedDefinition: ActivityDefinitionV1 = {
  ...definition,
  activityId: "local.chord.unordered",
  target: {
    targetId: "chord:c-major",
    label: "C 大三和弦",
    expectedAnswer: { mode: "choice", optionIds: ["c4", "e4", "g4"] },
    answerPolicy: { choiceOrder: "unordered" },
  },
};
let unordered = createActivitySession(unorderedDefinition, "session-unordered");
unordered = submitActivityAnswer(
  unorderedDefinition,
  unordered,
  { mode: "choice", optionIds: ["g4", "c4", "e4"] },
  unordered.revision,
);
unordered = checkChoiceActivityAnswer(unorderedDefinition, unordered, unordered.revision);
assert.equal(unordered.checkEvidence?.state, "consistent");

console.log("P114 unified activity protocol tests passed.");
