import assert from "node:assert/strict";

import { createLocalVocalReferencePlaybackControllerLifecycle } from "../components/practice/useLocalVocalReferencePlaybackController.js";
import type { LocalVocalReferencePlaybackController } from "../lib/practice/localVocalReferencePlaybackController.js";

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
  } as unknown as LocalVocalReferencePlaybackController;
  const lifecycle = createLocalVocalReferencePlaybackControllerLifecycle(controller);
  lifecycle.mount();
  lifecycle.unmount();
  lifecycle.mount();
  await flush();
  assert.equal(disposeCalls, 0);
  lifecycle.unmount();
  await flush();
  assert.equal(disposeCalls, 1);
  console.log("local vocal reference playback lifecycle tests passed");
};

void run();
