import assert from "node:assert/strict";
import { createLocalSeventhChordQuestion, getLocalSeventhChordAnswer, getLocalSeventhChordAnswerOptions, getLocalSeventhChordVariantCount, isLocalSeventhChordVariantId } from "../lib/practice/localEarTrainingSeventhChords";
import { createLocalQuestionSchedule, getScheduledQuestionIndex } from "../lib/practice/localQuestionScheduler";

assert.deepEqual({ 基础: getLocalSeventhChordVariantCount("基础"), 进阶: getLocalSeventhChordVariantCount("进阶"), 挑战: getLocalSeventhChordVariantCount("挑战") }, { 基础: 48, 进阶: 96, 挑战: 192 });
assert.equal(getLocalSeventhChordAnswerOptions("基础").length, 4);
assert.equal(getLocalSeventhChordAnswerOptions("进阶").length, 8);
assert.equal(getLocalSeventhChordAnswerOptions("挑战").length, 16);
const dominant = createLocalSeventhChordQuestion({ difficulty: "基础", sequence: 0, variantId: "seventh-chord:c3:dominant-seventh:root" });
assert.equal(dominant.frequenciesHz.length, 4);
assert(Math.abs(dominant.frequenciesHz[3] / dominant.frequenciesHz[0] - 2 ** (10 / 12)) < 1e-10);
const inversion = createLocalSeventhChordQuestion({ difficulty: "挑战", sequence: 0, variantId: "seventh-chord:c3:minor-seventh:third" });
assert.equal(inversion.inversionId, "third");
assert(inversion.frequenciesHz.every((value, index, values) => index === 0 || value > values[index - 1]));
assert.equal(isLocalSeventhChordVariantId("基础", inversion.variantId), false);
assert.deepEqual(getLocalSeventhChordAnswer({ question: dominant, selectedOptionId: dominant.answerOptionId }).matchesAnswer, true);
assert.throws(() => createLocalSeventhChordQuestion({ difficulty: "基础", sequence: 0, variantId: "seventh-chord:c3:minor-seventh:first" }), /Invalid local seventh chord variant/);
const expectedVoicings = {
  "major-seventh": [[0, 4, 7, 11], [4, 7, 11, 12], [7, 11, 12, 16], [11, 12, 16, 19]],
  "dominant-seventh": [[0, 4, 7, 10], [4, 7, 10, 12], [7, 10, 12, 16], [10, 12, 16, 19]],
  "minor-seventh": [[0, 3, 7, 10], [3, 7, 10, 12], [7, 10, 12, 15], [10, 12, 15, 19]],
  "half-diminished-seventh": [[0, 3, 6, 10], [3, 6, 10, 12], [6, 10, 12, 15], [10, 12, 15, 18]],
} as const;
for (const [quality, voicings] of Object.entries(expectedVoicings)) {
  const inversionIds = ["root", "first", "second", "third"] as const;
  for (let index = 0; index < inversionIds.length; index += 1) {
    const inversionId = inversionIds[index];
    const question = createLocalSeventhChordQuestion({ difficulty: "挑战", sequence: 0, variantId: `seventh-chord:c3:${quality}:${inversionId}` });
    const semitones = question.frequenciesHz.map((frequency) => Math.round(12 * Math.log2(frequency / question.root.frequencyHz)));
    assert.deepEqual(semitones, voicings[index], `${quality} ${inversionId} voicing`);
  }
}
for (const difficulty of ["基础", "进阶", "挑战"] as const) {
  const count = getLocalSeventhChordVariantCount(difficulty); const schedule = createLocalQuestionSchedule(count, 1150 + count);
  const ids = Array.from({ length: count }, (_, sequence) => createLocalSeventhChordQuestion({ difficulty, sequence, questionIndex: getScheduledQuestionIndex(schedule, sequence) ?? 0 }).variantId);
  assert.equal(new Set(ids).size, count);
}
console.log("Local seventh chord tests passed.");
