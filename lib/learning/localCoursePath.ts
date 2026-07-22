import { ACTIVITY_FAMILIES, type ActivityFamily } from "../activity/activityDefinition";

export const LOCAL_COURSE_CATALOG_SCHEMA_VERSION = "local-course-catalog-v1" as const;
export const LOCAL_COURSE_PROGRESS_SCHEMA_VERSION = "local-course-progress-v1" as const;
export const LEGACY_LOCAL_COURSE_PROGRESS_SCHEMA_VERSION = "local-course-progress-v0" as const;

export const LOCAL_COURSE_MOBILE_SCREENS = ["pitch", "interval", "rhythm", "melody"] as const;
export type LocalCourseMobileScreen = (typeof LOCAL_COURSE_MOBILE_SCREENS)[number];

const LOCAL_COURSE_ACTIVITY_ROUTES: Record<LocalCourseMobileScreen, readonly ActivityFamily[]> = {
  pitch: ["pitch-relation"],
  interval: ["interval"],
  rhythm: ["rhythm-dictation"],
  melody: ["melody-dictation"],
};

export type LocalCourseActivityMappingV1 = {
  activityMappingId: string;
  objectiveIds: string[];
  mobileScreen: LocalCourseMobileScreen;
  activityFamily: ActivityFamily;
};

export type LocalCourseLessonV1 = {
  lessonId: string;
  order: number;
  title: string;
  summary: string;
  objectives: Array<{ objectiveId: string; description: string }>;
  activityMappings: LocalCourseActivityMappingV1[];
  completion: {
    kind: "checked-activity-result-v1";
    assessmentMode: "non-scoring";
    requiredActivityMappingId: string;
  };
};

export type LocalCourseChapterV1 = {
  chapterId: string;
  order: number;
  title: string;
  lessons: LocalCourseLessonV1[];
};

export type LocalCourseV1 = {
  courseId: string;
  courseVersion: string;
  locale: "zh-CN";
  title: string;
  summary: string;
  chapters: LocalCourseChapterV1[];
};

export type LocalCourseCatalogV1 = {
  schemaVersion: typeof LOCAL_COURSE_CATALOG_SCHEMA_VERSION;
  catalogId: string;
  catalogVersion: string;
  courses: LocalCourseV1[];
};

export type LocalCourseProgressV1 = {
  schemaVersion: typeof LOCAL_COURSE_PROGRESS_SCHEMA_VERSION;
  catalogId: string;
  catalogVersion: string;
  courseId: string;
  courseVersion: string;
  revision: number;
  completedLessonIds: string[];
};

export type CheckedLocalCourseActivityResultV1 = {
  kind: "checked-local-course-activity-result-v1";
  catalogId: string;
  catalogVersion: string;
  courseId: string;
  courseVersion: string;
  lessonId: string;
  activityMappingId: string;
  activityFamily: ActivityFamily;
};

type LegacyLocalCourseProgressV0 = {
  schemaVersion: typeof LEGACY_LOCAL_COURSE_PROGRESS_SCHEMA_VERSION;
  courseId: string;
  completedLessonIds: string[];
};

export type LocalCourseLessonAvailability = "locked" | "available" | "completed";

