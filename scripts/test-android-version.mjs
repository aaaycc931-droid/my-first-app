import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseAndroidVersionPackage,
  readAndroidVersion,
} from "./android-version.mjs";
import { validateAndroidVersionSource } from "./validate-android-version-source.mjs";

const validPackage = {
  name: "fixture",
  version: "0.2.0",
  solfeggio: { androidVersionCode: 2 },
};
const validGradle = `
import groovy.json.JsonSlurper
def packageMetadata = new JsonSlurper().parse(file('../../package.json'))
def androidVersionName = packageMetadata.version as String
def androidVersionCode = packageMetadata.solfeggio.androidVersionCode as Integer
android { defaultConfig { versionCode androidVersionCode; versionName androidVersionName } }
`;

assert.deepEqual(parseAndroidVersionPackage(validPackage), {
  versionName: "0.2.0",
  versionCode: 2,
});

for (const [description, packageMetadata, expected] of [
  ["缺少 version", { solfeggio: { androidVersionCode: 2 } }, "version"],
  ["非 SemVer version", { ...validPackage, version: "foo" }, "stable SemVer"],
  ["前导零 version", { ...validPackage, version: "01.0.0" }, "stable SemVer"],
  ["缺少 versionCode", { ...validPackage, solfeggio: {} }, "androidVersionCode"],
  ["小数 versionCode", { ...validPackage, solfeggio: { androidVersionCode: 2.5 } }, "1 到"],
  ["字符串 versionCode", { ...validPackage, solfeggio: { androidVersionCode: "2" } }, "1 到"],
  ["超上限 versionCode", { ...validPackage, solfeggio: { androidVersionCode: 2_100_000_001 } }, "2100000000"],
]) {
  assert.throws(
    () => parseAndroidVersionPackage(packageMetadata),
    (error) => error instanceof Error && error.message.includes(expected),
    description,
  );
}

const makeFixture = ({
  packageMetadata = validPackage,
  lockVersion = validPackage.version,
  gradle = validGradle,
  changelog = "## 0.2.0（versionCode 2）\n\n- 私测版本。\n",
} = {}) => {
  const directory = mkdtempSync(join(tmpdir(), "android-version-"));
  const packageJsonPath = join(directory, "package.json");
  const packageLockPath = join(directory, "package-lock.json");
  const appGradlePath = join(directory, "build.gradle");
  const changelogPath = join(directory, "android-private-test-changelog.md");
  writeFileSync(packageJsonPath, JSON.stringify(packageMetadata));
  writeFileSync(
    packageLockPath,
    JSON.stringify({ version: lockVersion, packages: { "": { version: lockVersion } } }),
  );
  writeFileSync(appGradlePath, gradle);
  writeFileSync(changelogPath, changelog);
  return { packageJsonPath, packageLockPath, appGradlePath, changelogPath };
};

assert.deepEqual(readAndroidVersion(makeFixture().packageJsonPath), {
  versionName: "0.2.0",
  versionCode: 2,
});
assert.deepEqual(validateAndroidVersionSource(makeFixture()), {
  versionName: "0.2.0",
  versionCode: 2,
});

assert.throws(
  () => validateAndroidVersionSource(makeFixture({ lockVersion: "0.1.0" })),
  (error) => error instanceof Error && error.message.includes("package-lock.json"),
  "锁文件版本不一致必须失败",
);
assert.throws(
  () =>
    validateAndroidVersionSource(
      makeFixture({ gradle: `${validGradle}\nversionCode 99` }),
    ),
  (error) => error instanceof Error && error.message.includes("硬编码版本"),
  "Gradle 硬编码版本必须失败",
);
for (const [description, changelog] of [
  ["变更记录缺少当前标题", "## 0.1.0（versionCode 1）\n"],
  [
    "变更记录重复当前标题",
    "## 0.2.0（versionCode 2）\n## 0.2.0（versionCode 2）\n",
  ],
  ["变更记录 versionCode 错误", "## 0.2.0（versionCode 3）\n"],
]) {
  assert.throws(
    () => validateAndroidVersionSource(makeFixture({ changelog })),
    (error) => error instanceof Error && error.message.includes("恰好包含一次"),
    description,
  );
}
assert.throws(
  () => readAndroidVersion(join(tmpdir(), "missing-android-version.json")),
  (error) => error instanceof Error && error.message.includes("无法读取或解析"),
  "缺失 package.json 必须失败",
);

console.log("Android 版本单一来源正负夹具测试通过");
