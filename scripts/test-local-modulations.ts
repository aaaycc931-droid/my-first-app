import assert from "node:assert/strict";
import {
  createLocalModulationQuestion,
  getLocalModulationAnswer,
  getLocalModulationAnswerOptions,
  getLocalModulationVariantCount,
  isLocalModulationVariantId,
} from "../lib/practice/localEarTrainingModulations";

assert.deepEqual(
  {
    基础: getLocalModulationVariantCount("基础"),
    进阶: getLocalModulationVariantCount("进阶"),
    挑战: getLocalModulationVariantCount("挑战"),
  },
  { 基础: 48, 进阶: 72, 挑战: 96 },
);

assert.deepEqual(getLocalModulationAnswerOptions("基础").map((option) => option.id), [
  "stay-tonic",
  "dominant",
]);
assert.deepEqual(getLocalModulationAnswerOptions("进阶").map((option) => option.id), [
  "stay-tonic",
  "dominant",
  "relative-minor",
]);
assert.deepEqual(getLocalModulationAnswerOptions("挑战").map((option) => option.id), [
  "stay-tonic",
  "dominant",
  "relative-minor",
  "parallel-minor",
]);

const rootPitchClass = (chord: readonly number[], tonicFrequencyHz: number) =>
  ((Math.round(12 * Math.log2(chord[0] / tonicFrequencyHz)) % 12) + 12) % 12;

const expectedDestinationPitchClass = {
  "stay-tonic": 0,
  dominant: 7,
  "relative-minor": 9,
  "parallel-minor": 0,
} as const;
const expectedDominantPitchClass = {
  "stay-tonic": 7,
  dominant: 2,
  "relative-minor": 4,
  "parallel-minor": 7,
} as const;

for (const difficulty of ["基础", "进阶", "挑战"] as const) {
  const count = getLocalModulationVariantCount(difficulty);
  const questions = Array.from({ length: count }, (_, questionIndex) =>
    createLocalModulationQuestion({ difficulty, sequence: questionIndex, questionIndex }),
  );
  assert.equal(new Set(questions.map((question) => question.variantId)).size, count);
  assert.equal(new Set(questions.map((question) => question.tonic.id)).size, 12);
  assert(questions.every((question) => question.chordFrequenciesHz.length === 8));
  assert(questions.every((question) => question.chordFrequenciesHz.every((chord) =>
    chord.length === 3 && chord.every((frequency, index) =>
      Number.isFinite(frequency) && frequency > 0 && (index === 0 || frequency > chord[index - 1]),
    ),
  )));
  assert(questions.every((question) =>
    rootPitchClass(question.chordFrequenciesHz.at(-1)!, question.tonic.frequencyHz)
      === expectedDestinationPitchClass[question.destination.id],
  ));
  assert(questions.every((question) =>
    rootPitchClass(question.chordFrequenciesHz.at(-2)!, question.tonic.frequencyHz)
      === expectedDominantPitchClass[question.destination.id],
  ));

  const grouped = new Map<string, typeof questions>();
  for (const question of questions) {
    const key = `${question.tonic.id}:${question.destination.id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), question]);
  }
  grouped.forEach((pair) => {
    assert.equal(pair.length, 2);
    assert.equal(new Set(pair.map((question) => question.route.id)).size, 2);
    assert.deepEqual(pair[0].chordFrequenciesHz.slice(0, 4), pair[1].chordFrequenciesHz.slice(0, 4));
  });
}

const dominant = createLocalModulationQuestion({
  difficulty: "基础",
  sequence: 8,
  variantId: "modulation:c3:dominant:diatonic-predominant",
});
assert.equal(dominant.tonic.label, "C 大调");
assert.equal(dominant.destination.label, "转到属调");
assert.equal(dominant.targetTonicLabel, "G 大调");
assert.equal(dominant.route.id, "diatonic-predominant");
assert.equal(getLocalModulationAnswer({ question: dominant, selectedOptionId: "dominant" }).matchesAnswer, true);
assert.equal(getLocalModulationAnswer({ question: dominant, selectedOptionId: null }).hasSelection, false);

assert.equal(isLocalModulationVariantId("基础", "modulation:b3:dominant:alternate-predominant"), true);
assert.equal(isLocalModulationVariantId("基础", "modulation:c3:relative-minor:diatonic-predominant"), false);
assert.equal(isLocalModulationVariantId("进阶", "modulation:c3:parallel-minor:diatonic-predominant"), false);
assert.equal(isLocalModulationVariantId("挑战", "modulation:c3:parallel-minor:diatonic-predominant"), true);
assert.equal(isLocalModulationVariantId("挑战", "modulation:h3:dominant:diatonic-predominant"), false);
assert.equal(isLocalModulationVariantId("挑战", "modulation:c3:dominant:unknown-route"), false);
assert.equal(isLocalModulationVariantId("挑战", "modulation:c3:dominant:diatonic-predominant:extra"), false);
assert.throws(
  () => createLocalModulationQuestion({
    difficulty: "基础",
    sequence: 0,
    variantId: "modulation:c3:relative-minor:diatonic-predominant",
  }),
  /Invalid local modulation variant id/,
);

console.log("Local modulation tests passed.");
