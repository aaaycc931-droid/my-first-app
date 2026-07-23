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

const createMemoryStorage = (): StorageLike & {
  values: Map<string, string>;
  getSetCallCount: () => number;
} => {
  const values = new Map<string, string>();
  let setCallCount = 0;

  return {
    values,
    getSetCallCount: () => setCallCount,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      setCallCount += 1;
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
  sourceStatus: "available",
});

const queue = updateLocalPracticeReviewQueue({
  queue: createEmptyLocalPracticeReviewQueue(),
  target: {
    kind: "single-pitch",
    difficulty: "基础",
    seed: 42,
    sequence: 3,
    variantId: "pitch:c4",
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
  sourceStatus: "available",
});

const legacyStorage = createMemoryStorage();
legacyStorage.values.set(
  MOBILE_PRACTICE_REVIEW_STORAGE_KEY,
  JSON.stringify({
    schemaVersion: 1,
    catalogVersion: 1,
    targets: [{ kind: "single-pitch", difficulty: "基础", seed: 123, sequence: 4 }],
  }),
);
const migratedLoad = loadMobilePracticeReviewQueue(legacyStorage);
assert.deepEqual(migratedLoad, {
  queue: [{
    kind: "single-pitch",
    difficulty: "基础",
    seed: 123,
    sequence: 4,
    variantId: "pitch:d4",
  }],
  notice: null,
  sourceStatus: "available",
});
const migratedEnvelope = JSON.parse(
  legacyStorage.values.get(MOBILE_PRACTICE_REVIEW_STORAGE_KEY) ?? "{}",
) as { schemaVersion?: number; catalogVersion?: number };
assert.equal(migratedEnvelope.schemaVersion, 10);
assert.equal(migratedEnvelope.catalogVersion, 10);
const setCallsAfterMigration = legacyStorage.getSetCallCount();
assert.deepEqual(loadMobilePracticeReviewQueue(legacyStorage), migratedLoad);
assert.equal(
  legacyStorage.getSetCallCount(),
  setCallsAfterMigration,
  "a second load of the rewritten v10 queue must not rewrite storage again",
);

const spacingTarget = {
  kind: "seventh-chord-spacing" as const,
  difficulty: "挑战" as const,
  seed: 1154,
  sequence: 5,
  variantId: "seventh-chord-spacing:c3:dominant-seventh:third:open",
};
const previousSpacingStorage = createMemoryStorage();
previousSpacingStorage.values.set(MOBILE_PRACTICE_REVIEW_STORAGE_KEY, JSON.stringify({
  schemaVersion: 7,
  catalogVersion: 7,
  targets: [spacingTarget],
}));
assert.deepEqual(loadMobilePracticeReviewQueue(previousSpacingStorage), {
  queue: [spacingTarget],
  notice: null,
  sourceStatus: "available",
});
const rewrittenSpacingEnvelope = JSON.parse(
  previousSpacingStorage.values.get(MOBILE_PRACTICE_REVIEW_STORAGE_KEY) ?? "{}",
) as { schemaVersion?: number; catalogVersion?: number };
assert.equal(rewrittenSpacingEnvelope.schemaVersion, 10);
assert.equal(rewrittenSpacingEnvelope.catalogVersion, 10);

const previousComparisonStorage = createMemoryStorage();
previousComparisonStorage.values.set(MOBILE_PRACTICE_REVIEW_STORAGE_KEY, JSON.stringify({
  schemaVersion: 9,
  catalogVersion: 9,
  targets: [{
    kind: "chord-inversion",
    difficulty: "基础",
    playbackMode: "和声",
    seed: 115,
    sequence: 0,
    variantId: "chord:c4:major:root",
  }],
}));
assert.equal(loadMobilePracticeReviewQueue(previousComparisonStorage).queue[0]?.variantId, "chord:c4:major:root");
const rewrittenComparisonEnvelope = JSON.parse(
  previousComparisonStorage.values.get(MOBILE_PRACTICE_REVIEW_STORAGE_KEY) ?? "{}",
) as { schemaVersion?: number; catalogVersion?: number };
assert.equal(rewrittenComparisonEnvelope.schemaVersion, 10);
assert.equal(rewrittenComparisonEnvelope.catalogVersion, 10);

const forgedModulationStorage = createMemoryStorage();
forgedModulationStorage.values.set(MOBILE_PRACTICE_REVIEW_STORAGE_KEY, JSON.stringify({
  schemaVersion: 7,
  catalogVersion: 7,
  targets: [spacingTarget, {
    kind: "modulation",
    difficulty: "挑战",
    seed: 1155,
    sequence: 6,
    variantId: "modulation:c3:parallel-minor:alternate-predominant",
  }],
}));
const forgedModulationLoad = loadMobilePracticeReviewQueue(forgedModulationStorage);
assert.deepEqual(forgedModulationLoad.queue, createEmptyLocalPracticeReviewQueue());
assert.match(forgedModulationLoad.notice ?? "", /已自动清除/);
assert.equal(forgedModulationLoad.sourceStatus, "unavailable");
assert.equal(forgedModulationStorage.values.has(MOBILE_PRACTICE_REVIEW_STORAGE_KEY), false);

const migrationWriteFailure: StorageLike = {
  getItem: () => JSON.stringify({
    schemaVersion: 1,
    catalogVersion: 1,
    targets: [{ kind: "single-pitch", difficulty: "基础", seed: 123, sequence: 4 }],
  }),
  setItem: () => { throw new Error("set failed"); },
  removeItem: () => undefined,
};
const migrationWriteFailureLoad = loadMobilePracticeReviewQueue(migrationWriteFailure);
assert.equal(migrationWriteFailureLoad.queue[0]?.variantId, "pitch:d4");
assert.match(migrationWriteFailureLoad.notice ?? "", /旧记录已恢复/);
assert.match(migrationWriteFailureLoad.notice ?? "", /升级保存失败/);
assert.equal(migrationWriteFailureLoad.sourceStatus, "available");
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
assert.equal(readFailure.sourceStatus, "unavailable");
assert.match(
  saveMobilePracticeReviewQueue(makeThrowingStorage("set"), queue).notice ?? "",
  /保存失败/,
);
assert.match(
  clearMobilePracticeReviewQueue(makeThrowingStorage("remove")).notice ?? "",
  /清除失败/,
);

const unavailableLoad = loadMobilePracticeReviewQueue(null);
assert.match(unavailableLoad.notice ?? "", /暂时不可用/);
assert.equal(unavailableLoad.sourceStatus, "unavailable");
assert.match(saveMobilePracticeReviewQueue(null, queue).notice ?? "", /暂时不可用/);
assert.match(clearMobilePracticeReviewQueue(null).notice ?? "", /暂时不可用/);

const invalidStorage = createMemoryStorage();
invalidStorage.values.set(MOBILE_PRACTICE_REVIEW_STORAGE_KEY, "not-json");
const invalidLoad = loadMobilePracticeReviewQueue(invalidStorage);
assert.deepEqual(invalidLoad.queue, createEmptyLocalPracticeReviewQueue());
assert.match(invalidLoad.notice ?? "", /已自动清除/);
assert.equal(invalidLoad.sourceStatus, "unavailable");
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
assert.equal(unclearedInvalidLoad.sourceStatus, "unavailable");

console.log("Mobile practice review storage tests passed.");