const MAX_CATALOG_BYTES = 64 * 1024;
const MAX_PROGRESS_BYTES = 16 * 1024;
const MAX_COURSES = 8;
const MAX_CHAPTERS_PER_COURSE = 32;
const MAX_LESSONS_PER_COURSE = 128;
const MAX_OBJECTIVES_PER_LESSON = 8;
const MAX_MAPPINGS_PER_LESSON = 8;
const MAX_TEXT_LENGTH = 512;
const VERSIONED_ID = /^(catalog|course|chapter|lesson|objective|mapping)\.[a-z0-9]+(?:[.-][a-z0-9]+)*\.v[1-9]\d*$/;
const VERSION = /^v[1-9]\d*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertExactKeys = (value: Record<string, unknown>, keys: string[], label: string) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} 字段不完整或包含未知字段。`);
  }
};

const assertRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!isRecord(value)) throw new Error(`${label} 必须是对象。`);
  return value;
};

function assertText(value: unknown, label: string, max = MAX_TEXT_LENGTH): asserts value is string {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0 || value.length > max) {
    throw new Error(`${label} 必须是非空且长度受限的文本。`);
  }
}

function assertVersionedId(value: unknown, prefix: string, label: string): asserts value is string {
  assertText(value, label, 160);
  if (!VERSIONED_ID.test(value) || !value.startsWith(`${prefix}.`)) {
    throw new Error(`${label} 必须是带版本的稳定 ${prefix} 标识。`);
  }
}

function assertVersion(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !VERSION.test(value)) throw new Error(`${label} 必须是稳定版本号。`);
}

const assertJsonSize = (value: unknown, maxBytes: number, label: string) => {
  let json: string;
  try {
    json = JSON.stringify(value);
  } catch {
    throw new Error(`${label} 无法序列化。`);
  }
  if (new TextEncoder().encode(json).byteLength > maxBytes) throw new Error(`${label} 超出大小限制。`);
};

const assertUnique = (ids: string[], label: string) => {
  if (new Set(ids).size !== ids.length) throw new Error(`${label} 包含重复标识。`);
};

const assertContiguousOrder = (items: Array<{ order: number }>, label: string) => {
  if (items.some((item, index) => !Number.isInteger(item.order) || item.order !== index)) {
    throw new Error(`${label} 必须从 0 开始连续排序。`);
  }
};

export const LOCAL_CHINESE_FOUNDATION_COURSE: LocalCourseV1 = {
  courseId: "course.zh-cn.music-foundation.v1",
  courseVersion: "v1",
  locale: "zh-CN",
  title: "中文视唱练耳入门",
  summary: "从单音与音程开始，进入节奏和旋律听写。完成只表示已核对一次匹配的非评分活动结果，不代表成绩或能力等级。",
  chapters: [
    {
      chapterId: "chapter.zh-cn.music-foundation.pitch.v1",
      order: 0,
      title: "第一章：听清音高关系",
      lessons: [
        {
          lessonId: "lesson.zh-cn.music-foundation.single-pitch.v1",
          order: 0,
          title: "认识单音",
          summary: "使用本地单音听辨入口熟悉音名。",
          objectives: [{ objectiveId: "objective.zh-cn.music-foundation.single-pitch-identify.v1", description: "能按流程完成一次非评分单音听辨练习。" }],
          activityMappings: [{ activityMappingId: "mapping.zh-cn.music-foundation.single-pitch.v1", objectiveIds: ["objective.zh-cn.music-foundation.single-pitch-identify.v1"], mobileScreen: "pitch", activityFamily: "pitch-relation" }],
          completion: { kind: "checked-activity-result-v1", assessmentMode: "non-scoring", requiredActivityMappingId: "mapping.zh-cn.music-foundation.single-pitch.v1" },
        },
        {
          lessonId: "lesson.zh-cn.music-foundation.interval.v1",
          order: 1,
          title: "比较两个音",
          summary: "使用本地音程听辨入口认识两个音之间的关系。",
          objectives: [{ objectiveId: "objective.zh-cn.music-foundation.interval-identify.v1", description: "能按流程完成一次非评分音程听辨练习。" }],
          activityMappings: [{ activityMappingId: "mapping.zh-cn.music-foundation.interval.v1", objectiveIds: ["objective.zh-cn.music-foundation.interval-identify.v1"], mobileScreen: "interval", activityFamily: "interval" }],
          completion: { kind: "checked-activity-result-v1", assessmentMode: "non-scoring", requiredActivityMappingId: "mapping.zh-cn.music-foundation.interval.v1" },
        },
      ],
    },
    {
      chapterId: "chapter.zh-cn.music-foundation.rhythm-melody.v1",
      order: 1,
      title: "第二章：进入节奏与旋律",
      lessons: [
        {
          lessonId: "lesson.zh-cn.music-foundation.rhythm.v1",
          order: 0,
          title: "听辨四拍节奏",
          summary: "使用本地节奏入口完成一次四拍节奏练习。",
          objectives: [{ objectiveId: "objective.zh-cn.music-foundation.rhythm-identify.v1", description: "能按流程完成一次非评分节奏听辨练习。" }],
          activityMappings: [{ activityMappingId: "mapping.zh-cn.music-foundation.rhythm.v1", objectiveIds: ["objective.zh-cn.music-foundation.rhythm-identify.v1"], mobileScreen: "rhythm", activityFamily: "rhythm-dictation" }],
          completion: { kind: "checked-activity-result-v1", assessmentMode: "non-scoring", requiredActivityMappingId: "mapping.zh-cn.music-foundation.rhythm.v1" },
        },
        {
          lessonId: "lesson.zh-cn.music-foundation.melody-dictation.v1",
          order: 1,
          title: "三音旋律听写",
          summary: "使用本地旋律入口完成一次三音旋律听写。",
          objectives: [{ objectiveId: "objective.zh-cn.music-foundation.melody-order.v1", description: "能按流程完成一次非评分三音旋律听写。" }],
          activityMappings: [{ activityMappingId: "mapping.zh-cn.music-foundation.melody-dictation.v1", objectiveIds: ["objective.zh-cn.music-foundation.melody-order.v1"], mobileScreen: "melody", activityFamily: "melody-dictation" }],
          completion: { kind: "checked-activity-result-v1", assessmentMode: "non-scoring", requiredActivityMappingId: "mapping.zh-cn.music-foundation.melody-dictation.v1" },
        },
      ],
    },
  ],
};

export const LOCAL_COURSE_CATALOG: LocalCourseCatalogV1 = {
  schemaVersion: LOCAL_COURSE_CATALOG_SCHEMA_VERSION,
  catalogId: "catalog.zh-cn.local-course-path.v1",
  catalogVersion: "v1",
  courses: [LOCAL_CHINESE_FOUNDATION_COURSE],
};

export const validateLocalCourseCatalog = (catalog: unknown): LocalCourseCatalogV1 => {
  assertJsonSize(catalog, MAX_CATALOG_BYTES, "本地课程目录");
  const root = assertRecord(catalog, "本地课程目录");
  assertExactKeys(root, ["schemaVersion", "catalogId", "catalogVersion", "courses"], "本地课程目录");
  if (root.schemaVersion !== LOCAL_COURSE_CATALOG_SCHEMA_VERSION) throw new Error("不支持的本地课程目录版本。");
  assertVersionedId(root.catalogId, "catalog", "目录标识");
  assertVersion(root.catalogVersion, "目录内容版本");
  if (!Array.isArray(root.courses) || root.courses.length === 0 || root.courses.length > MAX_COURSES) throw new Error("本地课程数量无效。");

  const allIds: string[] = [root.catalogId];
  for (let courseIndex = 0; courseIndex < root.courses.length; courseIndex += 1) {
    const rawCourse = root.courses[courseIndex];
    const course = assertRecord(rawCourse, `课程 ${courseIndex + 1}`);
    assertExactKeys(course, ["courseId", "courseVersion", "locale", "title", "summary", "chapters"], "课程");
    assertVersionedId(course.courseId, "course", "课程标识");
    assertVersion(course.courseVersion, "课程版本");
    if (course.locale !== "zh-CN") throw new Error("当前本地课程只接受 zh-CN 内容。");
    assertText(course.title, "课程标题");
    assertText(course.summary, "课程说明");
    if (!Array.isArray(course.chapters) || course.chapters.length < 2 || course.chapters.length > MAX_CHAPTERS_PER_COURSE) throw new Error("课程章节数量无效。");
    assertContiguousOrder(course.chapters as Array<{ order: number }>, "课程章节");
    allIds.push(course.courseId);
    let lessonCount = 0;

    for (const rawChapter of course.chapters) {
      const chapter = assertRecord(rawChapter, "课程章节");
      assertExactKeys(chapter, ["chapterId", "order", "title", "lessons"], "课程章节");
      assertVersionedId(chapter.chapterId, "chapter", "章节标识");
      assertText(chapter.title, "章节标题");
      if (!Array.isArray(chapter.lessons) || chapter.lessons.length === 0) throw new Error("章节必须包含课节。");
      assertContiguousOrder(chapter.lessons as Array<{ order: number }>, "章节课节");
      lessonCount += chapter.lessons.length;
      if (lessonCount > MAX_LESSONS_PER_COURSE) throw new Error("课程课节数量超出限制。");
      allIds.push(chapter.chapterId);

      for (const rawLesson of chapter.lessons) {
        const lesson = assertRecord(rawLesson, "课程课节");
        assertExactKeys(lesson, ["lessonId", "order", "title", "summary", "objectives", "activityMappings", "completion"], "课程课节");
        assertVersionedId(lesson.lessonId, "lesson", "课节标识");
        assertText(lesson.title, "课节标题");
        assertText(lesson.summary, "课节说明");
        if (!Array.isArray(lesson.objectives) || lesson.objectives.length === 0 || lesson.objectives.length > MAX_OBJECTIVES_PER_LESSON) throw new Error("课节目标数量无效。");
        if (!Array.isArray(lesson.activityMappings) || lesson.activityMappings.length === 0 || lesson.activityMappings.length > MAX_MAPPINGS_PER_LESSON) throw new Error("课节活动映射数量无效。");
        allIds.push(lesson.lessonId);
        const objectiveIds: string[] = [];
        for (const rawObjective of lesson.objectives) {
          const objective = assertRecord(rawObjective, "课节目标");
          assertExactKeys(objective, ["objectiveId", "description"], "课节目标");
          assertVersionedId(objective.objectiveId, "objective", "目标标识");
          assertText(objective.description, "目标说明");
          objectiveIds.push(objective.objectiveId);
          allIds.push(objective.objectiveId);
        }
        assertUnique(objectiveIds, "课节目标");

        const mappingIds: string[] = [];
        for (const rawMapping of lesson.activityMappings) {
          const mapping = assertRecord(rawMapping, "活动映射");
          assertExactKeys(mapping, ["activityMappingId", "objectiveIds", "mobileScreen", "activityFamily"], "活动映射");
          assertVersionedId(mapping.activityMappingId, "mapping", "活动映射标识");
          if (!Array.isArray(mapping.objectiveIds) || mapping.objectiveIds.length === 0 || mapping.objectiveIds.some((id) => typeof id !== "string" || !objectiveIds.includes(id))) throw new Error("活动映射引用了未知目标。");
          assertUnique(mapping.objectiveIds as string[], "活动映射目标引用");
          if (!LOCAL_COURSE_MOBILE_SCREENS.includes(mapping.mobileScreen as LocalCourseMobileScreen)) throw new Error("活动映射引用了未知移动端入口。");
          if (!ACTIVITY_FAMILIES.includes(mapping.activityFamily as ActivityFamily)) throw new Error("活动映射引用了未知活动族。");
          if (!LOCAL_COURSE_ACTIVITY_ROUTES[mapping.mobileScreen as LocalCourseMobileScreen].includes(mapping.activityFamily as ActivityFamily)) throw new Error("活动族与移动端入口不匹配。");
          mappingIds.push(mapping.activityMappingId);
          allIds.push(mapping.activityMappingId);
        }
        assertUnique(mappingIds, "课节活动映射");

        const completion = assertRecord(lesson.completion, "课节完成条件");
        assertExactKeys(completion, ["kind", "assessmentMode", "requiredActivityMappingId"], "课节完成条件");
        if (completion.kind !== "checked-activity-result-v1" || completion.assessmentMode !== "non-scoring") throw new Error("课节只能通过已核对的非评分活动结果完成。");
        if (typeof completion.requiredActivityMappingId !== "string" || !mappingIds.includes(completion.requiredActivityMappingId)) throw new Error("课节完成条件引用了未知活动映射。");
      }
    }
  }
  assertUnique(allIds, "课程目录");
  return catalog as LocalCourseCatalogV1;
};

const findCourse = (catalog: LocalCourseCatalogV1, courseId: string) => {
  const course = catalog.courses.find((candidate) => candidate.courseId === courseId);
  if (!course) throw new Error("课程进度引用了未知课程。");
  return course;
};

const orderedLessons = (course: LocalCourseV1) => course.chapters.flatMap((chapter) => chapter.lessons);

const validateCompletedLessonIds = (course: LocalCourseV1, completedLessonIds: unknown): string[] => {
  if (!Array.isArray(completedLessonIds) || completedLessonIds.length > MAX_LESSONS_PER_COURSE || completedLessonIds.some((id) => typeof id !== "string")) throw new Error("已完成课节列表无效。");
  const ids = completedLessonIds as string[];
  assertUnique(ids, "已完成课节列表");
  const lessons = orderedLessons(course);
  if (ids.some((id, index) => lessons[index]?.lessonId !== id)) throw new Error("已完成课节必须是课程开头的连续顺序，不能跳课或引用旧内容。");
  return ids;
};

export const createEmptyLocalCourseProgress = (
  courseId = LOCAL_CHINESE_FOUNDATION_COURSE.courseId,
  catalog: LocalCourseCatalogV1 = LOCAL_COURSE_CATALOG,
): LocalCourseProgressV1 => {
  validateLocalCourseCatalog(catalog);
  const course = findCourse(catalog, courseId);
  return { schemaVersion: LOCAL_COURSE_PROGRESS_SCHEMA_VERSION, catalogId: catalog.catalogId, catalogVersion: catalog.catalogVersion, courseId: course.courseId, courseVersion: course.courseVersion, revision: 0, completedLessonIds: [] };
};

/** @deprecated Prefer createEmptyLocalCourseProgress for storage-facing code. */
export const createLocalCourseProgress = createEmptyLocalCourseProgress;

export const loadLocalCourseProgress = (
  value: unknown,
  catalog: LocalCourseCatalogV1 = LOCAL_COURSE_CATALOG,
): LocalCourseProgressV1 => {
  validateLocalCourseCatalog(catalog);
  assertJsonSize(value, MAX_PROGRESS_BYTES, "本地课程进度");
  const progress = assertRecord(value, "本地课程进度");
  if (progress.schemaVersion === LEGACY_LOCAL_COURSE_PROGRESS_SCHEMA_VERSION) {
    assertExactKeys(progress, ["schemaVersion", "courseId", "completedLessonIds"], "旧版本地课程进度");
    assertText(progress.courseId, "旧版课程标识", 160);
    const course = findCourse(catalog, progress.courseId);
    const completedLessonIds = validateCompletedLessonIds(course, progress.completedLessonIds);
    return { schemaVersion: LOCAL_COURSE_PROGRESS_SCHEMA_VERSION, catalogId: catalog.catalogId, catalogVersion: catalog.catalogVersion, courseId: course.courseId, courseVersion: course.courseVersion, revision: 0, completedLessonIds: [...completedLessonIds] };
  }
  if (progress.schemaVersion !== LOCAL_COURSE_PROGRESS_SCHEMA_VERSION) throw new Error("不支持的本地课程进度版本。");
  assertExactKeys(progress, ["schemaVersion", "catalogId", "catalogVersion", "courseId", "courseVersion", "revision", "completedLessonIds"], "本地课程进度");
  if (progress.catalogId !== catalog.catalogId || progress.catalogVersion !== catalog.catalogVersion) throw new Error("课程目录版本已变化，旧进度不能静默套用。");
  assertText(progress.courseId, "课程标识", 160);
  const course = findCourse(catalog, progress.courseId);
  if (progress.courseVersion !== course.courseVersion) throw new Error("课程内容版本已变化，旧进度不能静默套用。");
  if (!Number.isSafeInteger(progress.revision) || (progress.revision as number) < 0) throw new Error("课程进度修订号无效。");
  const completedLessonIds = validateCompletedLessonIds(course, progress.completedLessonIds);
  return { schemaVersion: LOCAL_COURSE_PROGRESS_SCHEMA_VERSION, catalogId: catalog.catalogId, catalogVersion: catalog.catalogVersion, courseId: course.courseId, courseVersion: course.courseVersion, revision: progress.revision as number, completedLessonIds: [...completedLessonIds] };
};

export const serializeLocalCourseProgress = (
  progressValue: unknown,
  catalog: LocalCourseCatalogV1 = LOCAL_COURSE_CATALOG,
): string => JSON.stringify(loadLocalCourseProgress(progressValue, catalog));

export const deserializeLocalCourseProgress = (
  serialized: string | null,
  catalog: LocalCourseCatalogV1 = LOCAL_COURSE_CATALOG,
): { progress: LocalCourseProgressV1; migrated: boolean } | null => {
  if (serialized === null) return null;
  if (typeof serialized !== "string" || serialized.length === 0) throw new Error("本地课程进度文本无效。");
  if (new TextEncoder().encode(serialized).byteLength > MAX_PROGRESS_BYTES) throw new Error("本地课程进度超出大小限制。");
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("本地课程进度不是有效 JSON。");
  }
  const rawSchemaVersion = isRecord(parsed) ? parsed.schemaVersion : null;
  return {
    progress: loadLocalCourseProgress(parsed, catalog),
    migrated: rawSchemaVersion === LEGACY_LOCAL_COURSE_PROGRESS_SCHEMA_VERSION,
  };
};

export const getLocalCourseLessonAvailability = (
  progressValue: unknown,
  lessonId: string,
  catalog: LocalCourseCatalogV1 = LOCAL_COURSE_CATALOG,
): LocalCourseLessonAvailability => {
  const progress = loadLocalCourseProgress(progressValue, catalog);
  const lessons = orderedLessons(findCourse(catalog, progress.courseId));
  const lessonIndex = lessons.findIndex((lesson) => lesson.lessonId === lessonId);
  if (lessonIndex < 0) throw new Error("无法查询未知课节的解锁状态。");
  if (lessonIndex < progress.completedLessonIds.length) return "completed";
  return lessonIndex === progress.completedLessonIds.length ? "available" : "locked";
};

export const completeLocalCourseLesson = (
  progressValue: unknown,
  checkedResult: CheckedLocalCourseActivityResultV1,
  catalog: LocalCourseCatalogV1 = LOCAL_COURSE_CATALOG,
): LocalCourseProgressV1 => {
  const progress = loadLocalCourseProgress(progressValue, catalog);
  if (
    checkedResult.kind !== "checked-local-course-activity-result-v1"
    || checkedResult.catalogId !== progress.catalogId
    || checkedResult.catalogVersion !== progress.catalogVersion
    || checkedResult.courseId !== progress.courseId
    || checkedResult.courseVersion !== progress.courseVersion
  ) throw new Error("核对结果与当前课程或内容版本不匹配。");
  const availability = getLocalCourseLessonAvailability(progress, checkedResult.lessonId, catalog);
  if (availability === "locked") throw new Error("请按课程顺序完成前面的课节。");
  const lesson = orderedLessons(findCourse(catalog, progress.courseId)).find((candidate) => candidate.lessonId === checkedResult.lessonId)!;
  const requiredMapping = lesson.activityMappings.find((mapping) => mapping.activityMappingId === lesson.completion.requiredActivityMappingId)!;
  if (
    checkedResult.activityMappingId !== requiredMapping.activityMappingId
    || checkedResult.activityFamily !== requiredMapping.activityFamily
  ) throw new Error("核对结果与当前课节要求的活动映射不匹配。");
  if (availability === "completed") return progress;
  return { ...progress, revision: progress.revision + 1, completedLessonIds: [...progress.completedLessonIds, checkedResult.lessonId] };
};

validateLocalCourseCatalog(LOCAL_COURSE_CATALOG);
