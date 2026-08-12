import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/practice/page.tsx", "utf8");
const hook = readFileSync(
  "components/practice/useLocalMelodyGuideDecodeController.ts",
  "utf8",
);
const controller = readFileSync(
  "lib/practice/localMelodyGuideDecodeController.ts",
  "utf8",
);
const port = readFileSync("lib/audio/localMelodyGuideDecode.ts", "utf8");

assert.match(page, /useLocalMelodyGuideDecodeController/);
assert.match(page, /localMelodyGuideDecode\.select\(file\)/);
assert.match(page, /localMelodyGuideDecode\.clear\(\)/);
for (const forbidden of [
  "localMelodyGuideRunIdRef",
  "new AudioContext",
  "decodeAudioData",
  "file.arrayBuffer()",
  "applyLocalMelodyGuideDecodedMetadata",
]) {
  assert.doesNotMatch(page, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
for (const required of [
  "createBrowserLocalMelodyGuideDecodePort",
  "createLocalMelodyGuideDecodeController",
]) {
  assert.match(hook, new RegExp(required));
}
for (const required of ["generation", "select", "clear", "detach"]) {
  assert.match(controller, new RegExp(required));
}
for (const required of ["arrayBuffer", "decodeAudioData", "close"]) {
  assert.match(port, new RegExp(required));
}
for (const required of ["本地", "WAV", "MP3", "M4A"]) {
  assert.match(controller, new RegExp(required));
}

console.log("Local melody guide decode UI contract tests passed.");
