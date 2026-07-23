import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import {
  P119_CONTENT_REVIEW_SOURCE_COMMIT,
  P119_CONTENT_REVIEW_SOURCE_PATHS,
  buildP119ContentReviewManifest,
  calculateP119ContentReviewManifestSha256,
  getP119ContentReviewManifestItemIds,
  serializeP119ContentReviewManifest,
  toP119ReviewJsonValue,
  type JsonValue,
} from "../lib/release/p119ContentReviewManifest";
import { buildP119LocalContentInventory } from "../lib/release/p119ContentEducationEvidence";

const manifestPath =
  `local-fixtures/p119-content-education/review-manifest.${P119_CONTENT_REVIEW_SOURCE_COMMIT}.json`;
const sourceFiles = P119_CONTENT_REVIEW_SOURCE_PATHS.map((path) => ({
  path,
  sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
}));
const first = buildP119ContentReviewManifest({
  sourceCommitSha: P119_CONTENT_REVIEW_SOURCE_COMMIT,
  sourceFiles,
});
const second = buildP119ContentReviewManifest({
  sourceCommitSha: P119_CONTENT_REVIEW_SOURCE_COMMIT,
  sourceFiles: [...sourceFiles].reverse(),
});

assert.deepEqual(first, second, "source path input order must not affect the manifest");
const serialized = serializeP119ContentReviewManifest(first);
assert.equal(serialized, serializeP119ContentReviewManifest(second));
assert.equal(serialized.endsWith("\n"), true);
assert.equal(serialized.endsWith("\n\n"), false);
assert.equal(serialized.includes("\r"), false);
assert.equal(serialized.charCodeAt(0) === 0xfeff, false);
assert.equal(serialized, readFileSync(manifestPath, "utf8"));

const digest = calculateP119ContentReviewManifestSha256(first);
assert.match(digest, /^[0-9a-f]{64}$/);
assert.equal(
  readFileSync(`${manifestPath}.sha256`, "utf8"),
  `${digest}  review-manifest.${P119_CONTENT_REVIEW_SOURCE_COMMIT}.json\n`,
);

assert.equal(first.source.sourceCommitSha, P119_CONTENT_REVIEW_SOURCE_COMMIT);
assert.equal(first.source.catalogVersion, 10);
assert.equal(first.source.catalogMode, "expanded-local-v2");
assert.equal(first.groups.length, 30);
assert.equal(first.items.length, 1855);
assert.equal(first.courseItems.length, 3);
assert.equal(first.scope.generatedKindCount, 10);
assert.equal(first.scope.courseLessonCount, 3);
assert.equal(first.evidenceBoundary.professionalVariantTarget, "BLOCKED");
assert.equal(first.evidenceBoundary.samplingPlan, "NOT_EXECUTED");
assert.equal(first.evidenceBoundary.teacherReviews, "NOT_EXECUTED");
assert.equal(first.evidenceBoundary.educationValidity, "NOT_EXECUTED");

const inventory = buildP119LocalContentInventory();
assert.deepEqual(
  first.groups.map(({ kind, difficulty, variantCount }) => ({
    kind,
    difficulty,
    variantCount,
  })),
  inventory.map(({ kind, difficulty, variantCount }) => ({
    kind,
    difficulty,
    variantCount,
  })),
);
assert.deepEqual(
  first.sourceFiles.map((item) => item.path),
  [...P119_CONTENT_REVIEW_SOURCE_PATHS],
);
const kindRank = [
  "single-pitch",
  "interval",
  "chord-inversion",
  "harmony-progression",
  "scale-mode",
  "seventh-chord",
  "seventh-chord-spacing",
  "modulation",
  "rhythm",
  "melody-dictation",
];
const difficultyRank = ["基础", "进阶", "挑战"];
for (let index = 1; index < first.items.length; index += 1) {
  const previous = first.items[index - 1];
  const current = first.items[index];
  const previousTuple = [
    kindRank.indexOf(previous.kind),
    difficultyRank.indexOf(previous.difficulty),
    previous.variantId,
  ] as const;
  const currentTuple = [
    kindRank.indexOf(current.kind),
    difficultyRank.indexOf(current.difficulty),
    current.variantId,
  ] as const;
  assert.ok(
    previousTuple[0] < currentTuple[0]
    || (
      previousTuple[0] === currentTuple[0]
      && (
        previousTuple[1] < currentTuple[1]
        || (
          previousTuple[1] === currentTuple[1]
          && previousTuple[2] < currentTuple[2]
        )
      )
    ),
    `manifest item order drifted at ${previous.reviewItemId}`,
  );
}
for (const group of first.groups) {
  assert.equal(group.reviewItemIds.length, group.variantCount);
  assert.deepEqual(
    group.reviewItemIds,
    first.items
      .filter((item) =>
        item.kind === group.kind && item.difficulty === group.difficulty)
      .map((item) => item.reviewItemId),
  );
  const variantIds = first.items
    .filter((item) =>
      item.kind === group.kind && item.difficulty === group.difficulty)
    .map((item) => item.variantId);
  assert.deepEqual(variantIds, [...variantIds].sort());
}

