import assert from "node:assert/strict";

import type { ActivityAnswer } from "../lib/activity/activityAnswer";
import { adaptMelodyDictationQuestionToActivity } from "../lib/activity/legacyLocalActivityAdapter";
import {
  adaptFixedSolfegeAnswerToActivityEvidence,
  createFixedSolfegeAnswer,
  enableMelodyFixedSolfegeInput,
  FIXED_SOLFEGE_TOKEN_BY_NOTE_ID,
} from "../lib/activity/melodySolfegeActivityAdapter";
import type { LocalEarTrainingMelodyQuestion } from "../lib/practice/localEarTrainingMelodyDictation";

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

const definition = enableMelodyFixedSolfegeInput(
  adaptMelodyDictationQuestionToActivity(question(["c4", "f-sharp-4", "c5"])),
);
assert.deepEqual(definition.allowedInputModes, ["choice", "solfege"]);
assert.deepEqual(definition.target.expectedAnswer, {
  mode: "choice",
  optionIds: ["c4", "f-sharp-4", "c5"],
});
assert.equal(FIXED_SOLFEGE_TOKEN_BY_NOTE_ID.c4, "do4");
assert.equal(FIXED_SOLFEGE_TOKEN_BY_NOTE_ID["f-sharp-4"], "fi4");
assert.equal(FIXED_SOLFEGE_TOKEN_BY_NOTE_ID.c5, "do5");

const exactAnswer = createFixedSolfegeAnswer(["c4", "f-sharp-4", "c5"]);
assert.deepEqual(exactAnswer, { mode: "solfege", tokens: ["do4", "fi4", "do5"] });
assert.equal(
  adaptFixedSolfegeAnswerToActivityEvidence({ definition, answer: exactAnswer ?? undefined }).state,
  "consistent",
);
assert.equal(
  adaptFixedSolfegeAnswerToActivityEvidence({
    definition,
    answer: { mode: "solfege", tokens: ["do5", "fi4", "do4"] },
  }).state,
  "different",
  "fixed solfege answers must preserve note order",
);

const repeatedDefinition = enableMelodyFixedSolfegeInput(
  adaptMelodyDictationQuestionToActivity(question(["c4", "c4", "d4"])),
);
assert.equal(
  adaptFixedSolfegeAnswerToActivityEvidence({
    definition: repeatedDefinition,
    answer: createFixedSolfegeAnswer(["c4", "c4", "d4"]) ?? undefined,
  }).state,
  "consistent",
  "repeated notes must retain their positions",
);
assert.equal(
  adaptFixedSolfegeAnswerToActivityEvidence({
    definition: repeatedDefinition,
    answer: { mode: "solfege", tokens: ["do4", "re4", "do4"] },
  }).state,
  "different",
  "reordering a repeated-note answer must remain different",
);

const insufficientAnswers: Array<ActivityAnswer | undefined> = [
  undefined,
  { mode: "solfege", tokens: [] },
  { mode: "solfege", tokens: ["do4", "re4"] },
  { mode: "solfege", tokens: ["do4", "unknown", "re4"] },
  { mode: "choice", optionIds: ["c4", "c4", "d4"] },
];
for (const answer of insufficientAnswers) {
  assert.equal(
    adaptFixedSolfegeAnswerToActivityEvidence({ definition: repeatedDefinition, answer }).state,
    "insufficient",
  );
}
assert.equal(createFixedSolfegeAnswer([]), null);
assert.equal(createFixedSolfegeAnswer(["c4", "d4"]), null);
assert.equal(createFixedSolfegeAnswer(["c4", "unknown", "d4"]), null);

const notEnabled = adaptMelodyDictationQuestionToActivity(question(["c4", "d4", "e4"]));
assert.equal(
  adaptFixedSolfegeAnswerToActivityEvidence({
    definition: notEnabled,
    answer: { mode: "solfege", tokens: ["do4", "re4", "mi4"] },
  }).state,
  "insufficient",
);
assert.throws(
  () => enableMelodyFixedSolfegeInput({
    ...notEnabled,
    target: {
      ...notEnabled.target,
      expectedAnswer: { mode: "choice", optionIds: ["c4", "d4"] },
    },
  }),
  /只支持当前三音/,
);
assert.throws(
  () => enableMelodyFixedSolfegeInput({
    ...notEnabled,
    target: {
      ...notEnabled.target,
      expectedAnswer: { mode: "choice", optionIds: ["c4", "d4", "unsupported"] },
    },
  }),
  /只支持当前三音/,
);

const evidence = adaptFixedSolfegeAnswerToActivityEvidence({
  definition,
  answer: exactAnswer ?? undefined,
});
assert.equal(evidence.assessmentMode, "non-scoring");
assert.equal("score" in evidence, false);
assert.equal("pass" in evidence, false);
assert.equal("accuracy" in evidence, false);

console.log("P114e melody fixed-solfege activity adapter tests passed.");
