import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/practice/page.tsx", "utf8");
const hook = readFileSync(
  "components/practice/usePracticeRhythmRuntimeController.ts",
  "utf8",
);
const controller = readFileSync(
  "lib/practice/practiceRhythmRuntimeController.ts",
  "utf8",
);

assert.match(page, /usePracticeRhythmRuntimeController\(\)/);
assert.match(page, /createPatternRhythmRunPlan/);
assert.match(page, /createNotationRhythmRunPlan/);
assert.match(page, /const tap = recordRhythmTap\(\);/);
assert.match(page, /getRelativeNotationRhythmTapOnsetMs/);
assert.match(page, /submitActivityAnswer/);
assert.match(page, /rhythmPhase !== "stopped"/);
assert.match(page, /completeActivityCheck/);
assert.match(page, /restartActivityAttempt/);
for (const formerPageOwner of [
  "rhythmSchedulerRef",
  "rhythmSchedulerGenerationRef",
  "rhythmTimeoutIdsRef",
  "rhythmTimerIdRef",
  "rhythmTapIdRef",
  "setRhythmPhase",
  "setRhythmTargets",
  "setRhythmTaps",
  "setRhythmNowMs",
  "setRhythmError",
]) {
  assert.doesNotMatch(page, new RegExp(formerPageOwner));
}
assert.equal(
  page.match(/const started = await scheduler\.start\(\);/g)?.length,
  1,
  "only the standalone metronome remains page-owned",
);
assert.equal(
  page.match(/usePracticeRhythmRuntimeController\(\)/g)?.length,
  2,
  "rhythm and latency must use isolated runtime controller instances",
);
assert.match(hook, /useSyncExternalStore/);
assert.match(hook, /activeEffectCount/);
assert.match(
  controller,
  /generation === requestGeneration &&\s+scheduler === requestScheduler/,
);
assert.match(controller, /plan\.practiceStartTimeMs - port\.now\(\)/);
assert.match(controller, /phase: "stopped", nowMs: port\.now\(\)/);

console.log("practice rhythm runtime UI contract tests passed");
