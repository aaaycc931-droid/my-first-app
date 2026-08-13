import assert from "node:assert/strict";

import { createNotationReferencePlaybackControllerLifecycle } from "../components/practice/useNotationReferencePlaybackController.js";
import type { NotationReferencePlaybackController } from "../lib/practice/notationReferencePlaybackController.js";

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
  } as unknown as NotationReferencePlaybackController;
  const lifecycle = createNotationReferencePlaybackControllerLifecycle(controller);
  lifecycle.mount();
  lifecycle.unmount();
  lifecycle.mount();
  await flush();
  assert.equal(disposeCalls, 0);
  lifecycle.unmount();
  await flush();
  assert.equal(disposeCalls, 1);
  console.log("notation reference playback lifecycle tests passed");
};

void run();
