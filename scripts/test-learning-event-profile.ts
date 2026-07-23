import assert from "node:assert/strict";

import {
  MAX_RECENT_LEARNING_EVENTS,
  createEmptyLocalLearningHistory,
  deserializeLocalLearningHistory,
  recordCheckedAnswerLearningEvent,
  recordReviewStartedLearningEvent,
  resetLocalLearningHistory,
  serializeLocalLearningHistory,
  setLearningSuggestionsEnabled,
} from "../lib/learning/learningEventProfile";
import type { LocalPracticeReviewTarget } from "../lib/practice/localPracticeReviewQueue";
import { createLocalIntervalComparisonQuestion } from "../lib/practice/localIntervalComparisons";

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
const seventh: LocalPracticeReviewTarget = {
  kind: "seventh-chord",
  difficulty: "挑战",
  seed: 1153,
  sequence: 0,
  variantId: "seventh-chord:c3:dominant-seventh:third",
};
const seventhSpacing: LocalPracticeReviewTarget = {
  kind: "seventh-chord-spacing",
  difficulty: "挑战",
  seed: 1154,
  sequence: 0,
  variantId: "seventh-chord-spacing:c3:dominant-seventh:third:open",
};
const modulation: LocalPracticeReviewTarget = {
  kind: "modulation",
  difficulty: "挑战",
  seed: 1155,
  sequence: 0,
  variantId: "modulation:c3:parallel-minor:alternate-predominant",
};
const comparisonQuestion = createLocalIntervalComparisonQuestion({ difficulty: "基础", sequence: 0, questionIndex: 0 });
const comparison: LocalPracticeReviewTarget = { kind: "interval-comparison", difficulty: "基础", seed: 1156, sequence: 0, variantId: comparisonQuestion.variantId };

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
history = recordCheckedAnswerLearningEvent({
  history,
  result: { target: seventh, isCorrect: false },
  practiceMode: "random",
  occurredAt: "2026-07-19T00:07:00.000Z",
});
history = recordCheckedAnswerLearningEvent({
  history,
  result: { target: seventhSpacing, isCorrect: false },
  practiceMode: "random",
  occurredAt: "2026-07-19T00:08:00.000Z",
});
history = recordCheckedAnswerLearningEvent({
  history,
  result: { target: modulation, isCorrect: false },
  practiceMode: "random",
  occurredAt: "2026-07-19T00:09:00.000Z",
});

assert.deepEqual(
  {
    checked: history.profile.checkedCount,
    correct: history.profile.correctCount,
    incorrect: history.profile.incorrectCount,
    reviewStarted: history.profile.reviewStartedCount,
    reviewResolved: history.profile.reviewResolvedCount,
  },
  { checked: 9, correct: 2, incorrect: 7, reviewStarted: 1, reviewResolved: 1 },
);
assert.equal(history.recentEvents[0]?.kind, "result-checked");
assert.equal(history.recentEvents[1]?.kind, "review-started");
assert.equal(history.recentEvents[2]?.practiceMode, "review");
assert.equal(history.profile.skillFacts.find((fact) => fact.skillKind === "single-pitch")?.incorrectCount, 1);
assert.equal(history.profile.skillFacts.find((fact) => fact.skillKind === "chord-inversion")?.incorrectCount, 1);
assert.equal(history.profile.skillFacts.find((fact) => fact.skillKind === "harmony-progression")?.incorrectCount, 1);
assert.equal(history.profile.skillFacts.find((fact) => fact.skillKind === "scale-mode")?.incorrectCount, 1);
assert.equal(history.profile.skillFacts.find((fact) => fact.skillKind === "seventh-chord")?.incorrectCount, 1);
assert.equal(history.profile.skillFacts.find((fact) => fact.skillKind === "seventh-chord-spacing")?.incorrectCount, 1);
assert.equal(history.profile.skillFacts.find((fact) => fact.skillKind === "modulation")?.incorrectCount, 1);
const serialized = serializeLocalLearningHistory(history);
assert.deepEqual(deserializeLocalLearningHistory(serialized), history);
const customHistory = recordCheckedAnswerLearningEvent({
  history: createEmptyLocalLearningHistory(),
  result: { target: scale, isCorrect: true },
  practiceMode: "custom",
  occurredAt: "2026-07-19T00:10:00.000Z",
});
assert.equal(customHistory.schemaVersion, 9);
assert.equal(customHistory.recentEvents[0]?.practiceMode, "custom");
assert.deepEqual(deserializeLocalLearningHistory(serializeLocalLearningHistory(customHistory)), customHistory);

