import assert from "node:assert/strict";
import {
  attachRuntimeTestShadow,
  classifyChangedPaths,
  parseNameStatus,
  selectComparison,
} from "./classify-ci-changes.mjs";

const docs = classifyChangedPaths(["AGENTS.md", "docs/mvp-status.md"]);
assert.equal(docs.docsOnly, true);
assert.equal(docs.runCode, false);
assert.equal(docs.runWeb, false);
assert.equal(docs.runAndroid, false);
assert.equal(docs.full, false);

for (const path of [
  ".github/pull_request_template.md",
  ".github/PULL_REQUEST_TEMPLATE/maintenance.md",
]) {
  const pullRequestDocs = classifyChangedPaths([path]);
  assert.equal(pullRequestDocs.docsOnly, true, `${path} is non-executable PR documentation`);
  assert.equal(pullRequestDocs.runCode, false);
  assert.equal(pullRequestDocs.runAndroid, false);
  assert.equal(pullRequestDocs.full, false);
}

const web = classifyChangedPaths(["app/account/page.tsx", "components/account/AccountPanel.tsx"]);
assert.equal(web.runCode, true);
assert.equal(web.runWeb, true);
assert.equal(web.runAndroid, false);
assert.equal(web.full, false);

const android = classifyChangedPaths(["mobile/src/App.tsx", "android/app/build.gradle"]);
assert.equal(android.runWeb, false);
assert.equal(android.runAndroid, true);
assert.equal(android.full, false);

const shared = classifyChangedPaths(["lib/practice/localPracticeCatalog.ts"]);
assert.equal(shared.runWeb, true);
assert.equal(shared.runAndroid, true);
assert.equal(shared.full, false);
const sharedShadow = attachRuntimeTestShadow(shared);
assert.equal(sharedShadow.runtimeShadow.full, true);
assert.equal(sharedShadow.runtimeShadow.reason, "shared-category");
assert.equal(sharedShadow.runtimeShadow.selectedCommands, 160);

for (const path of [
  ".github/workflows/quality.yml",
  "scripts/test-quality-workflow-test-coverage.mjs",
  "supabase/migrations/0008_future.sql",
  "package-lock.json",
  "unclassified/new-source.xyz",
]) {
  const result = classifyChangedPaths([path]);
  assert.equal(result.full, true, `${path} must fail safe to full CI`);
  assert.equal(result.runWeb, true, `${path} must run Web CI`);
  assert.equal(result.runAndroid, true, `${path} must run Android CI`);
}

const dependency = classifyChangedPaths(["package.json"]);
assert.equal(dependency.dependency, true);
assert.equal(dependency.runAudit, true);
assert.equal(attachRuntimeTestShadow(dependency).runtimeShadow.full, true);

const ownedWebTest = attachRuntimeTestShadow(
  classifyChangedPaths(["components/account/PrivatePracticeHistoryPanel.behavior.test.tsx"]),
);
assert.equal(ownedWebTest.runtimeShadow.full, false);
assert.deepEqual(ownedWebTest.runtimeShadow.lanes, ["account-web"]);
assert.ok(ownedWebTest.runtimeShadow.selectedCommands < 160);

const mixed = classifyChangedPaths(["docs/mvp-status.md", "app/page.tsx"]);
assert.equal(mixed.docsOnly, false);
assert.equal(mixed.runWeb, true);
assert.equal(mixed.runAndroid, false);

const empty = classifyChangedPaths([]);
assert.equal(empty.full, true);
assert.equal(empty.fullReason, "empty-diff");

const forced = classifyChangedPaths(["docs/mvp-status.md"], { forceFullReason: "schedule" });
assert.equal(forced.full, true);
assert.equal(forced.runCode, true);
assert.equal(forced.runWeb, true);
assert.equal(forced.runAndroid, true);
assert.equal(forced.runAudit, true);

assert.deepEqual(
  parseNameStatus(Buffer.from("M\0app/page.tsx\0R100\0docs/old.md\0docs/new.md\0D\0mobile/src/Old.tsx\0")),
  ["app/page.tsx", "docs/old.md", "docs/new.md", "mobile/src/Old.tsx"],
);
assert.throws(() => parseNameStatus(Buffer.from("R100\0docs/old.md\0")), /incomplete/);

const shaA = "a".repeat(40);
const shaB = "b".repeat(40);
assert.deepEqual(
  selectComparison({ eventName: "pull_request", baseSha: shaA, headSha: shaB }),
  { baseSha: shaA, headSha: shaB, useMergeBase: true },
);
assert.deepEqual(
  selectComparison({ eventName: "push", beforeSha: shaA, headSha: shaB }),
  { baseSha: shaA, headSha: shaB, useMergeBase: false },
);
assert.deepEqual(
  selectComparison({ eventName: "push", beforeSha: "0".repeat(40), headSha: shaB }),
  { forceFullReason: "invalid-push-before-sha" },
);
assert.deepEqual(
  selectComparison({ eventName: "schedule", headSha: shaB }),
  { forceFullReason: "schedule" },
);
assert.deepEqual(
  selectComparison({ eventName: "workflow_dispatch", headSha: shaB }),
  { forceFullReason: "workflow_dispatch" },
);

console.log("CI change policy tests passed.");
