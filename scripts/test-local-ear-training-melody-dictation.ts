import assert from "node:assert/strict";

import {
  createLocalEarTrainingMelodyQuestion,
  earTrainingMelodies,
  getEarTrainingMelodyNoteIds,
  getLocalEarTrainingMelodyAnswer,
  hasLocalEarTrainingMelodyAssessmentFields,
} from "../lib/practice/localEarTrainingMelodyDictation";
import {
  createLocalQuestionSchedule,
  getScheduledQuestionIndex,
} from "../lib/practice/localQuestionScheduler";

const defaultQuestion = createLocalEarTrainingMelodyQuestion({ difficulty: "基础", sequence: 0 });
assert.deepEqual(
  defaultQuestion,
  createLocalEarTrainingMelodyQuestion({ difficulty: "基础", sequence: 0 }),
  "未指定 seed 时，旋律题目工厂仍必须是确定性的",
);
assert.deepEqual(getEarTrainingMelodyNoteIds("基础"), ["c4", "d4", "e4", "g4"]);
assert.ok(getEarTrainingMelodyNoteIds("进阶").includes("a4"));

const seed = 20_260_716;
const basicMelodies = earTrainingMelodies.基础;
const schedule = createLocalQuestionSchedule(basicMelodies.length, seed);
const seededCycle = basicMelodies.map((_, sequence) =>
  createLocalEarTrainingMelodyQuestion({
    difficulty: "基础",
    sequence,
    questionIndex: getScheduledQuestionIndex(schedule, sequence) ?? 0,
  }),
);
assert.deepEqual(
  seededCycle.map((question) => question.melody.id).sort(),
  basicMelodies.map((melody) => melody.id).sort(),
  "一个本地随机循环必须覆盖基础题库中的每条旋律一次",
);
assert.equal(
  createLocalEarTrainingMelodyQuestion({
    difficulty: "基础",
    sequence: basicMelodies.length,
    questionIndex: getScheduledQuestionIndex(schedule, basicMelodies.length) ?? 0,
  }).melody.id,
  seededCycle[0].melody.id,
  "本地随机旋律顺序应在完整题库后循环",
);

const nonFiniteSequence = createLocalEarTrainingMelodyQuestion({
  difficulty: "基础",
  sequence: Number.NaN,
  questionIndex: getScheduledQuestionIndex(schedule, 0) ?? 0,
});
assert.deepEqual(nonFiniteSequence, seededCycle[0], "非有限 sequence 必须安全回退到第 0 题");

const incomplete = getLocalEarTrainingMelodyAnswer({
  question: defaultQuestion,
  selectedNoteIds: [defaultQuestion.melody.noteIds[0], null, defaultQuestion.melody.noteIds[2]],
});
assert.equal(incomplete.hasSelection, false);
assert.equal(incomplete.matchesAnswer, false);

const correct = getLocalEarTrainingMelodyAnswer({
  question: defaultQuestion,
  selectedNoteIds: defaultQuestion.melody.noteIds,
});
assert.equal(correct.hasSelection, true);
assert.equal(correct.matchesAnswer, true);

const wrongFirstNote = getEarTrainingMelodyNoteIds(defaultQuestion.difficulty).find(
  (noteId) => noteId !== defaultQuestion.melody.noteIds[0],
);
assert.ok(wrongFirstNote);
const wrongOrder = getLocalEarTrainingMelodyAnswer({
  question: defaultQuestion,
  selectedNoteIds: [wrongFirstNote ?? null, ...defaultQuestion.melody.noteIds.slice(1)],
});
assert.equal(wrongOrder.hasSelection, true);
assert.equal(wrongOrder.matchesAnswer, false);
assert.equal(hasLocalEarTrainingMelodyAssessmentFields({}), false);

console.log("local ear-training melody-dictation tests passed");
