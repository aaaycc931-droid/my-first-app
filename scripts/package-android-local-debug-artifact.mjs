import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import { readAndroidVersion } from "./android-version.mjs";

const root = process.cwd();
const apkPath = join(
  root,
  "android/app/build/outputs/apk/debug/app-debug.apk",
);
const outputDirectory = join(root, "artifacts/android-local");
const appGradlePath = join(root, "android/app/build.gradle");
const packageJsonPath = join(root, "package.json");
const androidVariablesPath = join(root, "android/variables.gradle");
const manifestPath = join(root, "android/app/src/main/AndroidManifest.xml");
const capacitorConfigPath = join(root, "capacitor.config.ts");

const fail = (message) => {
  throw new Error(`Android 私测 APK 工件未通过验证：${message}`);
};

const requireMatch = (content, expression, description) => {
  const match = content.match(expression);
  if (!match) {
    fail(`无法读取 ${description}`);
  }
  return match[1];
};

const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) {
    fail(`无法执行 ${command}：${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`${command} 失败：${result.stderr || result.stdout || "未知错误"}`);
  }
  return result.stdout;
};

const getCommit = () => {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA;
  }

  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    fail("缺少 GitHub commit SHA，且无法从本地 Git 读取 HEAD");
  }
};

const getBuildTool = (name) => {
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdkRoot) {
    fail("缺少 ANDROID_HOME 或 ANDROID_SDK_ROOT，无法检查 APK 元数据");
  }

  const tool = join(sdkRoot, "build-tools", "35.0.0", name);
  if (!existsSync(tool)) {
    fail(`缺少 Android Build Tools 35.0.0 的 ${name}`);
  }
  return tool;
};

if (!existsSync(apkPath)) {
  fail("找不到 debug APK；必须先成功完成 Gradle assembleDebug");
}

if (statSync(apkPath).size === 0) {
  fail("debug APK 为空文件");
}

const appGradle = readFileSync(appGradlePath, "utf8");
const androidVariables = readFileSync(androidVariablesPath, "utf8");
const manifest = readFileSync(manifestPath, "utf8");
const capacitorConfig = readFileSync(capacitorConfigPath, "utf8");
const applicationId = requireMatch(
  appGradle,
  /applicationId\s+"([^"]+)"/,
  "applicationId",
);
const { versionCode, versionName } = readAndroidVersion(packageJsonPath);
const minSdk = Number(
  requireMatch(androidVariables, /minSdkVersion\s*=\s*(\d+)/, "minSdkVersion"),
);
const targetSdk = Number(
  requireMatch(
    androidVariables,
    /targetSdkVersion\s*=\s*(\d+)/,
    "targetSdkVersion",
  ),
);

if (applicationId !== "com.aaaycc931.solfeggio") {
  fail(`applicationId 不符合本地私测边界：${applicationId}`);
}
if (!Number.isSafeInteger(minSdk) || !Number.isSafeInteger(targetSdk)) {
  fail("minSdk 或 targetSdk 不是有效整数");
}
if (/\bserver\s*:/.test(capacitorConfig) || /https?:\/\//.test(capacitorConfig)) {
  fail("Capacitor 配置包含远程 server 或网址");
}
if (manifest.includes("android.permission.INTERNET")) {
  fail("AndroidManifest.xml 声明了网络权限");
}
if (!manifest.includes("android.permission.RECORD_AUDIO")) {
  fail("AndroidManifest.xml 缺少实时音高反馈所需的麦克风权限");
}

const aapt = getBuildTool("aapt");
const apksigner = getBuildTool("apksigner");
const badging = run(aapt, ["dump", "badging", apkPath]);
const permissions = run(aapt, ["dump", "permissions", apkPath]);
const signing = run(apksigner, ["verify", "--verbose", "--print-certs", apkPath]);

if (!/Verified using v2 scheme \(APK Signature Scheme v2\):\s+true/.test(signing)) {
  fail("debug APK 未通过 APK Signature Scheme v2 验证");
}
if (!/Signer #1 certificate DN: .*CN=Android Debug/.test(signing)) {
  fail("APK 不是受控的 Android Debug 证书签名");
}

const packagedApplicationId = requireMatch(
  badging,
  /^package: name='([^']+)'/m,
  "APK applicationId",
);
const packagedVersionCode = Number(
  requireMatch(badging, /versionCode='(\d+)'/, "APK versionCode"),
);
const packagedVersionName = requireMatch(
  badging,
  /versionName='([^']+)'/,
  "APK versionName",
);
const packagedMinSdk = Number(
  requireMatch(badging, /sdkVersion:'(\d+)'/, "APK minSdk"),
);
const packagedTargetSdk = Number(
  requireMatch(badging, /targetSdkVersion:'(\d+)'/, "APK targetSdk"),
);
const packagedLabel = requireMatch(
  badging,
  /application-label:'([^']+)'/,
  "APK 应用名",
);

if (
  packagedApplicationId !== applicationId ||
  packagedVersionCode !== versionCode ||
  packagedVersionName !== versionName ||
  packagedMinSdk !== minSdk ||
  packagedTargetSdk !== targetSdk ||
  packagedLabel !== "视唱练耳"
) {
  fail("APK 元数据与受控 Android 配置不一致");
}

for (const forbiddenPermission of [
  "android.permission.INTERNET",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.MANAGE_EXTERNAL_STORAGE",
  "android.permission.READ_MEDIA_AUDIO",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
]) {
  if (permissions.includes(forbiddenPermission)) {
    fail(`APK 包含本地私测范围外的权限：${forbiddenPermission}`);
  }
}
if (!permissions.includes("android.permission.RECORD_AUDIO")) {
  fail("APK 缺少实时音高反馈所需的麦克风权限");
}

const archiveEntries = run("unzip", ["-Z1", apkPath]).split("\n");
const bundledEntries = archiveEntries.filter(
  (entry) => /^assets\/public\/.*\.(?:html|css|js|json|svg)$/.test(entry),
);
if (!archiveEntries.includes("assets/public/index.html") || bundledEntries.length === 0) {
  fail("APK 未包含同步后的本地 Web 资源");
}

const bundledText = bundledEntries
  .map((entry) => run("unzip", ["-p", apkPath, entry]))
  .join("\n");
for (const forbiddenReference of [
  "dpluqcflynztlpophvzq.supabase.co",
  "NEXT_PUBLIC_SUPABASE",
  "supabase-js",
  "vercel.app",
]) {
  if (bundledText.includes(forbiddenReference)) {
    fail(`APK 本地资源包含云端标识：${forbiddenReference}`);
  }
}

for (const expectedCopy of [
  "单音听辨",
  "音程听辨",
  "节奏听辨",
  "旋律听写",
  "和弦与转位听辨",
  "和声进行与终止式听辨",
  "本地参考钢琴",
  "本地模式",
]) {
  if (!bundledText.includes(expectedCopy)) {
    fail(`APK 本地资源缺少核心练习文案：${expectedCopy}`);
  }
}

const commit = getCommit();
const artifactFilename = `solfeggio-local-test-v${versionName}-debug.apk`;
const artifactPath = join(outputDirectory, artifactFilename);
const checksum = createHash("sha256")
  .update(readFileSync(apkPath))
  .digest("hex");

rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });
copyFileSync(apkPath, artifactPath);
writeFileSync(
  `${artifactPath}.sha256`,
  `${checksum}  ${artifactFilename}\n`,
  "utf8",
);

const source = {
  commit,
  ref: process.env.GITHUB_REF || "local",
  repository: process.env.GITHUB_REPOSITORY || "local",
  workflow: process.env.GITHUB_WORKFLOW || "local",
  run_id: process.env.GITHUB_RUN_ID || "local",
  run_attempt: process.env.GITHUB_RUN_ATTEMPT || "local",
  event_name: process.env.GITHUB_EVENT_NAME || "local",
};
const report = {
  schema_version: 1,
  artifact: {
    filename: artifactFilename,
    sha256: checksum,
    bytes: statSync(artifactPath).size,
    application_id: packagedApplicationId,
    application_name: packagedLabel,
    version_code: packagedVersionCode,
    version_name: packagedVersionName,
    min_sdk: packagedMinSdk,
    target_sdk: packagedTargetSdk,
    signing: "Android Debug（已通过 APK Signature Scheme 验证；不是 release 签名）",
  },
  provenance: source,
  boundary_checks: {
    gradle_build_and_unit_tests: "由此前的 workflow 步骤成功完成后才会运行本脚本",
    apk_signature_verification: "passed",
    apk_metadata_matches_controlled_config: "passed",
    bundled_local_web_assets: "passed",
    remote_server_configuration: "absent",
    internet_permission: "absent",
    microphone_permission: "present_for_opt_in_realtime_pitch_and_session_recording",
    broad_storage_permission: "absent",
    production_cloud_identifiers_in_bundle: "absent",
    core_offline_exercises_present: "passed",
  },
  delivery_scope: {
    format: "APK",
    distribution: "GitHub Actions 私测工件",
    excludes: ["AAB", "release 签名密钥", "应用商店上架材料"],
    real_device_qa: "not performed by CI",
  },
};
writeFileSync(
  join(outputDirectory, "android-local-build-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
writeFileSync(
  join(outputDirectory, "android-local-build-report.md"),
  `# Android 本地私测 APK 构建报告\n\n` +
    `- 文件：\`${artifactFilename}\`\n` +
    `- SHA-256：\`${checksum}\`\n` +
    `- 版本：\`${packagedVersionName}\`（versionCode ${packagedVersionCode}）\n` +
    `- commit：\`${commit}\`\n` +
    `- 来源：${source.repository} / ${source.workflow} / run ${source.run_id}（${source.ref}）\n` +
    `- 包名：\`${packagedApplicationId}\`；minSdk / targetSdk：${packagedMinSdk} / ${packagedTargetSdk}\n` +
    `- 签名：Android Debug，APK Signature Scheme 已验证；不是 release 签名。\n\n` +
    `## 已验证的本地边界\n\n` +
    `- APK 包含本地 Web 资源、六类核心听辨练习（含和弦/转位与和声进行）及本地参考钢琴；\n` +
    `- 未声明网络或宽泛外部存储权限；麦克风权限仅用于用户主动开始的本地实时音高反馈和当前会话录音；\n` +
    `- Capacitor 配置未包含远程 server 或网址，APK bundle 未出现受控生产云端标识；\n` +
    `- 本报告仅在 Gradle 单元测试、debug APK 构建、源码 bundle 校验、APK 签名与结构校验均成功后生成。\n\n` +
    `## 边界与未覆盖项\n\n` +
    `这是 GitHub Actions 的可下载调试 APK，不是 AAB、应用商店包或专用 release 签名包。CI 不能替代真实 Android 手机的离线安装、音频和生命周期测试。\n`,
  "utf8",
);

console.log(`Android 私测 APK 工件已验证并写入：${outputDirectory}`);
