import assert from "node:assert/strict";

import { buildLocalWeakPointReviewQueue } from "../lib/learning/localWeakPointReviewQueue";
import type { LocalPracticeReviewTarget } from "../lib/practice/localPracticeReviewQueue";

const pitchC4: LocalPracticeReviewTarget = {
  kind: "single-pitch", difficulty: "基础", seed: 1, sequence: 0, variantId: "pitch:c4",
};
const interval: LocalPracticeReviewTarget = {
  kind: "interval", difficulty: "进阶", direction: "下行", seed: 2, sequence: 0,
  variantId: "interval:g4:major-second",
};
const pitchD4: LocalPracticeReviewTarget = {
  kind: "single-pitch", difficulty: "基础", seed: 3, sequence: 0, variantId: "pitch:d4",
};
const rhythm: LocalPracticeReviewTarget = {
  kind: "rhythm", difficulty: "基础", seed: 4, sequence: 0, variantId: "rhythm:even-quarters",
};

assert.deepEqual(buildLocalWeakPointReviewQueue([]), {
  status: "available",
  pendingTargetCount: 0,
  groups: [],
});

const source = [pitchC4, interval, pitchD4, rhythm] as const;
const snapshot = structuredClone(source);
const grouped = buildLocalWeakPointReviewQueue([...source]);
assert.equal(grouped.status, "available");
assert.equal(grouped.pendingTargetCount, 4);
assert.deepEqual(grouped.groups.map((group) => group.kind), ["single-pitch", "interval", "rhythm"]);
assert.deepEqual(grouped.groups[0]?.targets, [pitchC4, pitchD4], "targets retain queue MRU order within a family");
assert.deepEqual(grouped.groups[1]?.targets, [interval]);
assert.equal(grouped.groups.reduce((sum, group) => sum + group.targets.length, 0), grouped.pendingTargetCount);
assert.deepEqual(source, snapshot, "grouping must not mutate the source queue");

const duplicate = buildLocalWeakPointReviewQueue([pitchC4, { ...pitchC4, seed: 99, sequence: 99 }]);
assert.deepEqual(duplicate, { status: "unavailable", pendingTargetCount: 0, groups: [] });

const unknown = buildLocalWeakPointReviewQueue([
  { ...pitchC4, kind: "unknown-kind" } as unknown as LocalPracticeReviewTarget,
]);
assert.deepEqual(unknown, { status: "unavailable", pendingTargetCount: 0, groups: [] });

const tooMany = Array.from({ length: 13 }, (_, index) => ({
  ...pitchC4,
  variantId: `pitch:test-${index}`,
})) as LocalPracticeReviewTarget[];
assert.deepEqual(buildLocalWeakPointReviewQueue(tooMany), {
  status: "unavailable", pendingTargetCount: 0, groups: [],
});

assert.deepEqual(
  buildLocalWeakPointReviewQueue([
    { ...pitchC4, difficulty: "未知" } as unknown as LocalPracticeReviewTarget,
  ]),
  { status: "unavailable", pendingTargetCount: 0, groups: [] },
);

assert.deepEqual(
  buildLocalWeakPointReviewQueue([
    { ...interval, direction: "横向" } as unknown as LocalPracticeReviewTarget,
  ]),
  { status: "unavailable", pendingTargetCount: 0, groups: [] },
);

assert.deepEqual(
  buildLocalWeakPointReviewQueue([null as unknown as LocalPracticeReviewTarget]),
  { status: "unavailable", pendingTargetCount: 0, groups: [] },
);

assert.equal("score" in grouped, false);
assert.equal("accuracy" in grouped, false);
assert.equal("grade" in grouped, false);
assert.equal("diagnosis" in grouped, false);

console.log("Local weak-point review queue tests passed.");
