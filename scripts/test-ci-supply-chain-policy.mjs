import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const workflowsDirectory = new URL("../.github/workflows/", import.meta.url);
const gradleWrapperPath = new URL(
  "../android/gradle/wrapper/gradle-wrapper.properties",
  import.meta.url,
);

const [workflowEntries, gradleWrapper] = await Promise.all([
  readdir(workflowsDirectory, { withFileTypes: true }),
  readFile(gradleWrapperPath, "utf8"),
]);
const workflowNames = workflowEntries
  .filter(
    (entry) =>
      entry.isFile()
      && (entry.name.endsWith(".yml") || entry.name.endsWith(".yaml")),
  )
  .map((entry) => entry.name)
  .sort();

assert.ok(workflowNames.length > 0, "repository must contain workflow YAML files");

const workflows = await Promise.all(
  workflowNames.map(async (name) => ({
    name,
    contents: await readFile(new URL(name, workflowsDirectory), "utf8"),
  })),
);

const approvedActions = new Map([
  ["actions/checkout", ["34e114876b0b11c390a56381ad16ebd13914f8d5", "v4.3.1"]],
  ["actions/setup-node", ["49933ea5288caeca8642d1e84afbd3f7d6820020", "v4.4.0"]],
  ["actions/setup-java", ["c5195efecf7bdfc987ee8bae7a71cb8b11521c00", "v4.7.1"]],
  [
    "android-actions/setup-android",
    ["9fc6c4e9069bf8d3d10b2204b1fb8f6ef7065407", "v3.2.2"],
  ],
  ["actions/upload-artifact", ["ea165f8d65b6e75b540449e92b4886f43607fa02", "v4.6.2"]],
]);

const actionUses = workflows.flatMap(({ name, contents }) =>
  [...contents.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#\s*(\S+))?\s*$/gm)].map(
    ([, reference, versionComment]) => ({
      workflowName: name,
      reference,
      versionComment,
    }),
  ),
);
assert.ok(actionUses.length > 0, "repository workflows must declare actions");

for (const { workflowName, reference: actionReference, versionComment } of actionUses) {
  const separatorIndex = actionReference.lastIndexOf("@");
  assert.notEqual(
    separatorIndex,
    -1,
    `${workflowName}: action is missing a ref: ${actionReference}`,
  );

  const actionName = actionReference.slice(0, separatorIndex);
  const actionSha = actionReference.slice(separatorIndex + 1);
  const approved = approvedActions.get(actionName);

  assert.ok(approved, `${workflowName}: unapproved action: ${actionName}`);
  assert.match(
    actionSha,
    /^[0-9a-f]{40}$/,
    `${workflowName}: ${actionName} must use a full commit SHA`,
  );
  assert.equal(
    actionSha,
    approved[0],
    `${workflowName}: ${actionName} SHA differs from the approved pin`,
  );
  assert.equal(
    versionComment,
    approved[1],
    `${workflowName}: ${actionName} must retain the reviewed tag as an inline comment`,
  );
}

for (const actionName of approvedActions.keys()) {
  assert.ok(
    actionUses.some(({ reference }) => reference.startsWith(`${actionName}@`)),
    `repository workflows must use approved action ${actionName}`,
  );
}

assert.match(
  gradleWrapper,
  /^distributionSha256Sum=ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c$/m,
  "Gradle wrapper distribution must use the reviewed SHA-256 checksum",
);
assert.equal(
  (gradleWrapper.match(/^distributionSha256Sum=/gm) ?? []).length,
  1,
  "Gradle wrapper must declare exactly one distribution checksum",
);

console.log(`CI supply-chain policy passed for ${repositoryRoot}`);
