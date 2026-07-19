import assert from "node:assert/strict";

import {
  createEmptyLocalLearningHistory,
  recordCheckedAnswerLearningEvent,
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
