import assert from "node:assert/strict";

import {
  LEGACY_LOCAL_COURSE_PROGRESS_SCHEMA_VERSION,
  LOCAL_CHINESE_FOUNDATION_COURSE,
  LOCAL_COURSE_CATALOG,
  completeLocalCourseLesson,
  createEmptyLocalCourseProgress,
  createLocalCourseProgress,
  deserializeLocalCourseProgress,
  getLocalCourseLessonAvailability,
  loadLocalCourseProgress,
  serializeLocalCourseProgress,
  validateLocalCourseCatalog,
  type LocalCourseCatalogV1,
} from "../lib/learning/localCoursePath";

const catalog = validateLocalCourseCatalog(LOCAL_COURSE_CATALOG);
assert.equal(catalog.courses.length, 1);
assert.equal(LOCAL_CHINESE_FOUNDATION_COURSE.locale, "zh-CN");
assert.equal(LOCAL_CHINESE_FOUNDATION_COURSE.chapters.length, 2);
assert.equal(LOCAL_CHINESE_FOUNDATION_COURSE.chapters.flatMap((chapter) => chapter.lessons).length, 4);

const lessons = LOCAL_CHINESE_FOUNDATION_COURSE.chapters.flatMap((chapter) => chapter.lessons);
const checkedResultFor = (lesson: (typeof lessons)[number]) => ({
  kind: "checked-local-course-activity-result-v1" as const,
  catalogId: LOCAL_COURSE_CATALOG.catalogId,
  catalogVersion: LOCAL_COURSE_CATALOG.catalogVersion,
  courseId: LOCAL_CHINESE_FOUNDATION_COURSE.courseId,
  courseVersion: LOCAL_CHINESE_FOUNDATION_COURSE.courseVersion,
  lessonId: lesson.lessonId,
  activityMappingId: lesson.activityMappings[0]!.activityMappingId,
  activityFamily: lesson.activityMappings[0]!.activityFamily,
});
for (const lesson of lessons) {
  assert.match(lesson.lessonId, /\.v1$/);
  assert.equal(lesson.completion.kind, "checked-activity-result-v1");
  assert.equal(lesson.completion.assessmentMode, "non-scoring");
  for (const objective of lesson.objectives) assert.match(objective.objectiveId, /\.v1$/);
  for (const mapping of lesson.activityMappings) {
    assert.match(mapping.activityMappingId, /\.v1$/);
    assert.ok(["pitch", "interval", "rhythm", "melody"].includes(mapping.mobileScreen));
  }
}
assert.deepEqual(
  lessons.map((lesson) => lesson.activityMappings[0]?.activityFamily),
  ["pitch-relation", "interval", "rhythm-dictation", "melody-dictation"],
);

let progress = createLocalCourseProgress();
assert.deepEqual(createEmptyLocalCourseProgress(), progress);
assert.deepEqual(progress.completedLessonIds, []);
assert.equal(getLocalCourseLessonAvailability(progress, lessons[0]!.lessonId), "available");
assert.equal(getLocalCourseLessonAvailability(progress, lessons[1]!.lessonId), "locked");
assert.throws(() => completeLocalCourseLesson(progress, checkedResultFor(lessons[1]!)), /课程顺序/);
assert.throws(() => completeLocalCourseLesson(progress, { ...checkedResultFor(lessons[0]!), activityFamily: "interval" }), /活动映射不匹配/);

progress = completeLocalCourseLesson(progress, checkedResultFor(lessons[0]!));
assert.equal(progress.revision, 1);
assert.equal(getLocalCourseLessonAvailability(progress, lessons[0]!.lessonId), "completed");
assert.equal(getLocalCourseLessonAvailability(progress, lessons[1]!.lessonId), "available");
assert.deepEqual(completeLocalCourseLesson(progress, checkedResultFor(lessons[0]!)), progress, "重复核对结果必须幂等");
assert.throws(() => completeLocalCourseLesson(progress, { ...checkedResultFor(lessons[0]!), activityFamily: "interval" }), /活动映射不匹配/);
assert.throws(() => completeLocalCourseLesson(progress, { ...checkedResultFor(lessons[0]!), activityMappingId: lessons[1]!.activityMappings[0]!.activityMappingId }), /活动映射不匹配/);
assert.throws(() => completeLocalCourseLesson(progress, { ...checkedResultFor(lessons[0]!), courseVersion: "v99" }), /版本不匹配/);

