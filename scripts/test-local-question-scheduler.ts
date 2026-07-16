import assert from "node:assert/strict";
import { createLocalQuestionSchedule, getScheduledQuestionIndex } from "../lib/practice/localQuestionScheduler";

const first = createLocalQuestionSchedule(8, 20260716);
assert.deepEqual(first, createLocalQuestionSchedule(8, 20260716));
assert.deepEqual([...first.order].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]);
assert.equal(getScheduledQuestionIndex(first, 8), first.order[0]);
assert.equal(getScheduledQuestionIndex(first, 16), first.order[0]);
assert.equal(getScheduledQuestionIndex(first, -1), first.order[0]);
assert.equal(getScheduledQuestionIndex(first, Number.NaN), null);
assert.equal(getScheduledQuestionIndex(first, Number.POSITIVE_INFINITY), null);
assert.equal(getScheduledQuestionIndex(createLocalQuestionSchedule(0, 1), 0), null);
assert.equal(createLocalQuestionSchedule(Number.MAX_SAFE_INTEGER, 1).order.length, 10_000);
console.log("Local question scheduler tests passed.");
