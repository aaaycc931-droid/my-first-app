import assert from "node:assert/strict";

import { createRecognitionNotesPlaybackControllerLifecycle } from "../components/recognition/useRecognitionNotesPlaybackController.js";
import type { RecognitionNotesPlaybackController } from "../lib/recognition/recognitionNotesPlaybackController.js";

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const run = async () => {
  let disposeCalls = 0;
  const controller = {
    dispose: () => {
      disposeCalls += 1;
    },
  } as unknown as RecognitionNotesPlaybackController;
  const lifecycle = createRecognitionNotesPlaybackControllerLifecycle(controller);
  lifecycle.mount();
  lifecycle.unmount();
  lifecycle.mount();
  await flushMicrotasks();
  assert.equal(disposeCalls, 0);
  lifecycle.unmount();
  await flushMicrotasks();
  assert.equal(disposeCalls, 1);
  console.log("recognition notes playback lifecycle tests passed");
};

void run();

