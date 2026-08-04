import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJsonPath = new URL("../package.json", import.meta.url);
const qualityWorkflowPath = new URL("../.github/workflows/quality.yml", import.meta.url);

const [packageJsonText, qualityWorkflow] = await Promise.all([
  readFile(packageJsonPath, "utf8"),
  readFile(qualityWorkflowPath, "utf8"),
]);

const packageJson = JSON.parse(packageJsonText);
const packageTestScripts = Object.keys(packageJson.scripts ?? {})
  .filter((scriptName) => scriptName.startsWith("test:"))
  .sort();
const requiredValidateScripts = [
  "validate:database-least-privilege",
  "validate:final-platform-schema",
];
const executableWorkflowLines = qualityWorkflow
  .split(/\r?\n/)
  .filter((line) => !line.trimStart().startsWith("#"))
  .join("\n");
const workflowTestCommands = [
  ...executableWorkflowLines.matchAll(/\bnpm run (test:[a-z0-9:-]+)(?:\s|$)/g),
].map((match) => match[1]);
const workflowTestCommandSet = new Set(workflowTestCommands);

assert.ok(packageTestScripts.length > 0, "package.json must define test:* scripts");
assert.equal(
  workflowTestCommands.length,
  workflowTestCommandSet.size,
  "Quality workflow must not run duplicate test:* commands",
);

const missingFromQuality = packageTestScripts.filter(
  (scriptName) => !workflowTestCommandSet.has(scriptName),
);
assert.deepEqual(
  missingFromQuality,
  [],
  `Quality workflow is missing package.json test:* scripts: ${missingFromQuality.join(", ")}`,
);

const unknownInQuality = [...workflowTestCommandSet]
  .filter((scriptName) => !packageTestScripts.includes(scriptName))
  .sort();
assert.deepEqual(
  unknownInQuality,
  [],
  `Quality workflow references unknown test:* scripts: ${unknownInQuality.join(", ")}`,
);

for (const scriptName of requiredValidateScripts) {
  assert.equal(
    typeof packageJson.scripts?.[scriptName],
    "string",
    `package.json must define required CI validator ${scriptName}`,
  );
  const occurrences = [
    ...executableWorkflowLines.matchAll(new RegExp(`\\bnpm run ${scriptName}(?:\\s|$)`, "g")),
  ].length;
  assert.equal(
    occurrences,
    1,
    `Quality workflow must run required CI validator ${scriptName} exactly once`,
  );
}

assert.doesNotMatch(
  executableWorkflowLines,
  /^\s*paths-ignore:/m,
  "Required Quality workflow must not disappear behind paths-ignore",
);
assert.doesNotMatch(
  executableWorkflowLines,
  /^\s*pull_request_target:/m,
  "Quality workflow must not execute pull_request_target code",
);
assert.match(
  executableWorkflowLines,
  /concurrency:\s*\n\s+group: quality-\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}\s*\n\s+cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/,
  "Quality workflow must cancel obsolete runs only for the same pull request",
);
assert.match(
  executableWorkflowLines,
  /\n  quality:\s*\n\s+name: quality\s*\n\s+needs:[\s\S]*?\n\s+if: \$\{\{ always\(\) \}\}/,
  "Stable quality gate must aggregate lane results even after failures or skips",
);
assert.match(
  executableWorkflowLines,
  /if: \$\{\{ needs\.classify\.outputs\.run_android == 'true' \}\}/,
  "Android job must be selected by the reviewed change policy",
);
assert.match(
  executableWorkflowLines,
  /if: \$\{\{ success\(\) && github\.event_name == 'workflow_dispatch' && inputs\.upload_apk \}\}/,
  "APK upload must require an explicit manual workflow dispatch",
);
assert.equal(
  (executableWorkflowLines.match(/actions\/upload-artifact@/g) ?? []).length,
  1,
  "Quality workflow must contain exactly one reviewed artifact upload action",
);

console.log(
  `Quality workflow covers all ${packageTestScripts.length} package.json test:* scripts and ${requiredValidateScripts.length} required validators exactly once.`,
);
