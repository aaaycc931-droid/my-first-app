import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import {
  P119_CONTENT_REVIEW_SOURCE_PATHS,
  buildP119ContentReviewManifest,
  serializeP119ContentReviewManifest,
  type P119ContentReviewManifest,
} from "../lib/release/p119ContentReviewManifest";

const args = process.argv.slice(2);
const valueAfter = (flag: string): string | null => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
};
const manifestArgument = valueAfter("--manifest");
if (!manifestArgument) throw new Error("必须使用 --manifest 指定被冻结的 P119 清单。");

const manifestPath = resolve(manifestArgument);
const checksumPath = `${manifestPath}.sha256`;
for (const path of [manifestPath, checksumPath]) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`P119 清单工件必须是普通文件且不得为符号链接：${path}`);
  }
}

const serialized = readFileSync(manifestPath, "utf8");
const digest = createHash("sha256").update(serialized, "utf8").digest("hex");
const checksum = readFileSync(checksumPath, "utf8");
const expectedChecksum = `${digest}  ${basename(manifestPath)}\n`;
if (checksum !== expectedChecksum) {
  throw new Error("P119 清单 .sha256 必须精确匹配实际 UTF-8 文件与 GNU 双空格格式。");
}

const parsed = JSON.parse(serialized) as P119ContentReviewManifest;
const sourceCommitSha = parsed.source?.sourceCommitSha;
if (!/^[0-9a-f]{40}$/.test(sourceCommitSha)) {
  throw new Error("P119 清单 source commit 必须是 40 位小写十六进制 SHA。");
}
if (basename(manifestPath) !== `review-manifest.${sourceCommitSha}.json`) {
  throw new Error("P119 清单文件名必须精确绑定 parsed source commit。");
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
    throw new Error(`当前内容真源与 P119 source commit 不一致：${path}`);
  }
  return {
    path,
    sha256: createHash("sha256").update(frozenBytes).digest("hex"),
  };
});
const expected = buildP119ContentReviewManifest({
  sourceCommitSha,
  sourceFiles,
});
if (serializeP119ContentReviewManifest(expected) !== serialized) {
  throw new Error("P119 清单不是当前 source file 内容的 canonical 确定性重建结果。");
}

console.log(`P119 审核清单复验通过：${basename(manifestPath)} (${digest})`);
