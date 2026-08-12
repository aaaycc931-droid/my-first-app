import assert from "node:assert/strict";

import { createPracticeRhythmRuntimeControllerLifecycle } from "../components/practice/usePracticeRhythmRuntimeController";
import type { PracticeRhythmRuntimeController } from "../lib/practice/practiceRhythmRuntimeController";

const run = async () => {
let disposeCount = 0;
const controller = {
  dispose: () => { disposeCount += 1; },
} as PracticeRhythmRuntimeController;
const lifecycle = createPracticeRhythmRuntimeControllerLifecycle(controller);

lifecycle.mount();
lifecycle.unmount();
lifecycle.mount();
await Promise.resolve();
assert.equal(disposeCount, 0, "StrictMode synthetic remount must preserve the controller");

lifecycle.unmount();
await Promise.resolve();
assert.equal(disposeCount, 1, "final unmount must dispose the controller once");

console.log("practice rhythm runtime lifecycle tests passed");
};

void run();
