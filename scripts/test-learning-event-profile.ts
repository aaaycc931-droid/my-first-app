import assert from "node:assert/strict";

import {
  MAX_RECENT_LEARNING_EVENTS,
  createEmptyLocalLearningHistory,
  deserializeLocalLearningHistory,
  recordCheckedAnswerLearningEvent,
  recordReviewStartedLearningEvent,
  resetLocalLearningHistory,
  resolveLocalLearningSuggestion,
  serializeLocalLearningHistory,
  setLearningSuggestionsEnabled,
} from "../lib/learning/learningEventProfile";
import type { LocalPracticeReviewTarget } from "../lib/practice/localPracticeReviewQueue";

const pitch: LocalPracticeReviewTarget = {
  kind: "single-pitch",
  difficulty: "基础",
  seed: 42,
  sequence: 3,
  variantId: "pitch:c4",
};
const rhythm: LocalPracticeReviewTarget = {
  kind: "rhythm",
  difficulty: "进阶",
  seed: 7,
  sequence: 2,
  variantId: "rhythm:eighth-pair",
};
const chord: LocalPracticeReviewTarget = {
  kind: "chord-inversion",
  difficulty: "进阶",
  playbackMode: "和声",
  seed: 115,
  sequence: 0,
  variantId: "chord:c4:major:first",
};
const progression: LocalPracticeReviewTarget = {
  kind: "harmony-progression",
  difficulty: "挑战",
  seed: 1151,
  sequence: 0,
  variantId: "progression:a3:minor-authentic",
};
const scale: LocalPracticeReviewTarget = {
  kind: "scale-mode",
  difficulty: "挑战",
  seed: 1152,
  sequence: 0,
  variantId: "scale:f4:lydian",
};

let history = createEmptyLocalLearningHistory();
history = recordCheckedAnswerLearningEvent({
  history,
  result: { target: pitch, isCorrect: false },
  practiceMode: "random",
  occurredAt: "2026-07-19T00:00:00.000Z",
});
history = recordReviewStartedLearningEvent({
  history,
  target: pitch,
  occurredAt: "2026-07-19T00:01:00.000Z",
});
history = recordCheckedAnswerLearningEvent({
  history,
  result: { target: pitch, isCorrect: true },
  practiceMode: "review",
  occurredAt: "2026-07-19T00:02:00.000Z",
});
history = recordCheckedAnswerLearningEvent({
  history,
  result: { target: rhythm, isCorrect: true },
  practiceMode: "random",
  occurredAt: "2026-07-19T00:03:00.000Z",
});
history = recordCheckedAnswerLearningEvent({
  history,
  result: { target: chord, isCorrect: false },
  practiceMode: "random",
  occurredAt: "2026-07-19T00:04:00.000Z",
});
history = recordCheckedAnswerLearningEvent({
  history,
  result: { target: progression, isCorrect: false },
  practiceMode: "random",
  occurredAt: "2026-07-19T00:05:00.000Z",
});
history = recordCheckedAnswerLearningEvent({
  history,
  result: { target: scale, isCorrect: false },
  practiceMode: "random",
  occurredAt: "2026-07-19T00:06:00.000Z",
});

assert.deepEqual(
  {
    checked: history.profile.checkedCount,
    correct: history.profile.correctCount,
    incorrect: history.profile.incorrectCount,
    reviewStarted: history.profile.reviewStartedCount,
    reviewResolved: history.profile.reviewResolvedCount,
  },
  { checked: 6, correct: 2, incorrect: 4, reviewStarted: 1, reviewResolved: 1 },
);
assert.equal(history.recentEvents[0]?.kind, "result-checked");
assert.equal(history.recentEvents[1]?.kind, "review-started");
assert.equal(history.recentEvents[2]?.practiceMode, "review");
assert.equal(history.profile.skillFacts.find((fact) => fact.skillKind === "single-pitch")?.incorrectCount, 1);
assert.equal(history.profile.skillFacts.find((fact) => fact.skillKind === "chord-inversion")?.incorrectCount, 1);
assert.equal(history.profile.skillFacts.find((fact) => fact.skillKind === "harmony-progression")?.incorrectCount, 1);
assert.equal(history.profile.skillFacts.find((fact) => fact.skillKind === "scale-mode")?.incorrectCount, 1);
assert.match(resolveLocalLearningSuggestion(history, [pitch])?.reason ?? "", /1 次该类错误/);

