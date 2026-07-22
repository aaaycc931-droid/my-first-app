import type { ActivityCheckedFactV1 } from "../activity/activityCheckedFact";
import type { LocalPracticeReviewTarget } from "../practice/localPracticeReviewQueue";

export const LOCAL_COURSE_PATH_SCHEMA_VERSION = "local-course-path-v1" as const;
export const LOCAL_COURSE_CONTENT_VERSION = "zh-foundation-2026.1" as const;
export const LOCAL_COURSE_ID = "00000000-0000-0000-0000-000000000001" as const;

export type LocalCourseLesson = {
  id: string;
  title: string;
  objective: string;
  prerequisiteLessonIds: string[];
  target: LocalPracticeReviewTarget;
  activityBinding: { activityId: string; activityVersion: "1"; contentVersion: "local-ear-training-v2"; targetId: string };
  completionFingerprint: string;
};

const lesson = (value: Omit<LocalCourseLesson, "completionFingerprint">): LocalCourseLesson => ({
  ...value,
  completionFingerprint: [LOCAL_COURSE_CONTENT_VERSION, value.id, ...value.prerequisiteLessonIds,
    value.activityBinding.activityId, value.activityBinding.activityVersion,
    value.activityBinding.contentVersion, value.activityBinding.targetId, "checked-non-scoring-v1"].join("|"),
});

export const LOCAL_CHINESE_FOUNDATION_COURSE = {
  schemaVersion: LOCAL_COURSE_PATH_SCHEMA_VERSION,
  contentVersion: LOCAL_COURSE_CONTENT_VERSION,
  id: LOCAL_COURSE_ID,
  title: "中文视唱练耳基础路径",
  objective: "依次完成单音、音程与节奏的本地核对练习，建立可继续学习的基础路径。",
  chapters: [{
    id: "zh-foundation-listening-1",
    title: "第一章：听辨基础",
    objective: "完成三项有顺序的听辨活动；完成表示已练习并查看说明，不代表通过或能力等级。",
    lessons: [
      lesson({ id: "00000000-0000-0000-0000-000000000101", title: "认识 C4", objective: "听辨并核对中央 C（C4）。", prerequisiteLessonIds: [], target: { kind: "single-pitch", difficulty: "基础", seed: 11801, sequence: 0, variantId: "pitch:c4" }, activityBinding: { activityId: "local.single-pitch.pitch:c4", activityVersion: "1", contentVersion: "local-ear-training-v2", targetId: "pitch:c4" } }),
      lesson({ id: "00000000-0000-0000-0000-000000000102", title: "上行大三度", objective: "听辨并核对从 C4 开始的上行大三度。", prerequisiteLessonIds: ["00000000-0000-0000-0000-000000000101"], target: { kind: "interval", difficulty: "基础", direction: "上行", seed: 11802, sequence: 0, variantId: "interval:c4:major-third" }, activityBinding: { activityId: "local.interval.interval:c4:major-third.上行", activityVersion: "1", contentVersion: "local-ear-training-v2", targetId: "interval:上行:major-third" } }),
      lesson({ id: "00000000-0000-0000-0000-000000000103", title: "四拍均匀", objective: "听辨并核对四拍均匀节奏。", prerequisiteLessonIds: ["00000000-0000-0000-0000-000000000102"], target: { kind: "rhythm", difficulty: "基础", seed: 11803, sequence: 0, variantId: "rhythm:even-quarters" }, activityBinding: { activityId: "local.rhythm.rhythm:even-quarters", activityVersion: "1", contentVersion: "local-ear-training-v2", targetId: "rhythm:even-quarters:bpm-84" } }),
    ],
  }],
} as const;

export const LOCAL_COURSE_LESSONS: readonly LocalCourseLesson[] = LOCAL_CHINESE_FOUNDATION_COURSE.chapters[0].lessons;

export type LocalCourseProgress = { schemaVersion: typeof LOCAL_COURSE_PATH_SCHEMA_VERSION; courseId: typeof LOCAL_COURSE_ID; contentVersion: typeof LOCAL_COURSE_CONTENT_VERSION; revision: number; completions: Array<{ lessonId: string; completionFingerprint: string }> };

