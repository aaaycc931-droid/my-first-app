import { createHash } from "node:crypto";
import { mkdtempSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { verifyAndroidLocalDebugArtifact } from "./verify-android-local-debug-artifact.mjs";

const versionName = "0.1.0";
const versionCode = 1;
const commit = "0123456789abcdef0123456789abcdef01234567";
const apkFilename = `solfeggio-local-test-v${versionName}-debug.apk`;

const makeFixture = (mutate = () => {}) => {
  const directory = mkdtempSync(join(tmpdir(), "android-artifact-verify-"));
  const apk = Buffer.from("fixture-apk-content");
  const sha256 = createHash("sha256").update(apk).digest("hex");
  const files = {
    [apkFilename]: apk,
    [`${apkFilename}.sha256`]: `${sha256}  ${apkFilename}\n`,
    "android-local-build-report.json": `${JSON.stringify(
      {
        schema_version: 1,
        artifact: {
          filename: apkFilename,
          sha256,
          bytes: apk.length,
          version_name: versionName,
          version_code: versionCode,
        },
        provenance: { commit },
      },
      null,
      2,
    )}\n`,
    "android-local-build-report.md":
      `- 文件：\`${apkFilename}\`\n` +
      `- SHA-256：\`${sha256}\`\n` +
      `- 版本：\`${versionName}\`（versionCode ${versionCode}）\n` +
      `- commit：\`${commit}\`\n`,
  };
  mutate(files);
  for (const [filename, content] of Object.entries(files)) {
    writeFileSync(join(directory, filename), content);
  }
  return directory;
};

const verify = (directory) =>
  verifyAndroidLocalDebugArtifact({
    artifactDirectory: directory,
    expectedVersionName: versionName,
    expectedVersionCode: versionCode,
    expectedCommit: commit,
  });

const valid = verify(makeFixture());
assert.equal(valid.apkFilename, apkFilename);
assert.equal(valid.bytes, Buffer.byteLength("fixture-apk-content"));

for (const [description, mutate, expectedMessage] of [
  [
    "额外文件",
    (files) => {
      files["unexpected.txt"] = "not allowed";
    },
    "allowlist 外文件",
  ],
  [
    "缺少校验文件",
    (files) => {
      delete files[`${apkFilename}.sha256`];
    },
    "缺少文件",
  ],
  [
    "校验文件路径指向其他 APK",
    (files) => {
      files[`${apkFilename}.sha256`] = `${"0".repeat(64)}  other.apk\n`;
    },
    "APK 文件名不一致",
  ],
  [
    "JSON 字节数被篡改",
    (files) => {
      const report = JSON.parse(files["android-local-build-report.json"]);
      report.artifact.bytes += 1;
      files["android-local-build-report.json"] = JSON.stringify(report);
    },
    "字节数",
  ],
  [
    "JSON 摘要被篡改",
    (files) => {
      const report = JSON.parse(files["android-local-build-report.json"]);
      report.artifact.sha256 = "a".repeat(64);
      files["android-local-build-report.json"] = JSON.stringify(report);
    },
    "SHA-256",
  ],
  [
    "JSON 版本被篡改",
    (files) => {
      const report = JSON.parse(files["android-local-build-report.json"]);
      report.artifact.version_name = "9.9.9";
      files["android-local-build-report.json"] = JSON.stringify(report);
    },
    "versionName",
  ],
  [
    "JSON commit 被篡改",
    (files) => {
      const report = JSON.parse(files["android-local-build-report.json"]);
      report.provenance.commit = "f".repeat(40);
      files["android-local-build-report.json"] = JSON.stringify(report);
    },
    "commit",
  ],
]) {
  assert.throws(
    () => verify(makeFixture(mutate)),
    (error) =>
      error instanceof Error &&
      error.message.includes(expectedMessage),
    description,
  );
}

const symlinkFixture = makeFixture();
unlinkSync(join(symlinkFixture, apkFilename));
symlinkSync(
  join(symlinkFixture, `${apkFilename}.sha256`),
  join(symlinkFixture, apkFilename),
);
assert.throws(
  () => verify(symlinkFixture),
  (error) => error instanceof Error && error.message.includes("只允许普通文件"),
  "软链接必须被拒绝",
);

console.log("Android APK 工件完整性复验夹具测试通过");