const serialized = serializeLocalLearningHistory(history);
assert.deepEqual(deserializeLocalLearningHistory(serialized), history);
const tainted = { ...history, selection: "private", audio: "bytes", email: "user@example.com" };
const sanitized = serializeLocalLearningHistory(tainted);
for (const forbidden of ["selection", "private", "audio", "bytes", "email", "user@example.com"]) {
  assert.equal(sanitized.includes(forbidden), false, `序列化不得保留污染字段 ${forbidden}`);
}
const previous = JSON.parse(serialized) as {
  schemaVersion: number;
  profile: {
    checkedCount: number;
    incorrectCount: number;
    skillFacts: Array<{ skillKind: string }>;
    updatedAt: string | null;
  };
  recentEvents: Array<{ skillKind: string }>;
};
previous.schemaVersion = 1;
previous.profile.checkedCount -= 3;
previous.profile.incorrectCount -= 3;
previous.profile.updatedAt = "2026-07-19T00:03:00.000Z";
previous.profile.skillFacts = previous.profile.skillFacts.filter(
  (fact) => fact.skillKind !== "chord-inversion" && fact.skillKind !== "harmony-progression" && fact.skillKind !== "scale-mode" && fact.skillKind !== "seventh-chord",
);
previous.recentEvents = previous.recentEvents.filter(
  (event) => event.skillKind !== "chord-inversion" && event.skillKind !== "harmony-progression" && event.skillKind !== "scale-mode" && event.skillKind !== "seventh-chord",
);
const migrated = deserializeLocalLearningHistory(JSON.stringify(previous));
assert.equal(migrated?.schemaVersion, 5);
assert.equal(migrated?.profile.skillFacts.length, 8);
assert.equal(migrated?.profile.skillFacts.find((fact) => fact.skillKind === "chord-inversion")?.checkedCount, 0);
assert.equal(migrated?.profile.skillFacts.find((fact) => fact.skillKind === "harmony-progression")?.checkedCount, 0);
assert.equal(migrated?.profile.skillFacts.find((fact) => fact.skillKind === "scale-mode")?.checkedCount, 0);
assert.equal(migrated?.profile.skillFacts.find((fact) => fact.skillKind === "seventh-chord")?.checkedCount, 0);
const previousChord = JSON.parse(serialized) as typeof previous;
previousChord.schemaVersion = 2;
previousChord.profile.checkedCount -= 2;
previousChord.profile.incorrectCount -= 2;
previousChord.profile.updatedAt = "2026-07-19T00:04:00.000Z";
previousChord.profile.skillFacts = previousChord.profile.skillFacts.filter((fact) => fact.skillKind !== "harmony-progression" && fact.skillKind !== "scale-mode" && fact.skillKind !== "seventh-chord");
previousChord.recentEvents = previousChord.recentEvents.filter((event) => event.skillKind !== "harmony-progression" && event.skillKind !== "scale-mode" && event.skillKind !== "seventh-chord");
assert.equal(deserializeLocalLearningHistory(JSON.stringify(previousChord))?.schemaVersion, 5);
const previousProgression = JSON.parse(serialized) as typeof previous;
previousProgression.schemaVersion = 3;
previousProgression.profile.checkedCount -= 1;
previousProgression.profile.incorrectCount -= 1;
previousProgression.profile.updatedAt = "2026-07-19T00:05:00.000Z";
previousProgression.profile.skillFacts = previousProgression.profile.skillFacts.filter((fact) => fact.skillKind !== "scale-mode" && fact.skillKind !== "seventh-chord");
previousProgression.recentEvents = previousProgression.recentEvents.filter((event) => event.skillKind !== "scale-mode" && event.skillKind !== "seventh-chord");
assert.equal(deserializeLocalLearningHistory(JSON.stringify(previousProgression))?.schemaVersion, 5);
const previousScale = JSON.parse(serialized) as typeof previous;
previousScale.schemaVersion = 4;
previousScale.profile.skillFacts = previousScale.profile.skillFacts.filter((fact) => fact.skillKind !== "seventh-chord");
previousScale.recentEvents = previousScale.recentEvents.filter((event) => event.skillKind !== "seventh-chord");
assert.equal(deserializeLocalLearningHistory(JSON.stringify(previousScale))?.schemaVersion, 5);
const futureEventInV4 = JSON.parse(JSON.stringify(previousScale)) as typeof previous;
futureEventInV4.recentEvents[0].skillKind = "seventh-chord";
assert.equal(deserializeLocalLearningHistory(JSON.stringify(futureEventInV4)), null);
for (const forbidden of ["selected", "recording", "audio", "email", "score", "grade", "accuracyPercentage"]) {
  assert.equal(serialized.includes(forbidden), false, `不得保存 ${forbidden}`);
}

const disabled = setLearningSuggestionsEnabled(history, false);
assert.equal(resolveLocalLearningSuggestion(disabled, [pitch]), null);
assert.equal(disabled.profile.revision, history.profile.revision + 1);
const reset = resetLocalLearningHistory(disabled);
assert.equal(reset.profile.suggestionsEnabled, false);
assert.equal(reset.profile.checkedCount, 0);
assert.deepEqual(reset.recentEvents, []);

let capped = createEmptyLocalLearningHistory();
for (let index = 0; index < MAX_RECENT_LEARNING_EVENTS + 5; index += 1) {
  capped = recordCheckedAnswerLearningEvent({
    history: capped,
    result: { target: pitch, isCorrect: index % 2 === 0 },
    practiceMode: "random",
    occurredAt: new Date(Date.UTC(2026, 6, 19, 1, index)).toISOString(),
  });
}
assert.equal(capped.recentEvents.length, MAX_RECENT_LEARNING_EVENTS);
assert.equal(capped.recentEvents[0]?.sequence, 6);
assert.equal(capped.profile.checkedCount, MAX_RECENT_LEARNING_EVENTS + 5);

const tampered = JSON.parse(serialized) as Record<string, unknown>;
(tampered.profile as Record<string, unknown>).checkedCount = 99;
assert.equal(deserializeLocalLearningHistory(JSON.stringify(tampered)), null);
assert.equal(deserializeLocalLearningHistory("not-json"), null);
assert.equal(deserializeLocalLearningHistory("x".repeat(24 * 1024 + 1)), null);

console.log("Learning event/profile tests passed.");
