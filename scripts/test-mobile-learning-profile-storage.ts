import assert from "node:assert/strict";

import {
  createEmptyLocalLearningHistory,
  recordCheckedAnswerLearningEvent,
  serializeLocalLearningHistory,
} from "../lib/learning/learningEventProfile";
import {
  MOBILE_LEARNING_PROFILE_STORAGE_KEY,
  clearMobileLearningHistory,
  loadMobileLearningHistory,
  saveMobileLearningHistory,
} from "../mobile/src/runtime/mobileLearningProfileStorage";
import type { StorageLike } from "../mobile/src/runtime/mobilePracticeReviewStorage";

const values = new Map<string, string>();
const storage: StorageLike = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => { values.set(key, value); },
  removeItem: (key) => { values.delete(key); },
};
const history = recordCheckedAnswerLearningEvent({
  history: createEmptyLocalLearningHistory(),
  result: {
    target: { kind: "single-pitch", difficulty: "基础", seed: 1, sequence: 1, variantId: "pitch:c4" },
    isCorrect: false,
  },
  practiceMode: "random",
  occurredAt: "2026-07-19T00:00:00.000Z",
});

assert.deepEqual(loadMobileLearningHistory(storage), {
  history: createEmptyLocalLearningHistory(),
  notice: null,
});
assert.deepEqual(saveMobileLearningHistory(storage, history), { notice: null });
assert.deepEqual(loadMobileLearningHistory(storage), { history, notice: null });
assert.equal(values.has(MOBILE_LEARNING_PROFILE_STORAGE_KEY), true);
assert.deepEqual(clearMobileLearningHistory(storage), { notice: null });
assert.equal(values.has(MOBILE_LEARNING_PROFILE_STORAGE_KEY), false);

const spacingHistory = recordCheckedAnswerLearningEvent({
  history: createEmptyLocalLearningHistory(),
  result: {
    target: {
      kind: "seventh-chord-spacing",
      difficulty: "挑战",
      seed: 1154,
      sequence: 5,
      variantId: "seventh-chord-spacing:c3:dominant-seventh:third:open",
    },
    isCorrect: false,
  },
  practiceMode: "random",
  occurredAt: "2026-07-20T00:00:00.000Z",
});
const previousSpacingEnvelope = JSON.parse(serializeLocalLearningHistory(spacingHistory)) as {
  schemaVersion: number;
  profile: { skillFacts: Array<{ skillKind: string }> };
  recentEvents: Array<{ skillKind: string }>;
};
previousSpacingEnvelope.schemaVersion = 6;
previousSpacingEnvelope.profile.skillFacts = previousSpacingEnvelope.profile.skillFacts.filter(
  (fact) => fact.skillKind !== "modulation",
);
values.set(MOBILE_LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(previousSpacingEnvelope));
const migratedSpacing = loadMobileLearningHistory(storage);
assert.equal(migratedSpacing.notice, null);
assert.equal(migratedSpacing.history.schemaVersion, 8);
assert.equal(migratedSpacing.history.profile.skillFacts.find((fact) => fact.skillKind === "seventh-chord-spacing")?.incorrectCount, 1);
assert.equal(migratedSpacing.history.profile.skillFacts.find((fact) => fact.skillKind === "modulation")?.checkedCount, 0);
assert.equal(migratedSpacing.history.recentEvents[0]?.skillKind, "seventh-chord-spacing");
assert.equal((JSON.parse(values.get(MOBILE_LEARNING_PROFILE_STORAGE_KEY) ?? "{}") as { schemaVersion?: number }).schemaVersion, 6);
assert.deepEqual(saveMobileLearningHistory(storage, migratedSpacing.history), { notice: null });
assert.equal((JSON.parse(values.get(MOBILE_LEARNING_PROFILE_STORAGE_KEY) ?? "{}") as { schemaVersion?: number }).schemaVersion, 8);

const previousModulationEnvelope = JSON.parse(serializeLocalLearningHistory(history)) as {
  schemaVersion: number;
  profile: { suggestionsEnabled: boolean; checkedCount: number };
  recentEvents: Array<{ practiceMode: string }>;
};
previousModulationEnvelope.schemaVersion = 7;
previousModulationEnvelope.profile.suggestionsEnabled = false;
values.set(MOBILE_LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(previousModulationEnvelope));
const migratedModulation = loadMobileLearningHistory(storage);
assert.equal(migratedModulation.notice, null);
assert.equal(migratedModulation.history.schemaVersion, 8);
assert.equal(migratedModulation.history.profile.checkedCount, history.profile.checkedCount);
assert.equal(migratedModulation.history.profile.suggestionsEnabled, false);
assert.deepEqual(migratedModulation.history.recentEvents, history.recentEvents);

const forgedCustomEnvelope = JSON.parse(JSON.stringify(previousModulationEnvelope)) as typeof previousModulationEnvelope;
forgedCustomEnvelope.recentEvents[0].practiceMode = "custom";
values.set(MOBILE_LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(forgedCustomEnvelope));
const rejectedForgedCustom = loadMobileLearningHistory(storage);
assert.equal(rejectedForgedCustom.history.profile.checkedCount, 0);
assert.match(rejectedForgedCustom.notice ?? "", /已自动清除/);
assert.equal(values.has(MOBILE_LEARNING_PROFILE_STORAGE_KEY), false);

const forgedModulationEnvelope = JSON.parse(JSON.stringify(previousSpacingEnvelope)) as typeof previousSpacingEnvelope;
forgedModulationEnvelope.recentEvents[0].skillKind = "modulation";
values.set(MOBILE_LEARNING_PROFILE_STORAGE_KEY, JSON.stringify(forgedModulationEnvelope));
const rejectedForgedModulation = loadMobileLearningHistory(storage);
assert.equal(rejectedForgedModulation.history.profile.checkedCount, 0);
assert.match(rejectedForgedModulation.notice ?? "", /已自动清除/);
assert.equal(values.has(MOBILE_LEARNING_PROFILE_STORAGE_KEY), false);

values.set(MOBILE_LEARNING_PROFILE_STORAGE_KEY, "invalid");
const invalid = loadMobileLearningHistory(storage);
assert.equal(invalid.history.profile.checkedCount, 0);
assert.match(invalid.notice ?? "", /已自动清除/);
assert.equal(values.has(MOBILE_LEARNING_PROFILE_STORAGE_KEY), false);

const throwing = (operation: "get" | "set" | "remove"): StorageLike => ({
  getItem: () => { if (operation === "get") throw new Error("get"); return null; },
  setItem: () => { if (operation === "set") throw new Error("set"); },
  removeItem: () => { if (operation === "remove") throw new Error("remove"); },
});
assert.match(loadMobileLearningHistory(throwing("get")).notice ?? "", /读取失败/);
assert.match(saveMobileLearningHistory(throwing("set"), history).notice ?? "", /保存失败/);
assert.match(clearMobileLearningHistory(throwing("remove")).notice ?? "", /清除失败/);
assert.match(loadMobileLearningHistory(null).notice ?? "", /暂时不可用/);

console.log("Mobile learning profile storage tests passed.");
