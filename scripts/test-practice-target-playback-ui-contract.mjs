import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/practice/page.tsx", "utf8");
const hook = readFileSync(
  "components/practice/usePracticeTargetPlaybackController.ts",
  "utf8",
);
const controller = readFileSync(
  "lib/practice/practiceTargetPlaybackController.ts",
  "utf8",
);

assert.match(page, /usePracticeTargetPlaybackController/);
assert.match(page, /targetPlayback\.playSequence/);
assert.match(page, /targetPlayback\.playNote/);
for (const forbidden of [
  "playbackAudioContextRef",
  "playbackOscillatorsRef",
  "playbackTimeoutIdsRef",
  "createOscillator()",
]) {
  assert.doesNotMatch(
    page,
    new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `练习页面不应重新持有目标音播放 side effect：${forbidden}`,
  );
}

for (const required of [
  "createBrowserPracticeTargetPlaybackPort",
  "stopAllBrowserAudio",
  "subscribeBrowserAudioStopAll",
]) {
  assert.match(
    hook,
    new RegExp(required),
    `目标音播放 composition root 缺少：${required}`,
  );
}

for (const required of [
  "generation",
  "activeNoteIndex",
  "playSequence",
  "playNote",
  "clearTimers",
]) {
  assert.match(
    controller,
    new RegExp(required),
    `目标音播放 controller 边界缺少：${required}`,
  );
}

console.log("Practice target playback UI contract tests passed.");
