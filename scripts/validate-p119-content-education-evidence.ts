import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

import {
  evaluateP119ContentEducationEvidence,
  type P119ContentEducationEvidenceInput,
} from "../lib/release/p119ContentEducationEvidence";
import {
  P119_CONTENT_REVIEW_SOURCE_PATHS,
  buildP119ContentReviewManifest,
  serializeP119ContentReviewManifest,
  type P119ContentReviewManifest,
} from "../lib/release/p119ContentReviewManifest";

const evidencePath = resolve(
  process.cwd(),
  "local-fixtures/p119-content-education/evidence.local.json",
);

if (!existsSync(evidencePath)) {
  console.error(
    "尚无 P119a 本地教师审核证据文件。请复制 evidence.example.json 为 evidence.local.json，并只按真实执行结果填写；不得填写猜测值。",
  );
  process.exitCode = 2;
} else {
  const parsed = JSON.parse(
    readFileSync(evidencePath, "utf8"),
  ) as P119ContentEducationEvidenceInput;
  if (
    parsed.schemaVersion !== 2
    || !parsed.candidate
    || !/^[0-9a-f]{40}$/.test(parsed.candidate.sourceCommitSha)
  ) {
    throw new Error("P119 本地证据必须先提供 schema v2 与合法的 40 位 source commit。");
  }
  const expectedManifestFile =
    `review-manifest.${parsed.candidate.sourceCommitSha}.json`;
  if (
    parsed.candidate.reviewManifestFile !== expectedManifestFile
    || basename(parsed.candidate.reviewManifestFile) !== parsed.candidate.reviewManifestFile
  ) {
    throw new Error("P119 本地证据引用的 manifest 文件名与 source commit 不一致。");
  }
  const manifestDirectory = resolve(
    process.cwd(),
    "local-fixtures/p119-content-education",
  );
  const manifestPath = resolve(
    manifestDirectory,
    expectedManifestFile,
  );
  if (dirname(manifestPath) !== manifestDirectory) {
    throw new Error("P119 本地证据引用的 manifest 路径越界。");
  }
  const serializedManifest = readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(serializedManifest) as P119ContentReviewManifest;
  execFileSync(
    "git",
    ["cat-file", "-e", `${parsed.candidate.sourceCommitSha}^{commit}`],
    { stdio: "ignore" },
  );
  const sourceFiles = P119_CONTENT_REVIEW_SOURCE_PATHS.map((path) => {
    const frozenBytes = Buffer.from(execFileSync(
      "git",
      ["show", `${parsed.candidate.sourceCommitSha}:${path}`],
      { maxBuffer: 20 * 1024 * 1024 },
    ));
    const currentBytes = readFileSync(resolve(process.cwd(), path));
    if (!frozenBytes.equals(currentBytes)) {
      throw new Error(`当前内容真源与 P119 source commit 不一致：${path}`);
    }
    return {
      path,
      sha256: createHash("sha256").update(frozenBytes).digest("hex"),
    };
  });
  const rebuiltManifest = buildP119ContentReviewManifest({
    sourceCommitSha: parsed.candidate.sourceCommitSha,
    sourceFiles,
  });
  if (serializeP119ContentReviewManifest(rebuiltManifest) !== serializedManifest) {
    throw new Error("P119 本地证据引用的 manifest 与当前内容真源不一致。");
  }
  const sha256 = createHash("sha256")
    .update(serializedManifest, "utf8")
    .digest("hex");
  const result = evaluateP119ContentEducationEvidence(parsed, undefined, {
    manifest,
    serializedManifest,
    sha256,
  });
  for (const check of result.checks) {
    console.log(
      `${check.passed ? "PASS" : "BLOCKED"} | ${check.label} | 当前：${check.observed} | 要求：${check.required}`,
    );
  }
  console.log(
    result.inventoryReadyForHumanReview
      ? "当前内容盘点达到本批次进入人工审核的自动前置条件。"
      : "当前内容盘点仍有自动前置阻塞；不得开始或宣称完成本批次教育审核。",
  );
  console.log(
    result.teacherReviewBatchApproved
      ? "本地记录显示双教师审核批次满足结构门槛；仍须人工核对资质、签署原件和逐题记录。"
      : "双教师审核仍为 NOT_EXECUTED / BLOCKED / INCOMPLETE；不得标记教育验收通过。",
  );
  if (!result.teacherReviewBatchApproved) process.exitCode = 2;
}