const previousModulation = JSON.parse(serialized) as {
  schemaVersion: number;
  nextSequence: number;
  profile: typeof history.profile;
  recentEvents: typeof history.recentEvents;
};
previousModulation.schemaVersion = 7;
previousModulation.profile.suggestionsEnabled = false;
previousModulation.profile.skillFacts = previousModulation.profile.skillFacts.filter((fact) => fact.skillKind !== "interval-comparison");
const migratedModulation = deserializeLocalLearningHistory(JSON.stringify(previousModulation));
assert.equal(migratedModulation?.schemaVersion, 9);
assert.equal(migratedModulation?.nextSequence, history.nextSequence);
assert.deepEqual(migratedModulation?.recentEvents, history.recentEvents);
assert.equal(migratedModulation?.profile.skillFacts.find((fact) => fact.skillKind === "interval-comparison")?.checkedCount, 0);
assert.equal(migratedModulation?.profile.suggestionsEnabled, false);
const comparisonHistory = recordCheckedAnswerLearningEvent({ history: createEmptyLocalLearningHistory(), result: { target: comparison, isCorrect: false }, practiceMode: "random", occurredAt: "2026-07-19T00:11:00.000Z" });
assert.equal(comparisonHistory.profile.skillFacts.find((fact) => fact.skillKind === "interval-comparison")?.incorrectCount, 1);
const previousCustomizer = JSON.parse(serializeLocalLearningHistory(comparisonHistory)) as typeof previousModulation;
previousCustomizer.schemaVersion = 8;
previousCustomizer.profile.checkedCount -= 1;
previousCustomizer.profile.incorrectCount -= 1;
previousCustomizer.profile.skillFacts = previousCustomizer.profile.skillFacts.filter((fact) => fact.skillKind !== "interval-comparison");
previousCustomizer.recentEvents = previousCustomizer.recentEvents.filter((event) => event.skillKind !== "interval-comparison");
assert.equal(deserializeLocalLearningHistory(JSON.stringify(previousCustomizer))?.schemaVersion, 9);
const forgedComparisonInV8 = JSON.parse(JSON.stringify(previousCustomizer)) as typeof previousCustomizer;
forgedComparisonInV8.recentEvents = comparisonHistory.recentEvents;
assert.equal(deserializeLocalLearningHistory(JSON.stringify(forgedComparisonInV8)), null);
const forgedCustomEventInV7 = JSON.parse(JSON.stringify(previousModulation)) as typeof previousModulation;
forgedCustomEventInV7.recentEvents[0].practiceMode = "custom";
assert.equal(deserializeLocalLearningHistory(JSON.stringify(forgedCustomEventInV7)), null);
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
previous.profile.checkedCount -= 6;
previous.profile.incorrectCount -= 6;
previous.profile.updatedAt = "2026-07-19T00:03:00.000Z";
previous.profile.skillFacts = previous.profile.skillFacts.filter(
  (fact) => fact.skillKind !== "chord-inversion" && fact.skillKind !== "harmony-progression" && fact.skillKind !== "scale-mode" && fact.skillKind !== "seventh-chord" && fact.skillKind !== "seventh-chord-spacing" && fact.skillKind !== "modulation" && fact.skillKind !== "interval-comparison",
);
previous.recentEvents = previous.recentEvents.filter(
  (event) => event.skillKind !== "chord-inversion" && event.skillKind !== "harmony-progression" && event.skillKind !== "scale-mode" && event.skillKind !== "seventh-chord" && event.skillKind !== "seventh-chord-spacing" && event.skillKind !== "modulation" && event.skillKind !== "interval-comparison",
);
const migrated = deserializeLocalLearningHistory(JSON.stringify(previous));
assert.equal(migrated?.schemaVersion, 9);
assert.equal(migrated?.profile.skillFacts.length, 11);
assert.equal(migrated?.profile.skillFacts.find((fact) => fact.skillKind === "chord-inversion")?.checkedCount, 0);
assert.equal(migrated?.profile.skillFacts.find((fact) => fact.skillKind === "harmony-progression")?.checkedCount, 0);
assert.equal(migrated?.profile.skillFacts.find((fact) => fact.skillKind === "scale-mode")?.checkedCount, 0);
assert.equal(migrated?.profile.skillFacts.find((fact) => fact.skillKind === "seventh-chord")?.checkedCount, 0);
assert.equal(migrated?.profile.skillFacts.find((fact) => fact.skillKind === "seventh-chord-spacing")?.checkedCount, 0);
assert.equal(migrated?.profile.skillFacts.find((fact) => fact.skillKind === "modulation")?.checkedCount, 0);
const previousChord = JSON.parse(serialized) as typeof previous;
previousChord.schemaVersion = 2;
previousChord.profile.checkedCount -= 5;
previousChord.profile.incorrectCount -= 5;
previousChord.profile.updatedAt = "2026-07-19T00:04:00.000Z";
previousChord.profile.skillFacts = previousChord.profile.skillFacts.filter((fact) => fact.skillKind !== "harmony-progression" && fact.skillKind !== "scale-mode" && fact.skillKind !== "seventh-chord" && fact.skillKind !== "seventh-chord-spacing" && fact.skillKind !== "modulation" && fact.skillKind !== "interval-comparison");
previousChord.recentEvents = previousChord.recentEvents.filter((event) => event.skillKind !== "harmony-progression" && event.skillKind !== "scale-mode" && event.skillKind !== "seventh-chord" && event.skillKind !== "seventh-chord-spacing" && event.skillKind !== "modulation" && event.skillKind !== "interval-comparison");
assert.equal(deserializeLocalLearningHistory(JSON.stringify(previousChord))?.schemaVersion, 9);
const previousProgression = JSON.parse(serialized) as typeof previous;
previousProgression.schemaVersion = 3;
previousProgression.profile.checkedCount -= 4;
previousProgression.profile.incorrectCount -= 4;
previousProgression.profile.updatedAt = "2026-07-19T00:05:00.000Z";
previousProgression.profile.skillFacts = previousProgression.profile.skillFacts.filter((fact) => fact.skillKind !== "scale-mode" && fact.skillKind !== "seventh-chord" && fact.skillKind !== "seventh-chord-spacing" && fact.skillKind !== "modulation" && fact.skillKind !== "interval-comparison");
previousProgression.recentEvents = previousProgression.recentEvents.filter((event) => event.skillKind !== "scale-mode" && event.skillKind !== "seventh-chord" && event.skillKind !== "seventh-chord-spacing" && event.skillKind !== "modulation" && event.skillKind !== "interval-comparison");
assert.equal(deserializeLocalLearningHistory(JSON.stringify(previousProgression))?.schemaVersion, 9);
const previousScale = JSON.parse(serialized) as typeof previous;
previousScale.schemaVersion = 4;
previousScale.profile.checkedCount -= 3;
previousScale.profile.incorrectCount -= 3;
previousScale.profile.skillFacts = previousScale.profile.skillFacts.filter((fact) => fact.skillKind !== "seventh-chord" && fact.skillKind !== "seventh-chord-spacing" && fact.skillKind !== "modulation" && fact.skillKind !== "interval-comparison");
previousScale.recentEvents = previousScale.recentEvents.filter((event) => event.skillKind !== "seventh-chord" && event.skillKind !== "seventh-chord-spacing" && event.skillKind !== "modulation" && event.skillKind !== "interval-comparison");
assert.equal(deserializeLocalLearningHistory(JSON.stringify(previousScale))?.schemaVersion, 9);
const futureEventInV4 = JSON.parse(JSON.stringify(previousScale)) as typeof previous;
futureEventInV4.recentEvents[0].skillKind = "seventh-chord";
assert.equal(deserializeLocalLearningHistory(JSON.stringify(futureEventInV4)), null);
const previousSeventh = JSON.parse(serialized) as typeof previous;
previousSeventh.schemaVersion = 5;
previousSeventh.profile.checkedCount -= 2;
previousSeventh.profile.incorrectCount -= 2;
previousSeventh.profile.skillFacts = previousSeventh.profile.skillFacts.filter((fact) => fact.skillKind !== "seventh-chord-spacing" && fact.skillKind !== "modulation" && fact.skillKind !== "interval-comparison");
previousSeventh.recentEvents = previousSeventh.recentEvents.filter((event) => event.skillKind !== "seventh-chord-spacing" && event.skillKind !== "modulation" && event.skillKind !== "interval-comparison");
const migratedSeventh = deserializeLocalLearningHistory(JSON.stringify(previousSeventh));
assert.equal(migratedSeventh?.schemaVersion, 9);
assert.equal(migratedSeventh?.profile.skillFacts.find((fact) => fact.skillKind === "seventh-chord")?.incorrectCount, 1);
assert.equal(migratedSeventh?.profile.skillFacts.find((fact) => fact.skillKind === "seventh-chord-spacing")?.checkedCount, 0);
const futureSpacingEventInV5 = JSON.parse(JSON.stringify(previousSeventh)) as typeof previous;
futureSpacingEventInV5.recentEvents[0].skillKind = "seventh-chord-spacing";
assert.equal(deserializeLocalLearningHistory(JSON.stringify(futureSpacingEventInV5)), null);
const previousSpacing = JSON.parse(serialized) as typeof previous;
previousSpacing.schemaVersion = 6;
previousSpacing.profile.checkedCount -= 1;
previousSpacing.profile.incorrectCount -= 1;
previousSpacing.profile.skillFacts = previousSpacing.profile.skillFacts.filter((fact) => fact.skillKind !== "modulation" && fact.skillKind !== "interval-comparison");
previousSpacing.recentEvents = previousSpacing.recentEvents.filter((event) => event.skillKind !== "modulation" && event.skillKind !== "interval-comparison");
const migratedSpacing = deserializeLocalLearningHistory(JSON.stringify(previousSpacing));
assert.equal(migratedSpacing?.schemaVersion, 9);
assert.equal(migratedSpacing?.profile.skillFacts.find((fact) => fact.skillKind === "seventh-chord-spacing")?.incorrectCount, 1);
assert.equal(migratedSpacing?.profile.skillFacts.find((fact) => fact.skillKind === "modulation")?.checkedCount, 0);
assert.equal(migratedSpacing?.recentEvents.some((event) => event.skillKind === "seventh-chord-spacing"), true);
const futureModulationEventInV6 = JSON.parse(JSON.stringify(previousSpacing)) as typeof previous;
futureModulationEventInV6.recentEvents[0].skillKind = "modulation";
assert.equal(deserializeLocalLearningHistory(JSON.stringify(futureModulationEventInV6)), null);
for (const forbidden of ["selected", "recording", "audio", "email", "score", "grade", "accuracyPercentage"]) {
  assert.equal(serialized.includes(forbidden), false, `不得保存 ${forbidden}`);
}

const disabled = setLearningSuggestionsEnabled(history, false);
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
