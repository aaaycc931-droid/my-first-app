import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/practice/page.tsx", "utf8");
const hook = readFileSync(
  "components/practice/usePracticeRecordingAnalysisController.ts",
  "utf8",
);
const controller = readFileSync(
  "lib/practice/practiceRecordingAnalysisController.ts",
  "utf8",
);

assert.match(page, /usePracticeRecordingAnalysisController/);
for (const required of [
  "analyzeLevel",
  "estimatePitch",
  "detectOnsets",
  "recordingAnalysis.clear",
]) {
  assert.match(page, new RegExp(required.replace(".", "\\.")));
}

for (const forbidden of [
  "audioAnalysisRunIdRef",
  "pitchEstimateRunIdRef",
  "audioOnsetRunIdRef",
]) {
  assert.doesNotMatch(
    page,
    new RegExp(forbidden),
    `练习页面不应重新持有录音分析 generation：${forbidden}`,
  );
}

const handlerNames = [
  "handleAnalyzeLocalRecording",
  "handleEstimatePitchLocally",
  "handleDetectAudioOnsets",
];
for (const handlerName of handlerNames) {
  const handlerStart = page.indexOf(`const ${handlerName}`);
  assert.notEqual(handlerStart, -1, `缺少既有入口：${handlerName}`);
  const nextHandler = page.indexOf("\n  const ", handlerStart + 8);
  const handlerSource = page.slice(
    handlerStart,
    nextHandler === -1 ? page.length : nextHandler,
  );
  for (const forbidden of [
    "new AudioContext",
    "decodeAudioData",
    "estimateLocalPitch(",
    "detectAudioOnsets(",
    "getChannelData(",
  ]) {
    assert.doesNotMatch(
      handlerSource,
      new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `${handlerName} 不应直接持有录音解码／分析 side effect：${forbidden}`,
    );
  }
}

for (const required of [
  "createBrowserPracticeRecordingAnalysisPort",
  "createPracticeRecordingAnalysisController",
]) {
  assert.match(hook, new RegExp(required));
}
for (const required of [
  "level",
  "pitch",
  "onset",
  "generation",
  "recordingAttemptKey",
  "sensitivityPreset",
  "clear",
  "detach",
]) {
  assert.match(controller, new RegExp(required));
}

// The slice must not weaken the established non-scoring and local-only copy.
for (const required of ["不上传", "不是正式评分", "不调用 AI"]) {
  assert.match(page, new RegExp(required));
}

console.log("Practice recording analysis UI contract tests passed.");