const legacy = {
  schemaVersion: LEGACY_LOCAL_COURSE_PROGRESS_SCHEMA_VERSION,
  courseId: LOCAL_CHINESE_FOUNDATION_COURSE.courseId,
  completedLessonIds: [lessons[0]!.lessonId],
};
const migrated = loadLocalCourseProgress(legacy);
assert.equal(migrated.schemaVersion, "local-course-progress-v1");
assert.equal(migrated.catalogId, LOCAL_COURSE_CATALOG.catalogId);
assert.deepEqual(migrated.completedLessonIds, legacy.completedLessonIds);
assert.deepEqual(deserializeLocalCourseProgress(null), null);
assert.deepEqual(deserializeLocalCourseProgress(serializeLocalCourseProgress(progress)), { progress, migrated: false });
assert.deepEqual(deserializeLocalCourseProgress(JSON.stringify(legacy)), { progress: migrated, migrated: true });
assert.throws(() => deserializeLocalCourseProgress(""), /文本无效/);
assert.throws(() => deserializeLocalCourseProgress("{"), /有效 JSON/);

assert.throws(() => loadLocalCourseProgress({ ...progress, schemaVersion: "local-course-progress-v99" }), /不支持/);
assert.throws(() => loadLocalCourseProgress({ ...progress, unexpected: true }), /未知字段/);
assert.throws(() => loadLocalCourseProgress({ ...progress, catalogVersion: "v99" }), /不能静默套用/);
assert.throws(() => loadLocalCourseProgress({ ...progress, completedLessonIds: [lessons[1]!.lessonId] }), /不能跳课/);
assert.throws(() => loadLocalCourseProgress({ ...progress, completedLessonIds: [lessons[0]!.lessonId, lessons[0]!.lessonId] }), /重复/);
assert.throws(() => loadLocalCourseProgress({ ...progress, completedLessonIds: Array.from({ length: 129 }, (_, index) => `lesson.fake.${index}.v1`) }), /无效/);
assert.throws(() => getLocalCourseLessonAvailability(progress, "lesson.unknown.v1"), /未知课节/);

const cloneCatalog = (): LocalCourseCatalogV1 => structuredClone(LOCAL_COURSE_CATALOG);

const duplicateId = cloneCatalog();
duplicateId.courses[0]!.chapters[1]!.lessons[0]!.lessonId = duplicateId.courses[0]!.chapters[0]!.lessons[0]!.lessonId;
assert.throws(() => validateLocalCourseCatalog(duplicateId), /重复标识/);

const invalidReference = cloneCatalog();
invalidReference.courses[0]!.chapters[0]!.lessons[0]!.activityMappings[0]!.objectiveIds = ["objective.unknown.v1"];
assert.throws(() => validateLocalCourseCatalog(invalidReference), /未知目标/);

const invalidScreen = cloneCatalog();
invalidScreen.courses[0]!.chapters[0]!.lessons[0]!.activityMappings[0]!.mobileScreen = "piano" as "pitch";
assert.throws(() => validateLocalCourseCatalog(invalidScreen), /未知移动端入口/);

const invalidFamily = cloneCatalog();
invalidFamily.courses[0]!.chapters[0]!.lessons[0]!.activityMappings[0]!.activityFamily = "scored-exam" as "interval";
assert.throws(() => validateLocalCourseCatalog(invalidFamily), /未知活动族/);

const mismatchedRoute = cloneCatalog();
mismatchedRoute.courses[0]!.chapters[0]!.lessons[0]!.activityMappings[0]!.activityFamily = "melody-dictation";
assert.throws(() => validateLocalCourseCatalog(mismatchedRoute), /入口不匹配/);

const invalidOrder = cloneCatalog();
invalidOrder.courses[0]!.chapters[1]!.order = 4;
assert.throws(() => validateLocalCourseCatalog(invalidOrder), /连续排序/);

const scoringCompletion = cloneCatalog();
scoringCompletion.courses[0]!.chapters[0]!.lessons[0]!.completion.assessmentMode = "scored" as "non-scoring";
assert.throws(() => validateLocalCourseCatalog(scoringCompletion), /已核对的非评分/);

const invalidCompletionReference = cloneCatalog();
invalidCompletionReference.courses[0]!.chapters[0]!.lessons[0]!.completion.requiredActivityMappingId = "mapping.unknown.v1";
assert.throws(() => validateLocalCourseCatalog(invalidCompletionReference), /完成条件引用了未知/);

const unknownCatalogField = structuredClone(LOCAL_COURSE_CATALOG) as LocalCourseCatalogV1 & { userId?: string };
unknownCatalogField.userId = "must-not-be-stored";
assert.throws(() => validateLocalCourseCatalog(unknownCatalogField), /未知字段/);

const oversized = { ...progress, completedLessonIds: ["x".repeat(17 * 1024)] };
assert.throws(() => loadLocalCourseProgress(oversized), /大小限制/);

console.log("P118a local course path focused tests passed.");
