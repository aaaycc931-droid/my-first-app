export type LocalPracticeAnswerLock<T> = {
  selection: T;
  isAnswerVisible: boolean;
};

export const createLocalPracticeAnswerLock = <T>(selection: T): LocalPracticeAnswerLock<T> => ({
  selection,
  isAnswerVisible: false,
});

export const chooseLocalPracticeAnswer = <T>(
  state: LocalPracticeAnswerLock<T>,
  selection: T,
): LocalPracticeAnswerLock<T> =>
  state.isAnswerVisible ? state : { ...state, selection };

export const revealLocalPracticeAnswer = <T>(
  state: LocalPracticeAnswerLock<T>,
  canReveal: (selection: T) => boolean,
): LocalPracticeAnswerLock<T> =>
  !state.isAnswerVisible && canReveal(state.selection)
    ? { ...state, isAnswerVisible: true }
    : state;

export const resetLocalPracticeAnswer = <T>(selection: T): LocalPracticeAnswerLock<T> =>
  createLocalPracticeAnswerLock(selection);
