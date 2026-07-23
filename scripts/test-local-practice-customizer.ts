import assert from "node:assert/strict";

import {
  LOCAL_PRACTICE_CUSTOMIZER_SCHEMA_VERSION,
  getLocalPracticeCustomizerSubsetOptions,
  parseLocalPracticeCustomization,
  resolveLocalPracticeCustomization,
  resolveLocalPracticeCustomizerVariant,
} from "../lib/practice/localPracticeCustomizer";
import type { LocalPracticeDifficulty, LocalPracticeKind } from "../lib/practice/localPracticeCatalog";

const kinds: LocalPracticeKind[] = [
  "single-pitch",
  "interval",
  "chord-inversion",
  "harmony-progression",
  "scale-mode",
  "seventh-chord",
  "seventh-chord-spacing",
  "modulation",
  "rhythm",
  "melody-dictation",
];
const difficulties: LocalPracticeDifficulty[] = ["基础", "进阶", "挑战"];

const configFor = (kind: LocalPracticeKind, difficulty: LocalPracticeDifficulty) => {
  const options = getLocalPracticeCustomizerSubsetOptions(kind, difficulty);
  assert(options.length >= 2, `${kind}/${difficulty} must expose at least two answer categories`);
  assert(options.every((option) => option.variantCount > 0));
  const common = {
    schemaVersion: LOCAL_PRACTICE_CUSTOMIZER_SCHEMA_VERSION,
    kind,
    difficulty,
    answerOptionIds: [options[0].id, options[1].id],
  };
  if (kind === "interval") return { ...common, kind, intervalDirection: "下行" as const };
  if (kind === "chord-inversion") return { ...common, kind, chordPlaybackMode: "分解" as const };
  return common;
};

for (const kind of kinds) {
  for (const difficulty of difficulties) {
    const input = configFor(kind, difficulty);
    const first = resolveLocalPracticeCustomization(input);
    const second = resolveLocalPracticeCustomization(input);
    assert(first, `${kind}/${difficulty} customization must resolve`);
    assert.deepEqual(second, first, `${kind}/${difficulty} resolution order must be stable`);
    assert.equal(first.answerOptionIds.length, 2);
    assert.equal(first.subsetOptions.length, 2);
    assert.equal(first.variantCount, first.variantIds.length);
    assert(first.variantCount >= 2);
    assert.equal(new Set(first.variantIds).size, first.variantIds.length);
    for (const variantId of first.variantIds) {
      const variant = resolveLocalPracticeCustomizerVariant(kind, difficulty, variantId);
      assert(variant, `${kind}/${difficulty} emitted an unresolvable variant id`);
      assert(first.answerOptionIds.includes(variant.answerOptionId));
    }
  }
}

assert.deepEqual(
  getLocalPracticeCustomizerSubsetOptions("chord-inversion", "基础")
    .map(({ id, variantCount }) => ({ id, variantCount })),
  [
    { id: "major-root", variantCount: 10 },
    { id: "minor-root", variantCount: 10 },
  ],
);
assert.deepEqual(
  getLocalPracticeCustomizerSubsetOptions("harmony-progression", "基础")
    .map(({ id, variantCount }) => ({ id, variantCount })),
  [
    { id: "authentic-three", variantCount: 10 },
    { id: "plagal-three", variantCount: 10 },
  ],
);

const pitchOptions = getLocalPracticeCustomizerSubsetOptions("single-pitch", "基础");
const reversedPitchConfig = {
  schemaVersion: LOCAL_PRACTICE_CUSTOMIZER_SCHEMA_VERSION,
  kind: "single-pitch",
  difficulty: "基础",
  answerOptionIds: [pitchOptions[1].id, pitchOptions[0].id],
};
const canonicalPitch = resolveLocalPracticeCustomization(reversedPitchConfig);
assert(canonicalPitch);
assert.deepEqual(canonicalPitch.answerOptionIds, [pitchOptions[0].id, pitchOptions[1].id]);
assert.equal(canonicalPitch.variantIds[0], "pitch:c4");

assert.equal(resolveLocalPracticeCustomizerVariant("single-pitch", "基础", "pitch:not-real"), null);
assert.equal(resolveLocalPracticeCustomizerVariant("interval", "基础", "pitch:c4"), null);

assert.equal(parseLocalPracticeCustomization(null), null);
assert.equal(parseLocalPracticeCustomization({}), null);
assert.equal(parseLocalPracticeCustomization({ ...reversedPitchConfig, extra: true }), null);
assert.equal(parseLocalPracticeCustomization({ ...reversedPitchConfig, schemaVersion: 2 }), null);
assert.equal(parseLocalPracticeCustomization({ ...reversedPitchConfig, kind: "unknown" }), null);
assert.equal(parseLocalPracticeCustomization({ ...reversedPitchConfig, difficulty: "专家" }), null);
assert.equal(parseLocalPracticeCustomization({ ...reversedPitchConfig, answerOptionIds: [pitchOptions[0].id] }), null);
assert.equal(parseLocalPracticeCustomization({
  ...reversedPitchConfig,
  answerOptionIds: [pitchOptions[0].id, pitchOptions[0].id],
}), null);
assert.equal(parseLocalPracticeCustomization({
  ...reversedPitchConfig,
  answerOptionIds: [pitchOptions[0].id, "not-real"],
}), null);
assert.equal(parseLocalPracticeCustomization({
  ...configFor("interval", "基础"),
  intervalDirection: "同时",
}), null);
assert.equal(parseLocalPracticeCustomization({
  ...configFor("chord-inversion", "基础"),
  chordPlaybackMode: "随机",
}), null);
assert.equal(parseLocalPracticeCustomization({
  ...reversedPitchConfig,
  chordPlaybackMode: "和声",
}), null);

console.log("Local practice customizer tests passed.");
