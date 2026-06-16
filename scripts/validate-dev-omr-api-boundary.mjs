import { existsSync, readFileSync } from "node:fs";

const routePath = "app/api/dev/recognize-audiveris/route.ts";
const mainApiPath = "app/api/recognize/route.ts";
const pagePath = "app/page.tsx";
const recognizerFactoryPath = "lib/recognition/recognizerFactory.ts";

const checks = [];
const failures = [];

const pass = (message) => checks.push({ ok: true, message, details: [] });
const fail = (message, details = []) => {
  checks.push({ ok: false, message, details });
  failures.push({ message, details });
};

const readSource = (filePath) => readFileSync(filePath, "utf8");

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
  const finallyMatch = source.match(/finally\s*{[\s\S]*?isAudiverisRunning\s*=\s*false\s*;[\s\S]*?}/);
  if (finallyMatch) pass(`${filePath} releases isAudiverisRunning in finally.`);
  else fail(`${filePath} must release isAudiverisRunning = false inside finally.`);
};

const assertAudiverisDevUIBoundary = (filePath, source) => {
  assertContains(
    filePath,
    source,
    /NEXT_PUBLIC_AUDIVERIS_DEV_UI_ENABLED/,
    "includes the NEXT_PUBLIC_AUDIVERIS_DEV_UI_ENABLED gate",
  );
  assertContains(
    filePath,
    source,
    /fetch\(\s*["']\/api\/dev\/recognize-audiveris["']/,
    "calls the Audiveris dev API only from the explicit dev UI handler",
  );

  const apiReferenceIndexes = [...source.matchAll(/\/api\/dev\/recognize-audiveris/g)].map(
    (match) => match.index ?? -1,
  );

  if (apiReferenceIndexes.length !== 1) {
    fail(`${filePath} must reference /api/dev/recognize-audiveris exactly once.`, [
      `found: ${apiReferenceIndexes.length}`,
    ]);
    return;
  }

  const referenceIndex = apiReferenceIndexes[0];
  const nearbySource = source.slice(Math.max(0, referenceIndex - 2500), referenceIndex + 2500);

  if (
    nearbySource.includes("handleAudiverisDevRecognize") &&
    nearbySource.includes("formData.append(\"file\", audiverisDevFile)") &&
    source.includes("isAudiverisDevUIEnabled")
  ) {
    pass(`${filePath} references /api/dev/recognize-audiveris only in the dev-only UI logic.`);
  } else {
    fail(`${filePath} must keep /api/dev/recognize-audiveris inside the Audiveris dev-only UI logic.`);
  }

  assertNotContains(filePath, source, /\bfflate\b/, "does not import or use fflate");
  assertNotContains(filePath, source, /\bunzipSync\b/, "does not import or use unzipSync");
  assertNotContains(filePath, source, /\bmxlExtractor\b/, "does not import or use mxlExtractor");
  assertNotContains(filePath, source, /\bextractMusicXMLFromMxl\b/, "does not import or use extractMusicXMLFromMxl");
  assertNotContains(filePath, source, /child_process/, "does not reference child_process");
  assertNotContains(filePath, source, /\bspawn\b/, "does not reference spawn");
  assertNotContains(filePath, source, /\bexec\b/, "does not reference exec");
  assertNotContains(filePath, source, /\bexecFile\b/, "does not reference execFile");
  assertContains(filePath, source, /fetch\(\s*["']\/api\/recognize["']/, "keeps the main upload flow calling /api/recognize");
};

if (!existsSync(routePath)) {
  fail(`${routePath} must exist.`);
} else {
  pass(`${routePath} exists.`);
  const routeSource = readSource(routePath);

  assertContains(routePath, routeSource, /\bspawn\s*\(/, "call spawn");
  assertContains(routePath, routeSource, /AUDIVERIS_DEV_API_ENABLED/, "include the AUDIVERIS_DEV_API_ENABLED gate");
  assertContains(routePath, routeSource, /AUDIVERIS_DEV_API_ENABLED\s*!==\s*["']true["'][\s\S]*?status:\s*404/, "return 404 when the gate is not enabled");
  assertContains(routePath, routeSource, /AUDIVERIS_PATH/, "mention AUDIVERIS_PATH");
  assertContains(routePath, routeSource, /status:\s*429/, "return 429 when Audiveris is busy");
  assertOrder(routePath, routeSource, "isAudiverisRunning = true", "await request.formData()", "set isAudiverisRunning = true before await request.formData()");
  assertContains(routePath, routeSource, /finally\s*{/, "include finally");
  assertFinallyReleasesLock(routePath, routeSource);
  assertContains(routePath, routeSource, /application\/pdf|\.pdf/i, "include a PDF-only upload check");
  assertContains(routePath, routeSource, /10\s*\*\s*1024\s*\*\s*1024|10485760|10 MB/i, "include a 10MB upload limit");
  assertContains(routePath, routeSource, /tmpdir\s*\(/, "use the system temp dir via tmpdir");
  assertContains(routePath, routeSource, /\brm\s*\([\s\S]*recursive:\s*true[\s\S]*force:\s*true/, "cleanup the temp dir");
  assertContains(routePath, routeSource, /setTimeout|timeout/i, "include a timeout");
  assertContains(routePath, routeSource, /\.mxl/, "find generated .mxl output");
  assertContains(routePath, routeSource, /extractMusicXMLFromMxl\s*\(/, "call extractMusicXMLFromMxl");
  assertContains(routePath, routeSource, /parseMusicXML\s*\(/, "call parseMusicXML");
  assertContains(routePath, routeSource, /implemented:\s*true/, "return implemented: true");
  assertContains(routePath, routeSource, /noteCount/, "return noteCount");
  assertContains(routePath, routeSource, /firstNotes/, "return firstNotes");
  assertNotContains(routePath, routeSource, /\/api\/recognize/, "does not call /api/recognize");
}

const pageSource = readSource(pagePath);
assertAudiverisDevUIBoundary(pagePath, pageSource);

const mainApiSource = readSource(mainApiPath);
assertNotContains(mainApiPath, mainApiSource, /recognize-audiveris/, "does not reference recognize-audiveris");
assertNotContains(mainApiPath, mainApiSource, /Audiveris/i, "does not reference Audiveris");

const recognizerFactorySource = readSource(recognizerFactoryPath);
assertContains(recognizerFactoryPath, recognizerFactorySource, /const\s+defaultProvider\s*:\s*RecognizerProvider\s*=\s*["']mock["']\s*;/, "keeps default provider set to mock");
const providerMatch = recognizerFactorySource.match(/export\s+type\s+RecognizerProvider\s*=\s*([^;]+);/);
if (!providerMatch) fail(`${recognizerFactoryPath} must define RecognizerProvider.`);
else if (providerMatch[1].includes("audiveris")) fail(`${recognizerFactoryPath} provider union must not include audiveris.`);
else pass(`${recognizerFactoryPath} provider union does not include audiveris.`);

console.log("Dev OMR API boundary validation results:");
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} - ${check.message}`);
  for (const detail of check.details) console.log(`  - ${detail}`);
}

if (failures.length > 0) {
  console.error(`\nDev OMR API boundary validation failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log("\nDev OMR API boundary validation passed.");
