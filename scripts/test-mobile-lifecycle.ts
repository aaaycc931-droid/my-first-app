import assert from "node:assert/strict";

import {
  createMobileLifecycleState,
  dismissMobileResetNotice,
  enterMobileBackground,
  enterMobileForeground,
} from "../mobile/src/runtime/mobileLifecycle";

let state = createMobileLifecycleState(true);
assert.deepEqual(state, { isForeground: true, shouldShowResetNotice: false });

state = enterMobileBackground(state, false);
assert.deepEqual(state, { isForeground: false, shouldShowResetNotice: false });

state = enterMobileForeground(state);
assert.deepEqual(state, { isForeground: true, shouldShowResetNotice: false });

state = enterMobileBackground(state, true);
assert.deepEqual(state, { isForeground: false, shouldShowResetNotice: true });

state = enterMobileForeground(state);
assert.deepEqual(state, { isForeground: true, shouldShowResetNotice: true });

state = dismissMobileResetNotice(state);
assert.deepEqual(state, { isForeground: true, shouldShowResetNotice: false });

console.log("Mobile lifecycle tests passed.");
