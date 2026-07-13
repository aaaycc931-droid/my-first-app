import assert from "node:assert/strict";

import {
  createLocalEarTrainingSinglePitchQuestion,
  getLocalEarTrainingSinglePitchAnswer,
  hasLocalEarTrainingSinglePitchAssessmentFields,
} from "../lib/practice/localEarTrainingSinglePitch";

const basicQuestion = createLocalEarTrainingSinglePitchQuestion({ difficulty: "基础", sequence: 0 });
assert.equal(basicQuestion.pitch.label, "C4");
assert.ok(Math.abs(basicQuestion.pitch.frequencyHz - 261.63) < 0.01);

const nextQuestion = createLocalEarTrainingSinglePitchQuestion({ difficulty: "基础", sequence: 1 });
assert.equal(nextQuestion.pitch.label, "D4");
assert.notEqual(nextQuestion.id, basicQuestion.id);

const advancedQuestion = createLocalEarTrainingSinglePitchQuestion({ difficulty: "进阶", sequence: 4 });
assert.equal(advancedQuestion.pitch.label, "A4");
assert.equal(advancedQuestion.pitch.frequencyHz, 440);
assert.equal(getLocalEarTrainingSinglePitchAnswer({ question: advancedQuestion, selectedPitchId: null }).hasSelection, false);
assert.equal(getLocalEarTrainingSinglePitchAnswer({ question: advancedQuestion, selectedPitchId: "c4" }).matchesAnswer, false);
assert.equal(getLocalEarTrainingSinglePitchAnswer({ question: advancedQuestion, selectedPitchId: "a4" }).matchesAnswer, true);
assert.equal(hasLocalEarTrainingSinglePitchAssessmentFields({ answerLabel: "A4" }), false);

console.log("local ear-training single-pitch tests passed");
