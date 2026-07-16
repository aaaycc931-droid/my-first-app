import assert from "node:assert/strict";

import {
  createLocalEarTrainingQuestion,
  earTrainingIntervals,
  getIntervalTargetFrequencyHz,
  getLocalEarTrainingAnswer,
  getLocalEarTrainingQuestionVariantCount,
  hasLocalEarTrainingAssessmentFields,
} from "../lib/practice/localEarTrainingIntervals";
import {
  createLocalQuestionSchedule,
  getScheduledQuestionIndex,
} from "../lib/practice/localQuestionScheduler";

const defaultQuestion = createLocalEarTrainingQuestion({ difficulty: "基础", direction: "上行", sequence: 0 });
assert.deepEqual(
  defaultQuestion,
  createLocalEarTrainingQuestion({ difficulty: "基础", direction: "上行", sequence: 0 }),
  "未指定 seed 时，音程题目工厂仍必须是确定性的",
);
assert.equal(defaultQuestion.rootLabel, "C4");
assert.equal(defaultQuestion.id, "基础-上行-0-major-third-C4", "course-v1 question id must remain unchanged");
assert.equal(defaultQuestion.variantId, "interval:c4:major-third");
const stableIntervalQuestion = createLocalEarTrainingQuestion({
  difficulty: "基础",
  direction: "下行",
  sequence: 99,
  questionIndex: 0,
  variantId: "interval:g4:perfect-fifth",
});
assert.equal(stableIntervalQuestion.rootLabel, "G4");
assert.equal(stableIntervalQuestion.interval.id, "perfect-fifth");
assert.throws(() => createLocalEarTrainingQuestion({
  difficulty: "基础",
  direction: "上行",
  sequence: 0,
  variantId: "interval:c4:minor-second",
}), /Invalid local interval variant id/);

const seed = 20_260_716;
const variantCount = getLocalEarTrainingQuestionVariantCount("基础");
const schedule = createLocalQuestionSchedule(variantCount, seed);
const seededCycle = Array.from({ length: variantCount }, (_, sequence) =>
  createLocalEarTrainingQuestion({
    difficulty: "基础",
    direction: "上行",
    sequence,
    questionIndex: getScheduledQuestionIndex(schedule, sequence) ?? 0,
  }),
);
assert.equal(
  new Set(seededCycle.map((question) => `${question.rootLabel}-${question.interval.id}`)).size,
  variantCount,
  "一个本地随机循环必须覆盖每个根音和音程的组合一次",
);
const nextCycle = createLocalEarTrainingQuestion({
  difficulty: "基础",
  direction: "上行",
  sequence: variantCount,
  questionIndex: getScheduledQuestionIndex(schedule, variantCount) ?? 0,
});
assert.equal(nextCycle.interval.id, seededCycle[0].interval.id, "本地随机音程顺序应在完整题库后循环");
assert.equal(nextCycle.rootLabel, seededCycle[0].rootLabel, "完整题库后根音也应回到循环开头");

const nonFiniteSequence = createLocalEarTrainingQuestion({
  difficulty: "基础",
  direction: "上行",
  sequence: Number.POSITIVE_INFINITY,
  questionIndex: getScheduledQuestionIndex(schedule, 0) ?? 0,
});
assert.deepEqual(nonFiniteSequence, seededCycle[0], "非有限 sequence 必须安全回退到第 0 题");

const advancedQuestion = createLocalEarTrainingQuestion({ difficulty: "进阶", direction: "上行", sequence: 0, questionIndex: 0 });
const wrongIntervalId = earTrainingIntervals.进阶.find((interval) => interval.id !== advancedQuestion.interval.id)?.id;
assert.ok(wrongIntervalId);
assert.equal(getLocalEarTrainingAnswer({ question: advancedQuestion, selectedIntervalId: null }).hasSelection, false);
assert.equal(
  getLocalEarTrainingAnswer({ question: advancedQuestion, selectedIntervalId: wrongIntervalId ?? null }).matchesAnswer,
  false,
);
assert.equal(
  getLocalEarTrainingAnswer({ question: advancedQuestion, selectedIntervalId: advancedQuestion.interval.id }).matchesAnswer,
  true,
);
assert.equal(hasLocalEarTrainingAssessmentFields({ answerLabel: advancedQuestion.interval.label }), false);

const descendingQuestion = createLocalEarTrainingQuestion({
  difficulty: "基础",
  direction: "下行",
  sequence: 0,
  questionIndex: getScheduledQuestionIndex(schedule, 0) ?? 0,
});
assert.equal(descendingQuestion.direction, "下行");
assert.equal(descendingQuestion.interval.id, seededCycle[0].interval.id);
assert.ok(
  Math.abs(
    getIntervalTargetFrequencyHz(descendingQuestion) -
      descendingQuestion.rootFrequencyHz * 2 ** (-descendingQuestion.interval.semitones / 12),
  ) < 0.01,
);

console.log("local ear-training interval tests passed");