export const createEmptyLocalCourseProgress = (): LocalCourseProgress => ({ schemaVersion: LOCAL_COURSE_PATH_SCHEMA_VERSION, courseId: LOCAL_COURSE_ID, contentVersion: LOCAL_COURSE_CONTENT_VERSION, revision: 0, completions: [] });
export const isLessonComplete = (progress: LocalCourseProgress, item: LocalCourseLesson) => progress.completions.some((entry) => entry.lessonId === item.id && entry.completionFingerprint === item.completionFingerprint);
export const isLessonUnlocked = (progress: LocalCourseProgress, item: LocalCourseLesson) => item.prerequisiteLessonIds.every((id) => { const prerequisite = LOCAL_COURSE_LESSONS.find((candidate) => candidate.id === id); return prerequisite ? isLessonComplete(progress, prerequisite) : false; });

export const recordLocalCourseLessonCheck = (progress: LocalCourseProgress, item: LocalCourseLesson, event: ActivityCheckedFactV1): LocalCourseProgress => {
  if (!isLessonUnlocked(progress, item)) throw new Error("课节尚未解锁。");
  const binding = item.activityBinding;
  if (event.schemaVersion !== "activity-checked-fact-v1" || event.lifecycle !== "checked" || event.assessmentMode !== "non-scoring" || !["consistent", "different", "insufficient"].includes(event.evidenceState) || event.activityId !== binding.activityId || event.activityVersion !== binding.activityVersion || event.contentVersion !== binding.contentVersion || event.targetId !== binding.targetId || !event.attemptId || !Number.isSafeInteger(event.revision) || event.revision < 1) throw new Error("活动核对证据与当前课节不一致。");
  if (isLessonComplete(progress, item)) return progress;
  return { ...progress, revision: progress.revision + 1, completions: [...progress.completions, { lessonId: item.id, completionFingerprint: item.completionFingerprint }] };
};

export const serializeLocalCourseProgress = (progress: LocalCourseProgress) => JSON.stringify(progress);
export const deserializeLocalCourseProgress = (serialized: string): LocalCourseProgress | null => {
  if (serialized.length > 8 * 1024) return null;
  try {
    const value = JSON.parse(serialized) as Partial<LocalCourseProgress> & Record<string, unknown>;
    if (Object.keys(value).sort().join("|") !== "completions|contentVersion|courseId|revision|schemaVersion") return null;
    if (value.schemaVersion !== LOCAL_COURSE_PATH_SCHEMA_VERSION || value.courseId !== LOCAL_COURSE_ID || value.contentVersion !== LOCAL_COURSE_CONTENT_VERSION || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0 || !Array.isArray(value.completions)) return null;
    const completions = value.completions.filter((entry): entry is { lessonId: string; completionFingerprint: string } => Boolean(entry && typeof entry === "object" && !Array.isArray(entry) && Object.keys(entry).sort().join("|") === "completionFingerprint|lessonId" && typeof entry.lessonId === "string" && typeof entry.completionFingerprint === "string" && LOCAL_COURSE_LESSONS.some((item) => item.id === entry.lessonId && item.completionFingerprint === entry.completionFingerprint))).map((entry) => ({ lessonId: entry.lessonId, completionFingerprint: entry.completionFingerprint }));
    if (completions.length !== value.completions.length || new Set(completions.map((entry) => entry.lessonId)).size !== completions.length) return null;
    const completedIds = new Set(completions.map((entry) => entry.lessonId));
    if (completions.some((entry) => { const item = LOCAL_COURSE_LESSONS.find((candidate) => candidate.id === entry.lessonId); return !item || item.prerequisiteLessonIds.some((id) => !completedIds.has(id)); })) return null;
    return { schemaVersion: LOCAL_COURSE_PATH_SCHEMA_VERSION, courseId: LOCAL_COURSE_ID, contentVersion: LOCAL_COURSE_CONTENT_VERSION, revision: value.revision as number, completions };
  } catch { return null; }
};
