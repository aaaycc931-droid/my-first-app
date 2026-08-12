import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/recognize/page.tsx", "utf8");
const hook = readFileSync(
  "components/recognition/useRecognitionNotesPlaybackController.ts",
  "utf8",
);

for (const formerOwner of [
  "BrowserAudioChannel",
  "createBrowserAudioChannel",
  "playbackChannelRef",
  "playbackTimeoutIdsRef",
  "window.setTimeout",
  "window.clearTimeout",
  "createOscillator",
  "createGain",
  "noteNameToFrequencyHz",
]) {
  assert.doesNotMatch(page, new RegExp(formerOwner));
}
assert.match(page, /useRecognitionNotesPlaybackController\(\)/);
assert.match(page, /invalidateSharedResult: stopPlaybackPreview/);
assert.match(page, /clearPlayError,/);
assert.match(
  page,
  /notes: recognizedNotes,[\s\S]{0,100}?trackActiveNote: true/,
);
assert.equal(
  page.match(/trackActiveNote: false/g)?.length,
  2,
  "both Audiveris previews must stay untracked",
);
assert.match(page, /disabled=\{isPlaying\}/);
assert.match(hook, /createBrowserRecognitionNotesPlaybackPort\(\)/);
assert.match(hook, /useSyncExternalStore/);
assert.match(hook, /activeEffectCount/);

console.log("recognition notes playback UI contract tests passed");
