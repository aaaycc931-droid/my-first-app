import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const requiredSources = [
  "capacitor.config.ts",
  "mobile/index.html",
  "mobile/src/App.tsx",
  "mobile/src/MobileErrorBoundary.tsx",
  "mobile/src/runtime/mobileLifecycle.ts",
  "mobile/src/runtime/mobilePracticeReviewStorage.ts",
  "mobile/src/runtime/mobileLearningProfileStorage.ts",
  "mobile/src/stubs/supabaseBrowser.ts",
  "lib/practice/localPracticeReviewQueue.ts",
  "lib/practice/localEarTrainingChords.ts",
  "lib/practice/localEarTrainingHarmonyProgressions.ts",
  "lib/practice/localEarTrainingScaleModes.ts",
  "lib/practice/localEarTrainingSeventhChords.ts",
  "lib/learning/learningEventProfile.ts",
  "lib/piano/localPianoKeyboard.ts",
  "lib/piano/pianoNoteEvents.ts",
  "lib/piano/pianoAudioProvider.ts",
  "lib/piano/splendidGrandPiano.ts",
  "lib/piano/pianoInteraction.ts",
  "lib/piano/pianoPerformance.ts",
  "lib/piano/pianoMidi.ts",
  "lib/piano/pianoLearningScore.ts",
  "lib/platform/sharedProjectCapability.ts",
  "mobile/public/piano/timbres.manifest.json",
  "components/piano/LocalPianoPanel.tsx",
  "components/piano/useLocalPianoAudio.ts",
  "components/piano/useLocalPianoMidi.ts",
  "components/piano/LocalPianoLearningPanel.tsx",
  "components/practice/RealtimePitchMonitorPanel.tsx",
  "components/practice/LocalEarTrainingChordPanel.tsx",
  "components/practice/LocalEarTrainingHarmonyProgressionPanel.tsx",
  "components/practice/LocalEarTrainingScaleModePanel.tsx",
  "components/practice/LocalEarTrainingSeventhChordPanel.tsx",
  "components/practice/RealtimePitchCurveChart.tsx",
  "components/practice/LocalVocalExercisePanel.tsx",
  "components/practice/useRealtimePitchMonitor.ts",
  "components/practice/useOfflinePitchAnalysis.ts",
  "components/practice/OfflinePitchAnalysisPanel.tsx",
  "components/practice/OfflineNoteAlignmentEvidencePanel.tsx",
  "lib/practice/pitchEstimate.ts",
  "lib/practice/offlinePitchAnalysis.ts",
  "lib/practice/offlineNoteAlignment.ts",
  "lib/practice/realtimePitchCurve.ts",
  "lib/practice/localVocalExercise.ts",
  "lib/practice/localVocalTargetFeedback.ts",
  "mobile/src/runtime/localVocalPracticeStorage.ts",
  "android/app/src/main/java/com/aaaycc931/solfeggio/midi/NormalizedMidiMessage.java",
  "android/app/src/main/java/com/aaaycc931/solfeggio/midi/NativeUsbMidiNoteEvent.java",
  "android/app/src/main/java/com/aaaycc931/solfeggio/midi/UsbMidiMessageParser.java",
  "android/app/src/main/java/com/aaaycc931/solfeggio/midi/UsbMidiPlugin.java",
  "android/app/src/test/java/com/aaaycc931/solfeggio/midi/NativeUsbMidiNoteEventTest.java",
  "android/app/src/test/java/com/aaaycc931/solfeggio/midi/UsbMidiMessageParserTest.java",
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
const learningProfileSource = readFileSync(
  join(root, "lib/learning/learningEventProfile.ts"),
  "utf8",
);
const learningProfileStorageSource = readFileSync(
  join(root, "mobile/src/runtime/mobileLearningProfileStorage.ts"),
  "utf8",
);
const chordTrainingSource = readFileSync(
  join(root, "lib/practice/localEarTrainingChords.ts"),
  "utf8",
);
const chordTrainingPanelSource = readFileSync(
  join(root, "components/practice/LocalEarTrainingChordPanel.tsx"),
  "utf8",
);
const harmonyProgressionSource = readFileSync(
  join(root, "lib/practice/localEarTrainingHarmonyProgressions.ts"),
  "utf8",
);
const harmonyProgressionPanelSource = readFileSync(
  join(root, "components/practice/LocalEarTrainingHarmonyProgressionPanel.tsx"),
  "utf8",
);
const scaleModeSource = readFileSync(
  join(root, "lib/practice/localEarTrainingScaleModes.ts"),
  "utf8",
);
const scaleModePanelSource = readFileSync(
  join(root, "components/practice/LocalEarTrainingScaleModePanel.tsx"),
  "utf8",
);
const seventhChordSource = readFileSync(
  join(root, "lib/practice/localEarTrainingSeventhChords.ts"),
  "utf8",
);
const seventhChordPanelSource = readFileSync(
  join(root, "components/practice/LocalEarTrainingSeventhChordPanel.tsx"),
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
const pianoLearningPanelSource = readFileSync(
  join(root, "components/piano/LocalPianoLearningPanel.tsx"),
  "utf8",
);
const pianoProviderSource = readFileSync(join(root, "lib/piano/pianoAudioProvider.ts"), "utf8");
const pianoEventSource = readFileSync(join(root, "lib/piano/pianoNoteEvents.ts"), "utf8");
const sampledPianoSource = readFileSync(join(root, "lib/piano/splendidGrandPiano.ts"), "utf8");
const pianoInteractionSource = readFileSync(join(root, "lib/piano/pianoInteraction.ts"), "utf8");
const pianoPerformanceSource = readFileSync(join(root, "lib/piano/pianoPerformance.ts"), "utf8");
const pianoMidiSource = readFileSync(join(root, "lib/piano/pianoMidi.ts"), "utf8");
const pianoLearningSource = readFileSync(join(root, "lib/piano/pianoLearningScore.ts"), "utf8");
const offlinePitchSource = readFileSync(join(root, "lib/practice/offlinePitchAnalysis.ts"), "utf8");
const offlineAlignmentSource = readFileSync(join(root, "lib/practice/offlineNoteAlignment.ts"), "utf8");
const pianoTimbreManifest = JSON.parse(readFileSync(
  join(root, "mobile/public/piano/timbres.manifest.json"),
  "utf8",
));
const mainActivityPath = join(
  root,
  "android/app/src/main/java/com/aaaycc931/solfeggio/MainActivity.java",
);
const usbMidiPluginSource = readFileSync(join(
  root,
  "android/app/src/main/java/com/aaaycc931/solfeggio/midi/UsbMidiPlugin.java",
), "utf8");
const usbMidiParserSource = readFileSync(join(
  root,
  "android/app/src/main/java/com/aaaycc931/solfeggio/midi/UsbMidiMessageParser.java",
), "utf8");
const normalizedMidiMessageSource = readFileSync(join(
  root,
  "android/app/src/main/java/com/aaaycc931/solfeggio/midi/NormalizedMidiMessage.java",
), "utf8");
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
  !learningProfileSource.includes('LEARNING_EVENT_SCHEMA_VERSION = "learning-event-v1"')
  || !learningProfileSource.includes('LEARNING_PROFILE_SCHEMA_VERSION = "learning-profile-v1"')
  || !learningProfileSource.includes("MAX_RECENT_LEARNING_EVENTS = 48")
  || !learningProfileSource.includes("suggestionsEnabled")
  || !learningProfileSource.includes("resetLocalLearningHistory")
  || !learningProfileSource.includes("resolveLocalLearningSuggestion")
  || !learningProfileStorageSource.includes("solfeggio.mobile.learning-profile.v1")
  || !learningProfileStorageSource.includes("clearMobileLearningHistory")
  || !mobileApp.includes("学习画像")
  || !mobileApp.includes("本机事实，不是能力评分")
) {
  throw new Error("Android 本机学习事件、非评分画像、建议控制或独立清除边界不完整");
}
if (
  !chordTrainingSource.includes('type ChordQualityId = "major" | "minor" | "diminished" | "augmented"')
  || !chordTrainingSource.includes('type ChordInversionId = "root" | "first" | "second"')
  || !chordTrainingSource.includes("getLocalEarTrainingChordVariantCount")
  || !chordTrainingPanelSource.includes("和弦性质与转位听辨")
  || !chordTrainingPanelSource.includes("同时发声")
  || !chordTrainingPanelSource.includes("从低到高")
  || !mobileApp.includes('"chord"')
  || !mobileApp.includes("和弦与转位")
) {
  throw new Error("Android P115 和弦性质、转位、三难度或和声/分解播放闭环不完整");
}
if (
  !harmonyProgressionSource.includes("getLocalHarmonyProgressionVariantCount")
  || !harmonyProgressionSource.includes('id: "minor-authentic"')
  || !harmonyProgressionSource.includes('id: "deceptive"')
  || !harmonyProgressionPanelSource.includes("和声进行与终止式听辨")
  || !harmonyProgressionPanelSource.includes("播放和声进行")
  || !mobileApp.includes('"progression"')
  || !mobileApp.includes("和声进行")
) {
  throw new Error("Android P115 和声进行、终止式、三难度或逐和弦播放闭环不完整");
}
if (
  !scaleModeSource.includes("getLocalScaleModeVariantCount")
  || !scaleModeSource.includes('id: "harmonic-minor"')
  || !scaleModeSource.includes('id: "dorian"')
  || !scaleModeSource.includes('id: "whole-tone"')
  || !scaleModePanelSource.includes("音阶与调式听辨")
  || !scaleModePanelSource.includes("播放上行音阶")
  || !mobileApp.includes('"scale"')
  || !mobileApp.includes("音阶与调式")
) {
  throw new Error("Android P115 音阶、调式、三难度或逐音播放闭环不完整");
}
if (
  !seventhChordSource.includes("getLocalSeventhChordVariantCount")
  || !seventhChordSource.includes('"major-seventh"')
  || !seventhChordSource.includes('"dominant-seventh"')
  || !seventhChordSource.includes('"half-diminished-seventh"')
  || !seventhChordPanelSource.includes("七和弦性质与转位听辨")
  || !seventhChordPanelSource.includes("播放题目")
  || !mobileApp.includes('"seventh"')
  || !mobileApp.includes("七和弦听辨")
) {
  throw new Error("Android P115 七和弦性质、转位、三难度或播放闭环不完整");
}
if (
  !pianoModelSource.includes('DEFAULT_LOCAL_PIANO_RANGE_ID: LocalPianoRangeId = "C4-C5"')
  || !pianoModelSource.includes("MAX_LOCAL_PIANO_ACTIVE_KEYS = 32")
  || !pianoModelSource.includes("getFullPianoKeys")
  || !pianoModelSource.includes("setLocalPianoSustain")
  || !pianoPanelSource.includes("本地参考钢琴")
  || !pianoPanelSource.includes("aria-pressed={keyboardState.sustainEnabled}")
  || !pianoAudioSource.includes("subscribeBrowserAudioStopAll")
  || !pianoAudioSource.includes("LOCAL_PIANO_VOICE_WATCHDOG_MS")
  || !pianoProviderSource.includes("COMPATIBILITY_PIANO_VOICE_PROVIDER")
  || !pianoProviderSource.includes("BoundedPianoSampleCache")
  || !pianoEventSource.includes('PIANO_NOTE_EVENT_PROTOCOL_VERSION = "piano-note-events-v1"')
  || !pianoEventSource.includes("DEFAULT_PIANO_POLYPHONY = 32")
  || !sampledPianoSource.includes("SPLENDID_GRAND_PIANO_ZONES")
  || !pianoInteractionSource.includes("transposePianoKeys")
  || !pianoInteractionSource.includes("splitFullPianoRows")
  || !pianoPanelSource.includes("运行 32 音压力测试")
  || !pianoPanelSource.includes("节拍器与演奏记录")
  || !pianoPanelSource.includes("solfeggio.piano.performances.v1")
  || !pianoPerformanceSource.includes("MAX_PIANO_PERFORMANCE_EVENTS = 2_000")
  || !pianoPerformanceSource.includes("createPianoPlaybackSchedule")
  || !pianoMidiSource.includes('PIANO_MIDI_INPUT_VERSION = "piano-midi-input-v1"')
  || !pianoMidiSource.includes("decodePianoMidiMessage")
  || !pianoLearningSource.includes('PIANO_LEARNING_SCORE_VERSION = "piano-learning-score-v1"')
  || !pianoLearningSource.includes("createPianoLearningDraftFromMusicXML")
  || !pianoLearningPanelSource.includes("MIDI 与谱面学习")
  || !pianoLearningPanelSource.includes("瀑布视图")
  || pianoTimbreManifest.timbres?.[0]?.id !== "splendid-grand-piano-mobile-v1"
  || pianoTimbreManifest.timbres?.[0]?.velocityLayers !== 3
  || pianoTimbreManifest.timbres?.find((item) => item.id === "splendid-grand-profile-pack-v1")?.profileCount !== 6
) {
  throw new Error("Android 本地参考钢琴缺少音域、多指、延音或残音清理边界");
}
if (
  !offlinePitchSource.includes('OFFLINE_PITCH_ANALYSIS_VERSION = "offline-pitch-multicandidate-v1"')
  || !offlinePitchSource.includes("OFFLINE_PITCH_SAMPLE_RATE = 16_000")
  || !offlinePitchSource.includes("PitchDetector.forFloat32Array")
  || !offlinePitchSource.includes("suppressOfflineOctaveJump")
  || !offlinePitchSource.includes("engine-disagreement")
) {
  throw new Error("Android 录音后分析缺少版本、标准 PCM、多候选、拒答或八度抑制边界");
}
if (
  !offlineAlignmentSource.includes('OFFLINE_NOTE_ALIGNMENT_VERSION = "offline-note-alignment-v1"')
  || !offlineAlignmentSource.includes("segmentOfflinePitchFrames")
  || !offlineAlignmentSource.includes("analyzeOfflineNoteAlignment")
  || !offlineAlignmentSource.includes('label: "音头"')
  || !offlineAlignmentSource.includes('label: "稳定段"')
  || !offlineAlignmentSource.includes('label: "尾音"')
  || !offlineAlignmentSource.includes('state: "missing"')
  || !offlineAlignmentSource.includes('state: "unreliable"')
) {
  throw new Error("Android 逐音证据缺少版本、独立分段、目标对齐、三阶段证据或局部拒答边界");
}
const pianoAssetDirectory = join(root, "mobile/public/piano/splendid-grand-v1");
const pianoAssets = readdirSync(pianoAssetDirectory).filter((name) => name.endsWith(".ogg")).sort();
const pianoAssetBytes = pianoAssets.reduce((total, name) => total + statSync(join(pianoAssetDirectory, name)).size, 0);
if (pianoAssets.length !== 36 || pianoAssetBytes > 3 * 1024 * 1024) {
  throw new Error(`钢琴采样资产数量或包体预算异常：${pianoAssets.length} files / ${pianoAssetBytes} bytes`);
}
const pianoPackageDigestInput = pianoAssets.map((name) => {
  const digest = createHash("sha256")
    .update(readFileSync(join(pianoAssetDirectory, name)))
    .digest("hex");
  return `${digest}  ${name}\n`;
}).join("");
const pianoPackageDigest = createHash("sha256")
  .update(pianoPackageDigestInput)
  .digest("hex");
const splendidManifest = pianoTimbreManifest.timbres.find(
  (timbre) => timbre.id === "splendid-grand-piano-mobile-v1",
);
if (
  splendidManifest?.packageSha256 !== pianoPackageDigest
  || splendidManifest?.packageSizeBytes !== pianoAssetBytes
  || !sampledPianoSource.includes(pianoPackageDigest)
) {
  throw new Error("钢琴 ResourcePackage 的 SHA-256、大小或运行时声明与 36 个实际资产不一致");
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
  if (!mainActivity.includes("registerPlugin(UsbMidiPlugin.class)")) {
    throw new Error("Android 原生层未注册 USB MIDI Capacitor bridge");
  }
}

const deviceCallbackEnd = usbMidiPluginSource.indexOf("  @Override\n  public void load()");
const deviceCallbackSource = usbMidiPluginSource.slice(
  usbMidiPluginSource.indexOf("MidiManager.DeviceCallback"),
  deviceCallbackEnd,
);
if (
  !usbMidiPluginSource.includes('@CapacitorPlugin(name = "UsbMidi")')
  || !usbMidiPluginSource.includes('BRIDGE_PROTOCOL_VERSION = "android-midi-bridge-v1"')
  || !usbMidiPluginSource.includes("deviceType == MidiDeviceInfo.TYPE_USB")
  || !usbMidiPluginSource.includes("deviceType == MidiDeviceInfo.TYPE_BLUETOOTH")
  || !usbMidiPluginSource.includes("listBleDevices")
  || !usbMidiPluginSource.includes('call.getString("transport", "usb")')
  || !usbMidiPluginSource.includes("port.getType() == MidiDeviceInfo.PortInfo.TYPE_OUTPUT")
  || !usbMidiPluginSource.includes('call.getInt("deviceId")')
  || !usbMidiPluginSource.includes('call.getInt("outputPort")')
  || !usbMidiPluginSource.includes('call.getString("commandId")')
  || !usbMidiPluginSource.includes("handleOnPause()")
  || !usbMidiPluginSource.includes("handleOnDestroy()")
  || !usbMidiPluginSource.includes("unregisterDeviceCallback(deviceCallback)")
) {
  throw new Error("Android USB/BLE MIDI bridge 缺少原生设备类型、显式设备/端口选择、协议或生命周期关闭边界");
}
if (
  deviceCallbackEnd < 0
  || deviceCallbackSource.includes("openDevice(")
  || deviceCallbackSource.includes("openOutputPort(")
) {
  throw new Error("Android USB MIDI 设备回调不得自动打开设备或端口");
}
if (
  !usbMidiParserSource.includes("runningStatus")
  || !usbMidiParserSource.includes("insideSystemExclusive")
  || !usbMidiParserSource.includes("value >= 0xf8")
  || !usbMidiParserSource.includes("data[0] == 64")
  || !normalizedMidiMessageSource.includes("if (velocity == 0) return noteOff(channel, note)")
  || !normalizedMidiMessageSource.includes("value >= 64")
) {
  throw new Error("Android USB MIDI parser 缺少 running status、实时字节、SysEx、零力度 note-off 或延音边界");
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
  "节拍器与演奏记录",
  "MIDI 与谱面学习",
  "瀑布视图",
  "实时音高反馈",
  "开始实时反馈",
  "开始会话录音",
  "丢弃本次录音",
  "录音停止后的本地多候选分析",
  "确认开始本地分析",
  "逐音与逐句证据（非评分）",
  "回放本次片段并定位复练",
  "没有用单个总百分比",
  "练声目标生成器",
  "播放参考音型",
  "练声目标对照（非评分）",
  "本机练声记录",
  "保存当前曲线与录音",
  "本次音高观察（非评分）",
  "周期性音高摆动候选",
  "清除全部记录",
  "曲线时间缩放",
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
  if (
    !/<uses-feature android:name="android\.software\.midi" android:required="false" \/>/.test(manifest)
    || !/<uses-feature android:name="android\.hardware\.usb\.host" android:required="false" \/>/.test(manifest)
  ) {
    throw new Error("Android USB MIDI 必须保持 MIDI 与 USB host 为非强制 feature");
  }
  if (
    /android\.permission\.(?:BLUETOOTH(?:_CONNECT|_SCAN)?|MIDI|USB)/.test(manifest)
    || manifest.includes("android.hardware.usb.action.USB_DEVICE_ATTACHED")
    || manifest.includes("device_filter")
  ) {
    throw new Error("Android USB MIDI 不得虚构危险权限或通过 USB attach filter 自动打开应用");
  }
}

const syncedIndex = join(root, "android/app/src/main/assets/public/index.html");
if (existsSync(manifestPath) && !existsSync(syncedIndex)) {
  throw new Error("Android 工程存在，但本地 Web 资源尚未同步");
}

console.log("Android 本地模式校验通过：固定包名、本地资源、八类练习（含三和弦/转位、七和弦、和声进行与音阶/调式）、实时音高反馈、本机复练、非评分学习画像、本地参考钢琴、无远程运行时配置与生命周期保护。 ");
