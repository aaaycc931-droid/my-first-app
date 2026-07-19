import assert from "node:assert/strict";

import {
  createLocalScaleModeQuestion,
  getLocalScaleModeAnswer,
  getLocalScaleModeAnswerOptions,
  getLocalScaleModeVariantCount,
  isLocalScaleModeVariantId,
} from "../lib/practice/localEarTrainingScaleModes";
import { createLocalQuestionSchedule, getScheduledQuestionIndex } from "../lib/practice/localQuestionScheduler";

assert.deepEqual({
  基础: getLocalScaleModeVariantCount("基础"),
  进阶: getLocalScaleModeVariantCount("进阶"),
  挑战: getLocalScaleModeVariantCount("挑战"),
}, { 基础: 48, 进阶: 96, 挑战: 144 });
assert.equal(getLocalScaleModeAnswerOptions("基础").length, 4);
assert.equal(getLocalScaleModeAnswerOptions("进阶").length, 8);
assert.equal(getLocalScaleModeAnswerOptions("挑战").length, 12);

const major = createLocalScaleModeQuestion({ difficulty: "基础", sequence: 0, variantId: "scale:c4:major" });
assert.equal(major.answerOptionId, "major");
assert.equal(major.frequenciesHz.length, 8);
assert(Math.abs(major.frequenciesHz[2] / major.frequenciesHz[0] - 2 ** (4 / 12)) < 1e-10);
assert(Math.abs(major.frequenciesHz.at(-1)! / major.frequenciesHz[0] - 2) < 1e-10);
assert.match(major.explanation, /大三度与大七度/);

const harmonicMinor = createLocalScaleModeQuestion({ difficulty: "进阶", sequence: 0, variantId: "scale:a4:harmonic-minor" });
assert.equal(harmonicMinor.frequenciesHz.length, 8);
assert(Math.abs(harmonicMinor.frequenciesHz[6] / harmonicMinor.frequenciesHz[5] - 2 ** (3 / 12)) < 1e-10);
assert.match(harmonicMinor.explanation, /增二度/);

const wholeTone = createLocalScaleModeQuestion({ difficulty: "挑战", sequence: 0, variantId: "scale:gb4:whole-tone" });
assert.equal(wholeTone.frequenciesHz.length, 7);
for (let index = 1; index < wholeTone.frequenciesHz.length; index += 1) {
  assert(Math.abs(wholeTone.frequenciesHz[index] / wholeTone.frequenciesHz[index - 1] - 2 ** (2 / 12)) < 1e-10);
}
assert.equal(isLocalScaleModeVariantId("挑战", wholeTone.variantId), true);
assert.equal(isLocalScaleModeVariantId("进阶", wholeTone.variantId), false);

assert.deepEqual(getLocalScaleModeAnswer({ question: major, selectedOptionId: "major" }), {
  selectedOptionId: "major",
  hasSelection: true,
  matchesAnswer: true,
  answerLabel: "自然大调（伊奥尼亚）",
  explanation: major.explanation,
});
assert.throws(() => createLocalScaleModeQuestion({
  difficulty: "基础",
  sequence: 0,
  variantId: "scale:c4:lydian",
}), /Invalid local scale or mode variant/);

for (const difficulty of ["基础", "进阶", "挑战"] as const) {
  const count = getLocalScaleModeVariantCount(difficulty);
  const schedule = createLocalQuestionSchedule(count, 11520 + count);
  const ids = Array.from({ length: count }, (_, sequence) => {
    const questionIndex = getScheduledQuestionIndex(schedule, sequence);
    assert.notEqual(questionIndex, null);
    return createLocalScaleModeQuestion({ difficulty, sequence, questionIndex: questionIndex ?? 0 }).variantId;
  });
  assert.equal(new Set(ids).size, count, `${difficulty}音阶题库完整遍历前不得重复`);
}

console.log("Local scale and mode ear-training tests passed.");
