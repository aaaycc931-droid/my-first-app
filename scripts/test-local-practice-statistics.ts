import assert from "node:assert/strict";

import { buildLocalPracticeStatistics, type LocalPracticeStatisticsEvent } from "../lib/learning/localPracticeStatistics";

const event = (
  occurredAt: string,
  kind: LocalPracticeStatisticsEvent["kind"],
  practiceMode: LocalPracticeStatisticsEvent["practiceMode"],
  skillKind: LocalPracticeStatisticsEvent["skillKind"],
  outcome: "correct" | "incorrect" = "correct",
) => ({ occurredAt, kind, practiceMode, skillKind, outcome });

const events = [
  event("2026-07-21T12:00:00.000Z", "result-checked", "random", "single-pitch"),
  event("2026-07-16T12:00:00.000Z", "review-started", "review", "single-pitch"),
  event("2026-07-10T12:00:00.000Z", "result-checked", "review", "rhythm", "incorrect"),
  event("2026-06-01T12:00:00.000Z", "result-checked", "custom", "melody-dictation"),
];
const now = new Date("2026-07-22T12:00:00.000Z");

const sevenDays = buildLocalPracticeStatistics({ events, window: "7d", now });
assert.equal(sevenDays.status, "available");
assert.deepEqual(
  { facts: sevenDays.factCount, checked: sevenDays.checkedCount, reviewStarted: sevenDays.reviewStartedCount },
  { facts: 2, checked: 1, reviewStarted: 1 },
);
assert.deepEqual(
  sevenDays.byPracticeMode.filter((bucket) => bucket.factCount > 0),
  [
    { key: "random", factCount: 1, checkedCount: 1, reviewStartedCount: 0 },
    { key: "review", factCount: 1, checkedCount: 0, reviewStartedCount: 1 },
  ],
);
assert.equal(sevenDays.bySkillKind.find((bucket) => bucket.key === "single-pitch")?.factCount, 2);

assert.equal(buildLocalPracticeStatistics({ events, window: "30d", now }).factCount, 3);
assert.equal(buildLocalPracticeStatistics({ events, window: "all", now }).factCount, 4);
assert.equal(buildLocalPracticeStatistics({
  events: [event("2026-07-15T12:00:00.000Z", "result-checked", "random", "interval")],
  window: "7d",
  now,
}).factCount, 1);
assert.equal(buildLocalPracticeStatistics({
  events: [event("2026-07-15T11:59:59.999Z", "result-checked", "random", "interval")],
  window: "7d",
  now,
}).factCount, 0);
assert.equal(buildLocalPracticeStatistics({
  events: [event("2026-06-22T12:00:00.000Z", "result-checked", "random", "rhythm")],
  window: "30d",
  now,
}).factCount, 1);
assert.equal(buildLocalPracticeStatistics({
  events: [event("2026-06-22T11:59:59.999Z", "result-checked", "random", "rhythm")],
  window: "30d",
  now,
}).factCount, 0);

const oppositeOutcomes = events.map((item) => ({
  ...item,
  outcome: item.outcome === "correct" ? "incorrect" as const : "correct" as const,
}));
assert.deepEqual(
  buildLocalPracticeStatistics({ events: oppositeOutcomes, window: "all", now }),
  buildLocalPracticeStatistics({ events, window: "all", now }),
);

const invalid = buildLocalPracticeStatistics({
  events: [{ ...events[0], occurredAt: "not-a-date" }],
  window: "all",
  now,
});
assert.equal(invalid.status, "unavailable");
assert.equal(invalid.factCount, 0);
assert.equal(buildLocalPracticeStatistics({
  events: [event("2026-07-22T12:00:00.001Z", "result-checked", "random", "single-pitch")],
  window: "all",
  now,
}).status, "unavailable");
assert.equal(buildLocalPracticeStatistics({ events: [], window: "all", now }).factCount, 0);

console.log("P118b 本地详细练习统计 domain 测试通过");
