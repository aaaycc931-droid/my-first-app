import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const routePath = "app/api/dev/recognize-audiveris/route.ts";
const mainApiPath = "app/api/recognize/route.ts";
const pagePath = "app/recognize/page.tsx";
const apiClientPath = "lib/recognition/browserRecognitionApiClient.ts";
const recognizerFactoryPath = "lib/recognition/recognizerFactory.ts";

const checks = [];
const failures = [];

const pass = (message) => checks.push({ ok: true, message, details: [] });
const fail = (message, details = []) => {
  checks.push({ ok: false, message, details });
  failures.push({ message, details });
};

const readSource = (filePath) => readFileSync(filePath, "utf8");

const gitChangedFiles = () => {
  try {
    return execSync("git diff --name-only HEAD", { encoding: "utf8" })
      .split("\n")
      .map((filePath) => filePath.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

const assertContains = (filePath, source, pattern, description) => {
  if (pattern.test(source)) pass(`${filePath} ${description}.`);
  else fail(`${filePath} must ${description}.`);
};

const assertNotContains = (filePath, source, pattern, description) => {
  if (!pattern.test(source)) pass(`${filePath} ${description}.`);
  else fail(`${filePath} must ${description}.`);
};

const assertOrder = (filePath, source, earlier, later, description) => {
  const earlierIndex = source.indexOf(earlier);
  const laterIndex = source.indexOf(later);

  if (earlierIndex >= 0 && laterIndex >= 0 && earlierIndex < laterIndex) {
    pass(`${filePath} ${description}.`);
  } else {
    fail(`${filePath} must ${description}.`, [
      `${earlier}: ${earlierIndex}`,
      `${later}: ${laterIndex}`,
    ]);
  }
};

const assertFinallyReleasesLock = (filePath, source) => {
  const finallyMatch = source.match(
    /finally\s*{[\s\S]*?isAudiverisRunning\s*=\s*false\s*;[\s\S]*?}/,
  );
  if (finallyMatch) pass(`${filePath} releases isAudiverisRunning in finally.`);
  else
    fail(`${filePath} must release isAudiverisRunning = false inside finally.`);
};

const assertAudiverisDevUIBoundary = (
  filePath,
  source,
  clientFilePath,
  clientSource,
) => {
  assertContains(
    filePath,
    source,
    /NEXT_PUBLIC_AUDIVERIS_DEV_UI_ENABLED/,
    "includes the NEXT_PUBLIC_AUDIVERIS_DEV_UI_ENABLED gate",
  );
  assertContains(
    filePath,
    source,
    /recognitionApiClient\.recognizeAudiverisPdf\(\s*audiverisDevFile,\s*\{\s*includeFullNotes:\s*isAudiverisDevFullNotesEnabled\s*},?\s*\)/,
    "calls the recognition API client from the explicit dev UI handler",
  );
  assertNotContains(
    filePath,
    source,
    /\bfetch\s*\(/,
    "does not move fetch back into the page",
  );
  assertNotContains(
    filePath,
    source,
    /\bFormData\s*\(/,
    "does not move FormData construction back into the page",
  );
  assertNotContains(
    filePath,
    source,
    /\/api\/dev\/recognize-audiveris/,
    "does not own the Audiveris dev endpoint literal",
  );

  const apiReferenceIndexes = [
    ...clientSource.matchAll(/\/api\/dev\/recognize-audiveris/g),
  ].map((match) => match.index ?? -1);

  if (apiReferenceIndexes.length !== 1) {
    fail(
      `${clientFilePath} must reference /api/dev/recognize-audiveris exactly once.`,
      [`found: ${apiReferenceIndexes.length}`],
    );
    return;
  }

  const referenceIndex = apiReferenceIndexes[0];
  const nearbySource = clientSource.slice(
    Math.max(0, referenceIndex - 2500),
    referenceIndex + 2500,
  );

  if (
    nearbySource.includes("async recognizeAudiverisPdf") &&
    nearbySource.includes('formData.append("file", file)') &&
    nearbySource.includes("fetchRequest")
  ) {
    pass(
      `${clientFilePath} owns /api/dev/recognize-audiveris inside recognizeAudiverisPdf.`,
    );
  } else {
    fail(
      `${clientFilePath} must keep /api/dev/recognize-audiveris inside recognizeAudiverisPdf.`,
    );
  }

  assertNotContains(
    filePath,
    source,
    /\bfflate\b/,
    "does not import or use fflate",
  );
  assertNotContains(
    filePath,
    source,
    /\bunzipSync\b/,
    "does not import or use unzipSync",
  );
  assertNotContains(
    filePath,
    source,
    /\bmxlExtractor\b/,
    "does not import or use mxlExtractor",
  );
  assertNotContains(
    filePath,
    source,
    /\bextractMusicXMLFromMxl\b/,
    "does not import or use extractMusicXMLFromMxl",
  );
  assertNotContains(
    filePath,
    source,
    /child_process/,
    "does not reference child_process",
  );
  assertNotContains(filePath, source, /\bspawn\b/, "does not reference spawn");
  assertNotContains(filePath, source, /\bexec\b/, "does not reference exec");
  assertNotContains(
    filePath,
    source,
    /\bexecFile\b/,
    "does not reference execFile",
  );
  assertContains(
    filePath,
    source,
    /recognitionApiClient\.recognizeImage\(selectedFile\)/,
    "keeps the main upload flow calling the recognition API client",
  );
  assertContains(
    clientFilePath,
    clientSource,
    /async recognizeImage\(file\)[\s\S]*?fetchRequest\(\s*["']\/api\/recognize["'][\s\S]*?method:\s*["']POST["'][\s\S]*?body:\s*formData/,
    "keeps the main upload adapter posting to /api/recognize",
  );
  assertContains(
    filePath,
    source,
    /NEXT_PUBLIC_AUDIVERIS_DEV_FULL_NOTES_ENABLED/,
    "includes the full notes preview dev flag",
  );
  assertContains(
    filePath,
    source,
    /includeFullNotes:\s*isAudiverisDevFullNotesEnabled/,
    "passes the full notes preview flag to the recognition API client",
  );
  assertContains(
    clientFilePath,
    clientSource,
    /async recognizeAudiverisPdf\(file, \{ includeFullNotes \}\)[\s\S]*?formData\.append\(\s*["']file["']\s*,\s*file\s*\)[\s\S]*?if\s*\(includeFullNotes\)\s*{[\s\S]*?formData\.append\(\s*["']includeNotes["']\s*,\s*["']full["']\s*\)[\s\S]*?fetchRequest\(\s*["']\/api\/dev\/recognize-audiveris["'][\s\S]*?method:\s*["']POST["'][\s\S]*?body:\s*formData/,
    "owns the file field, conditional includeNotes=full flag, and Audiveris POST request",
  );
  assertContains(
    filePath,
    source,
    /播放完整 Audiveris notes 预览/,
    "shows the Audiveris full notes playback preview button copy",
  );
  assertContains(
    filePath,
    source,
    /停止播放/,
    "shows the explicit stop playback control copy",
  );
  assertContains(
    filePath,
    source,
    /播放 Audiveris firstNotes 预览/,
    "shows the Audiveris firstNotes playback preview button copy",
  );
  assertContains(
    filePath,
    source,
    /仅播放 Audiveris firstNotes 预览，不是完整曲谱/,
    "explains the firstNotes preview is not full-score playback",
  );
  assertContains(
    filePath,
    source,
    /没有可播放的 Audiveris firstNotes/,
    "shows the empty firstNotes playback message",
  );
  assertContains(
    filePath,
    source,
    /Dev-only full notes preview[\s\S]*\/api\/recognize[\s\S]*not[\s\S]*production[\s\S]*may be truncated/,
    "explains full notes preview safety boundaries",
  );

  const audiverisHandler = source.match(
    /const handleAudiverisDevRecognize = async \(\) => \{[\s\S]*?\n  };\n\n  const handleRecognize/,
  )?.[0];
  if (!audiverisHandler) {
    fail(`${filePath} must keep the Audiveris dev handler explicit.`);
  } else if (
    audiverisHandler.includes("setRecognizedNotes") ||
    audiverisHandler.includes("setRecognizeStatus")
  ) {
    fail(
      `${filePath} must not write Audiveris dev results into the main recognition state.`,
    );
  } else {
    pass(
      `${filePath} keeps Audiveris dev results out of the main recognition state.`,
    );
  }
};

if (!existsSync(routePath)) {
  fail(`${routePath} must exist.`);
} else {
  pass(`${routePath} exists.`);
  const routeSource = readSource(routePath);

  assertContains(routePath, routeSource, /\bspawn\s*\(/, "call spawn");
  assertContains(
    routePath,
    routeSource,
    /AUDIVERIS_DEV_API_ENABLED/,
    "include the AUDIVERIS_DEV_API_ENABLED gate",
  );
  assertContains(
    routePath,
    routeSource,
    /AUDIVERIS_DEV_API_ENABLED\s*!==\s*["']true["'][\s\S]*?status:\s*404/,
    "return 404 when the gate is not enabled",
  );
  assertContains(
    routePath,
    routeSource,
    /AUDIVERIS_PATH/,
    "mention AUDIVERIS_PATH",
  );
  assertContains(
    routePath,
    routeSource,
    /status:\s*429/,
    "return 429 when Audiveris is busy",
  );
  assertOrder(
    routePath,
    routeSource,
    "isAudiverisRunning = true",
    "await request.formData()",
    "set isAudiverisRunning = true before await request.formData()",
  );
  assertContains(routePath, routeSource, /finally\s*{/, "include finally");
  assertFinallyReleasesLock(routePath, routeSource);
  assertContains(
    routePath,
    routeSource,
    /application\/pdf|\.pdf/i,
    "include a PDF-only upload check",
  );
  assertContains(
    routePath,
    routeSource,
    /10\s*\*\s*1024\s*\*\s*1024|10485760|10 MB/i,
    "include a 10MB upload limit",
  );
  assertContains(
    routePath,
    routeSource,
    /tmpdir\s*\(/,
    "use the system temp dir via tmpdir",
  );
  assertContains(
    routePath,
    routeSource,
    /\brm\s*\([\s\S]*recursive:\s*true[\s\S]*force:\s*true/,
    "cleanup the temp dir",
  );
  assertContains(
    routePath,
    routeSource,
    /setTimeout|timeout/i,
    "include a timeout",
  );
  assertContains(routePath, routeSource, /\.mxl/, "find generated .mxl output");
  assertContains(
    routePath,
    routeSource,
    /extractMusicXMLFromMxl\s*\(/,
    "call extractMusicXMLFromMxl",
  );
  assertContains(
    routePath,
    routeSource,
    /parseMusicXML\s*\(/,
    "call parseMusicXML",
  );
  assertContains(
    routePath,
    routeSource,
    /implemented:\s*true/,
    "return implemented: true",
  );
  assertContains(routePath, routeSource, /noteCount/, "return noteCount");
  assertContains(routePath, routeSource, /firstNotes/, "return firstNotes");
  assertContains(
    routePath,
    routeSource,
    /AUDIVERIS_DEV_API_RETURN_FULL_NOTES/,
    "include the full notes response env gate",
  );
  assertContains(
    routePath,
    routeSource,
    /includeNotes\s*===\s*["']full["'][\s\S]*AUDIVERIS_DEV_API_RETURN_FULL_NOTES\s*===\s*["']true["']/,
    "gate full notes on includeNotes=full and AUDIVERIS_DEV_API_RETURN_FULL_NOTES=true",
  );
  assertContains(
    routePath,
    routeSource,
    /MAX_RETURNED_NOTES\s*=\s*2000|slice\(\s*0\s*,\s*2000\s*\)/,
    "limit returned full notes to 2000",
  );
  assertContains(
    routePath,
    routeSource,
    /notesTruncated/,
    "return notesTruncated when full notes are included",
  );
  assertContains(
    routePath,
    routeSource,
    /\.\.\.\(shouldReturnFullNotes[\s\S]*notes:/,
    "return notes only conditionally",
  );
  assertNotContains(
    routePath,
    routeSource,
    /notes:\s*parsedScore\.notes\s*[,}]/,
    "does not unconditionally return all parsed notes",
  );
  assertNotContains(
    routePath,
    routeSource,
    /\/api\/recognize/,
    "does not call /api/recognize",
  );
}

const changedFiles = gitChangedFiles();
if (changedFiles.includes(mainApiPath)) {
  fail(
    `${mainApiPath} must not be modified by this dev-only full notes preview task.`,
  );
} else {
  pass(
    `${mainApiPath} is not modified by this dev-only full notes preview task.`,
  );
}

const pageSource = readSource(pagePath);
const apiClientSource = readSource(apiClientPath);
assertAudiverisDevUIBoundary(
  pagePath,
  pageSource,
  apiClientPath,
  apiClientSource,
);

const mainApiSource = readSource(mainApiPath);
assertNotContains(
  mainApiPath,
  mainApiSource,
  /recognize-audiveris/,
  "does not reference recognize-audiveris",
);
assertNotContains(
  mainApiPath,
  mainApiSource,
  /Audiveris/i,
  "does not reference Audiveris",
);

const recognizerFactorySource = readSource(recognizerFactoryPath);
assertContains(
  recognizerFactoryPath,
  recognizerFactorySource,
  /const\s+defaultProvider\s*:\s*RecognizerProvider\s*=\s*["']mock["']\s*;/,
  "keeps default provider set to mock",
);
const providerMatch = recognizerFactorySource.match(
  /export\s+type\s+RecognizerProvider\s*=\s*([^;]+);/,
);
if (!providerMatch)
  fail(`${recognizerFactoryPath} must define RecognizerProvider.`);
else if (providerMatch[1].includes("audiveris"))
  fail(`${recognizerFactoryPath} provider union must not include audiveris.`);
else
  pass(`${recognizerFactoryPath} provider union does not include audiveris.`);

console.log("Dev OMR API boundary validation results:");
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} - ${check.message}`);
  for (const detail of check.details) console.log(`  - ${detail}`);
}

if (failures.length > 0) {
  console.error(
    `\nDev OMR API boundary validation failed with ${failures.length} issue(s).`,
  );
  process.exit(1);
}

console.log("\nDev OMR API boundary validation passed.");
