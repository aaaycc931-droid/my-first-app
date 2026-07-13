import type { NotationTemporaryPracticeTarget } from "./localNotationDraftPracticeTarget";

export type NotationTemporaryPracticeProgress = {
  targetId: string;
  draftFingerprint: string;
  completedEventIndexes: number[];
};

export const createNotationTemporaryPracticeProgress = (
  target: NotationTemporaryPracticeTarget,
): NotationTemporaryPracticeProgress => ({
  targetId: target.id,
  draftFingerprint: target.draftFingerprint,
  completedEventIndexes: [],
});

export const reconcileNotationTemporaryPracticeProgress = (
  progress: NotationTemporaryPracticeProgress | null,
  target: NotationTemporaryPracticeTarget | null,
): NotationTemporaryPracticeProgress | null => {
  if (!progress || !target || target.status !== "active") return null;
  if (progress.targetId !== target.id || progress.draftFingerprint !== target.draftFingerprint) return null;
  return {
    ...progress,
    completedEventIndexes: progress.completedEventIndexes.filter((index) => Number.isInteger(index) && index >= 0 && index < target.events.length),
  };
};

export const toggleNotationTemporaryPracticeEventCompletion = (
  progress: NotationTemporaryPracticeProgress,
  eventIndex: number,
): NotationTemporaryPracticeProgress => ({
  ...progress,
  completedEventIndexes: progress.completedEventIndexes.includes(eventIndex)
    ? progress.completedEventIndexes.filter((index) => index !== eventIndex)
    : [...progress.completedEventIndexes, eventIndex].sort((left, right) => left - right),
});

export const resetNotationTemporaryPracticeProgress = (
  progress: NotationTemporaryPracticeProgress,
): NotationTemporaryPracticeProgress => ({ ...progress, completedEventIndexes: [] });

export const isNotationTemporaryPracticeRoundComplete = (
  progress: NotationTemporaryPracticeProgress | null,
  target: NotationTemporaryPracticeTarget | null,
): boolean => Boolean(
  progress &&
    target &&
    target.status === "active" &&
    progress.targetId === target.id &&
    progress.draftFingerprint === target.draftFingerprint &&
    progress.completedEventIndexes.length === target.events.length,
);
