import {
  createEmptyLocalLearningHistory,
  deserializeLocalLearningHistory,
  serializeLocalLearningHistory,
  type LocalLearningHistory,
} from "../../../lib/learning/learningEventProfile";
import type { StorageLike } from "./mobilePracticeReviewStorage";

export const MOBILE_LEARNING_PROFILE_STORAGE_KEY =
  "solfeggio.mobile.learning-profile.v1";

export type MobileLearningProfileStorageResult = { notice: string | null };
export type MobileLearningProfileStorageLoadResult = MobileLearningProfileStorageResult & {
  history: LocalLearningHistory;
};

const unavailableNotice = "本机学习画像暂时不可用，本次练习仍可继续。";

export const loadMobileLearningHistory = (
  storage: StorageLike | null | undefined,
): MobileLearningProfileStorageLoadResult => {
  if (!storage) return { history: createEmptyLocalLearningHistory(false), notice: unavailableNotice };
  try {
    const serialized = storage.getItem(MOBILE_LEARNING_PROFILE_STORAGE_KEY);
    if (!serialized) return { history: createEmptyLocalLearningHistory(), notice: null };
    const history = deserializeLocalLearningHistory(serialized);
    if (history) return { history, notice: null };
    const recoveredHistory = createEmptyLocalLearningHistory(false);
    storage.setItem(
      MOBILE_LEARNING_PROFILE_STORAGE_KEY,
      serializeLocalLearningHistory(recoveredHistory),
    );
    return {
      history: recoveredHistory,
      notice: "本机学习画像旧记录无法读取，已恢复为空记录并关闭复练建议。",
    };
  } catch {
    return {
      history: createEmptyLocalLearningHistory(false),
      notice: "本机学习画像读取失败，已从空记录继续。",
    };
  }
};

export const saveMobileLearningHistory = (
  storage: StorageLike | null | undefined,
  history: LocalLearningHistory,
): MobileLearningProfileStorageResult => {
  if (!storage) return { notice: unavailableNotice };
  try {
    storage.setItem(MOBILE_LEARNING_PROFILE_STORAGE_KEY, serializeLocalLearningHistory(history));
    return { notice: null };
  } catch {
    return { notice: "本机学习画像保存失败，本次练习仍可继续。" };
  }
};

export const clearMobileLearningHistory = (
  storage: StorageLike | null | undefined,
): MobileLearningProfileStorageResult => {
  if (!storage) return { notice: unavailableNotice };
  try {
    storage.removeItem(MOBILE_LEARNING_PROFILE_STORAGE_KEY);
    return { notice: null };
  } catch {
    return { notice: "本机学习画像清除失败，本次练习仍可继续。" };
  }
};
