import type { LearningEvent, LearningSkillKind } from "./learningEventProfile";

export const LOCAL_PRACTICE_STATISTICS_WINDOWS = ["7d", "30d", "all"] as const;
export type LocalPracticeStatisticsWindow = (typeof LOCAL_PRACTICE_STATISTICS_WINDOWS)[number];

export type LocalPracticeStatisticsEvent = Pick<
  LearningEvent,
  "occurredAt" | "kind" | "skillKind" | "practiceMode"
>;

export type LocalPracticeStatisticsBucket<T extends string> = {
  key: T;
  factCount: number;
  checkedCount: number;
  reviewStartedCount: number;
};

export type LocalPracticeStatistics = {
  status: "available" | "unavailable";
  window: LocalPracticeStatisticsWindow;
  retainedEventCount: number;
  factCount: number;
  checkedCount: number;
  reviewStartedCount: number;
  byPracticeMode: LocalPracticeStatisticsBucket<LearningEvent["practiceMode"]>[];
  bySkillKind: LocalPracticeStatisticsBucket<LearningSkillKind>[];
};

const millisecondsPerDay = 24 * 60 * 60 * 1_000;
const practiceModes: LearningEvent["practiceMode"][] = ["random", "review", "custom"];
const skillKinds: LearningSkillKind[] = [
  "single-pitch", "interval", "interval-comparison", "chord-inversion",
  "harmony-progression", "scale-mode", "seventh-chord", "seventh-chord-spacing",
  "modulation", "rhythm", "melody-dictation",
];

const emptyBuckets = <T extends string>(keys: readonly T[]): LocalPracticeStatisticsBucket<T>[] =>
  keys.map((key) => ({ key, factCount: 0, checkedCount: 0, reviewStartedCount: 0 }));

const emptyStatistics = (
  window: LocalPracticeStatisticsWindow,
  retainedEventCount: number,
  status: LocalPracticeStatistics["status"],
): LocalPracticeStatistics => ({
  status,
  window,
  retainedEventCount,
  factCount: 0,
  checkedCount: 0,
  reviewStartedCount: 0,
  byPracticeMode: emptyBuckets(practiceModes),
  bySkillKind: emptyBuckets(skillKinds),
});

const isStatisticsEvent = (event: unknown, nowMs: number): event is LocalPracticeStatisticsEvent => {
  if (typeof event !== "object" || event === null) return false;
  const candidate = event as Partial<LocalPracticeStatisticsEvent>;
  if (typeof candidate.occurredAt !== "string") return false;
  const occurredAtMs = Date.parse(candidate.occurredAt);
  return Number.isFinite(occurredAtMs)
    && occurredAtMs <= nowMs
    && (candidate.kind === "result-checked" || candidate.kind === "review-started")
    && practiceModes.includes(candidate.practiceMode as LearningEvent["practiceMode"])
    && skillKinds.includes(candidate.skillKind as LearningSkillKind);
};

export const buildLocalPracticeStatistics = ({
  events,
  window,
  now = new Date(),
}: {
  events: readonly LocalPracticeStatisticsEvent[];
  window: LocalPracticeStatisticsWindow;
  now?: Date;
}): LocalPracticeStatistics => {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs) || !events.every((event) => isStatisticsEvent(event, nowMs))) {
    return emptyStatistics(window, events.length, "unavailable");
  }

  const cutoffMs = window === "all"
    ? Number.NEGATIVE_INFINITY
    : nowMs - (window === "7d" ? 7 : 30) * millisecondsPerDay;
  const included = events.filter((event) => Date.parse(event.occurredAt) >= cutoffMs);
  const result = emptyStatistics(window, events.length, "available");

  for (const event of included) {
    const modeBucket = result.byPracticeMode.find((bucket) => bucket.key === event.practiceMode);
    const skillBucket = result.bySkillKind.find((bucket) => bucket.key === event.skillKind);
    if (!modeBucket || !skillBucket) return emptyStatistics(window, events.length, "unavailable");
    for (const bucket of [modeBucket, skillBucket]) {
      bucket.factCount += 1;
      if (event.kind === "result-checked") bucket.checkedCount += 1;
      else bucket.reviewStartedCount += 1;
    }
    result.factCount += 1;
    if (event.kind === "result-checked") result.checkedCount += 1;
    else result.reviewStartedCount += 1;
  }
  return result;
};
