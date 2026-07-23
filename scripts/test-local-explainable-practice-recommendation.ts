import assert from "node:assert/strict";

import {
  LOCAL_EXPLAINABLE_RECOMMENDATION_RULE,
  buildLocalExplainablePracticeRecommendation,
} from "../lib/learning/localExplainablePracticeRecommendation";
import type { LocalPracticeReviewTarget } from "../lib/practice/localPracticeReviewQueue";

const pitch: LocalPracticeReviewTarget = {
  kind: "single-pitch", difficulty: "基础", seed: 1, sequence: 0, variantId: "pitch:c4",
};
const interval: LocalPracticeReviewTarget = {
  kind: "interval", difficulty: "进阶", direction: "下行", seed: 2, sequence: 0,
  variantId: "interval:g4:major-second",
};
const pitchD4: LocalPracticeReviewTarget = {
  kind: "single-pitch", difficulty: "基础", seed: 3, sequence: 0, variantId: "pitch:d4",
};

assert.deepEqual(
  buildLocalExplainablePracticeRecommendation({ suggestionsEnabled: false, queue: [pitch] }),
  { status: "disabled" },
);
assert.deepEqual(
  buildLocalExplainablePracticeRecommendation({ suggestionsEnabled: true, queue: [] }),
  { status: "empty" },
);

const source = [interval, pitch, pitchD4];
const snapshot = structuredClone(source);
const recommendation = buildLocalExplainablePracticeRecommendation({
  suggestionsEnabled: true,
  queue: source,
});
assert.deepEqual(recommendation, {
  status: "available",
  target: interval,
  source: {
    rule: LOCAL_EXPLAINABLE_RECOMMENDATION_RULE,
    queuePosition: 1,
    sameKindPendingCount: 1,
    pendingTargetCount: 3,
  },
});
assert.deepEqual(source, snapshot, "recommendation must not mutate the queue");

const pitchRecommendation = buildLocalExplainablePracticeRecommendation({
  suggestionsEnabled: true,
  queue: [pitchD4, interval, pitch],
});
assert.equal(pitchRecommendation.status, "available");
if (pitchRecommendation.status === "available") {
  assert.deepEqual(pitchRecommendation.target, pitchD4, "must preserve the exact queue MRU");
  assert.equal(pitchRecommendation.source.sameKindPendingCount, 2);
}

const malformedQueues = [
  [null as unknown as LocalPracticeReviewTarget],
  [{ ...pitch, kind: "unknown-kind" } as unknown as LocalPracticeReviewTarget],
  [pitch, { ...pitch, seed: 99, sequence: 99 }],
  Array.from({ length: 13 }, (_, index) => ({ ...pitch, variantId: `pitch:${index}` })),
];
for (const queue of malformedQueues) {
  assert.deepEqual(
    buildLocalExplainablePracticeRecommendation({ suggestionsEnabled: true, queue }),
    { status: "unavailable" },
  );
}

assert.equal("outcome" in recommendation, false);
assert.equal("score" in recommendation, false);
assert.equal("accuracy" in recommendation, false);
assert.equal("diagnosis" in recommendation, false);

console.log("Local explainable practice recommendation tests passed.");
