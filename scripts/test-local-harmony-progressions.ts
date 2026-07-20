import assert from "node:assert/strict";

import {
  createLocalHarmonyProgressionQuestion,
  getLocalHarmonyProgressionAnswer,
  getLocalHarmonyProgressionAnswerOptions,
  getLocalHarmonyProgressionVariantCount,
  isLocalHarmonyProgressionVariantId,
} from "../lib/practice/localEarTrainingHarmonyProgressions";
import { createLocalQuestionSchedule, getScheduledQuestionIndex } from "../lib/practice/localQuestionScheduler";

assert.deepEqual({
  基础: getLocalHarmonyProgressionVariantCount("基础"),
  进阶: getLocalHarmonyProgressionVariantCount("进阶"),
  挑战: getLocalHarmonyProgressionVariantCount("挑战"),
}, { 基础: 8, 进阶: 24, 挑战: 42 });
assert.equal(getLocalHarmonyProgressionAnswerOptions("基础").length, 2);
assert.equal(getLocalHarmonyProgressionAnswerOptions("进阶").length, 4);
assert.equal(getLocalHarmonyProgressionAnswerOptions("挑战").length, 7);

const authentic = createLocalHarmonyProgressionQuestion({ difficulty: "基础", sequence: 0, variantId: "progression:c3:authentic-three" });
assert.equal(authentic.answerOptionId, "authentic-three");
assert.equal(authentic.chordFrequenciesHz.length, 3);
assert.match(authentic.explanation, /V 回到主和弦 I/);
assert.equal(authentic.chordFrequenciesHz.every((chord) => chord.length === 3), true);
assert.equal(authentic.chordFrequenciesHz.every((chord) => chord[0] < chord[1] && chord[1] < chord[2]), true);
assert.deepEqual(authentic.voiceLeadingCue.bassFrequenciesHz, authentic.chordFrequenciesHz.map((chord) => chord[0]));
assert.deepEqual(authentic.voiceLeadingCue.upperFrequenciesHz, authentic.chordFrequenciesHz.map((chord) => chord[2]));
assert.match(authentic.voiceLeadingCue.bassMotion, /上行|下行|保持/);
assert.match(authentic.voiceLeadingCue.upperMotion, /上行|下行|保持/);
assert.match(authentic.voiceLeadingCue.explanation, /不单独判分/);

const minor = createLocalHarmonyProgressionQuestion({ difficulty: "挑战", sequence: 0, variantId: "progression:a3:minor-authentic" });
assert.equal(minor.pattern.label, "小调正格 · i–iv–V–i");
assert.equal(isLocalHarmonyProgressionVariantId("挑战", minor.variantId), true);
assert.equal(isLocalHarmonyProgressionVariantId("进阶", minor.variantId), false);
assert.deepEqual(getLocalHarmonyProgressionAnswer({ question: minor, selectedOptionId: "minor-authentic" }), {
  selectedOptionId: "minor-authentic",
  hasSelection: true,
  matchesAnswer: true,
  answerLabel: minor.pattern.label,
  explanation: minor.explanation,
});
assert.throws(() => createLocalHarmonyProgressionQuestion({ difficulty: "基础", sequence: 0, variantId: minor.variantId }), /Invalid local harmony progression/);

for (const difficulty of ["基础", "进阶", "挑战"] as const) {
  const count = getLocalHarmonyProgressionVariantCount(difficulty);
  const schedule = createLocalQuestionSchedule(count, 11510 + count);
  const ids = Array.from({ length: count }, (_, sequence) => createLocalHarmonyProgressionQuestion({
    difficulty,
    sequence,
    questionIndex: getScheduledQuestionIndex(schedule, sequence) ?? 0,
  }).variantId);
  assert.equal(new Set(ids).size, count, `${difficulty}题库遍历完前不得重复`);
}

console.log("Local harmony progression tests passed.");
