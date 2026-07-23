import {
  LOCAL_COURSE_LESSONS,
  deserializeLocalCourseProgress,
  isLessonComplete,
  serializeLocalCourseProgress,
  type LocalCourseProgress,
} from "./localCoursePath";
import {
  MAX_RECENT_LEARNING_EVENTS,
} from "./learningEventProfile";
import {
  buildLocalExplainablePracticeRecommendation,
  type LocalExplainablePracticeRecommendation,
} from "./localExplainablePracticeRecommendation";
import {
  buildLocalPracticeStatistics,
  type LocalPracticeStatistics,
  type LocalPracticeStatisticsEvent,
} from "./localPracticeStatistics";
import {
  buildLocalWeakPointReviewQueue,
  type LocalWeakPointReviewQueue,
} from "./localWeakPointReviewQueue";
import type { LocalPracticeReviewQueue } from "../practice/localPracticeReviewQueue";

export type LocalCourseOverview = {
  status: "available" | "unavailable";
  checkedLessonCount: number;
  lessonCount: number;
};

export type LocalLearningOverview = {
  course: LocalCourseOverview;
  statistics: LocalPracticeStatistics;
  reviewQueue: LocalWeakPointReviewQueue;
  recommendation: LocalExplainablePracticeRecommendation;
};

const unavailableCourseOverview = (): LocalCourseOverview => ({
  status: "unavailable",
  checkedLessonCount: 0,
  lessonCount: LOCAL_COURSE_LESSONS.length,
});

const buildCourseOverview = (
  progress: LocalCourseProgress | null,
): LocalCourseOverview => {
  if (progress === null) return unavailableCourseOverview();

  try {
    const checkedProgress = deserializeLocalCourseProgress(
      serializeLocalCourseProgress(progress),
    );
    if (checkedProgress === null) return unavailableCourseOverview();

    return {
      status: "available",
      checkedLessonCount: LOCAL_COURSE_LESSONS.filter((lesson) =>
        isLessonComplete(checkedProgress, lesson)
      ).length,
      lessonCount: LOCAL_COURSE_LESSONS.length,
    };
  } catch {
    return unavailableCourseOverview();
  }
};

const unavailableStatistics = (
  statistics: LocalPracticeStatistics,
): LocalPracticeStatistics => ({
  ...statistics,
  status: "unavailable",
  factCount: 0,
  checkedCount: 0,
  reviewStartedCount: 0,
  byPracticeMode: statistics.byPracticeMode.map((bucket) => ({
    ...bucket,
    factCount: 0,
    checkedCount: 0,
    reviewStartedCount: 0,
  })),
  bySkillKind: statistics.bySkillKind.map((bucket) => ({
    ...bucket,
    factCount: 0,
    checkedCount: 0,
    reviewStartedCount: 0,
  })),
});

/**
 * Brings four existing local learning views together without combining their
 * facts into a score, rating, or new ordering rule. Each source fails closed
 * within its own section.
 */
export const buildLocalLearningOverview = ({
  courseProgress,
  events,
  reviewQueue,
  suggestionsEnabled,
  learningSourceStatus = "available",
  reviewSourceStatus = "available",
  now = new Date(),
}: {
  courseProgress: LocalCourseProgress | null;
  events: readonly LocalPracticeStatisticsEvent[];
  reviewQueue: LocalPracticeReviewQueue;
  suggestionsEnabled: boolean;
  learningSourceStatus?: "available" | "unavailable";
  reviewSourceStatus?: "available" | "unavailable";
  now?: Date;
}): LocalLearningOverview => {
  const statistics = buildLocalPracticeStatistics({
    events,
    window: "all",
    now,
  });

  return {
    course: buildCourseOverview(courseProgress),
    statistics: learningSourceStatus === "available"
      && events.length <= MAX_RECENT_LEARNING_EVENTS
      ? statistics
      : unavailableStatistics(statistics),
    reviewQueue: reviewSourceStatus === "available"
      ? buildLocalWeakPointReviewQueue(reviewQueue)
      : { status: "unavailable", pendingTargetCount: 0, groups: [] },
    recommendation:
      learningSourceStatus === "available" && reviewSourceStatus === "available"
        ? buildLocalExplainablePracticeRecommendation({
            suggestionsEnabled,
            queue: reviewQueue,
          })
        : { status: "unavailable" },
  };
};
