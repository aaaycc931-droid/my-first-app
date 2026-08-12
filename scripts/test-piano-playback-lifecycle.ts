import assert from "node:assert/strict";

import { createPianoPlaybackRuntimeControllerLifecycle } from "../components/piano/usePianoPlaybackRuntimeController.js";
import type { PianoPlaybackRuntimeController } from "../lib/piano/pianoPlaybackRuntimeController.js";

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
  } as unknown as PianoPlaybackRuntimeController;
  const lifecycle = createPianoPlaybackRuntimeControllerLifecycle(controller);
  lifecycle.mount();
  lifecycle.unmount();
  lifecycle.mount();
  await flush();
  assert.equal(disposeCalls, 0);
  lifecycle.unmount();
  await flush();
  assert.equal(disposeCalls, 1);
  console.log("piano playback lifecycle tests passed");
};

void run();

