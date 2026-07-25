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

console.log(
  `Quality workflow covers all ${packageTestScripts.length} package.json test:* scripts exactly once.`,
);
