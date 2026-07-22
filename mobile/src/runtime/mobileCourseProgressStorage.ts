import {
  LEGACY_LOCAL_COURSE_PROGRESS_SCHEMA_VERSION,
  createLocalCourseProgress,
  loadLocalCourseProgress,
  type LocalCourseProgressV1,
} from "../../../lib/learning/localCoursePath";
import type { StorageLike } from "./mobilePracticeReviewStorage";

export const MOBILE_COURSE_PROGRESS_STORAGE_KEY =
  "solfeggio.mobile.course-progress.v1";

export type MobileCourseProgressStorageResult = {
  notice: string | null;
};

export type MobileCourseProgressStorageLoadResult =
  MobileCourseProgressStorageResult & {
    progress: LocalCourseProgressV1;
  };

const unavailableNotice = "本机课程进度暂时不可用，课程练习仍可继续。";

const serializeProgress = (progress: LocalCourseProgressV1) =>
  JSON.stringify(loadLocalCourseProgress(progress));

export const loadMobileCourseProgress = (
  storage: StorageLike | null | undefined,
): MobileCourseProgressStorageLoadResult => {
  const empty = createLocalCourseProgress();
  if (!storage) return { progress: empty, notice: unavailableNotice };

  let serialized: string | null;
  try {
    serialized = storage.getItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY);
  } catch {
    return {
      progress: empty,
      notice: "本机课程进度读取失败，已从空进度继续。",
    };
  }

  if (!serialized) return { progress: empty, notice: null };

  try {
    const raw = JSON.parse(serialized) as unknown;
    const progress = loadLocalCourseProgress(raw);
    const migrated =
      typeof raw === "object"
      && raw !== null
      && !Array.isArray(raw)
      && (raw as { schemaVersion?: unknown }).schemaVersion
        === LEGACY_LOCAL_COURSE_PROGRESS_SCHEMA_VERSION;

    if (migrated) {
      try {
        storage.setItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY, serializeProgress(progress));
      } catch {
        return {
          progress,
          notice: "本机课程旧进度已恢复，但升级保存失败；本次仍可继续课程。",
        };
      }
    }

    return { progress, notice: null };
  } catch {
    try {
      storage.removeItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY);
    } catch {
      return {
        progress: empty,
        notice: "本机课程旧进度无法读取，且无法自动清除；已从空进度继续。",
      };
    }
    return {
      progress: empty,
      notice: "本机课程旧进度无效或已过期，已自动清除并从空进度继续。",
    };
  }
};

export const saveMobileCourseProgress = (
  storage: StorageLike | null | undefined,
  progress: LocalCourseProgressV1,
): MobileCourseProgressStorageResult => {
  if (!storage) return { notice: unavailableNotice };

  try {
    const serialized = serializeProgress(progress);
    storage.setItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY, serialized);
    return { notice: null };
  } catch {
    return { notice: "本机课程进度保存失败，原有进度保持不变，课程练习仍可继续。" };
  }
};

export const resetMobileCourseProgress = (
  storage: StorageLike | null | undefined,
): MobileCourseProgressStorageResult => {
  if (!storage) return { notice: unavailableNotice };

  try {
    storage.removeItem(MOBILE_COURSE_PROGRESS_STORAGE_KEY);
    return { notice: null };
  } catch {
    return { notice: "本机课程进度重置失败，原有进度保持不变。" };
  }
};
