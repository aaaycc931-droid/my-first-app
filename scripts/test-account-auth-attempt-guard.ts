import assert from "node:assert/strict";

import { AccountAuthAttemptGuard } from "../lib/account/accountAuthAttemptGuard.js";

const guard = new AccountAuthAttemptGuard();
const first = guard.begin();
assert.equal(guard.isCurrent(first), true);

const second = guard.begin();
assert.equal(guard.isCurrent(first), false, "a replacement attempt must invalidate the first response");
assert.equal(guard.isCurrent(second), true);

guard.invalidate();
assert.equal(guard.isCurrent(second), false, "an auth event or unmount must invalidate pending responses");

console.log("account auth attempt guard tests passed");
