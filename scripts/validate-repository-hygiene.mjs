import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { findForbiddenTrackedFiles } from "./repository-hygiene.mjs";

const checks = [];
const failures = [];

const pass = (message) => {
  checks.push({ ok: true, message });
};

const fail = (message, details = []) => {
  checks.push({ ok: false, message, details });
  failures.push({ message, details });
};

const readTextFile = (filePath) => readFileSync(filePath, "utf8");

const assertNoKeywords = (filePath, keywords) => {
  const source = readTextFile(filePath);
  const found = keywords.filter((keyword) => source.includes(keyword));

  if (found.length > 0) {
    fail(
      `${filePath} contains forbidden repository-boundary keyword(s).`,
      found.map((keyword) => `${filePath}: ${keyword}`),
    );
    return;
  }

  pass(`${filePath} does not contain forbidden repository-boundary keywords.`);
};

const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const forbiddenTrackedFiles = findForbiddenTrackedFiles(trackedFiles);

if (forbiddenTrackedFiles.length > 0) {
  fail(
    "Unexpected tracked generated/sample files are forbidden.",
    forbiddenTrackedFiles.map((filePath) => `${filePath} (${extname(filePath).toLowerCase()})`),
  );
} else {
  pass("No unexpected generated/sample file extensions are tracked by git.");
}

const recognizerFactoryPath = "lib/recognition/recognizerFactory.ts";
const recognizerFactorySource = readTextFile(recognizerFactoryPath);

if (/const\s+defaultProvider\s*:\s*RecognizerProvider\s*=\s*["']mock["']/.test(recognizerFactorySource)) {
  pass(`${recognizerFactoryPath} keeps defaultProvider set to "mock".`);
} else {
  fail(`${recognizerFactoryPath} must keep defaultProvider set to "mock".`);
}

const recognizerProviderMatch = recognizerFactorySource.match(
  /export\s+type\s+RecognizerProvider\s*=\s*([^;]+);/,
);

if (!recognizerProviderMatch) {
  fail(`${recognizerFactoryPath} must define RecognizerProvider.`);
} else if (recognizerProviderMatch[1].includes("audiveris")) {
  fail(`${recognizerFactoryPath} RecognizerProvider must not include "audiveris".`, [
    `${recognizerFactoryPath}: RecognizerProvider includes "audiveris"`,
  ]);
} else {
  pass(`${recognizerFactoryPath} RecognizerProvider does not include "audiveris".`);
}

assertNoKeywords("app/api/recognize/route.ts", [
  ".mxl",
  "fflate",
  "extractMusicXMLFromMxl",
  "Audiveris",
  'createRecognizer("musicxml")',
]);

assertNoKeywords("app/recognize/page.tsx", [
  "fflate",
  "unzipSync",
  "extractMusicXMLFromMxl",
  "mxlExtractor",
]);

console.log("Repository hygiene validation results:");
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} - ${check.message}`);
  for (const detail of check.details || []) {
    console.log(`  - ${detail}`);
  }
}

if (failures.length > 0) {
  console.error(`\nRepository hygiene validation failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log("\nRepository hygiene validation passed.");
