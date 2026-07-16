import assert from "node:assert/strict";

import {
  LOCAL_PRACTICE_REVIEW_QUEUE_MAX_ITEMS,
  LOCAL_PRACTICE_REVIEW_QUEUE_MAX_SERIALIZED_LENGTH,
  createLocalPracticeReviewQueue,
  parseLocalPracticeReviewQueue,
  serializeLocalPracticeReviewQueue,
  updateLocalPracticeReviewQueue,
  type LocalPracticeReviewTarget,
} from "../lib/practice/localPracticeReviewQueue";

const pitch: LocalPracticeReviewTarget = {
  kind: "single-pitch",
  difficulty: "基础",
  seed: 123,
  sequence: 4,
};
const interval: LocalPracticeReviewTarget = {
  kind: "interval",
  difficulty: "进阶",
  direction: "下行",
  seed: 456,
  sequence: 7,
};
const rhythm: LocalPracticeReviewTarget = {
  kind: "rhythm",
  difficulty: "基础",
  seed: 789,
  sequence: 2,
};
const melody: LocalPracticeReviewTarget = {
  kind: "melody-dictation",
  difficulty: "进阶",
  seed: 321,
  sequence: 5,
};

let queue = createLocalPracticeReviewQueue();
queue = updateLocalPracticeReviewQueue({ queue, target: pitch, isCorrect: false });
queue = updateLocalPracticeReviewQueue({ queue, target: interval, isCorrect: false });
queue = updateLocalPracticeReviewQueue({ queue, target: rhythm, isCorrect: false });
queue = updateLocalPracticeReviewQueue({ queue, target: melody, isCorrect: false });
assert.deepEqual(queue, [melody, rhythm, interval, pitch]);

queue = updateLocalPracticeReviewQueue({ queue, target: interval, isCorrect: false });
assert.deepEqual(queue, [interval, melody, rhythm, pitch], "a repeated wrong answer moves to the MRU front");
assert.equal(queue.filter((target) => target === interval).length, 1, "MRU targets stay unique");

queue = updateLocalPracticeReviewQueue({ queue, target: interval, isCorrect: true });
assert.deepEqual(queue, [melody, rhythm, pitch], "a correct answer removes the review target");

let cappedQueue = createLocalPracticeReviewQueue();
for (let sequence = 0; sequence < LOCAL_PRACTICE_REVIEW_QUEUE_MAX_ITEMS + 3; sequence += 1) {
  cappedQueue = updateLocalPracticeReviewQueue({
    queue: cappedQueue,
    target: { ...pitch, sequence },
    isCorrect: false,
  });
}
assert.equal(cappedQueue.length, LOCAL_PRACTICE_REVIEW_QUEUE_MAX_ITEMS);
assert.equal(cappedQueue[0]?.sequence, 14);
assert.equal(cappedQueue.at(-1)?.sequence, 3);

const allKinds = [pitch, interval, rhythm, melody];
const serialized = serializeLocalPracticeReviewQueue(allKinds);
assert.deepEqual(parseLocalPracticeReviewQueue(serialized), allKinds);
const serializedValue = JSON.parse(serialized) as Record<string, unknown>;
assert.deepEqual(Object.keys(serializedValue).sort(), ["catalogVersion", "schemaVersion", "targets"]);
assert.equal(serialized.includes("selection"), false);
assert.equal(serialized.includes("answer"), false);
assert.equal(serialized.includes("score"), false);
assert.equal(serialized.includes("audio"), false);
const taintedPitch = { ...pitch, selection: "c4", answer: "c4", score: 100, audio: "data" };
const sanitized = serializeLocalPracticeReviewQueue([taintedPitch]);
assert.equal(sanitized.includes("selection"), false);
assert.equal(sanitized.includes("answer"), false);
assert.equal(sanitized.includes("score"), false);
assert.equal(sanitized.includes("audio"), false);

const validEnvelope = JSON.parse(serialized) as {
  schemaVersion: number;
  catalogVersion: number;
  targets: Array<Record<string, unknown>>;
};
const rejects = [
  "not json",
  JSON.stringify({ ...validEnvelope, schemaVersion: 2 }),
  JSON.stringify({ ...validEnvelope, catalogVersion: 2 }),
  JSON.stringify({ ...validEnvelope, unexpected: true }),
  JSON.stringify({ ...validEnvelope, targets: [...validEnvelope.targets, ...validEnvelope.targets, ...validEnvelope.targets, ...validEnvelope.targets] }),
  JSON.stringify({ ...validEnvelope, targets: [validEnvelope.targets[0], validEnvelope.targets[0]] }),
  JSON.stringify({ ...validEnvelope, targets: [{ ...validEnvelope.targets[0], selectedPitchId: "c4" }] }),
  JSON.stringify({ ...validEnvelope, targets: [{ ...validEnvelope.targets[0], score: 100 }] }),
  JSON.stringify({ ...validEnvelope, targets: [{ ...validEnvelope.targets[0], seed: -1 }] }),
  JSON.stringify({ ...validEnvelope, targets: [{ ...validEnvelope.targets[0], sequence: 1.5 }] }),
  JSON.stringify({ ...validEnvelope, targets: [{ ...validEnvelope.targets[0], kind: "unknown" }] }),
  JSON.stringify({ ...validEnvelope, targets: [{ ...validEnvelope.targets[1], direction: "横向" }] }),
  "x".repeat(LOCAL_PRACTICE_REVIEW_QUEUE_MAX_SERIALIZED_LENGTH + 1),
];
for (const invalid of rejects) assert.equal(parseLocalPracticeReviewQueue(invalid), null);

console.log("Local practice review queue tests passed.");
