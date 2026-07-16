import {
  createEmptyLocalPracticeReviewQueue,
  deserializeLocalPracticeReviewQueue,
  serializeLocalPracticeReviewQueue,
  type LocalPracticeReviewQueue,
} from "../../../lib/practice/localPracticeReviewQueue";

export const MOBILE_PRACTICE_REVIEW_STORAGE_KEY =
  "solfeggio.mobile.practice-review-queue.v1";

export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export type MobilePracticeReviewStorageResult = {
  notice: string | null;
};

export type MobilePracticeReviewStorageLoadResult =
  MobilePracticeReviewStorageResult & {
    queue: LocalPracticeReviewQueue;
  };

const unavailableNotice = "本机复练记录暂时不可用，本次练习仍可继续。";

export const getBrowserPracticeReviewStorage = (): StorageLike | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const loadMobilePracticeReviewQueue = (
  storage: StorageLike | null | undefined,
): MobilePracticeReviewStorageLoadResult => {
  if (!storage) {
    return {
      queue: createEmptyLocalPracticeReviewQueue(),
      notice: unavailableNotice,
    };
  }

  try {
    const serialized = storage.getItem(MOBILE_PRACTICE_REVIEW_STORAGE_KEY);

    if (!serialized) {
      return {
        queue: createEmptyLocalPracticeReviewQueue(),
        notice: null,
      };
    }

    const parsed = deserializeLocalPracticeReviewQueue(serialized);
    if (!parsed) {
      try {
        storage.removeItem(MOBILE_PRACTICE_REVIEW_STORAGE_KEY);
      } catch {
        return {
          queue: createEmptyLocalPracticeReviewQueue(),
          notice: "本机复练记录读取失败，且无法自动清除；本次练习仍可继续。",
        };
      }
      return {
        queue: createEmptyLocalPracticeReviewQueue(),
        notice: "本机复练旧记录无法读取，已自动清除并从空记录继续。",
      };
    }

    if (parsed.migrated) {
      try {
        storage.setItem(
          MOBILE_PRACTICE_REVIEW_STORAGE_KEY,
          serializeLocalPracticeReviewQueue(parsed.queue),
        );
      } catch {
        return {
          queue: parsed.queue,
          notice: "本机复练旧记录已恢复，但升级保存失败；本次仍可继续复练。",
        };
      }
    }

    return { queue: parsed.queue, notice: null };
  } catch {
    return {
      queue: createEmptyLocalPracticeReviewQueue(),
      notice: "本机复练记录读取失败，已从空记录继续。",
    };
  }
};

export const saveMobilePracticeReviewQueue = (
  storage: StorageLike | null | undefined,
  queue: LocalPracticeReviewQueue,
): MobilePracticeReviewStorageResult => {
  if (!storage) {
    return { notice: unavailableNotice };
  }

  try {
    storage.setItem(
      MOBILE_PRACTICE_REVIEW_STORAGE_KEY,
      serializeLocalPracticeReviewQueue(queue),
    );
    return { notice: null };
  } catch {
    return {
      notice: "本机复练记录保存失败，本次练习仍可继续。",
    };
  }
};

export const clearMobilePracticeReviewQueue = (
  storage: StorageLike | null | undefined,
): MobilePracticeReviewStorageResult => {
  if (!storage) {
    return { notice: unavailableNotice };
  }

  try {
    storage.removeItem(MOBILE_PRACTICE_REVIEW_STORAGE_KEY);
    return { notice: null };
  } catch {
    return {
      notice: "本机复练记录清除失败，本次练习仍可继续。",
    };
  }
};
