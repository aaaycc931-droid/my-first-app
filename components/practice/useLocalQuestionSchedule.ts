"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createLocalQuestionSchedule,
  createLocalQuestionSeed,
  getScheduledQuestionIndex,
} from "../../lib/practice/localQuestionScheduler";

/**
 * Keeps APK-only exercise ordering random without changing the deterministic
 * sequence used by the Web course record.
 */
export const useLocalQuestionSchedule = ({
  itemCount,
  sequence,
  isCourseExercise,
}: {
  itemCount: number;
  sequence: number;
  isCourseExercise: boolean;
}) => {
  const [sessionSeed, setSessionSeed] = useState<number | null>(null);

  useEffect(() => {
    if (isCourseExercise) return undefined;
    const timer = window.setTimeout(() => setSessionSeed(createLocalQuestionSeed()), 0);
    return () => window.clearTimeout(timer);
  }, [isCourseExercise]);

  const questionIndex = useMemo(() => {
    if (isCourseExercise || sessionSeed === null) return sequence;
    return getScheduledQuestionIndex(
      createLocalQuestionSchedule(itemCount, sessionSeed),
      sequence,
    ) ?? 0;
  }, [isCourseExercise, itemCount, sequence, sessionSeed]);

  return {
    questionIndex,
    isReady: isCourseExercise || sessionSeed !== null,
  };
};
