import assert from "node:assert/strict";

import {
  createLocalEarTrainingSinglePitchQuestion,
  earTrainingSinglePitches,
  getLocalEarTrainingSinglePitchAnswer,
  hasLocalEarTrainingSinglePitchAssessmentFields,
} from "../lib/practice/localEarTrainingSinglePitch";
import {
  createLocalQuestionSchedule,
  getScheduledQuestionIndex,
} from "../lib/practice/localQuestionScheduler";

const defaultQuestion = createLocalEarTrainingSinglePitchQuestion({ difficulty: "基础", sequence: 0 });
assert.deepEqual(
  defaultQuestion,
  createLocalEarTrainingSinglePitchQuestion({ difficulty: "基础", sequence: 0 }),
  "未指定 seed 时，题目工厂仍必须是确定性的",
);
assert.ok(defaultQuestion.pitch.frequencyHz > 0, "默认题目的频率必须有效");
assert.equal(defaultQuestion.id, "基础-0-c4", "course-v1 question id must remain unchanged");
assert.equal(defaultQuestion.variantId, "pitch:c4");
assert.equal(
  createLocalEarTrainingSinglePitchQuestion({
    difficulty: "基础",
    sequence: 99,
    questionIndex: 3,
    variantId: "pitch:d4",
  }).pitch.id,
  "d4",
  "stable variant id must take precedence over a changed schedule index",
);
assert.throws(() => createLocalEarTrainingSinglePitchQuestion({
  difficulty: "基础",
  sequence: 0,
  variantId: "pitch:b4",
}), /Invalid local single-pitch variant id/);

const seed = 20_260_716;
const basicPitches = earTrainingSinglePitches.基础;
const schedule = createLocalQuestionSchedule(basicPitches.length, seed);
const seededCycle = basicPitches.map((_, sequence) =>
  createLocalEarTrainingSinglePitchQuestion({
    difficulty: "基础",
    sequence,
    questionIndex: getScheduledQuestionIndex(schedule, sequence) ?? 0,
  }),
);
assert.deepEqual(
  seededCycle.map((question) => question.pitch.id).sort(),
  basicPitches.map((pitch) => pitch.id).sort(),
  "一个本地随机循环必须覆盖基础题库中的每个单音一次",
);
assert.equal(
  createLocalEarTrainingSinglePitchQuestion({
    difficulty: "基础",
    sequence: basicPitches.length,
    questionIndex: getScheduledQuestionIndex(schedule, basicPitches.length) ?? 0,
  }).pitch.id,
  seededCycle[0].pitch.id,
  "本地随机题目顺序应在完整题库后循环",
);
assert.notEqual(seededCycle[0].id, seededCycle[1].id);

const nonFiniteSequence = createLocalEarTrainingSinglePitchQuestion({
  difficulty: "基础",
  sequence: Number.NaN,
  questionIndex: getScheduledQuestionIndex(schedule, 0) ?? 0,
});
assert.equal(nonFiniteSequence.sequence, 0);
assert.deepEqual(nonFiniteSequence, seededCycle[0], "非有限 sequence 必须安全回退到第 0 题");

const advancedQuestion = createLocalEarTrainingSinglePitchQuestion({ difficulty: "进阶", sequence: 4, questionIndex: 4 });
const wrongPitchId = earTrainingSinglePitches.进阶.find((pitch) => pitch.id !== advancedQuestion.pitch.id)?.id;
assert.ok(wrongPitchId);
assert.equal(getLocalEarTrainingSinglePitchAnswer({ question: advancedQuestion, selectedPitchId: null }).hasSelection, false);
assert.equal(
  getLocalEarTrainingSinglePitchAnswer({ question: advancedQuestion, selectedPitchId: wrongPitchId ?? null }).matchesAnswer,
  false,
);
assert.equal(
  getLocalEarTrainingSinglePitchAnswer({ question: advancedQuestion, selectedPitchId: advancedQuestion.pitch.id }).matchesAnswer,
  true,
);
assert.equal(hasLocalEarTrainingSinglePitchAssessmentFields({ answerLabel: advancedQuestion.pitch.label }), false);

console.log("local ear-training single-pitch tests passed");
