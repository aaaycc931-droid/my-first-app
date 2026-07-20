import assert from "node:assert/strict";

import {
  LOCAL_PRACTICE_REVIEW_QUEUE_MAX_ITEMS,
  LOCAL_PRACTICE_REVIEW_QUEUE_MAX_SERIALIZED_LENGTH,
  createLocalPracticeReviewQueue,
  parseLocalPracticeReviewQueue,
  deserializeLocalPracticeReviewQueue,
  serializeLocalPracticeReviewQueue,
  updateLocalPracticeReviewQueue,
  type LocalPracticeReviewTarget,
} from "../lib/practice/localPracticeReviewQueue";

const pitch: LocalPracticeReviewTarget = {
  kind: "single-pitch",
  difficulty: "基础",
  seed: 123,
  sequence: 4,
  variantId: "pitch:d4",
};
const interval: LocalPracticeReviewTarget = {
  kind: "interval",
  difficulty: "进阶",
  direction: "下行",
  seed: 456,
  sequence: 7,
  variantId: "interval:g4:major-second",
};
const rhythm: LocalPracticeReviewTarget = {
  kind: "rhythm",
  difficulty: "基础",
  seed: 789,
  sequence: 2,
  variantId: "rhythm:even-quarters",
};
const chord: LocalPracticeReviewTarget = {
  kind: "chord-inversion",
  difficulty: "进阶",
  playbackMode: "分解",
  seed: 115,
  sequence: 6,
  variantId: "chord:c4:minor:first",
};
const progression: LocalPracticeReviewTarget = {
  kind: "harmony-progression",
  difficulty: "挑战",
  seed: 1151,
  sequence: 2,
  variantId: "progression:a3:minor-authentic",
};
const scale: LocalPracticeReviewTarget = {
  kind: "scale-mode",
  difficulty: "挑战",
  seed: 1152,
  sequence: 3,
  variantId: "scale:f4:lydian",
};
const seventh: LocalPracticeReviewTarget = {
  kind: "seventh-chord",
  difficulty: "挑战",
  seed: 1153,
  sequence: 4,
  variantId: "seventh-chord:c3:dominant-seventh:third",
};
const seventhSpacing: LocalPracticeReviewTarget = {
  kind: "seventh-chord-spacing",
  difficulty: "挑战",
  seed: 1154,
  sequence: 5,
  variantId: "seventh-chord-spacing:c3:dominant-seventh:third:open",
};
const melody: LocalPracticeReviewTarget = {
  kind: "melody-dictation",
  difficulty: "进阶",
  seed: 321,
  sequence: 5,
  variantId: "melody:up-step",
};

let queue = createLocalPracticeReviewQueue();
queue = updateLocalPracticeReviewQueue({ queue, target: pitch, isCorrect: false });
queue = updateLocalPracticeReviewQueue({ queue, target: interval, isCorrect: false });
queue = updateLocalPracticeReviewQueue({ queue, target: chord, isCorrect: false });
queue = updateLocalPracticeReviewQueue({ queue, target: progression, isCorrect: false });
queue = updateLocalPracticeReviewQueue({ queue, target: scale, isCorrect: false });
queue = updateLocalPracticeReviewQueue({ queue, target: seventh, isCorrect: false });
queue = updateLocalPracticeReviewQueue({ queue, target: seventhSpacing, isCorrect: false });
queue = updateLocalPracticeReviewQueue({ queue, target: rhythm, isCorrect: false });
queue = updateLocalPracticeReviewQueue({ queue, target: melody, isCorrect: false });
assert.deepEqual(queue, [melody, rhythm, seventhSpacing, seventh, scale, progression, chord, interval, pitch]);

queue = updateLocalPracticeReviewQueue({ queue, target: interval, isCorrect: false });
assert.deepEqual(queue, [interval, melody, rhythm, seventhSpacing, seventh, scale, progression, chord, pitch], "a repeated wrong answer moves to the MRU front");
assert.equal(queue.filter((target) => target === interval).length, 1, "MRU targets stay unique");

queue = updateLocalPracticeReviewQueue({ queue, target: interval, isCorrect: true });
assert.deepEqual(queue, [melody, rhythm, seventhSpacing, seventh, scale, progression, chord, pitch], "a correct answer removes the review target");

