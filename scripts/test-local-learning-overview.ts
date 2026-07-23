import assert from "node:assert/strict";

import {
  buildLocalLearningOverview,
} from "../lib/learning/localLearningOverview";
import {
  LOCAL_COURSE_LESSONS,
  createEmptyLocalCourseProgress,
} from "../lib/learning/localCoursePath";
import type { LocalPracticeStatisticsEvent } from "../lib/learning/localPracticeStatistics";
import type { LocalPracticeReviewTarget } from "../lib/practice/localPracticeReviewQueue";

const now = new Date("2026-07-23T12:00:00.000Z");
const pitch: LocalPracticeReviewTarget = {
  kind: "single-pitch",
  difficulty: "基础",
  seed: 1,
  sequence: 0,
  variantId: "pitch:c4",
};
const rhythm: LocalPracticeReviewTarget = {
  kind: "rhythm",
  difficulty: "基础",
  seed: 4,
  sequence: 0,
  variantId: "rhythm:even-quarters",
};
const events: Array<LocalPracticeStatisticsEvent & {
  outcome: "correct" | "incorrect";
}> = [
  {
    occurredAt: "2026-07-22T12:00:00.000Z",
    kind: "result-checked",
    practiceMode: "random",
    skillKind: "single-pitch",
    outcome: "correct",
  },
  {
    occurredAt: "2026-07-20T12:00:00.000Z",
    kind: "review-started",
    practiceMode: "review",
    skillKind: "rhythm",
    outcome: "incorrect",
  },
];
const firstLesson = LOCAL_COURSE_LESSONS[0];
const courseProgress = {
  ...createEmptyLocalCourseProgress(),
  revision: 1,
  completions: [{
    lessonId: firstLesson.id,
    completionFingerprint: firstLesson.completionFingerprint,
  }],
};

const overview = buildLocalLearningOverview({
  courseProgress,
  events,
  reviewQueue: [rhythm, pitch],
  suggestionsEnabled: true,
  now,
});
assert.deepEqual(overview.course, {
  status: "available",
  checkedLessonCount: 1,
  lessonCount: 3,
});
assert.deepEqual({
  status: overview.statistics.status,
  window: overview.statistics.window,
  retained: overview.statistics.retainedEventCount,
  facts: overview.statistics.factCount,
  checked: overview.statistics.checkedCount,
  reviewStarted: overview.statistics.reviewStartedCount,
}, {
  status: "available",
  window: "all",
  retained: 2,
  facts: 2,
  checked: 1,
  reviewStarted: 1,
});
assert.equal(overview.reviewQueue.status, "available");
assert.equal(overview.reviewQueue.pendingTargetCount, 2);
assert.deepEqual(overview.reviewQueue.groups.map((group) => group.kind), [
  "rhythm",
  "single-pitch",
]);
assert.equal(overview.recommendation.status, "available");
if (overview.recommendation.status === "available") {
  assert.deepEqual(overview.recommendation.target, rhythm);
  assert.equal(overview.recommendation.source.queuePosition, 1);
}

const oppositeOutcomes = events.map((event) => ({
  ...event,
  outcome: event.outcome === "correct"
    ? "incorrect" as const
    : "correct" as const,
}));
assert.deepEqual(
  buildLocalLearningOverview({
    courseProgress,
    events: oppositeOutcomes,
    reviewQueue: [rhythm, pitch],
    suggestionsEnabled: true,
    now,
  }),
  overview,
  "overview must not consume outcome",
);

const unavailableCourse = buildLocalLearningOverview({
  courseProgress: null,
  events,
  reviewQueue: [rhythm],
  suggestionsEnabled: false,
  now,
});
assert.deepEqual(unavailableCourse.course, {
  status: "unavailable",
  checkedLessonCount: 0,
  lessonCount: 3,
});
assert.equal(unavailableCourse.statistics.status, "available");
assert.equal(unavailableCourse.reviewQueue.status, "available");
assert.deepEqual(unavailableCourse.recommendation, { status: "disabled" });

const oversizedEvents = Array.from({ length: 49 }, (_, index) => ({
  occurredAt: `2026-07-${String(1 + (index % 23)).padStart(2, "0")}T12:00:00.000Z`,
  kind: "result-checked" as const,
  practiceMode: "random" as const,
  skillKind: "single-pitch" as const,
}));
const oversized = buildLocalLearningOverview({
  courseProgress,
  events: oversizedEvents,
  reviewQueue: [pitch],
  suggestionsEnabled: true,
  now,
});
assert.equal(oversized.statistics.status, "unavailable");
assert.equal(oversized.statistics.retainedEventCount, 49);
assert.equal(oversized.statistics.factCount, 0);
assert.equal(oversized.course.status, "available");
assert.equal(oversized.reviewQueue.status, "available");
assert.equal(oversized.recommendation.status, "available");

const malformedQueue = [
  { ...pitch, kind: "unknown-kind" },
] as unknown as LocalPracticeReviewTarget[];
const queueUnavailable = buildLocalLearningOverview({
  courseProgress,
  events,
  reviewQueue: malformedQueue,
  suggestionsEnabled: true,
  now,
});
assert.equal(queueUnavailable.course.status, "available");
assert.equal(queueUnavailable.statistics.status, "available");
assert.equal(queueUnavailable.reviewQueue.status, "unavailable");
assert.deepEqual(queueUnavailable.recommendation, { status: "unavailable" });

const unavailableSources = buildLocalLearningOverview({
  courseProgress,
  events: [],
  reviewQueue: [],
  suggestionsEnabled: false,
  learningSourceStatus: "unavailable",
  reviewSourceStatus: "unavailable",
  now,
});
assert.equal(unavailableSources.course.status, "available");
assert.equal(unavailableSources.statistics.status, "unavailable");
assert.equal(unavailableSources.statistics.factCount, 0);
assert.equal(unavailableSources.reviewQueue.status, "unavailable");
assert.deepEqual(unavailableSources.recommendation, { status: "unavailable" });

for (const forbidden of [
  "outcome",
  "accuracy",
  "score",
  "grade",
  "rating",
  "diagnosis",
  "overallProgress",
]) {
  assert.equal(forbidden in overview, false);
}

console.log("P118e local learning overview domain tests passed.");
