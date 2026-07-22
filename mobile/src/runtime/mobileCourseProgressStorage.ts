import { createEmptyLocalCourseProgress, deserializeLocalCourseProgress, serializeLocalCourseProgress, type LocalCourseProgress } from "../../../lib/learning/localCoursePath";
import type { StorageLike } from "./mobilePracticeReviewStorage";

export const MOBILE_COURSE_PROGRESS_STORAGE_KEY = "solfeggio.mobile.course-progress.v1";
export const loadMobileCourseProgress = (storage: StorageLike | null | undefined): { progress: LocalCourseProgress; notice: string | null } => {
  if (!storage) return { progress: createEmptyLocalCourseProgress(), notice: "本机课程进度暂时不可用，本次练习仍可继续，但不会标记为已保存。" };
  try { const raw = storage.getItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY); if (!raw) return { progress: createEmptyLocalCourseProgress(), notice: null }; const progress = deserializeLocalCourseProgress(raw); if (progress) return { progress, notice: null }; storage.removeItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY); return { progress: createEmptyLocalCourseProgress(), notice: "旧版或无效课程进度已安全清除。" }; } catch { return { progress: createEmptyLocalCourseProgress(), notice: "本机课程进度读取失败，已从空进度继续。" }; }
};
export const saveMobileCourseProgress = (storage: StorageLike | null | undefined, progress: LocalCourseProgress) => { if (!storage) return { notice: "本机课程进度暂时不可用，本次练习仍可继续，但不会标记为已保存。" }; try { storage.setItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY, serializeLocalCourseProgress(progress)); return { notice: null }; } catch { return { notice: "本机课程进度保存失败，本次练习仍可继续，但不会标记为已保存。" }; } };
export const clearMobileCourseProgress = (storage: StorageLike | null | undefined) => { if (!storage) return { notice: "本机课程进度暂时不可用。" }; try { storage.removeItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY); return { notice: null }; } catch { return { notice: "本机课程进度清除失败。" }; } };
