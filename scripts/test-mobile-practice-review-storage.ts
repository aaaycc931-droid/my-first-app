import assert from "node:assert/strict";

import {
  createEmptyLocalPracticeReviewQueue,
  updateLocalPracticeReviewQueue,
} from "../lib/practice/localPracticeReviewQueue";
import {
  MOBILE_PRACTICE_REVIEW_STORAGE_KEY,
  clearMobilePracticeReviewQueue,
  loadMobilePracticeReviewQueue,
  saveMobilePracticeReviewQueue,
  type StorageLike,
} from "../mobile/src/runtime/mobilePracticeReviewStorage";

const createMemoryStorage = (): StorageLike & { values: Map<string, string> } => {
  const values = new Map<string, string>();

  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
};

const memoryStorage = createMemoryStorage();
assert.deepEqual(loadMobilePracticeReviewQueue(memoryStorage), {
  queue: createEmptyLocalPracticeReviewQueue(),
  notice: null,
});

const queue = updateLocalPracticeReviewQueue({
  queue: createEmptyLocalPracticeReviewQueue(),
  target: {
    kind: "single-pitch",
    difficulty: "基础",
    seed: 42,
    sequence: 3,
  },
  isCorrect: false,
});
assert.deepEqual(saveMobilePracticeReviewQueue(memoryStorage, queue), {
  notice: null,
});
assert.ok(memoryStorage.values.has(MOBILE_PRACTICE_REVIEW_STORAGE_KEY));
assert.deepEqual(loadMobilePracticeReviewQueue(memoryStorage), {
  queue,
  notice: null,
});
assert.deepEqual(clearMobilePracticeReviewQueue(memoryStorage), { notice: null });
assert.equal(memoryStorage.values.has(MOBILE_PRACTICE_REVIEW_STORAGE_KEY), false);

const makeThrowingStorage = (operation: "get" | "set" | "remove"): StorageLike => ({
  getItem: () => {
    if (operation === "get") throw new Error("get failed");
    return null;
  },
  setItem: () => {
    if (operation === "set") throw new Error("set failed");
  },
  removeItem: () => {
    if (operation === "remove") throw new Error("remove failed");
  },
});

const readFailure = loadMobilePracticeReviewQueue(makeThrowingStorage("get"));
assert.deepEqual(readFailure.queue, createEmptyLocalPracticeReviewQueue());
assert.match(readFailure.notice ?? "", /读取失败/);
assert.match(
  saveMobilePracticeReviewQueue(makeThrowingStorage("set"), queue).notice ?? "",
  /保存失败/,
);
assert.match(
  clearMobilePracticeReviewQueue(makeThrowingStorage("remove")).notice ?? "",
  /清除失败/,
);

assert.match(loadMobilePracticeReviewQueue(null).notice ?? "", /暂时不可用/);
assert.match(saveMobilePracticeReviewQueue(null, queue).notice ?? "", /暂时不可用/);
assert.match(clearMobilePracticeReviewQueue(null).notice ?? "", /暂时不可用/);

const invalidStorage = createMemoryStorage();
invalidStorage.values.set(MOBILE_PRACTICE_REVIEW_STORAGE_KEY, "not-json");
const invalidLoad = loadMobilePracticeReviewQueue(invalidStorage);
assert.deepEqual(invalidLoad.queue, createEmptyLocalPracticeReviewQueue());
assert.match(invalidLoad.notice ?? "", /已自动清除/);
assert.equal(invalidStorage.values.has(MOBILE_PRACTICE_REVIEW_STORAGE_KEY), false);

const unclearedInvalidStorage: StorageLike = {
  getItem: () => "not-json",
  setItem: () => undefined,
  removeItem: () => {
    throw new Error("remove failed");
  },
};
const unclearedInvalidLoad = loadMobilePracticeReviewQueue(unclearedInvalidStorage);
assert.deepEqual(unclearedInvalidLoad.queue, createEmptyLocalPracticeReviewQueue());
assert.match(unclearedInvalidLoad.notice ?? "", /无法自动清除/);

console.log("Mobile practice review storage tests passed.");
