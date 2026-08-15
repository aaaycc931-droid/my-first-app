import { readFileSync } from "node:fs";

const panel = readFileSync("components/practice/LocalVocalExercisePanel.tsx", "utf8");
const hook = readFileSync("components/practice/useLocalVocalReferencePlaybackController.ts", "utf8");
const controller = readFileSync("lib/practice/localVocalReferencePlaybackController.ts", "utf8");
const browserPort = readFileSync("lib/audio/localVocalReferencePlayback.ts", "utf8");
const app = readFileSync("mobile/src/App.tsx", "utf8");
const generator = readFileSync("lib/practice/localVocalExercise.ts", "utf8");

const requireCopy = (source, expected, label) => {
  if (!source.includes(expected)) throw new Error(`${label}缺少：${expected}`);
};

for (const expected of ["练声音型", "根音", "模进方向", "八度位置", "速度：", "循环组数", "参考播放", "播放参考音型", "正在准备参考音型", "停止参考播放", "选择片段复练", "重复所选片段 3 次", "不代表声部或正式等级"]) requireCopy(panel, expected, "练声生成器中文界面");
for (const expected of ["single", "interval", "major-scale", "five-note", "arpeggio", "manifestVersion", "referenceMode", "intervalSemitones"]) requireCopy(generator, expected, "版本化练声生成器");
requireCopy(app, "<LocalVocalExercisePanel onTargetChange={setVocalTarget} />", "Android 练声入口");

for (const expected of [
  "useLocalVocalReferencePlaybackController",
  "playback.play",
  "playback.status",
  "playback.stop",
]) requireCopy(panel, expected, "练声参考音 controller 调用边界");

for (const forbidden of [
  "createBrowserAudioChannel",
  "prepareForUserGesture",
  "createOscillator",
  "createGain",
  "setTimeout",
]) {
  if (panel.includes(forbidden)) {
    throw new Error(`练声生成器不得重新承担浏览器音频或 timer ownership：${forbidden}`);
  }
}

for (const expected of [
  "subscribeBrowserAudioStopAll",
  "stopAllBrowserAudio",
  "createLocalVocalReferencePlaybackControllerLifecycle",
]) requireCopy(hook, expected, "练声参考音 hook 生命周期边界");

for (const expected of [
  'status: "preparing"',
  "requestGeneration",
  "completionTimer",
  "port.prepare",
  "port.setTimer",
]) requireCopy(controller, expected, "练声参考音 latest-wins controller 边界");

for (const expected of [
  'oscillator.type = "triangle"',
  "oscillator.frequency.value = frequencyHz",
  "channel.trackSource",
  "playbackStartSeconds = context.currentTime + 0.04",
]) requireCopy(browserPort, expected, "练声参考音 browser port 包络");

console.log("本地练声生成器 UI 与版本化 manifest 契约测试通过");
