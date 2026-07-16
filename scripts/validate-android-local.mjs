import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const requiredSources = [
  "capacitor.config.ts",
  "mobile/index.html",
  "mobile/src/App.tsx",
  "mobile/src/MobileErrorBoundary.tsx",
  "mobile/src/runtime/mobileLifecycle.ts",
  "mobile/src/runtime/mobilePracticeReviewStorage.ts",
  "mobile/src/stubs/supabaseBrowser.ts",
  "lib/practice/localPracticeReviewQueue.ts",
  "lib/piano/localPianoKeyboard.ts",
  "components/piano/LocalPianoPanel.tsx",
  "components/piano/useLocalPianoAudio.ts",
  "components/practice/RealtimePitchMonitorPanel.tsx",
  "components/practice/useRealtimePitchMonitor.ts",
  "lib/practice/pitchEstimate.ts",
];

for (const relativePath of requiredSources) {
  if (!existsSync(join(root, relativePath))) {
    throw new Error(`缺少 Android 本地模式文件：${relativePath}`);
  }
}

const capacitorConfig = readFileSync(join(root, "capacitor.config.ts"), "utf8");
const viteConfig = readFileSync(join(root, "mobile/vite.config.ts"), "utf8");
const mobileApp = readFileSync(join(root, "mobile/src/App.tsx"), "utf8");
const reviewQueueSource = readFileSync(
  join(root, "lib/practice/localPracticeReviewQueue.ts"),
  "utf8",
);
const reviewStorageSource = readFileSync(
  join(root, "mobile/src/runtime/mobilePracticeReviewStorage.ts"),
  "utf8",
);
const pianoModelSource = readFileSync(
  join(root, "lib/piano/localPianoKeyboard.ts"),
  "utf8",
);
const pianoPanelSource = readFileSync(
  join(root, "components/piano/LocalPianoPanel.tsx"),
  "utf8",
);
const pianoAudioSource = readFileSync(
  join(root, "components/piano/useLocalPianoAudio.ts"),
  "utf8",
);
const mainActivityPath = join(
  root,
  "android/app/src/main/java/com/aaaycc931/solfeggio/MainActivity.java",
);
if (!capacitorConfig.includes('appId: "com.aaaycc931.solfeggio"')) {
  throw new Error("Android applicationId 未固定");
}
if (!capacitorConfig.includes('webDir: "mobile-dist"')) {
  throw new Error("Capacitor 未指向本地静态资源目录");
}
if (/\bserver\s*:/.test(capacitorConfig) || /https?:\/\//.test(capacitorConfig)) {
  throw new Error("Capacitor 配置不得包含远程 server 或网址");
}
if (!viteConfig.includes('target: "chrome74"')) {
  throw new Error("移动构建必须固定兼容 Android System WebView 的 Chrome 74 目标");
}
if (!mobileApp.includes("stopAllBrowserAudio") || !mobileApp.includes("pagehide")) {
  throw new Error("移动端缺少音频全局停止或后台生命周期处理");
}
if (
  !reviewQueueSource.includes("LOCAL_PRACTICE_REVIEW_QUEUE_MAX_ITEMS = 12")
  || !reviewQueueSource.includes("schemaVersion")
  || !reviewQueueSource.includes("catalogVersion")
  || !reviewQueueSource.includes("variantId")
  || !reviewQueueSource.includes("parseLegacyTarget")
  || !reviewQueueSource.includes("isCorrect")
) {
  throw new Error("本机复练队列缺少容量、版本、稳定题目标识、旧记录迁移或答题更新边界");
}
if (
  !reviewStorageSource.includes("solfeggio.mobile.practice-review-queue.v1")
  || !reviewStorageSource.includes("loadMobilePracticeReviewQueue")
  || !reviewStorageSource.includes("saveMobilePracticeReviewQueue")
  || !reviewStorageSource.includes("clearMobilePracticeReviewQueue")
) {
  throw new Error("移动端缺少本机复练的读取、保存或清除边界");
}
if (
  !pianoModelSource.includes('DEFAULT_LOCAL_PIANO_RANGE_ID: LocalPianoRangeId = "C4-C5"')
  || !pianoModelSource.includes("MAX_LOCAL_PIANO_ACTIVE_KEYS = 8")
  || !pianoModelSource.includes("setLocalPianoSustain")
  || !pianoPanelSource.includes("本地参考钢琴")
  || !pianoPanelSource.includes("aria-pressed={keyboardState.sustainEnabled}")
  || !pianoAudioSource.includes("subscribeBrowserAudioStopAll")
  || !pianoAudioSource.includes("LOCAL_PIANO_VOICE_WATCHDOG_MS")
) {
  throw new Error("Android 本地参考钢琴缺少音域、多指、延音或残音清理边界");
}
for (const forbiddenReviewField of [
  "selectedPitchId",
  "selectedIntervalId",
  "selectedPatternId",
  "selectedNoteIds",
  "audioData",
  "score:",
  "accuracy:",
]) {
  if (reviewQueueSource.includes(forbiddenReviewField)) {
    throw new Error(`本机复练模型不得保存答案、音频或评分字段：${forbiddenReviewField}`);
  }
}
if (existsSync(mainActivityPath)) {
  const mainActivity = readFileSync(mainActivityPath, "utf8");
  if (!mainActivity.includes("solfeggio:native-lifecycle")) {
    throw new Error("Android 原生层缺少本地生命周期事件桥接");
  }
}

