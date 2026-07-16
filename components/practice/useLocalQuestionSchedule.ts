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
  replaySeed,
}: {
  itemCount: number;
  sequence: number;
  isCourseExercise: boolean;
  replaySeed?: number;
}) => {
  const [generatedSeed, setGeneratedSeed] = useState<number | null>(null);

  useEffect(() => {
    if (isCourseExercise || replaySeed !== undefined) return undefined;
    const timer = window.setTimeout(() => setGeneratedSeed(createLocalQuestionSeed()), 0);
    return () => window.clearTimeout(timer);
  }, [isCourseExercise, replaySeed]);

  const sessionSeed = isCourseExercise ? null : replaySeed ?? generatedSeed;

  const questionIndex = useMemo(() => {
    if (isCourseExercise || sessionSeed === null) return sequence;
    return getScheduledQuestionIndex(
      createLocalQuestionSchedule(itemCount, sessionSeed),
      sequence,
    ) ?? 0;
  }, [isCourseExercise, itemCount, sequence, sessionSeed]);

  return {
    questionIndex,
    sessionSeed,
    isReady: isCourseExercise || sessionSeed !== null,
  };
};
