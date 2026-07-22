import assert from "node:assert/strict";

import {
  LEGACY_LOCAL_COURSE_PROGRESS_SCHEMA_VERSION,
  LOCAL_CHINESE_FOUNDATION_COURSE,
  LOCAL_COURSE_CATALOG,
  LOCAL_COURSE_PROGRESS_SCHEMA_VERSION,
  completeLocalCourseLesson,
  createLocalCourseProgress,
} from "../lib/learning/localCoursePath";
import {
  MOBILE_COURSE_PROGRESS_STORAGE_KEY,
  loadMobileCourseProgress,
  resetMobileCourseProgress,
  saveMobileCourseProgress,
} from "../mobile/src/runtime/mobileCourseProgressStorage";
import type { StorageLike } from "../mobile/src/runtime/mobilePracticeReviewStorage";

const values = new Map<string, string>();
const storage: StorageLike = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => { values.set(key, value); },
  removeItem: (key) => { values.delete(key); },
};

const empty = createLocalCourseProgress();
const firstLesson = LOCAL_CHINESE_FOUNDATION_COURSE.chapters[0]!.lessons[0]!;
const completed = completeLocalCourseLesson(
  empty,
  {
    kind: "checked-local-course-activity-result-v1",
    catalogId: LOCAL_COURSE_CATALOG.catalogId,
    catalogVersion: LOCAL_COURSE_CATALOG.catalogVersion,
    courseId: LOCAL_CHINESE_FOUNDATION_COURSE.courseId,
    courseVersion: LOCAL_CHINESE_FOUNDATION_COURSE.courseVersion,
    lessonId: firstLesson.lessonId,
    activityMappingId: firstLesson.activityMappings[0]!.activityMappingId,
    activityFamily: firstLesson.activityMappings[0]!.activityFamily,
  },
);

assert.deepEqual(loadMobileCourseProgress(storage), { progress: empty, notice: null });
assert.deepEqual(saveMobileCourseProgress(storage, completed), { notice: null });
assert.deepEqual(loadMobileCourseProgress(storage), { progress: completed, notice: null });

const persisted = JSON.parse(values.get(MOBILE_COURSE_PROGRESS_STORAGE_KEY) ?? "{}") as Record<string, unknown>;
assert.deepEqual(Object.keys(persisted).sort(), [
  "catalogId",
  "catalogVersion",
  "completedLessonIds",
  "courseId",
  "courseVersion",
  "revision",
  "schemaVersion",
]);
for (const forbidden of ["answer", "recording", "pcm", "blob", "frame", "identity", "account", "email"]) {
  assert.equal(JSON.stringify(persisted).toLowerCase().includes(forbidden), false);
}

assert.deepEqual(resetMobileCourseProgress(storage), { notice: null });
assert.equal(values.has(MOBILE_COURSE_PROGRESS_STORAGE_KEY), false);

const legacy = {
  schemaVersion: LEGACY_LOCAL_COURSE_PROGRESS_SCHEMA_VERSION,
  courseId: completed.courseId,
  completedLessonIds: completed.completedLessonIds,
};
values.set(MOBILE_COURSE_PROGRESS_STORAGE_KEY, JSON.stringify(legacy));
const migrated = loadMobileCourseProgress(storage);
assert.equal(migrated.notice, null);
assert.equal(migrated.progress.schemaVersion, LOCAL_COURSE_PROGRESS_SCHEMA_VERSION);
assert.deepEqual(migrated.progress.completedLessonIds, completed.completedLessonIds);
assert.equal(
  (JSON.parse(values.get(MOBILE_COURSE_PROGRESS_STORAGE_KEY) ?? "{}") as { schemaVersion?: string }).schemaVersion,
  LOCAL_COURSE_PROGRESS_SCHEMA_VERSION,
);

for (const invalid of [
  "not-json",
  JSON.stringify({ ...completed, catalogVersion: "v999" }),
  JSON.stringify({ ...completed, answer: "不得保存答案" }),
  JSON.stringify({ ...completed, completedLessonIds: ["lesson.unknown.v1"] }),
]) {
  values.set(MOBILE_COURSE_PROGRESS_STORAGE_KEY, invalid);
  const rejected = loadMobileCourseProgress(storage);
  assert.deepEqual(rejected.progress, empty);
  assert.match(rejected.notice ?? "", /无效或已过期/);
  assert.equal(values.has(MOBILE_COURSE_PROGRESS_STORAGE_KEY), false);
}

const throwing = (operation: "get" | "set" | "remove"): StorageLike => ({
  getItem: (key) => {
    if (operation === "get") throw new Error("get");
    return values.get(key) ?? null;
  },
  setItem: (key, value) => {
    if (operation === "set") throw new Error("set");
    values.set(key, value);
  },
  removeItem: (key) => {
    if (operation === "remove") throw new Error("remove");
    values.delete(key);
  },
});

assert.match(loadMobileCourseProgress(throwing("get")).notice ?? "", /读取失败/);
assert.match(loadMobileCourseProgress(null).notice ?? "", /暂时不可用/);
assert.match(saveMobileCourseProgress(null, completed).notice ?? "", /暂时不可用/);
assert.match(resetMobileCourseProgress(null).notice ?? "", /暂时不可用/);

values.set(MOBILE_COURSE_PROGRESS_STORAGE_KEY, JSON.stringify(legacy));
const failedMigration = loadMobileCourseProgress(throwing("set"));
assert.deepEqual(failedMigration.progress.completedLessonIds, completed.completedLessonIds);
assert.match(failedMigration.notice ?? "", /升级保存失败/);
assert.equal(
  (JSON.parse(values.get(MOBILE_COURSE_PROGRESS_STORAGE_KEY) ?? "{}") as { schemaVersion?: string }).schemaVersion,
  LEGACY_LOCAL_COURSE_PROGRESS_SCHEMA_VERSION,
);

values.set(MOBILE_COURSE_PROGRESS_STORAGE_KEY, JSON.stringify(completed));
const previous = values.get(MOBILE_COURSE_PROGRESS_STORAGE_KEY);
assert.match(saveMobileCourseProgress(throwing("set"), empty).notice ?? "", /原有进度保持不变/);
assert.equal(values.get(MOBILE_COURSE_PROGRESS_STORAGE_KEY), previous);

const forged = { ...completed, recording: "private-audio" } as typeof completed;
assert.match(saveMobileCourseProgress(storage, forged).notice ?? "", /保存失败/);
assert.equal(values.get(MOBILE_COURSE_PROGRESS_STORAGE_KEY), previous);

values.set(MOBILE_COURSE_PROGRESS_STORAGE_KEY, "invalid");
const failedInvalidRemoval = loadMobileCourseProgress(throwing("remove"));
assert.deepEqual(failedInvalidRemoval.progress, empty);
assert.match(failedInvalidRemoval.notice ?? "", /无法自动清除/);
assert.equal(values.get(MOBILE_COURSE_PROGRESS_STORAGE_KEY), "invalid");

values.set(MOBILE_COURSE_PROGRESS_STORAGE_KEY, JSON.stringify(completed));
assert.match(resetMobileCourseProgress(throwing("remove")).notice ?? "", /原有进度保持不变/);
assert.equal(values.has(MOBILE_COURSE_PROGRESS_STORAGE_KEY), true);

console.log("Mobile course progress storage tests passed.");
