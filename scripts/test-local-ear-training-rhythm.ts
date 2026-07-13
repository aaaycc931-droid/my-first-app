import assert from "node:assert/strict";

import {
  createLocalEarTrainingRhythmQuestion,
  getLocalEarTrainingRhythmAnswer,
  getLocalEarTrainingRhythmDurationMs,
  hasLocalEarTrainingRhythmAssessmentFields,
} from "../lib/practice/localEarTrainingRhythm";

const basicQuestion = createLocalEarTrainingRhythmQuestion({ difficulty: "基础", sequence: 0 });
assert.equal(basicQuestion.pattern.label, "四拍均匀");
assert.deepEqual(basicQuestion.pattern.onsetBeats, [0, 1, 2, 3]);
assert.equal(basicQuestion.bpm, 84);
assert.ok(getLocalEarTrainingRhythmDurationMs(basicQuestion) > 3_000);

const nextBasicQuestion = createLocalEarTrainingRhythmQuestion({ difficulty: "基础", sequence: 1 });
assert.equal(nextBasicQuestion.pattern.label, "前半小节更密");
assert.notEqual(nextBasicQuestion.id, basicQuestion.id);

const advancedQuestion = createLocalEarTrainingRhythmQuestion({ difficulty: "进阶", sequence: 3 });
assert.equal(advancedQuestion.pattern.label, "中间留空");
assert.equal(getLocalEarTrainingRhythmAnswer({ question: advancedQuestion, selectedPatternId: null }).hasSelection, false);
assert.equal(getLocalEarTrainingRhythmAnswer({ question: advancedQuestion, selectedPatternId: "even-quarters" }).matchesAnswer, false);
assert.equal(getLocalEarTrainingRhythmAnswer({ question: advancedQuestion, selectedPatternId: "middle-gap" }).matchesAnswer, true);
assert.equal(hasLocalEarTrainingRhythmAssessmentFields({ answerLabel: "中间留空" }), false);

console.log("local ear-training rhythm tests passed");
