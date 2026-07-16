import { readFileSync } from "node:fs";
import { join } from "node:path";

const STABLE_SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export const MAX_ANDROID_VERSION_CODE = 2_100_000_000;

const fail = (source, message) => {
  throw new Error(`Android 版本配置无效（${source}）：${message}`);
};

export const parseAndroidVersionPackage = (
  packageMetadata,
  { source = "package.json" } = {},
) => {
  if (
    packageMetadata === null ||
    Array.isArray(packageMetadata) ||
    typeof packageMetadata !== "object"
  ) {
    fail(source, "顶层必须是 JSON 对象");
  }

  const versionName = packageMetadata.version;
  if (
    typeof versionName !== "string" ||
    !STABLE_SEMVER_PATTERN.test(versionName)
  ) {
    fail(source, "version 必须是无前导零的 stable SemVer（x.y.z）");
  }

  const versionCode = packageMetadata.solfeggio?.androidVersionCode;
  if (
    !Number.isSafeInteger(versionCode) ||
    versionCode <= 0 ||
    versionCode > MAX_ANDROID_VERSION_CODE
  ) {
    fail(
      source,
      `solfeggio.androidVersionCode 必须是 1 到 ${MAX_ANDROID_VERSION_CODE} 的整数`,
    );
  }

  return Object.freeze({ versionName, versionCode });
};

export const readAndroidVersion = (
  packageJsonPath = join(process.cwd(), "package.json"),
) => {
  let packageMetadata;
  try {
    packageMetadata = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  } catch (error) {
    fail(packageJsonPath, `无法读取或解析：${error.message}`);
  }
  return parseAndroidVersionPackage(packageMetadata, {
    source: packageJsonPath,
  });
};