let cappedQueue = createLocalPracticeReviewQueue();
for (let sequence = 0; sequence < LOCAL_PRACTICE_REVIEW_QUEUE_MAX_ITEMS + 3; sequence += 1) {
  cappedQueue = updateLocalPracticeReviewQueue({
    queue: cappedQueue,
    target: { ...pitch, sequence, variantId: `pitch:test-${sequence}` },
    isCorrect: false,
  });
}
assert.equal(cappedQueue.length, LOCAL_PRACTICE_REVIEW_QUEUE_MAX_ITEMS);
assert.equal(cappedQueue[0]?.sequence, 14);
assert.equal(cappedQueue.at(-1)?.sequence, 3);

const allKinds = [pitch, interval, chord, progression, scale, seventh, seventhSpacing, rhythm, melody];
const legacyKinds = [pitch, interval, rhythm, melody];
const serialized = serializeLocalPracticeReviewQueue(allKinds);
assert.deepEqual(parseLocalPracticeReviewQueue(serialized), allKinds);
const serializedValue = JSON.parse(serialized) as Record<string, unknown>;
assert.deepEqual(Object.keys(serializedValue).sort(), ["catalogVersion", "schemaVersion", "targets"]);
assert.equal(serializedValue.schemaVersion, 7);
assert.equal(serializedValue.catalogVersion, 7);
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

const challengePitch: LocalPracticeReviewTarget = {
  kind: "single-pitch",
  difficulty: "挑战",
  seed: 9600,
  sequence: 1,
  variantId: "pitch:c-sharp-4:brief",
};
assert.deepEqual(
  parseLocalPracticeReviewQueue(serializeLocalPracticeReviewQueue([challengePitch])),
  [challengePitch],
  "catalog v6 challenge targets round-trip with a stable variant id",
);

const validEnvelope = JSON.parse(serialized) as {
  schemaVersion: number;
  catalogVersion: number;
  targets: Array<Record<string, unknown>>;
};
const legacyEnvelope = {
  schemaVersion: 1,
  catalogVersion: 1,
  targets: [
    { kind: "single-pitch", difficulty: "基础", seed: 123, sequence: 4 },
    { kind: "interval", difficulty: "进阶", direction: "下行", seed: 456, sequence: 7 },
    { kind: "rhythm", difficulty: "基础", seed: 789, sequence: 2 },
    { kind: "melody-dictation", difficulty: "进阶", seed: 321, sequence: 5 },
  ],
};
assert.deepEqual(deserializeLocalPracticeReviewQueue(JSON.stringify(legacyEnvelope)), {
  queue: legacyKinds,
  migrated: true,
});

const previousEnvelope = {
  schemaVersion: 2,
  catalogVersion: 2,
  targets: legacyKinds,
};
assert.deepEqual(deserializeLocalPracticeReviewQueue(JSON.stringify(previousEnvelope)), {
  queue: legacyKinds,
  migrated: true,
});
const previousChordEnvelope = {
  schemaVersion: 3,
  catalogVersion: 3,
  targets: [...legacyKinds, chord],
};
assert.deepEqual(deserializeLocalPracticeReviewQueue(JSON.stringify(previousChordEnvelope)), {
  queue: [...legacyKinds, chord],
  migrated: true,
});
const previousProgressionEnvelope = {
  schemaVersion: 4,
  catalogVersion: 4,
  targets: [...legacyKinds, chord, progression],
};
assert.deepEqual(deserializeLocalPracticeReviewQueue(JSON.stringify(previousProgressionEnvelope)), {
  queue: [...legacyKinds, chord, progression],
  migrated: true,
});
const previousScaleEnvelope = {
  schemaVersion: 5,
  catalogVersion: 5,
  targets: [...legacyKinds, chord, progression, scale],
};
assert.deepEqual(deserializeLocalPracticeReviewQueue(JSON.stringify(previousScaleEnvelope)), {
  queue: [...legacyKinds, chord, progression, scale],
  migrated: true,
}, "v5 scale-mode review targets must survive the v6 migration");
const previousSeventhEnvelope = {
  schemaVersion: 6,
  catalogVersion: 6,
  targets: [...legacyKinds, chord, progression, scale, seventh],
};
assert.deepEqual(deserializeLocalPracticeReviewQueue(JSON.stringify(previousSeventhEnvelope)), {
  queue: [...legacyKinds, chord, progression, scale, seventh],
  migrated: true,
}, "v6 seventh-chord review targets must survive the v7 migration");
assert.equal(parseLocalPracticeReviewQueue(JSON.stringify({
  ...previousSeventhEnvelope,
  targets: [seventhSpacing],
})), null, "v6 envelope rejects the future seventh-chord-spacing kind");

