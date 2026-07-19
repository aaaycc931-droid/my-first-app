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

assert.deepEqual(
  {
    checked: history.profile.checkedCount,
    correct: history.profile.correctCount,
    incorrect: history.profile.incorrectCount,
    reviewStarted: history.profile.reviewStartedCount,
    reviewResolved: history.profile.reviewResolvedCount,
  },
  { checked: 3, correct: 2, incorrect: 1, reviewStarted: 1, reviewResolved: 1 },
);
assert.equal(history.recentEvents[0]?.kind, "result-checked");
assert.equal(history.recentEvents[1]?.kind, "review-started");
assert.equal(history.recentEvents[2]?.practiceMode, "review");
assert.equal(history.profile.skillFacts.find((fact) => fact.skillKind === "single-pitch")?.incorrectCount, 1);
assert.match(resolveLocalLearningSuggestion(history, [pitch])?.reason ?? "", /1 次该类错误/);

const serialized = serializeLocalLearningHistory(history);
assert.deepEqual(deserializeLocalLearningHistory(serialized), history);
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

