import assert from "node:assert/strict";

import {
  createPrivatePracticeHistoryResult,
  PRIVATE_PRACTICE_HISTORY_QUERY_LIMIT,
} from "../lib/account/privatePracticeHistory";
import { loadSupabasePrivatePracticeHistory } from "../lib/platform/supabasePrivatePracticeHistory";

const validRow = {
  id: "attempt-1",
  state: "completed",
  target_version: 1,
  started_at: "2026-08-03T08:00:00.000Z",
  completed_at: "2026-08-03T08:01:00.000Z",
  client_summary: {
    exercise_kind: "interval",
    difficulty: "基础",
    matches_answer: false,
    formal_evaluation: false,
  },
  session: { source: "system_course" },
  exercise: {
    id: "exercise-1",
    kind: "interval",
    title: "基础音程听辨",
    is_published: true,
    lesson: {
      id: "lesson-1",
      title: "认识音程",
      course: { id: "course-1", title: "基础课程" },
    },
  },
};

const normalized = createPrivatePracticeHistoryResult([
  validRow,
  {
    ...validRow,
    id: "attempt-formal",
    client_summary: {
      ...validRow.client_summary,
      formal_evaluation: true,
    },
  },
  {
    ...validRow,
    id: "attempt-kind-mismatch",
    client_summary: {
      ...validRow.client_summary,
      exercise_kind: "rhythm",
    },
  },
  {
    ...validRow,
    id: "attempt-invalid-difficulty",
    client_summary: {
      ...validRow.client_summary,
      difficulty: "未经验证的难度",
    },
  },
  { ...validRow, id: "attempt-without-completion", completed_at: null },
  {
    ...validRow,
    id: "attempt-personal-source",
    session: { source: "web" },
  },
  {
    ...validRow,
    id: "attempt-unpublished",
    exercise: { ...validRow.exercise, is_published: false },
  },
  {
    ...validRow,
    id: "attempt-without-course",
    exercise: {
      ...validRow.exercise,
      lesson: { ...validRow.exercise.lesson, course: null },
    },
  },
  { id: "attempt-malformed", state: "completed", client_summary: {} },
]);

assert.equal(normalized.items.length, 1);
assert.equal(normalized.ignoredCount, 8);
assert.deepEqual(normalized.items[0], {
  id: "attempt-1",
  exerciseId: "exercise-1",
  exerciseTitle: "基础音程听辨",
  lessonTitle: "认识音程",
  courseTitle: "基础课程",
  kind: "interval",
  kindLabel: "音程听辨",
  difficulty: "基础",
  matchesAnswer: false,
  completedAt: "2026-08-03T08:01:00.000Z",
  retryHref:
    "/practice?feature=ear-training&mode=interval&exercise=exercise-1",
});

const capped = createPrivatePracticeHistoryResult(
  Array.from({ length: 25 }, (_, index) => ({
    ...validRow,
    id: `attempt-${index}`,
  })),
);
assert.equal(capped.items.length, 20);
assert.equal(capped.items.at(-1)?.id, "attempt-19");

const calls: Array<{ name: string; args: unknown[] }> = [];
const response = Promise.resolve({ data: [validRow], error: null });
const query = {
  select(...args: unknown[]) {
    calls.push({ name: "select", args });
    return this;
  },
  eq(...args: unknown[]) {
    calls.push({ name: "eq", args });
    return this;
  },
  order(...args: unknown[]) {
    calls.push({ name: "order", args });
    return this;
  },
  limit(...args: unknown[]) {
    calls.push({ name: "limit", args });
    return response;
  },
};
const client = {
  from(table: string) {
    calls.push({ name: "from", args: [table] });
    return query;
  },
};

async function main() {
  const loaded = await loadSupabasePrivatePracticeHistory(
    client as never,
    "user-current",
  );
  assert.equal(loaded.items.length, 1);
  assert.deepEqual(
    calls.filter((call) => call.name === "eq").map((call) => call.args),
    [
      ["user_id", "user-current"],
      ["state", "completed"],
      ["session.source", "system_course"],
      ["exercise.is_published", true],
    ],
    "history reads must remain explicitly owner-bound and completed-only",
  );
  assert.deepEqual(
    calls.find((call) => call.name === "order")?.args,
    ["completed_at", { ascending: false }],
  );
  assert.deepEqual(
    calls.find((call) => call.name === "limit")?.args,
    [PRIVATE_PRACTICE_HISTORY_QUERY_LIMIT],
  );

  console.log("private practice history contract tests passed");
}

void main();