const allReviewItemIds = getP119ContentReviewManifestItemIds(first);
assert.equal(new Set(allReviewItemIds).size, 1858);
assert.equal(allReviewItemIds.length, 1858);
assert.ok(allReviewItemIds.every((item) =>
  item.startsWith("question:") || item.startsWith("course:")));
assert.deepEqual(
  first.courseItems.map((item) =>
    (item.lesson as { prerequisiteLessonIds: string[] }).prerequisiteLessonIds),
  [
    [],
    ["00000000-0000-0000-0000-000000000101"],
    ["00000000-0000-0000-0000-000000000102"],
  ],
);
assert.deepEqual(
  first.courseItems.map((item) =>
    (item.lesson as { id: string }).id),
  [
    "00000000-0000-0000-0000-000000000101",
    "00000000-0000-0000-0000-000000000102",
    "00000000-0000-0000-0000-000000000103",
  ],
);
assert.ok(first.courseItems.every((item) =>
  item.courseObjective.length > 0 && item.chapterObjective.length > 0));

for (const item of first.items) {
  assert.ok(item.contentVersions.length > 0);
  assert.ok(item.representations.length > 0);
  assert.equal("id" in (item.representations[0].questionSnapshot as object), false);
  assert.equal("sequence" in (item.representations[0].questionSnapshot as object), false);
  for (const representation of item.representations) {
    const activity = representation.activityDefinition as {
      schemaVersion: string;
      contentVersion: string;
      target: { expectedAnswer: unknown };
      explanation: string;
    };
    assert.equal(activity.schemaVersion, "activity-definition-v1");
    assert.ok(item.contentVersions.includes(activity.contentVersion));
    assert.ok(activity.target.expectedAnswer);
    assert.ok(activity.explanation.length > 0);
  }
}
const intervalItems = first.items.filter((item) => item.kind === "interval");
assert.ok(intervalItems.length > 0);
assert.ok(intervalItems.every((item) =>
  item.representations.map((entry) => entry.representationId).join("|") === "上行|下行"));

const forbiddenKeys = new Set([
  "score",
  "grade",
  "pass",
  "fail",
  "accuracy",
  "accuracyPercentage",
  "teacherReviewApproved",
]);
const visit = (value: JsonValue): void => {
  if (Array.isArray(value)) {
    value.forEach(visit);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      assert.equal(forbiddenKeys.has(key), false, `forbidden evidence field: ${key}`);
      visit(nested);
    }
  }
};
visit(JSON.parse(serialized) as JsonValue);

assert.throws(
  () => buildP119ContentReviewManifest({
    sourceCommitSha: "not-a-commit",
    sourceFiles,
  }),
  /40 位小写十六进制/,
);
assert.throws(
  () => buildP119ContentReviewManifest({
    sourceCommitSha: P119_CONTENT_REVIEW_SOURCE_COMMIT,
    sourceFiles: sourceFiles.slice(1),
  }),
  /source file/,
);
const changedSourceFiles = structuredClone(sourceFiles);
changedSourceFiles[0].sha256 = "f".repeat(64);
const changedDigest = calculateP119ContentReviewManifestSha256(
  buildP119ContentReviewManifest({
    sourceCommitSha: P119_CONTENT_REVIEW_SOURCE_COMMIT,
    sourceFiles: changedSourceFiles,
  }),
);
assert.notEqual(changedDigest, digest);
assert.throws(() => toP119ReviewJsonValue(Number.NaN), /NaN/);
assert.throws(() => toP119ReviewJsonValue(Number.POSITIVE_INFINITY), /Infinity/);
assert.throws(() => toP119ReviewJsonValue({ missing: undefined }), /非 JSON/);
const circular: { self?: unknown } = {};
circular.self = circular;
assert.throws(() => toP119ReviewJsonValue(circular), /循环引用/);

