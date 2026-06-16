import { existsSync, readFileSync } from "node:fs";

const routePath = "app/api/dev/recognize-audiveris/route.ts";
const mainApiPath = "app/api/recognize/route.ts";
const pagePath = "app/page.tsx";

const checks = [];
const failures = [];

const pass = (message) => {
  checks.push({ ok: true, message, details: [] });
};

const fail = (message, details = []) => {
  checks.push({ ok: false, message, details });
  failures.push({ message, details });
};

const readSource = (filePath) => readFileSync(filePath, "utf8");

const assertContains = (filePath, source, pattern, description) => {
  if (pattern.test(source)) {
    pass(`${filePath} ${description}.`);
  } else {
    fail(`${filePath} must ${description}.`);
  }
};

const forbiddenPatterns = [
  { keyword: "child_process", pattern: /child_process/ },
  { keyword: "spawn", pattern: /\bspawn\b/ },
  { keyword: "exec", pattern: /\bexec\b/ },
  { keyword: "execFile", pattern: /\bexecFile\b/ },
  { keyword: "fflate", pattern: /fflate/ },
  { keyword: "mxlExtractor", pattern: /mxlExtractor/ },
  { keyword: "extractMusicXMLFromMxl", pattern: /extractMusicXMLFromMxl/ },
  { keyword: "getRecognizer", pattern: /getRecognizer/ },
  { keyword: "/api/recognize", pattern: /\/api\/recognize/ },
];

const assertForbiddenKeywords = (filePath, source, forbiddenItems) => {
  const found = forbiddenItems
    .filter((item) => item.pattern.test(source))
    .map((item) => item.keyword);

  if (found.length > 0) {
    fail(
      `${filePath} contains forbidden keyword(s).`,
      found.map((keyword) => `${filePath}: ${keyword}`),
    );
    return;
  }

  pass(`${filePath} contains no forbidden dev OMR boundary keywords.`);
};

if (!existsSync(routePath)) {
  fail(`${routePath} must exist.`);
} else {
  pass(`${routePath} exists.`);
  const routeSource = readSource(routePath);

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
  assertContains(routePath, routeSource, /AUDIVERIS_PATH/, "mention AUDIVERIS_PATH");
  assertContains(
    routePath,
    routeSource,
    /implemented:\s*false|skeleton only|Audiveris execution is not implemented in this skeleton/,
    "make skeleton-only unimplemented semantics explicit",
  );

  assertForbiddenKeywords(routePath, routeSource, forbiddenPatterns);
}

for (const filePath of [mainApiPath, pagePath]) {
  const source = readSource(filePath);
  if (source.includes("recognize-audiveris")) {
    fail(`${filePath} must not reference recognize-audiveris.`, [
      `${filePath}: recognize-audiveris`,
    ]);
  } else {
    pass(`${filePath} does not reference recognize-audiveris.`);
  }
}

console.log("Dev OMR API boundary validation results:");
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} - ${check.message}`);
  for (const detail of check.details) {
    console.log(`  - ${detail}`);
  }
}

if (failures.length > 0) {
  console.error(`\nDev OMR API boundary validation failed with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log("\nDev OMR API boundary validation passed.");
