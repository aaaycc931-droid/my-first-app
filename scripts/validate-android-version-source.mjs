import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readAndroidVersion } from "./android-version.mjs";

const fail = (message) => {
  throw new Error(`Android 版本单一来源校验失败：${message}`);
};

const readJson = (path, description) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${description}无法读取或解析：${error.message}`);
  }
};

export const validateAndroidVersionSource = ({
  packageJsonPath,
  packageLockPath,
  appGradlePath,
  changelogPath,
}) => {
  const { versionName, versionCode } = readAndroidVersion(packageJsonPath);
  const packageLock = readJson(packageLockPath, "package-lock.json ");
  if (
    packageLock.version !== versionName ||
    packageLock.packages?.[""]?.version !== versionName
  ) {
    fail("package-lock.json 顶层及根包版本必须与 package.json version 一致");
  }

  const appGradle = readFileSync(appGradlePath, "utf8");
  for (const [pattern, description] of [
    [/import\s+groovy\.json\.JsonSlurper/, "JsonSlurper 导入"],
    [/new\s+JsonSlurper\(\)\.parse\(file\(['\"]\.\.\/\.\.\/package\.json['\"]\)\)/, "package.json 读取"],
    [/androidVersionName\s*=\s*packageMetadata\.version\s+as\s+String/, "versionName 映射"],
    [/androidVersionCode\s*=\s*packageMetadata\.solfeggio\.androidVersionCode\s+as\s+Integer/, "versionCode 映射"],
    [/versionName\s+androidVersionName\b/, "defaultConfig versionName 引用"],
    [/versionCode\s+androidVersionCode\b/, "defaultConfig versionCode 引用"],
  ]) {
    if (!pattern.test(appGradle)) {
      fail(`android/app/build.gradle 缺少受控的${description}`);
    }
  }
  if (/versionName\s+["'][^"']+["']/.test(appGradle) || /versionCode\s+\d+\b/.test(appGradle)) {
    fail("android/app/build.gradle 不得保留硬编码版本");
  }

  let changelog;
  try {
    changelog = readFileSync(changelogPath, "utf8");
  } catch (error) {
    fail(`Android 私测变更记录无法读取：${error.message}`);
  }
  const expectedHeading = `## ${versionName}（versionCode ${versionCode}）`;
  const headingCount = changelog
    .split(/\r?\n/)
    .filter((line) => line === expectedHeading).length;
  if (headingCount !== 1) {
    fail(`变更记录必须恰好包含一次标题“${expectedHeading}”`);
  }

  return { versionName, versionCode };
};

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  const root = process.cwd();
  const result = validateAndroidVersionSource({
    packageJsonPath: join(root, "package.json"),
    packageLockPath: join(root, "package-lock.json"),
    appGradlePath: join(root, "android/app/build.gradle"),
    changelogPath: join(root, "docs/android-private-test-changelog.md"),
  });
  console.log(
    `Android 版本单一来源校验通过：${result.versionName}（versionCode ${result.versionCode}）`,
  );
}
