import assert from "node:assert/strict";

import {
  createLocalEarTrainingChordQuestion,
  getLocalChordAnswerOptions,
  getLocalEarTrainingChordAnswer,
  getLocalEarTrainingChordVariantCount,
  hasLocalEarTrainingChordAssessmentFields,
  isLocalEarTrainingChordVariantId,
} from "../lib/practice/localEarTrainingChords";
import { createLocalQuestionSchedule, getScheduledQuestionIndex } from "../lib/practice/localQuestionScheduler";

assert.deepEqual(
  {
    基础: getLocalEarTrainingChordVariantCount("基础"),
    进阶: getLocalEarTrainingChordVariantCount("进阶"),
    挑战: getLocalEarTrainingChordVariantCount("挑战"),
  },
  { 基础: 20, 进阶: 48, 挑战: 72 },
);
assert.deepEqual(
  getLocalChordAnswerOptions("基础").map((option) => option.label),
  ["大三和弦 · 原位", "小三和弦 · 原位"],
);
assert.equal(getLocalChordAnswerOptions("进阶").length, 8);
assert.equal(getLocalChordAnswerOptions("挑战").length, 12);

const foundationVariantIds = Array.from({ length: 20 }, (_, questionIndex) =>
  createLocalEarTrainingChordQuestion({
    difficulty: "基础",
    sequence: questionIndex,
    questionIndex,
  }).variantId);
assert.deepEqual(foundationVariantIds, [
  "chord:c4:major:root", "chord:c4:minor:root",
  "chord:d4:major:root", "chord:d4:minor:root",
  "chord:e4:major:root", "chord:e4:minor:root",
  "chord:f4:major:root", "chord:f4:minor:root",
  "chord:g4:major:root", "chord:g4:minor:root",
  "chord:a4:major:root", "chord:a4:minor:root",
  "chord:c5:major:root", "chord:c5:minor:root",
  "chord:d5:major:root", "chord:d5:minor:root",
  "chord:e5:major:root", "chord:e5:minor:root",
  "chord:f5:major:root", "chord:f5:minor:root",
]);
assert.equal(isLocalEarTrainingChordVariantId("基础", "chord:c5:major:root"), true);
assert.equal(isLocalEarTrainingChordVariantId("进阶", "chord:c5:major:root"), false);
for (const variantId of foundationVariantIds) {
  const question = createLocalEarTrainingChordQuestion({
    difficulty: "基础",
    sequence: 999,
    variantId,
  });
  assert.equal(question.variantId, variantId);
  assert.equal(question.inversionId, "root");
  assert(question.frequenciesHz.every((frequencyHz) =>
    Number.isFinite(frequencyHz) && frequencyHz > 0));
  assert(question.frequenciesHz[0] < question.frequenciesHz[1]);
  assert(question.frequenciesHz[1] < question.frequenciesHz[2]);
  assert.equal(hasLocalEarTrainingChordAssessmentFields(question), false);
}

const rootMajor = createLocalEarTrainingChordQuestion({
  difficulty: "基础",
  sequence: 0,
  variantId: "chord:c4:major:root",
});
assert.equal(rootMajor.answerOptionId, "major-root");
assert.match(rootMajor.explanation, /大三和弦/);
assert.match(rootMajor.explanation, /根音在最低声部/);
assert(Math.abs(rootMajor.frequenciesHz[1] / rootMajor.frequenciesHz[0] - 2 ** (4 / 12)) < 1e-10);
assert(Math.abs(rootMajor.frequenciesHz[2] / rootMajor.frequenciesHz[0] - 2 ** (7 / 12)) < 1e-10);

const firstMinor = createLocalEarTrainingChordQuestion({
  difficulty: "进阶",
  sequence: 0,
  variantId: "chord:c4:minor:first",
});
assert.deepEqual(firstMinor.frequenciesHz.map((frequency) => Math.round(frequency)), [311, 392, 523]);
assert.match(firstMinor.explanation, /三音在最低声部/);

const secondDiminished = createLocalEarTrainingChordQuestion({
  difficulty: "挑战",
  sequence: 0,
  variantId: "chord:d4:diminished:second",
});
assert.equal(secondDiminished.inversionLabel, "第二转位");
assert(secondDiminished.frequenciesHz[0] < secondDiminished.frequenciesHz[1]);
assert(secondDiminished.frequenciesHz[1] < secondDiminished.frequenciesHz[2]);
assert.equal(isLocalEarTrainingChordVariantId("挑战", secondDiminished.variantId), true);
assert.equal(isLocalEarTrainingChordVariantId("基础", secondDiminished.variantId), false);

assert.deepEqual(getLocalEarTrainingChordAnswer({
  question: firstMinor,
  selectedOptionId: "minor-first",
}), {
  selectedOptionId: "minor-first",
  hasSelection: true,
  matchesAnswer: true,
  answerLabel: "小三和弦 · 第一转位",
  explanation: firstMinor.explanation,
});
assert.equal(hasLocalEarTrainingChordAssessmentFields(rootMajor), false);
assert.throws(() => createLocalEarTrainingChordQuestion({
  difficulty: "基础",
  sequence: 0,
  variantId: "chord:c4:augmented:second",
}), /Invalid local chord variant/);

for (const difficulty of ["基础", "进阶", "挑战"] as const) {
  const count = getLocalEarTrainingChordVariantCount(difficulty);
  const schedule = createLocalQuestionSchedule(count, 11500 + count);
  const variants = Array.from({ length: count }, (_, sequence) => {
    const questionIndex = getScheduledQuestionIndex(schedule, sequence);
    assert.notEqual(questionIndex, null);
    return createLocalEarTrainingChordQuestion({
      difficulty,
      sequence,
      questionIndex: questionIndex ?? 0,
    }).variantId;
  });
  assert.equal(new Set(variants).size, count, `${difficulty}题库在遍历完前不得重复`);
}

console.log("Local chord and inversion training tests passed.");
