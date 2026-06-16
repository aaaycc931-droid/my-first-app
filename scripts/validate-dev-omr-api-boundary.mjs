import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

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

const assertContains = (filePath, source, pattern, description, keyword = String(pattern)) => {
  if (pattern.test(source)) {
    pass(`${filePath} ${description}.`);
  } else {
    fail(`${filePath} must ${description}.`, [`${filePath}: missing ${keyword}`]);
  }
};

const assertNotContains = (filePath, source, pattern, description, keyword) => {
  if (pattern.test(source)) {
    fail(`${filePath} must not ${description}.`, [`${filePath}: ${keyword}`]);
  } else {
    pass(`${filePath} does not ${description}.`);
  }
};

function walkFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if ([".git", "node_modules", ".next"].includes(entry)) continue;
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) walkFiles(fullPath, files);
    else files.push(fullPath);
  }
  return files;
}

if (!existsSync(routePath)) {
  fail(`${routePath} must exist.`, [`${routePath}: missing file`]);
} else {
  pass(`${routePath} exists.`);
  const routeSource = readSource(routePath);

  assertContains(routePath, routeSource, /AUDIVERIS_DEV_API_ENABLED/, "include the AUDIVERIS_DEV_API_ENABLED gate", "AUDIVERIS_DEV_API_ENABLED");
  assertContains(routePath, routeSource, /AUDIVERIS_DEV_API_ENABLED\s*!==\s*["']true["'][\s\S]*?status:\s*404/, "return 404 when the gate is not enabled", "status: 404");
  assertContains(routePath, routeSource, /AUDIVERIS_PATH/, "check AUDIVERIS_PATH before execution", "AUDIVERIS_PATH");
  assertContains(routePath, routeSource, /MAX_.*SIZE|10\s*\*\s*1024\s*\*\s*1024|file\.size\s*>/, "contain an upload size limit", "upload size limit");
  assertContains(routePath, routeSource, /\.pdf|application\/pdf|PDF only/i, "only allow PDF input", "PDF-only check");
  assertContains(routePath, routeSource, /tmpdir\(\)|mkdtemp/, "use a system temporary isolated directory", "tmpdir/mkdtemp");
  assertContains(routePath, routeSource, /finally[\s\S]*rm\([^)]*recursive:\s*true[\s\S]*force:\s*true/, "include cleanup logic", "finally cleanup rm recursive force");
  assertContains(routePath, routeSource, /AUDIVERIS_DEV_API_TIMEOUT_MS|setTimeout|timeout/i, "include timeout logic", "timeout");
  assertContains(routePath, routeSource, /isAudiverisRunning|busy|lock|429/, "include a concurrency guard or busy lock", "concurrency guard");
  assertContains(routePath, routeSource, /devOnly:\s*true/, "return devOnly: true", "devOnly: true");
  assertContains(routePath, routeSource, /implemented:\s*true/, "return implemented: true", "implemented: true");
  assertNotContains(routePath, routeSource, /\.omr|full log|stdout|stderr/i, "return .omr or full log output", ".omr/full log/stdout/stderr");
  assertNotContains(routePath, routeSource, /fetch\(["']\/api\/recognize|\/api\/recognize/, "call /api/recognize", "/api/recognize");
}

for (const filePath of [mainApiPath, pagePath]) {
  const source = readSource(filePath);
  assertNotContains(filePath, source, /recognize-audiveris/, "reference recognize-audiveris", "recognize-audiveris");
}

const pageSource = readSource(pagePath);
assertNotContains(pagePath, pageSource, /fflate|unzipSync|mxlExtractor|extractMusicXMLFromMxl/, "contain MXL extraction keywords", "fflate/unzipSync/mxlExtractor/extractMusicXMLFromMxl");

const recognizerFactorySource = readSource(recognizerFactoryPath);
assertContains(recognizerFactoryPath, recognizerFactorySource, /const\s+defaultProvider\s*:\s*RecognizerProvider\s*=\s*["']mock["']/, "keep default provider as mock", "defaultProvider mock");
assertNotContains(recognizerFactoryPath, recognizerFactorySource, /audiveris/i, "contain an audiveris provider", "audiveris provider");

const forbiddenArtifactExtensions = new Set([
  ".pdf", ".mxl", ".xml", ".omr", ".log", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tif", ".tiff",
]);
const allowedXmlFixtures = /^lib\/musicxml\/__fixtures__\/.*\.musicxml$/;
const artifactFiles = walkFiles(".")
  .map((file) => file.replace(/^\.\//, ""))
  .filter((file) => forbiddenArtifactExtensions.has(path.extname(file).toLowerCase()))
  .filter((file) => !allowedXmlFixtures.test(file));

if (artifactFiles.length > 0) {
  fail("Repository must not contain committed PDF/MXL/XML/OMR/log/image samples.", artifactFiles.map((file) => `${file}: forbidden artifact extension`));
} else {
  pass("Repository contains no forbidden PDF/MXL/XML/OMR/log/image samples outside allowed MusicXML fixtures.");
}

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
