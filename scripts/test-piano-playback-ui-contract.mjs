import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panel = readFileSync("components/piano/LocalPianoPanel.tsx", "utf8");
const hook = readFileSync(
  "components/piano/usePianoPlaybackRuntimeController.ts",
  "utf8",
);

assert.doesNotMatch(panel, /playbackTimersRef/);
assert.doesNotMatch(panel, /const runCycle/);
assert.match(panel, /usePianoPlaybackRuntimeController/);
assert.match(
  panel,
  /const startRecording = \(\) => \{\s+if \(!stopPlayback\(\)\) return;/,
);
assert.match(panel, /events: schedule\.map/);
assert.match(panel, /events: schedule\.flatMap<PianoPlaybackRuntimeEvent>/);
assert.match(panel, /loop: loopEnabled/);
assert.match(panel, /loop: false/);
assert.match(panel, /baseDelayMs: baseDelay/);
assert.match(panel, /pointerId: `playback-\$\{event\.keyId\}`/);
assert.match(panel, /velocity: event\.velocity \?\? 0\.65/);
assert.match(panel, /velocity: 0\.68/);
assert.match(hook, /useSyncExternalStore/);
assert.match(hook, /activeEffectCount/);

console.log("piano playback UI contract tests passed");
