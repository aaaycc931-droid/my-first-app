import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const fail = (message) => {
  throw new Error(`Android 私测 APK 工件完整性复验失败：${message}`);
};

const requireSafeVersionName = (versionName) => {
  if (
    typeof versionName !== "string" ||
    !/^[0-9A-Za-z][0-9A-Za-z._-]*$/.test(versionName)
  ) {
    fail("versionName 缺失或包含不安全字符");
  }
  return versionName;
};

const requirePositiveInteger = (value, description) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail(`${description} 必须是正整数`);
  }
  return value;
};

const requireCommit = (commit) => {
  if (typeof commit !== "string" || !/^[0-9a-f]{40}$/i.test(commit)) {
    fail("预期 commit 必须是 40 位十六进制 Git SHA");
  }
  return commit.toLowerCase();
};

const readJsonObject = (path) => {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`构建报告 JSON 无法解析：${error.message}`);
  }
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
    fail("构建报告 JSON 顶层必须是对象");
  }
  return parsed;
};

const requireLiteralInMarkdown = (markdown, value, description) => {
  if (!markdown.includes(`\`${value}\``)) {
    fail(`Markdown 报告中的${description}与受控工件不一致`);
  }
};

export const verifyAndroidLocalDebugArtifact = ({
  artifactDirectory,
  expectedVersionName,
  expectedVersionCode,
  expectedCommit,
}) => {
  const directory = resolve(artifactDirectory);
  const versionName = requireSafeVersionName(expectedVersionName);
  const versionCode = requirePositiveInteger(
    expectedVersionCode,
    "预期 versionCode",
  );
  const commit = requireCommit(expectedCommit);
  const apkFilename = `solfeggio-local-test-v${versionName}-debug.apk`;
  const checksumFilename = `${apkFilename}.sha256`;
  const reportJsonFilename = "android-local-build-report.json";
  const reportMarkdownFilename = "android-local-build-report.md";
  const allowlist = new Set([
    apkFilename,
    checksumFilename,
    reportJsonFilename,
    reportMarkdownFilename,
  ]);

  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    fail(`无法读取工件目录：${error.message}`);
  }

  const actualNames = new Set(entries.map((entry) => entry.name));
  const missing = [...allowlist].filter((name) => !actualNames.has(name));
  const unexpected = [...actualNames].filter((name) => !allowlist.has(name));
  if (missing.length > 0) {
    fail(`缺少文件：${missing.join("、")}`);
  }
  if (unexpected.length > 0) {
    fail(`发现 allowlist 外文件：${unexpected.join("、")}`);
  }
  if (entries.length !== allowlist.size) {
    fail(`工件目录必须精确包含 ${allowlist.size} 个文件`);
  }

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (!entry.isFile() || lstatSync(path).isSymbolicLink()) {
      fail(`工件目录只允许普通文件：${entry.name}`);
    }
    if (basename(path) !== entry.name) {
      fail(`工件路径不在受控目录内：${entry.name}`);
    }
  }

  const apkPath = join(directory, apkFilename);
  const apkBytes = statSync(apkPath).size;
  if (!Number.isSafeInteger(apkBytes) || apkBytes <= 0) {
    fail("APK 必须是非空文件");
  }
  const apkSha256 = createHash("sha256")
    .update(readFileSync(apkPath))
    .digest("hex");

  const checksum = readFileSync(join(directory, checksumFilename), "utf8");
  const checksumMatch = checksum.match(/^([0-9a-f]{64})  ([^\r\n]+)\n?$/i);
  if (!checksumMatch || checksumMatch[0].length !== checksum.length) {
    fail(".sha256 必须精确包含一条 GNU 格式 SHA-256 记录");
  }
  if (checksumMatch[2] !== apkFilename) {
    fail(".sha256 中的 APK 文件名不一致");
  }
  if (checksumMatch[1].toLowerCase() !== apkSha256) {
    fail(".sha256 中的摘要与 APK 实际内容不一致");
  }

  const report = readJsonObject(join(directory, reportJsonFilename));
  if (report.schema_version !== 1) {
    fail("JSON 报告 schema_version 必须为 1");
  }
  if (
    report.artifact === null ||
    Array.isArray(report.artifact) ||
    typeof report.artifact !== "object"
  ) {
    fail("JSON 报告缺少 artifact 对象");
  }
  if (
    report.provenance === null ||
    Array.isArray(report.provenance) ||
    typeof report.provenance !== "object"
  ) {
    fail("JSON 报告缺少 provenance 对象");
  }

  const artifact = report.artifact;
  if (artifact.filename !== apkFilename) {
    fail("JSON 报告中的 APK 文件名不一致");
  }
  if (
    typeof artifact.sha256 !== "string" ||
    artifact.sha256.toLowerCase() !== apkSha256
  ) {
    fail("JSON 报告中的 SHA-256 与 APK 实际内容不一致");
  }
  if (artifact.bytes !== apkBytes) {
    fail("JSON 报告中的 APK 字节数与实际文件不一致");
  }
  if (artifact.version_name !== versionName) {
    fail("JSON 报告中的 versionName 与受控 Android 版本不一致");
  }
  if (artifact.version_code !== versionCode) {
    fail("JSON 报告中的 versionCode 与受控 Android 版本不一致");
  }
  if (
    typeof report.provenance.commit !== "string" ||
    report.provenance.commit.toLowerCase() !== commit
  ) {
    fail("JSON 报告中的 commit 与当前构建 commit 不一致");
  }

  const markdown = readFileSync(join(directory, reportMarkdownFilename), "utf8");
  requireLiteralInMarkdown(markdown, apkFilename, " APK 文件名");
  requireLiteralInMarkdown(markdown, apkSha256, " SHA-256");
  requireLiteralInMarkdown(markdown, commit, " commit");
  if (!markdown.includes(`版本：\`${versionName}\`（versionCode ${versionCode}）`)) {
    fail("Markdown 报告中的版本与受控 Android 版本不一致");
  }

  return {
    apkFilename,
    bytes: apkBytes,
    sha256: apkSha256,
    versionName,
    versionCode,
    commit,
  };
};

const getMatch = (content, expression, description) => {
  const match = content.match(expression);
  if (!match) {
    fail(`无法从 Android 配置读取${description}`);
  }
  return match[1];
};

const runFromRepository = () => {
  const root = process.cwd();
  const appGradle = readFileSync(join(root, "android/app/build.gradle"), "utf8");
  const expectedVersionName = getMatch(
    appGradle,
    /versionName\s+"([^"]+)"/,
    " versionName",
  );
  const expectedVersionCode = Number(
    getMatch(appGradle, /versionCode\s+(\d+)/, " versionCode"),
  );
  let expectedCommit = process.env.GITHUB_SHA;
  if (!expectedCommit) {
    try {
      expectedCommit = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim();
    } catch (error) {
      fail(`无法读取当前 Git commit：${error.message}`);
    }
  }

  const result = verifyAndroidLocalDebugArtifact({
    artifactDirectory: join(root, "artifacts/android-local"),
    expectedVersionName,
    expectedVersionCode,
    expectedCommit,
  });
  console.log(
    `Android 私测 APK 工件完整性复验通过：${result.apkFilename} (${result.sha256})`,
  );
};

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  runFromRepository();
}