const distRoot = join(root, "mobile-dist");
const distIndex = join(distRoot, "index.html");
if (!existsSync(distIndex)) {
  throw new Error("缺少 mobile-dist/index.html，请先执行 npm run mobile:build");
}

const collectFiles = (directory) =>
  readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    return statSync(fullPath).isDirectory() ? collectFiles(fullPath) : [fullPath];
  });

const textFiles = collectFiles(distRoot).filter((file) =>
  /\.(?:html|css|js|json|svg)$/.test(file),
);
const bundledText = textFiles
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

for (const forbidden of [
  "dpluqcflynztlpophvzq.supabase.co",
  "NEXT_PUBLIC_SUPABASE",
  "supabase-js",
  "vercel.app",
]) {
  if (bundledText.includes(forbidden)) {
    throw new Error(`移动端 bundle 含有被禁止的云端标识：${forbidden}`);
  }
}

for (const expectedCopy of [
  "单音听辨",
  "音程听辨",
  "节奏听辨",
  "旋律听写",
  "本地模式",
  "本机复练",
  "本地参考钢琴",
  "实时音高反馈",
  "开始实时反馈",
  "挑战：",
  "本难度共",
  "solfeggio.mobile.practice-review-queue.v1",
]) {
  if (!bundledText.includes(expectedCopy)) {
    throw new Error(`移动端 bundle 缺少核心练习：${expectedCopy}`);
  }
}

const indexHtml = readFileSync(distIndex, "utf8");
if (/\b(?:src|href)="\//.test(indexHtml)) {
  throw new Error("移动端入口包含根路径资源，离线 WebView 中可能无法加载");
}

const manifestPath = join(root, "android/app/src/main/AndroidManifest.xml");
if (existsSync(manifestPath)) {
  const manifest = readFileSync(manifestPath, "utf8");
  if (manifest.includes("android.permission.INTERNET")) {
    throw new Error("本地私测 APK 不应声明网络权限");
  }
  if (!manifest.includes("android.permission.RECORD_AUDIO")) {
    throw new Error("实时音高反馈缺少 Android 麦克风权限");
  }
}

const syncedIndex = join(root, "android/app/src/main/assets/public/index.html");
if (existsSync(manifestPath) && !existsSync(syncedIndex)) {
  throw new Error("Android 工程存在，但本地 Web 资源尚未同步");
}

console.log("Android 本地模式校验通过：固定包名、本地资源、四类练习、实时音高反馈、本机复练、本地参考钢琴、无远程运行时配置与生命周期保护。 ");
