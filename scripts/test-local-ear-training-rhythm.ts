import assert from "node:assert/strict";

import {
  createLocalEarTrainingRhythmQuestion,
  earTrainingRhythmPatterns,
  getLocalEarTrainingRhythmAnswer,
  getLocalEarTrainingRhythmDurationMs,
  hasLocalEarTrainingRhythmAssessmentFields,
} from "../lib/practice/localEarTrainingRhythm";
import {
  createLocalQuestionSchedule,
  getScheduledQuestionIndex,
} from "../lib/practice/localQuestionScheduler";

const defaultQuestion = createLocalEarTrainingRhythmQuestion({ difficulty: "基础", sequence: 0 });
assert.deepEqual(
  defaultQuestion,
  createLocalEarTrainingRhythmQuestion({ difficulty: "基础", sequence: 0 }),
  "未指定 seed 时，节奏题目工厂仍必须是确定性的",
);
assert.equal(defaultQuestion.bpm, 84);
assert.ok(getLocalEarTrainingRhythmDurationMs(defaultQuestion) > 3_000);

const seed = 20_260_716;
const basicPatterns = earTrainingRhythmPatterns.基础;
const schedule = createLocalQuestionSchedule(basicPatterns.length, seed);
const seededCycle = basicPatterns.map((_, sequence) =>
  createLocalEarTrainingRhythmQuestion({
    difficulty: "基础",
    sequence,
    questionIndex: getScheduledQuestionIndex(schedule, sequence) ?? 0,
  }),
);
assert.deepEqual(
  seededCycle.map((question) => question.pattern.id).sort(),
  basicPatterns.map((pattern) => pattern.id).sort(),
  "一个本地随机循环必须覆盖基础题库中的每个节奏型一次",
);
assert.equal(
  createLocalEarTrainingRhythmQuestion({
    difficulty: "基础",
    sequence: basicPatterns.length,
    questionIndex: getScheduledQuestionIndex(schedule, basicPatterns.length) ?? 0,
  }).pattern.id,
  seededCycle[0].pattern.id,
  "本地随机节奏顺序应在完整题库后循环",
);

const nonFiniteSequence = createLocalEarTrainingRhythmQuestion({
  difficulty: "基础",
  sequence: Number.NEGATIVE_INFINITY,
  questionIndex: getScheduledQuestionIndex(schedule, 0) ?? 0,
});
assert.deepEqual(nonFiniteSequence, seededCycle[0], "非有限 sequence 必须安全回退到第 0 题");

const advancedQuestion = createLocalEarTrainingRhythmQuestion({ difficulty: "进阶", sequence: 3, questionIndex: 3 });
const wrongPatternId = earTrainingRhythmPatterns.进阶.find((pattern) => pattern.id !== advancedQuestion.pattern.id)?.id;
assert.ok(wrongPatternId);
assert.equal(getLocalEarTrainingRhythmAnswer({ question: advancedQuestion, selectedPatternId: null }).hasSelection, false);
assert.equal(
  getLocalEarTrainingRhythmAnswer({ question: advancedQuestion, selectedPatternId: wrongPatternId ?? null }).matchesAnswer,
  false,
);
assert.equal(
  getLocalEarTrainingRhythmAnswer({ question: advancedQuestion, selectedPatternId: advancedQuestion.pattern.id }).matchesAnswer,
  true,
);
assert.equal(hasLocalEarTrainingRhythmAssessmentFields({ answerLabel: advancedQuestion.pattern.label }), false);

console.log("local ear-training rhythm tests passed");
