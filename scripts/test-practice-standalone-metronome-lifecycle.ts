import assert from "node:assert/strict";

import { createPracticeStandaloneMetronomeLifecycle } from "../components/practice/usePracticeStandaloneMetronomeController.js";
import type { PracticeStandaloneMetronomeController } from "../lib/practice/practiceStandaloneMetronomeController.js";

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const run = async () => {
  let disposeCalls = 0;
  const controller = {
    dispose: () => {
      disposeCalls += 1;
    },
  } as unknown as PracticeStandaloneMetronomeController;
  const lifecycle = createPracticeStandaloneMetronomeLifecycle(controller);
  lifecycle.mount();
  lifecycle.unmount();
  lifecycle.mount();
  await flush();
  assert.equal(disposeCalls, 0);
  lifecycle.unmount();
  await flush();
  assert.equal(disposeCalls, 1);
  console.log("practice standalone metronome lifecycle tests passed");
};

void run();
