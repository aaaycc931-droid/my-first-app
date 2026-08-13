import { readFileSync } from "node:fs";

const hook = readFileSync("components/practice/useRealtimePitchMonitor.ts", "utf8");
const panel = readFileSync("components/practice/RealtimePitchMonitorPanel.tsx", "utf8");
const chart = readFileSync("components/practice/RealtimePitchCurveChart.tsx", "utf8");
const inputPort = readFileSync("lib/audio/realtimePitchInput.ts", "utf8");
const recorderPort = readFileSync("lib/audio/mediaRecorder.ts", "utf8");
const controller = readFileSync("lib/practice/realtimePitchMonitorController.ts", "utf8");
const app = readFileSync("mobile/src/App.tsx", "utf8");
const manifest = readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");

const requireCopy = (source, expected, label) => {
  if (!source.includes(expected)) throw new Error(`${label}缺少：${expected}`);
};

for (const expected of [
  "useSyncExternalStore",
  "createRealtimePitchMonitorController",
  "browserRealtimePitchInputPort",
  "browserMediaRecorderCapturePort",
  "createBlobAudioPlaybackController",
  "controller.attach()",
  "controller.detach()",
  "subscribeBrowserAudioStopAll(controller.handleGlobalStop)",
]) requireCopy(hook, expected, "实时音高薄 React hook");

for (const forbidden of [
  "navigator.",
  "getUserMedia",
  "AudioContext",
  "createAnalyser",
  "new MediaRecorder(",
  ".ondataavailable",
  "new Audio(",
  "URL.createObjectURL",
  "URL.revokeObjectURL",
  "generationRef",
  "recordingGenerationRef",
]) {
  if (hook.includes(forbidden)) {
    throw new Error(`实时音高 hook 不得重新承担浏览器媒体与 generation 编排：${forbidden}`);
  }
}

for (const expected of [
  "navigator.mediaDevices.getUserMedia",
  'new AudioContext({ latencyHint: "interactive" })',
  'echoCancellation: false',
  'noiseSuppression: false',
  'autoGainControl: false',
  "analyser.fftSize = 4096",
  "analyser.smoothingTimeConstant = 0",
  "timer = setTimer(analyze, 50)",
  'request.onInterrupted("track-ended")',
  'request.onInterrupted("context-interrupted")',
  "if (disposed || !context || !analyser) return",
  "stream.getTracks().forEach",
  "ownedContext.close()",
]) requireCopy(inputPort, expected, "实时音高 browser input port 边界");

for (const expected of [
  "inputGeneration",
  "recordingGeneration",
  "analyzeRealtimePitchFrame",
  "appendRealtimePitchCurvePoint",
  "timesliceMs: 250",
  "completedPlaybackRecording",
  "suppressNextGlobalStop",
  "handleGlobalStop",
  "麦克风媒体轨已中断，本轮录音资格已作废。",
  "没有获得可回放的录音数据，请重试。",
  "系统阻止了录音回放，请再次点击播放或重新录制。",
]) requireCopy(controller, expected, "实时音高 controller 边界");

for (const forbidden of [
  'from "react"',
  "useEffect(",
  "useState(",
  "navigator.",
  "new AudioContext(",
  "new MediaRecorder(",
  "typeof MediaRecorder",
  ".ondataavailable",
  "new Audio(",
  "URL.createObjectURL",
]) {
  if (controller.includes(forbidden)) {
    throw new Error(`实时音高 controller 必须保持框架无关并只经 ports 使用媒体能力：${forbidden}`);
  }
}

for (const expected of [
  "createBrowserMediaRecorderCapturePort",
  "PREFERRED_MEDIA_RECORDER_MIME_TYPES",
  "new Recorder(request.stream",
  "recorder.ondataavailable",
  "start: () =>",
  "recorder.start(request.timesliceMs)",
  "request.onStopped",
]) requireCopy(recorderPort, expected, "MediaRecorder capture port 边界");

for (const caller of [
  "components/practice/RealtimePitchMonitorPanel.tsx",
  "components/practice/LocalIntervalImitationPanel.tsx",
  "components/practice/LocalMelodyImitationPanel.tsx",
  "components/practice/LocalMelodySightSingingPanel.tsx",
]) requireCopy(readFileSync(caller, "utf8"), "useRealtimePitchMonitor", `${caller} 调用边界`);

for (const expected of [
  "开始实时反馈",
  "开始会话录音",
  "停止录音",
  "播放本次录音",
  "丢弃本次录音",
  "停止监听",
  "停止并清空",
  "曲线时间缩放",
  "目标参考线（不计分）",
  "不足以可靠判断",
  "不自动保存、不上传",
  "不生成分数、等级或通过判断",
]) requireCopy(panel, expected, "实时音高中文界面");

for (const expected of [
  "useNotationReferencePlaybackController",
  "a4ReferencePlayback.playTone",
  "frequencyHz: 440",
  "releaseOffsetSeconds: 0.85",
  "当前设备无法播放 A4 参考音。你仍可查看目标并稍后重试。",
]) requireCopy(panel, expected, "A4 参考音 controller 边界");

for (const forbidden of [
  "createBrowserAudioChannel",
  "a4ReferenceChannelRef",
  "createOscillator",
  "createGain",
]) {
  if (panel.includes(forbidden)) {
    throw new Error(`A4 参考音不得重新承担 raw browser audio：${forbidden}`);
  }
}

for (const expected of [
  "splitReliablePitchCurveSegments",
  "最近 {windowSeconds} 秒音高曲线",
  "断线：不足以判断",
  "虚线：目标音",
  "现在",
]) requireCopy(chart, expected, "实时音高曲线界面");

requireCopy(app, '"monitor"', "Android 实时音高入口");
requireCopy(app, "practiceRecordRepository={indexedDbLocalVocalPracticeRecordRepository}", "Android 实时音高存储注入");
requireCopy(app, "targetExercise={vocalTarget}", "Android 实时音高入口");
requireCopy(manifest, "android.permission.RECORD_AUDIO", "Android 麦克风权限");
if (manifest.includes("android.permission.INTERNET")) throw new Error("实时音高切片不得加入网络权限");

console.log("实时音高反馈 UI 与权限生命周期契约测试通过");