const duplicateLegacyEnvelope = {
  schemaVersion: 1,
  catalogVersion: 1,
  targets: [
    { kind: "single-pitch", difficulty: "基础", seed: 123, sequence: 0 },
    { kind: "single-pitch", difficulty: "基础", seed: 123, sequence: 4 },
  ],
};
const migratedDuplicates = deserializeLocalPracticeReviewQueue(
  JSON.stringify(duplicateLegacyEnvelope),
);
assert.equal(migratedDuplicates?.queue.length, 1, "legacy semantic duplicates keep the MRU item");
assert.equal(migratedDuplicates?.queue[0]?.sequence, 0);

const rejects = [
  "not json",
  JSON.stringify({ ...validEnvelope, schemaVersion: 1 }),
  JSON.stringify({ ...validEnvelope, catalogVersion: 1 }),
  JSON.stringify({ ...validEnvelope, unexpected: true }),
  JSON.stringify({ ...validEnvelope, targets: [...validEnvelope.targets, ...validEnvelope.targets, ...validEnvelope.targets, ...validEnvelope.targets] }),
  JSON.stringify({ ...validEnvelope, targets: [validEnvelope.targets[0], validEnvelope.targets[0]] }),
  JSON.stringify({ ...validEnvelope, targets: [{ ...validEnvelope.targets[0], selectedPitchId: "c4" }] }),
  JSON.stringify({ ...validEnvelope, targets: [{ ...validEnvelope.targets[0], score: 100 }] }),
  JSON.stringify({ ...validEnvelope, targets: [{ ...validEnvelope.targets[0], seed: -1 }] }),
  JSON.stringify({ ...validEnvelope, targets: [{ ...validEnvelope.targets[0], sequence: 1.5 }] }),
  JSON.stringify({ ...validEnvelope, targets: [{ ...validEnvelope.targets[0], kind: "unknown" }] }),
  JSON.stringify({ ...validEnvelope, targets: [{ ...validEnvelope.targets[0], variantId: "pitch:unknown" }] }),
  JSON.stringify({ ...validEnvelope, targets: [{ ...validEnvelope.targets[0], variantId: "pitch:b4" }] }),
  JSON.stringify({ ...validEnvelope, targets: [{
    kind: "interval",
    difficulty: "基础",
    direction: "上行",
    seed: 1,
    sequence: 0,
    variantId: "interval:c4:minor-second",
  }] }),
  JSON.stringify({ ...validEnvelope, targets: [{ ...validEnvelope.targets[1], direction: "横向" }] }),
  JSON.stringify({ ...validEnvelope, targets: [{ ...validEnvelope.targets[2], playbackMode: "倒放" }] }),
  "x".repeat(LOCAL_PRACTICE_REVIEW_QUEUE_MAX_SERIALIZED_LENGTH + 1),
];
for (const invalid of rejects) assert.equal(parseLocalPracticeReviewQueue(invalid), null);

assert.equal(parseLocalPracticeReviewQueue(JSON.stringify({
  ...legacyEnvelope,
  targets: [legacyEnvelope.targets[0], { ...legacyEnvelope.targets[1], variantId: "interval:g4:major-second" }],
})), null, "legacy envelope rejects a current-shape target atomically");
assert.equal(parseLocalPracticeReviewQueue(JSON.stringify({
  ...validEnvelope,
  targets: [{ kind: "single-pitch", difficulty: "基础", seed: 0, sequence: 0 }],
})), null, "current envelope rejects a legacy-shape target atomically");
assert.equal(parseLocalPracticeReviewQueue(JSON.stringify({
  ...legacyEnvelope,
  targets: [legacyEnvelope.targets[0], { kind: "single-pitch", difficulty: "未知", seed: 0, sequence: 0 }],
})), null, "one invalid legacy target rejects the whole queue");
assert.equal(parseLocalPracticeReviewQueue(JSON.stringify({
  ...legacyEnvelope,
  targets: [{ kind: "single-pitch", difficulty: "挑战", seed: 0, sequence: 0 }],
})), null, "catalog v1 rejects challenge targets that never existed in that namespace");

const oppositeDirections = deserializeLocalPracticeReviewQueue(JSON.stringify({
  schemaVersion: 1,
  catalogVersion: 1,
  targets: [
    { kind: "interval", difficulty: "进阶", direction: "上行", seed: 456, sequence: 7 },
    { kind: "interval", difficulty: "进阶", direction: "下行", seed: 456, sequence: 7 },
  ],
}));
assert.equal(oppositeDirections?.queue.length, 2, "opposite interval directions remain distinct review targets");

console.log("Local practice review queue tests passed.");
