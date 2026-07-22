import assert from "node:assert/strict";
import { LOCAL_COURSE_LESSONS, createEmptyLocalCourseProgress, deserializeLocalCourseProgress, isLessonComplete, isLessonUnlocked, recordLocalCourseLessonCheck, serializeLocalCourseProgress } from "../lib/learning/localCoursePath";
import { MOBILE_COURSE_PROGRESS_STORAGE_KEY, clearMobileCourseProgress, loadMobileCourseProgress, saveMobileCourseProgress } from "../mobile/src/runtime/mobileCourseProgressStorage";
import type { StorageLike } from "../mobile/src/runtime/mobilePracticeReviewStorage";
import { adaptIntervalQuestionToActivity, adaptRhythmQuestionToActivity, adaptSinglePitchQuestionToActivity } from "../lib/activity/legacyLocalActivityAdapter";
import { createLocalEarTrainingSinglePitchQuestion } from "../lib/practice/localEarTrainingSinglePitch";
import { createLocalEarTrainingQuestion } from "../lib/practice/localEarTrainingIntervals";
import { createLocalEarTrainingRhythmQuestion } from "../lib/practice/localEarTrainingRhythm";

const eventFor = (index: number, state: "consistent" | "different" | "insufficient" = "different") => {
  const binding = LOCAL_COURSE_LESSONS[index].activityBinding;
  return { schemaVersion: "activity-checked-fact-v1", lifecycle: "checked", assessmentMode: "non-scoring", ...binding, attemptId: `course:test:attempt:${index + 1}`, revision: 2, evidenceState: state } as const;
};
const actualDefinitions = [
  adaptSinglePitchQuestionToActivity(createLocalEarTrainingSinglePitchQuestion({ difficulty: "基础", sequence: 0, questionIndex: 0, variantId: "pitch:c4", catalogMode: "legacy-v1" })),
  adaptIntervalQuestionToActivity(createLocalEarTrainingQuestion({ difficulty: "基础", direction: "上行", sequence: 0, questionIndex: 0, variantId: "interval:c4:major-third", catalogMode: "legacy-v1" })),
  adaptRhythmQuestionToActivity(createLocalEarTrainingRhythmQuestion({ difficulty: "基础", sequence: 0, questionIndex: 0, variantId: "rhythm:even-quarters", catalogMode: "legacy-v1" })),
];
actualDefinitions.forEach((definition, index) => assert.deepEqual(LOCAL_COURSE_LESSONS[index].activityBinding, { activityId: definition.activityId, activityVersion: definition.activityVersion, contentVersion: definition.contentVersion, targetId: definition.target.targetId }));
assert.equal(new Set(LOCAL_COURSE_LESSONS.map((item) => item.id)).size, LOCAL_COURSE_LESSONS.length);
let progress = createEmptyLocalCourseProgress();
assert.equal(isLessonUnlocked(progress, LOCAL_COURSE_LESSONS[0]), true);
assert.equal(isLessonUnlocked(progress, LOCAL_COURSE_LESSONS[1]), false);
assert.throws(() => recordLocalCourseLessonCheck(progress, LOCAL_COURSE_LESSONS[1], eventFor(1)), /尚未解锁/);
progress = recordLocalCourseLessonCheck(progress, LOCAL_COURSE_LESSONS[0], eventFor(0, "different"));
assert.equal(isLessonComplete(progress, LOCAL_COURSE_LESSONS[0]), true);
assert.equal(isLessonUnlocked(progress, LOCAL_COURSE_LESSONS[1]), true);
progress = recordLocalCourseLessonCheck(progress, LOCAL_COURSE_LESSONS[1], eventFor(1, "insufficient"));
progress = recordLocalCourseLessonCheck(progress, LOCAL_COURSE_LESSONS[2], eventFor(2, "consistent"));
assert.equal(progress.completions.length, 3);
assert.deepEqual(deserializeLocalCourseProgress(serializeLocalCourseProgress(progress)), progress);
assert.equal(deserializeLocalCourseProgress(JSON.stringify({ ...progress, schemaVersion: "future-v2" })), null);
assert.equal(deserializeLocalCourseProgress(JSON.stringify({ ...progress, contentVersion: "stale" })), null);
assert.equal(deserializeLocalCourseProgress(JSON.stringify({ ...progress, completions: [{ lessonId: LOCAL_COURSE_LESSONS[0].id, completionFingerprint: "stale" }] })), null);
assert.equal(deserializeLocalCourseProgress(JSON.stringify({ ...progress, answer: "sensitive" })), null);
assert.equal(deserializeLocalCourseProgress(JSON.stringify({ ...progress, completions: [{ ...progress.completions[0], answer: "sensitive" }] })), null);
assert.equal(deserializeLocalCourseProgress(JSON.stringify({ ...createEmptyLocalCourseProgress(), completions: [{ lessonId: LOCAL_COURSE_LESSONS[1].id, completionFingerprint: LOCAL_COURSE_LESSONS[1].completionFingerprint }] })), null);
assert.throws(() => recordLocalCourseLessonCheck(createEmptyLocalCourseProgress(), LOCAL_COURSE_LESSONS[0], { ...eventFor(0), activityId: "wrong" }), /不一致/);
assert.throws(() => recordLocalCourseLessonCheck(createEmptyLocalCourseProgress(), LOCAL_COURSE_LESSONS[0], { ...eventFor(0), assessmentMode: "scoring" } as never), /不一致/);
assert.throws(() => recordLocalCourseLessonCheck(createEmptyLocalCourseProgress(), LOCAL_COURSE_LESSONS[0], { ...eventFor(0), evidenceState: "scored-pass" } as never), /不一致/);
assert.ok(!serializeLocalCourseProgress(progress).includes("answer"));
assert.ok(!serializeLocalCourseProgress(progress).includes("evidenceState"));
const values = new Map<string, string>();
const storage: StorageLike = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: (key) => { values.delete(key); } };
assert.deepEqual(saveMobileCourseProgress(storage, progress), { notice: null });
assert.deepEqual(loadMobileCourseProgress(storage), { progress, notice: null });
assert.equal(values.has(MOBILE_COURSE_PROGRESS_STORAGE_KEY), true);
values.set(MOBILE_COURSE_PROGRESS_STORAGE_KEY, JSON.stringify({ ...progress, contentVersion: "future" }));
assert.match(loadMobileCourseProgress(storage).notice ?? "", /安全清除/);
assert.equal(values.has(MOBILE_COURSE_PROGRESS_STORAGE_KEY), false);
assert.deepEqual(clearMobileCourseProgress(storage), { notice: null });
const throwing: StorageLike = { getItem: () => { throw new Error("get"); }, setItem: () => { throw new Error("set"); }, removeItem: () => { throw new Error("remove"); } };
assert.match(loadMobileCourseProgress(throwing).notice ?? "", /读取失败/);
assert.match(saveMobileCourseProgress(throwing, progress).notice ?? "", /保存失败/);
assert.match(clearMobileCourseProgress(throwing).notice ?? "", /清除失败/);
assert.match(loadMobileCourseProgress(null).notice ?? "", /不会标记为已保存/);
console.log("local course path tests passed");
