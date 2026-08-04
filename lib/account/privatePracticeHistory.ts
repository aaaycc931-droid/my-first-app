export const PRIVATE_PRACTICE_HISTORY_LIMIT = 20;
export const PRIVATE_PRACTICE_HISTORY_QUERY_LIMIT = 60;

export type PrivatePracticeKind = "single_pitch" | "interval" | "rhythm";

export type PrivatePracticeHistoryItem = {
  id: string;
  exerciseId: string;
  exerciseTitle: string;
  lessonTitle: string | null;
  courseTitle: string | null;
  kind: PrivatePracticeKind;
  kindLabel: string;
  difficulty: string;
  matchesAnswer: boolean;
  completedAt: string;
  retryHref: string;
};

export type PrivatePracticeHistoryResult = {
  items: PrivatePracticeHistoryItem[];
  ignoredCount: number;
};

const PRACTICE_KIND_DETAILS: Record<
  PrivatePracticeKind,
  { label: string; mode: string; difficulties: readonly string[] }
> = {
  single_pitch: {
    label: "单音听辨",
    mode: "single-pitch",
    difficulties: ["基础", "进阶"],
  },
  interval: { label: "音程听辨", mode: "interval", difficulties: ["基础"] },
  rhythm: { label: "节奏听辨", mode: "rhythm", difficulties: ["基础"] },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asRelation(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
}

function asSafeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength
    ? normalized
    : null;
}

function asPracticeKind(value: unknown): PrivatePracticeKind | null {
  return typeof value === "string" && value in PRACTICE_KIND_DETAILS
    ? (value as PrivatePracticeKind)
    : null;
}

function asIsoTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function createPrivatePracticeHistoryResult(
  rows: readonly unknown[],
): PrivatePracticeHistoryResult {
  const items: PrivatePracticeHistoryItem[] = [];
  let ignoredCount = 0;

  for (const rawRow of rows) {
    const row = asRecord(rawRow);
    const summary = asRecord(row?.client_summary);
    const session = asRelation(row?.session);
    const exercise = asRelation(row?.exercise);
    const lesson = asRelation(exercise?.lesson);
    const course = asRelation(lesson?.course);
    const id = asSafeText(row?.id, 80);
    const exerciseId = asSafeText(exercise?.id, 80);
    const exerciseTitle = asSafeText(exercise?.title, 160);
    const lessonId = asSafeText(lesson?.id, 80);
    const lessonTitle = asSafeText(lesson?.title, 160);
    const courseId = asSafeText(course?.id, 80);
    const courseTitle = asSafeText(course?.title, 160);
    const kind = asPracticeKind(exercise?.kind);
    const summaryKind = asPracticeKind(summary?.exercise_kind);
    const difficulty = asSafeText(summary?.difficulty, 32);
    const completedAt = asIsoTimestamp(row?.completed_at);
    const matchesAnswer = summary?.matches_answer;
    const targetVersion = row?.target_version;
    const isNonFormal = summary?.formal_evaluation === false;

    if (
      row?.state !== "completed" ||
      session?.source !== "system_course" ||
      !id ||
      !exerciseId ||
      !exerciseTitle ||
      exercise?.is_published !== true ||
      !lessonId ||
      !lessonTitle ||
      !courseId ||
      !courseTitle ||
      !kind ||
      summaryKind !== kind ||
      !difficulty ||
      !PRACTICE_KIND_DETAILS[kind].difficulties.includes(difficulty) ||
      !completedAt ||
      typeof matchesAnswer !== "boolean" ||
      !Number.isInteger(targetVersion) ||
      (targetVersion as number) < 1 ||
      !isNonFormal
    ) {
      ignoredCount += 1;
      continue;
    }

    const details = PRACTICE_KIND_DETAILS[kind];
    items.push({
      id,
      exerciseId,
      exerciseTitle,
      lessonTitle,
      courseTitle,
      kind,
      kindLabel: details.label,
      difficulty,
      matchesAnswer,
      completedAt,
      retryHref: `/practice?feature=ear-training&mode=${details.mode}&exercise=${encodeURIComponent(exerciseId)}`,
    });

    if (items.length === PRIVATE_PRACTICE_HISTORY_LIMIT) break;
  }

  return { items, ignoredCount };
}

export function formatPrivatePracticeCompletedAt(
  completedAt: string,
  timeZone: string,
): string {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(new Date(completedAt));
  } catch {
    return new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Shanghai",
    }).format(new Date(completedAt));
  }
}
