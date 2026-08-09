import assert from "node:assert/strict";
import {
  RUNTIME_TEST_LANES,
  classifyRuntimeTestShadow,
  loadPackageScripts,
  loadRuntimeTestManifest,
} from "./runtime-test-lane-policy.mjs";

const manifest = loadRuntimeTestManifest();
const packageScripts = loadPackageScripts();
const packageTestScripts = Object.keys(packageScripts)
  .filter((script) => script.startsWith("test:"))
  .sort();
const manifestScripts = manifest.commands.map(({ script }) => script);
const manifestScriptSet = new Set(manifestScripts);
const manifestTestScripts = manifestScripts.filter((script) => script.startsWith("test:"));

assert.equal(manifest.version, 1, "runtime test manifest version must be reviewed");
assert.equal(manifest.reviewedCommandCount, manifest.commands.length);
assert.ok(
  manifest.baseline.commandCount <= manifest.reviewedCommandCount,
  "measured baseline cannot contain more commands than the reviewed manifest",
);
assert.equal(manifest.baseline.durationSeconds, 560.809);
assert.equal(manifest.baseline.commandDurationSeconds, 560.694);
assert.equal(
  Number(
    Object.values(manifest.baseline.laneDurationSeconds)
      .reduce((total, duration) => total + duration, 0)
      .toFixed(3),
  ),
  manifest.baseline.commandDurationSeconds,
);
assert.equal(
  manifestScripts.length,
  manifestScriptSet.size,
  "every runtime test must appear exactly once in the manifest",
);

for (const { script, lane } of manifest.commands) {
  assert.equal(typeof packageScripts[script], "string", `${script} must exist in package.json`);
  assert.ok(RUNTIME_TEST_LANES.includes(lane), `${script} has unknown lane ${lane}`);
}
assert.deepEqual(
  [...new Set(manifest.commands.map(({ lane }) => lane))].sort(),
  [...RUNTIME_TEST_LANES].sort(),
  "every reviewed runtime lane must own at least one command",
);
const verifyCommand = manifest.commands.find(
  ({ script }) => script === "verify:p119-content-review-manifest",
);
assert.deepEqual(verifyCommand?.args, [
  "--",
  "--manifest",
  "local-fixtures/p119-content-education/review-manifest.bd5c5af211a3a1b36f4fcfacebdfe89b65fbafc1.json",
]);

const excludedScriptSet = new Set(manifest.excludedScripts);
assert.equal(
  manifest.excludedScripts.length,
  excludedScriptSet.size,
  "excluded test scripts must be unique",
);
for (const script of manifest.excludedScripts) {
  assert.equal(typeof packageScripts[script], "string", `${script} must exist in package.json`);
  assert.ok(!manifestScriptSet.has(script), `${script} cannot be both runtime and excluded`);
}

assert.deepEqual(
  [...manifestTestScripts, ...excludedScriptSet].sort(),
  packageTestScripts,
  "every package test must belong to the runtime manifest or the reviewed lightweight exclusions",
);

const singleLane = classifyRuntimeTestShadow(["lib/piano/pianoMidi.ts"]);
assert.equal(singleLane.full, false);
assert.deepEqual(singleLane.lanes, ["piano-midi"]);
assert.equal(singleLane.estimatedSeconds, 44.609);

const sharedPath = classifyRuntimeTestShadow(["lib/audio/noteFrequency.ts"]);
assert.equal(sharedPath.full, true);
assert.equal(sharedPath.reason, "shared-path");

const unknownPath = classifyRuntimeTestShadow(["lib/new-domain/newRuntime.ts"]);
assert.equal(unknownPath.full, true);
assert.equal(unknownPath.reason, "unknown-path");

const hostilePath = classifyRuntimeTestShadow(["app/x\nrun_android=false"]);
assert.equal(hostilePath.full, true);
assert.equal(hostilePath.reason, "unknown-path");
assert.doesNotMatch(hostilePath.reason, /[\r\n]/);

const mixedLanes = classifyRuntimeTestShadow([
  "lib/piano/pianoMidi.ts",
  "lib/account/accountSessionWorkGuard.ts",
]);
assert.equal(mixedLanes.full, false);
assert.deepEqual(mixedLanes.lanes, ["account-web", "piano-midi"]);

const docsOnly = classifyRuntimeTestShadow(["docs/mvp-status.md"]);
assert.equal(docsOnly.full, false);
assert.deepEqual(docsOnly.lanes, []);

const rootUppercaseDocs = classifyRuntimeTestShadow(["README.MD"]);
assert.equal(rootUppercaseDocs.reason, "docs-only");
assert.equal(rootUppercaseDocs.selectedCommands, 0);

const nestedMarkdownCode = classifyRuntimeTestShadow(["app/runtime-contract.md"]);
assert.equal(nestedMarkdownCode.full, true);
assert.equal(nestedMarkdownCode.reason, "unknown-path");

const forced = classifyRuntimeTestShadow(["lib/piano/pianoMidi.ts"], {
  forceFullReason: "schedule",
});
assert.equal(forced.full, true);
assert.equal(forced.reason, "schedule");
assert.deepEqual(forced.lanes, [...RUNTIME_TEST_LANES]);
assert.equal(forced.estimatedSeconds, 560.694);

console.log(
  `Runtime test lane policy covers ${manifestScripts.length} runtime commands across ${RUNTIME_TEST_LANES.length} lanes; ${manifest.excludedScripts.length} lightweight tests stay outside the suite.`,
);
