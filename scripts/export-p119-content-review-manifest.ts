import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";

import {
  P119_CONTENT_REVIEW_MANIFEST_FILENAME_PREFIX,
  P119_CONTENT_REVIEW_SOURCE_PATHS,
  buildP119ContentReviewManifest,
  calculateP119ContentReviewManifestSha256,
  serializeP119ContentReviewManifest,
} from "../lib/release/p119ContentReviewManifest";

const args = process.argv.slice(2);
const valueAfter = (flag: string): string | null => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
};

const sourceCommitSha = valueAfter("--source-commit");
if (!sourceCommitSha) {
  throw new Error("必须使用 --source-commit 提供被冻结内容的 40 位 commit SHA。");
}
const outputDirectory = resolve(
  valueAfter("--output-dir") ?? "local-fixtures/p119-content-education",
);
if (!/^[0-9a-f]{40}$/.test(sourceCommitSha)) {
  throw new Error("P119 清单 source commit 必须是 40 位小写十六进制 SHA。");
}
execFileSync("git", ["cat-file", "-e", `${sourceCommitSha}^{commit}`], {
  stdio: "ignore",
});
const sourceFiles = P119_CONTENT_REVIEW_SOURCE_PATHS.map((path) => {
  const frozenBytes = Buffer.from(execFileSync("git", ["show", `${sourceCommitSha}:${path}`], {
    maxBuffer: 20 * 1024 * 1024,
  }));
  const currentBytes = readFileSync(resolve(path));
  if (!frozenBytes.equals(currentBytes)) {
    throw new Error(`当前工作树与 source commit 的内容真源不一致：${path}`);
  }
  return {
    path,
    sha256: createHash("sha256").update(frozenBytes).digest("hex"),
  };
});
const manifest = buildP119ContentReviewManifest({ sourceCommitSha, sourceFiles });
const serialized = serializeP119ContentReviewManifest(manifest);
const digest = calculateP119ContentReviewManifestSha256(manifest);
const filename = `${P119_CONTENT_REVIEW_MANIFEST_FILENAME_PREFIX}.${sourceCommitSha}.json`;
const checksumFilename = `${filename}.sha256`;
const temporaryManifest = join(outputDirectory, `.${filename}.tmp`);
const temporaryChecksum = join(outputDirectory, `.${checksumFilename}.tmp`);
const manifestPath = join(outputDirectory, filename);
const checksumPath = join(outputDirectory, checksumFilename);
const checksum = `${digest}  ${basename(filename)}\n`;

mkdirSync(outputDirectory, { recursive: true });
if (existsSync(manifestPath) || existsSync(checksumPath)) {
  if (
    existsSync(manifestPath)
    && existsSync(checksumPath)
    && readFileSync(manifestPath, "utf8") === serialized
    && readFileSync(checksumPath, "utf8") === checksum
  ) {
    console.log(`P119 审核清单已存在且内容一致：${manifestPath}`);
    console.log(`SHA-256：${digest}`);
    process.exit(0);
  }
  throw new Error("同一 source commit 的 P119 冻结清单不可覆盖；请核对内容基线。");
}
let publishedManifest = false;
let publishedChecksum = false;
try {
  writeFileSync(temporaryManifest, serialized, { encoding: "utf8", flag: "wx" });
  writeFileSync(
    temporaryChecksum,
    checksum,
    { encoding: "utf8", flag: "wx" },
  );
  linkSync(temporaryManifest, manifestPath);
  publishedManifest = true;
  linkSync(temporaryChecksum, checksumPath);
  publishedChecksum = true;
} catch (error) {
  if (publishedChecksum) rmSync(checksumPath, { force: true });
  if (publishedManifest) rmSync(manifestPath, { force: true });
  throw error;
} finally {
  rmSync(temporaryManifest, { force: true });
  rmSync(temporaryChecksum, { force: true });
}

console.log(`P119 审核清单已冻结：${join(outputDirectory, filename)}`);
console.log(`SHA-256：${digest}`);
