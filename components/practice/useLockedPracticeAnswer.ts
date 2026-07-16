"use client";

import { useCallback, useState } from "react";
import {
  chooseLocalPracticeAnswer,
  createLocalPracticeAnswerLock,
  resetLocalPracticeAnswer,
  revealLocalPracticeAnswer,
} from "../../lib/practice/localPracticeAnswerLock";

export type LockedPracticeAnswer<T> = {
  selection: T;
  isAnswerVisible: boolean;
  choose: (nextSelection: T) => boolean;
  reveal: () => T | null;
  reset: () => void;
};

export function useLockedPracticeAnswer<T>(
  initialSelection: T,
  canReveal: (selection: T) => boolean,
): LockedPracticeAnswer<T> {
  const [state, setState] = useState(() =>
    createLocalPracticeAnswerLock(initialSelection),
  );

  const choose = useCallback(
    (nextSelection: T) => {
      if (state.isAnswerVisible) return false;
      setState((current) => chooseLocalPracticeAnswer(current, nextSelection));
      return true;
    },
    [state.isAnswerVisible],
  );

  const reveal = useCallback(() => {
    if (state.isAnswerVisible || !canReveal(state.selection)) return null;
    setState((current) => revealLocalPracticeAnswer(current, canReveal));
    return state.selection;
  }, [canReveal, state]);

  const reset = useCallback(() => {
    setState(resetLocalPracticeAnswer(initialSelection));
  }, [initialSelection]);

  return {
    selection: state.selection,
    isAnswerVisible: state.isAnswerVisible,
    choose,
    reveal,
    reset,
  };
}
