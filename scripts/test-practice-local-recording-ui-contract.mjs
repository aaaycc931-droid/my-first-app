import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/practice/page.tsx", "utf8");
const hook = readFileSync(
  "components/practice/useLocalRecordingController.ts",
  "utf8",
);
const controller = readFileSync(
  "lib/practice/localRecordingController.ts",
  "utf8",
);

assert.match(page, /useLocalRecordingController/);
assert.doesNotMatch(page, /navigator\.mediaDevices\.getUserMedia/);
assert.doesNotMatch(page, /new MediaRecorder\(/);
assert.doesNotMatch(page, /URL\.createObjectURL\(audioBlob\)/);
assert.doesNotMatch(page, /new Audio\(recordedAudioUrl\)/);

for (const required of [
  "requesting",
  "handleGlobalStop",
  "recordingBlob",
  "没有获得可回放的录音数据",
]) {
  assert.match(
    controller,
    new RegExp(required),
    `本地录音 controller 边界缺少：${required}`,
  );
}

for (const required of [
  "browserLocalRecordingInputPort",
  "browserLocalRecordingPreviewPort",
  "browserMediaRecorderCapturePort",
  "browserBlobAudioPlaybackPort",
  "subscribeBrowserAudioStopAll",
]) {
  assert.match(
    hook,
    new RegExp(required),
    `本地录音 composition root 缺少：${required}`,
  );
}

console.log("Practice local recording UI contract tests passed.");
