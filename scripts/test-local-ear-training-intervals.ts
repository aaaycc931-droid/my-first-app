import assert from "node:assert/strict";

import {
  createLocalEarTrainingQuestion,
  getIntervalTargetFrequencyHz,
  getLocalEarTrainingAnswer,
  hasLocalEarTrainingAssessmentFields,
} from "../lib/practice/localEarTrainingIntervals";

const basicQuestion = createLocalEarTrainingQuestion({ difficulty: "基础", direction: "上行", sequence: 0 });
assert.equal(basicQuestion.interval.label, "大三度");
assert.equal(basicQuestion.rootLabel, "C4");
assert.ok(Math.abs(getIntervalTargetFrequencyHz(basicQuestion) - 329.63) < 0.1);

const nextRootQuestion = createLocalEarTrainingQuestion({ difficulty: "基础", direction: "上行", sequence: 3 });
assert.equal(nextRootQuestion.rootLabel, "D4");
assert.equal(nextRootQuestion.interval.label, "大三度");

const advancedQuestion = createLocalEarTrainingQuestion({ difficulty: "进阶", direction: "上行", sequence: 0 });
assert.equal(advancedQuestion.interval.label, "小二度");
assert.equal(getLocalEarTrainingAnswer({ question: advancedQuestion, selectedIntervalId: null }).hasSelection, false);
assert.equal(getLocalEarTrainingAnswer({ question: advancedQuestion, selectedIntervalId: "major-second" }).matchesAnswer, false);
assert.equal(getLocalEarTrainingAnswer({ question: advancedQuestion, selectedIntervalId: "minor-second" }).matchesAnswer, true);
assert.equal(hasLocalEarTrainingAssessmentFields({ answerLabel: "小二度" }), false);

const descendingQuestion = createLocalEarTrainingQuestion({ difficulty: "基础", direction: "下行", sequence: 0 });
assert.equal(descendingQuestion.direction, "下行");
assert.equal(descendingQuestion.interval.label, "大三度");
assert.ok(Math.abs(getIntervalTargetFrequencyHz(descendingQuestion) - 207.66) < 0.1);
assert.notEqual(descendingQuestion.id, basicQuestion.id);

console.log("local ear-training interval tests passed");
