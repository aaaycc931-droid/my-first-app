import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panel = readFileSync(
  "components/practice/NotationTemporaryPracticePanel.tsx",
  "utf8",
);
const hook = readFileSync(
  "components/practice/useNotationReferencePlaybackController.ts",
  "utf8",
);

for (const removedOwner of [
  "new AudioContext",
  "createOscillator",
  "referenceToneContextRef",
  "referenceToneOscillatorRef",
  "referenceMelodyOscillatorsRef",
  "referenceMelodyTimeoutRef",
  "window.setTimeout",
]) {
  assert.doesNotMatch(panel, new RegExp(removedOwner));
}
assert.match(panel, /useNotationReferencePlaybackController/);
assert.match(panel, /referencePlayback\.status !== "idle"/);
assert.match(panel, /referencePlayback\.playTone/);
assert.match(panel, /referencePlayback\.playMelody/);
assert.match(panel, /const stopReferenceTone = referencePlayback\.stop/);
assert.match(panel, /target\?\.id, target\?\.status/);
assert.match(hook, /stopAllBrowserAudio\(\)/);
assert.match(hook, /subscribeBrowserAudioStopAll\(controller\.stop\)/);
assert.match(hook, /activeEffectCount/);

console.log("notation reference playback UI contract tests passed");
