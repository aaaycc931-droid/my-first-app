import assert from "node:assert/strict";
import {
  createLocalSeventhChordSpacingQuestion,
  getLocalSeventhChordSpacingAnswer,
  getLocalSeventhChordSpacingAnswerOptions,
  getLocalSeventhChordSpacingVariantCount,
  isLocalSeventhChordSpacingVariantId,
} from "../lib/practice/localEarTrainingSeventhChordSpacing";

assert.deepEqual(
  {
    基础: getLocalSeventhChordSpacingVariantCount("基础"),
    进阶: getLocalSeventhChordSpacingVariantCount("进阶"),
    挑战: getLocalSeventhChordSpacingVariantCount("挑战"),
  },
  { 基础: 48, 进阶: 96, 挑战: 384 },
);
assert.deepEqual(getLocalSeventhChordSpacingAnswerOptions(), [
  { id: "close", label: "密集排列" },
  { id: "open", label: "开放排列" },
]);

const pitchClasses = (frequenciesHz: readonly number[], rootFrequencyHz: number) =>
  frequenciesHz
    .map((frequency) => ((Math.round(12 * Math.log2(frequency / rootFrequencyHz)) % 12) + 12) % 12)
    .sort((a, b) => a - b);
const spanInSemitones = (frequenciesHz: readonly number[]) =>
  12 * Math.log2(frequenciesHz[frequenciesHz.length - 1] / frequenciesHz[0]);

for (const difficulty of ["基础", "进阶", "挑战"] as const) {
  const count = getLocalSeventhChordSpacingVariantCount(difficulty);
  const questions = Array.from({ length: count }, (_, questionIndex) =>
    createLocalSeventhChordSpacingQuestion({ difficulty, sequence: questionIndex, questionIndex }),
  );
  assert.equal(new Set(questions.map((question) => question.variantId)).size, count);
  assert(questions.some((question) => question.spacingId === "close"));
  assert(questions.some((question) => question.spacingId === "open"));
  assert(questions.every((question) => question.frequenciesHz.every(
    (frequency, index, frequencies) => Number.isFinite(frequency) && frequency > 0 && (index === 0 || frequency > frequencies[index - 1]),
  )));
  assert(questions.filter((question) => question.spacingId === "close").every(
    (question) => spanInSemitones(question.frequenciesHz) < 12,
  ));
  assert(questions.filter((question) => question.spacingId === "open").every(
    (question) => spanInSemitones(question.frequenciesHz) > 12,
  ));
  const byStructure = new Map<string, typeof questions>();
  for (const question of questions) {
    const key = `${question.root.id}:${question.quality.id}:${question.inversionId}`;
    byStructure.set(key, [...(byStructure.get(key) ?? []), question]);
  }
  byStructure.forEach((pair) => {
    const closeQuestion = pair.find((question) => question.spacingId === "close");
    const openQuestion = pair.find((question) => question.spacingId === "open");
    assert(closeQuestion && openQuestion);
    assert.equal(closeQuestion.frequenciesHz[0], openQuestion.frequenciesHz[0]);
    assert.deepEqual(
      pitchClasses(closeQuestion.frequenciesHz, closeQuestion.root.frequencyHz),
      pitchClasses(openQuestion.frequenciesHz, openQuestion.root.frequencyHz),
    );
  });
}

const close = createLocalSeventhChordSpacingQuestion({
  difficulty: "挑战",
  sequence: 0,
  variantId: "seventh-chord-spacing:c3:half-diminished-seventh:third:close",
});
const open = createLocalSeventhChordSpacingQuestion({
  difficulty: "挑战",
  sequence: 1,
  variantId: "seventh-chord-spacing:c3:half-diminished-seventh:third:open",
});
assert.equal(close.quality.id, open.quality.id);
assert.equal(close.inversionId, open.inversionId);
assert.equal(close.frequenciesHz[0], open.frequenciesHz[0]);
assert.deepEqual(pitchClasses(close.frequenciesHz, close.root.frequencyHz), pitchClasses(open.frequenciesHz, open.root.frequencyHz));
assert.deepEqual(open.frequenciesHz, [close.frequenciesHz[0], close.frequenciesHz[2], close.frequenciesHz[1] * 2, close.frequenciesHz[3] * 2]);
assert.equal(getLocalSeventhChordSpacingAnswer({ question: open, selectedOptionId: "open" }).matchesAnswer, true);
assert.equal(isLocalSeventhChordSpacingVariantId("基础", "seventh-chord-spacing:c3:minor-seventh:root:open"), false);
assert.equal(isLocalSeventhChordSpacingVariantId("基础", "seventh-chord-spacing:c3:dominant-seventh:root:open"), true);
assert.throws(
  () => createLocalSeventhChordSpacingQuestion({ difficulty: "进阶", sequence: 0, variantId: "seventh-chord-spacing:c3:major-seventh:first:open" }),
  /Invalid local seventh chord spacing variant/,
);

console.log("Local seventh chord spacing tests passed.");
