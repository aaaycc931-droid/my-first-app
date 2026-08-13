import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/practice/page.tsx", "utf8");
const hook = readFileSync(
  "components/practice/usePracticeStandaloneMetronomeController.ts",
  "utf8",
);

for (const removedOwner of [
  "BrowserMetronomeScheduler",
  "metronomeSchedulerRef",
  "metronomeSchedulerGenerationRef",
  "isMountedRef",
  "setIsMetronomeRunning",
  "setMetronomeBeat",
  "setMetronomeError",
]) {
  assert.doesNotMatch(page, new RegExp(removedOwner));
}
assert.match(page, /usePracticeStandaloneMetronomeController/);
assert.match(page, /const isMetronomeBusy = metronome\.status !== "idle"/);
assert.match(page, /if \(activeFeatureView !== "rhythm"\) stopMetronome\(\)/);
assert.match(page, /disabled=\{!isMetronomeBusy\}/);
assert.match(hook, /stopAllBrowserAudio\(\)/);
assert.match(hook, /subscribeBrowserAudioStopAll\(controller\.stop\)/);
assert.match(hook, /window\.addEventListener\("blur", stopOnBlur\)/);
assert.match(hook, /document\.visibilityState === "hidden"/);
assert.match(hook, /activeEffectCount/);

console.log("practice standalone metronome UI contract tests passed");
