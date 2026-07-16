export type MobileLifecycleState = {
  isForeground: boolean;
  shouldShowResetNotice: boolean;
};

export const createMobileLifecycleState = (
  isForeground: boolean,
): MobileLifecycleState => ({
  isForeground,
  shouldShowResetNotice: false,
});

export const enterMobileBackground = (
  state: MobileLifecycleState,
  hasActivePractice: boolean,
): MobileLifecycleState => ({
  isForeground: false,
  shouldShowResetNotice: state.shouldShowResetNotice || hasActivePractice,
});

export const enterMobileForeground = (
  state: MobileLifecycleState,
): MobileLifecycleState => ({ ...state, isForeground: true });

export const dismissMobileResetNotice = (
  state: MobileLifecycleState,
): MobileLifecycleState => ({ ...state, shouldShowResetNotice: false });
