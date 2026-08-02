import assert from "node:assert/strict";

import { AccountSessionWorkGuard } from "../lib/account/accountSessionWorkGuard.js";

const guard = new AccountSessionWorkGuard();
guard.setSession("user-a");
const firstToken = guard.capture("user-a");
assert.ok(firstToken);
assert.equal(guard.isCurrent(firstToken), true);

guard.setSession("user-b");
assert.equal(guard.isCurrent(firstToken), false, "switching users must invalidate pending user A work");
const secondToken = guard.capture("user-b");
assert.ok(secondToken);
assert.equal(guard.isCurrent(secondToken), true);

guard.invalidate();
assert.equal(guard.isCurrent(secondToken), false, "sign-out must invalidate pending account work");
guard.setSession("user-b");
const reauthenticatedToken = guard.capture("user-b");
assert.ok(reauthenticatedToken);
assert.equal(guard.isCurrent(reauthenticatedToken), true);
assert.equal(guard.isCurrent(secondToken), false, "re-authentication must not revive old work");

console.log("account session stale guard tests passed");