const verifier = resolve(
  ".next/p119-content-review-manifest/scripts/verify-p119-content-review-manifest.js",
);
const exporter = resolve(
  ".next/p119-content-review-manifest/scripts/export-p119-content-review-manifest.js",
);
const temporaryDirectory = mkdtempSync(join(tmpdir(), "p119-manifest-"));
try {
  const temporaryManifest = join(
    temporaryDirectory,
    `review-manifest.${P119_CONTENT_REVIEW_SOURCE_COMMIT}.json`,
  );
  writeFileSync(temporaryManifest, serialized);
  writeFileSync(
    `${temporaryManifest}.sha256`,
    `${digest}  review-manifest.${P119_CONTENT_REVIEW_SOURCE_COMMIT}.json\n`,
  );
  const validVerification = spawnSync(
    process.execPath,
    [verifier, "--manifest", temporaryManifest],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(validVerification.status, 0, validVerification.stderr);

  const tampered = serialized.replace(
    '"catalogVersion": 10',
    '"catalogVersion": 11',
  );
  const tamperedDigest = createHash("sha256").update(tampered).digest("hex");
  writeFileSync(temporaryManifest, tampered);
  writeFileSync(
    `${temporaryManifest}.sha256`,
    `${tamperedDigest}  review-manifest.${P119_CONTENT_REVIEW_SOURCE_COMMIT}.json\n`,
  );
  const tamperedVerification = spawnSync(
    process.execPath,
    [verifier, "--manifest", temporaryManifest],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(tamperedVerification.status, 1);
  assert.match(tamperedVerification.stderr, /canonical|P119/i);

  const renamedManifest = join(temporaryDirectory, "renamed.json");
  writeFileSync(renamedManifest, serialized);
  writeFileSync(`${renamedManifest}.sha256`, `${digest}  renamed.json\n`);
  const renamedVerification = spawnSync(
    process.execPath,
    [verifier, "--manifest", renamedManifest],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(renamedVerification.status, 1);
  assert.match(renamedVerification.stderr, /文件名/);

  const linkDirectory = join(temporaryDirectory, "link");
  mkdirSync(linkDirectory);
  const symlinkManifest = join(
    linkDirectory,
    `review-manifest.${P119_CONTENT_REVIEW_SOURCE_COMMIT}.json`,
  );
  symlinkSync(resolve(manifestPath), symlinkManifest);
  writeFileSync(
    `${symlinkManifest}.sha256`,
    `${digest}  review-manifest.${P119_CONTENT_REVIEW_SOURCE_COMMIT}.json\n`,
  );
  const symlinkVerification = spawnSync(
    process.execPath,
    [verifier, "--manifest", symlinkManifest],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(symlinkVerification.status, 1);
  assert.match(symlinkVerification.stderr, /符号链接/);

  const exportedDirectory = join(temporaryDirectory, "exported");
  const exportArgs = [
    exporter,
    "--source-commit",
    P119_CONTENT_REVIEW_SOURCE_COMMIT,
    "--output-dir",
    exportedDirectory,
  ];
  const firstExport = spawnSync(process.execPath, exportArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(firstExport.status, 0, firstExport.stderr);
  const secondExport = spawnSync(process.execPath, exportArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(secondExport.status, 0, secondExport.stderr);
  assert.match(secondExport.stdout, /已存在且内容一致/);

  const fakeCommitExport = spawnSync(
    process.execPath,
    [
      exporter,
      "--source-commit",
      "a".repeat(40),
      "--output-dir",
      join(temporaryDirectory, "fake"),
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(fakeCommitExport.status, 1);

  const missingCommitExport = spawnSync(
    process.execPath,
    [exporter, "--output-dir", join(temporaryDirectory, "missing")],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(missingCommitExport.status, 1);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

console.log("P119 content review manifest focused tests passed.");
