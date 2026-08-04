import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const ZERO_SHA_PATTERN = /^0{40}$/;

const INFRA_FILES = new Set([
  ".editorconfig",
  ".gitignore",
  ".npmrc",
  "capacitor.config.ts",
  "eslint.config.mjs",
  "next.config.mjs",
  "package-lock.json",
  "package.json",
  "postcss.config.js",
  "tailwind.config.ts",
  "tsconfig.json",
  "vitest.mobile.config.ts",
]);

function isRootDocumentation(path) {
  return !path.includes("/") && (/\.md$/i.test(path) || path === "LICENSE");
}

export function classifyChangedPaths(paths, options = {}) {
  const uniquePaths = [...new Set(paths.filter(Boolean))].sort();
  const categories = {
    docs: false,
    web: false,
    android: false,
    shared: false,
    database: false,
    infra: false,
    dependency: false,
    unknown: false,
  };

  for (const path of uniquePaths) {
    if (path.startsWith("docs/") || isRootDocumentation(path)) {
      categories.docs = true;
    } else if (path === "package.json" || path === "package-lock.json") {
      categories.infra = true;
      categories.dependency = true;
    } else if (path.startsWith(".github/") || path.startsWith("scripts/") || INFRA_FILES.has(path)) {
      categories.infra = true;
    } else if (path.startsWith("supabase/")) {
      categories.database = true;
    } else if (path.startsWith("android/") || path.startsWith("mobile/") || path.startsWith("mobile-dist/")) {
      categories.android = true;
    } else if (path.startsWith("app/") || path.startsWith("components/") || path.startsWith("public/")) {
      categories.web = true;
    } else if (path.startsWith("lib/") || path.startsWith("local-fixtures/")) {
      categories.shared = true;
    } else {
      categories.unknown = true;
    }
  }

  const forcedFull = Boolean(options.forceFullReason);
  const emptyDiff = uniquePaths.length === 0;
  const full = forcedFull
    || emptyDiff
    || categories.database
    || categories.infra
    || categories.unknown;
  const docsOnly = categories.docs
    && !categories.web
    && !categories.android
    && !categories.shared
    && !categories.database
    && !categories.infra
    && !categories.unknown;

  const labels = Object.entries(categories)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
  if (forcedFull) labels.push("forced-full");
  if (emptyDiff) labels.push("empty-diff");

  return {
    ...categories,
    full,
    docsOnly,
    runCode: full || !docsOnly,
    runWeb: full || categories.web || categories.shared,
    runAndroid: full || categories.android || categories.shared,
    runAudit: categories.dependency || forcedFull,
    classification: labels.join(",") || "unknown",
    changedCount: uniquePaths.length,
    changedPaths: uniquePaths,
    fullReason: options.forceFullReason ?? (emptyDiff ? "empty-diff" : ""),
  };
}

export function parseNameStatus(buffer) {
  const fields = buffer.toString("utf8").split("\0");
  if (fields.at(-1) === "") fields.pop();

  const paths = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (!status) throw new Error("git diff emitted an empty status field");

    if (status.startsWith("R") || status.startsWith("C")) {
      const oldPath = fields[index++];
      const newPath = fields[index++];
      if (!oldPath || !newPath) throw new Error(`git diff emitted an incomplete ${status} record`);
      paths.push(oldPath, newPath);
    } else {
      const path = fields[index++];
      if (!path) throw new Error(`git diff emitted an incomplete ${status} record`);
      paths.push(path);
    }
  }

  return paths;
}

export function selectComparison({ eventName, baseSha, beforeSha, headSha }) {
  if (eventName === "workflow_dispatch" || eventName === "schedule") {
    return { forceFullReason: eventName };
  }

  if (!SHA_PATTERN.test(headSha ?? "")) {
    return { forceFullReason: "invalid-head-sha" };
  }

  if (eventName === "pull_request") {
    if (!SHA_PATTERN.test(baseSha ?? "")) {
      return { forceFullReason: "invalid-pr-base-sha" };
    }
    return { baseSha, headSha, useMergeBase: true };
  }

  if (eventName === "push") {
    if (!SHA_PATTERN.test(beforeSha ?? "") || ZERO_SHA_PATTERN.test(beforeSha)) {
      return { forceFullReason: "invalid-push-before-sha" };
    }
    return { baseSha: beforeSha, headSha, useMergeBase: false };
  }

  return { forceFullReason: `unsupported-event-${eventName || "unknown"}` };
}

function changedPathsForComparison(comparison) {
  let diffBase = comparison.baseSha;
  if (comparison.useMergeBase) {
    diffBase = execFileSync("git", ["merge-base", comparison.baseSha, comparison.headSha], {
      encoding: "utf8",
    }).trim();
    if (!SHA_PATTERN.test(diffBase)) throw new Error("git merge-base did not return a commit SHA");
  }

  const output = execFileSync(
    "git",
    ["diff", "--name-status", "-z", "--find-renames", diffBase, comparison.headSha, "--"],
    { encoding: "buffer", maxBuffer: 10 * 1024 * 1024 },
  );
  return parseNameStatus(output);
}

function booleanOutput(value) {
  return value ? "true" : "false";
}

function writeGitHubOutputs(result) {
  if (!process.env.GITHUB_OUTPUT) return;
  const outputs = {
    docs_only: booleanOutput(result.docsOnly),
    run_code: booleanOutput(result.runCode),
    run_web: booleanOutput(result.runWeb),
    run_android: booleanOutput(result.runAndroid),
    run_audit: booleanOutput(result.runAudit),
    full: booleanOutput(result.full),
    classification: result.classification,
    changed_count: String(result.changedCount),
    full_reason: result.fullReason,
  };
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `${Object.entries(outputs).map(([key, value]) => `${key}=${value}`).join("\n")}\n`,
  );
}

function writeSummary(result) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const displayedPaths = result.changedPaths.slice(0, 50);
  const omitted = result.changedPaths.length - displayedPaths.length;
  const lines = [
    "### CI change classification",
    "",
    `- Classification: \`${result.classification}\``,
    `- Changed paths: ${result.changedCount}`,
    `- Full fallback: ${booleanOutput(result.full)}`,
    `- Run code suite: ${booleanOutput(result.runCode)}`,
    `- Run Web build: ${booleanOutput(result.runWeb)}`,
    `- Run Android build: ${booleanOutput(result.runAndroid)}`,
  ];
  if (result.fullReason) lines.push(`- Full reason: \`${result.fullReason}\``);
  if (displayedPaths.length) {
    lines.push("", "<details><summary>Changed paths</summary>", "", "```text", ...displayedPaths, "```", "</details>");
  }
  if (omitted > 0) lines.push("", `_${omitted} additional paths omitted from this summary._`);
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
}

export function runFromEnvironment(environment = process.env) {
  const comparison = selectComparison({
    eventName: environment.GITHUB_EVENT_NAME,
    baseSha: environment.CI_BASE_SHA,
    beforeSha: environment.CI_BEFORE_SHA,
    headSha: environment.CI_HEAD_SHA,
  });

  let result;
  if (comparison.forceFullReason) {
    result = classifyChangedPaths([], { forceFullReason: comparison.forceFullReason });
  } else {
    try {
      result = classifyChangedPaths(changedPathsForComparison(comparison));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      result = classifyChangedPaths([], { forceFullReason: `diff-error-${reason.replaceAll("\n", " ")}` });
    }
  }

  writeGitHubOutputs(result);
  writeSummary(result);
  if (!environment.GITHUB_OUTPUT) console.log(JSON.stringify(result, null, 2));
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) runFromEnvironment();
