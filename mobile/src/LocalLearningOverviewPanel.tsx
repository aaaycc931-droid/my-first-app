import { useMemo, useState } from "react";

import {
  buildLocalLearningOverview,
} from "../../lib/learning/localLearningOverview";
import type { LocalPracticeStatisticsEvent } from "../../lib/learning/localPracticeStatistics";
import type {
  LocalPracticeReviewQueue,
  LocalPracticeReviewTarget,
} from "../../lib/practice/localPracticeReviewQueue";
import { LocalExplainablePracticeRecommendationPanel } from "./LocalExplainablePracticeRecommendationPanel";
import { LocalWeakPointReviewQueuePanel } from "./LocalWeakPointReviewQueuePanel";
import { loadMobileCourseProgress } from "./runtime/mobileCourseProgressStorage";

const browserStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export function LocalLearningOverviewPanel({
  events,
  reviewQueue,
  suggestionsEnabled,
  learningSourceStatus,
  reviewSourceStatus,
  labelForTarget,
  onStartTarget,
  onClearReviewQueue,
  onToggleSuggestions,
  now,
}: {
  events: readonly LocalPracticeStatisticsEvent[];
  reviewQueue: LocalPracticeReviewQueue;
  suggestionsEnabled: boolean;
  learningSourceStatus: "available" | "unavailable";
  reviewSourceStatus: "available" | "unavailable";
  labelForTarget: (target: LocalPracticeReviewTarget) => string;
  onStartTarget: (target: LocalPracticeReviewTarget) => void;
  onClearReviewQueue: () => void;
  onToggleSuggestions: () => void;
  now?: Date;
}) {
  const loadedCourse = useState(() => loadMobileCourseProgress(browserStorage()))[0];
  const overview = useMemo(
    () => buildLocalLearningOverview({
      courseProgress: loadedCourse.sourceStatus === "available"
        ? loadedCourse.progress
        : null,
      events,
      reviewQueue,
      suggestionsEnabled,
      learningSourceStatus,
      reviewSourceStatus,
      now,
    }),
    [
      events,
      learningSourceStatus,
      loadedCourse,
      now,
      reviewQueue,
      reviewSourceStatus,
      suggestionsEnabled,
    ],
  );

  return (
    <section className="mt-5" aria-labelledby="learning-overview-heading">
      <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50 p-5 shadow-sm">
        <p className="text-sm font-semibold text-indigo-700">课程 · 统计 · 复练 · 建议</p>
        <h2 id="learning-overview-heading" className="text-xl font-black text-slate-950">
          本机学习总览
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          这里并列展示各自来源能够直接证明的本机事实，不合并计算总进度、正确率、分数、等级或能力判断。
          课程课节进度不计入练习动作统计、复练队列或建议，四块来源彼此独立。
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <article className="rounded-2xl border border-indigo-200 bg-white p-4">
            <h3 className="font-black text-indigo-950">中文课程</h3>
            {overview.course.status === "available" ? (
              <>
                <p className="mt-2 text-lg font-black text-indigo-950">
                  已练习并核对 {overview.course.checkedLessonCount}/{overview.course.lessonCount} 课节
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  完成只表示已练习并查看说明，不代表通过或能力等级。
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-amber-900">
                本机课程进度无法作为概览来源，未生成课程摘要。
              </p>
            )}
            <a
              href="#course"
              className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-indigo-800 px-4 py-2 text-sm font-bold text-white"
            >
              打开课程
            </a>
          </article>

          <article className="rounded-2xl border border-sky-200 bg-white p-4">
            <h3 className="font-black text-sky-950">当前保留的练习事实</h3>
            {overview.statistics.status === "available" ? (
              <>
                <p className="mt-2 text-lg font-black text-sky-950">
                  当前保留练习动作 {overview.statistics.factCount} 次
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  已核对 {overview.statistics.checkedCount} 次 · 开始复练 {overview.statistics.reviewStartedCount} 次
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  来源仅为当前保留的最近 {overview.statistics.retainedEventCount} 条本机事件，不代表终身历史。
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-amber-900">
                本机事件存在无法解释的数据，未生成练习摘要。
              </p>
            )}
            <a
              href="#statistics"
              className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-sky-800 px-4 py-2 text-sm font-bold text-white"
            >
              查看详细统计
            </a>
          </article>
        </div>
      </div>

      <LocalWeakPointReviewQueuePanel
        queue={reviewQueue}
        reviewModel={overview.reviewQueue}
        labelForTarget={labelForTarget}
        onStartTarget={onStartTarget}
        onClear={onClearReviewQueue}
      />

      <LocalExplainablePracticeRecommendationPanel
        recommendation={overview.recommendation}
        labelForTarget={labelForTarget}
        onStartTarget={onStartTarget}
        onToggle={onToggleSuggestions}
        suggestionsEnabled={suggestionsEnabled}
        settingsAvailable={learningSourceStatus === "available"}
      />
    </section>
  );
}
