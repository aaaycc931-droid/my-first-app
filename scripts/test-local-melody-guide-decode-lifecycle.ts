import assert from "node:assert/strict";

import { createLocalMelodyGuideDecodeControllerLifecycle } from "../components/practice/useLocalMelodyGuideDecodeController.js";
import type { LocalMelodyGuideDecodeController } from "../lib/practice/localMelodyGuideDecodeController.js";

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const createController = () => {
  let attachCalls = 0;
  let detachCalls = 0;
  const controller = {
    attach: () => {
      attachCalls += 1;
    },
    detach: () => {
      detachCalls += 1;
    },
  } as unknown as LocalMelodyGuideDecodeController;
  return {
    controller,
    getAttachCalls: () => attachCalls,
    getDetachCalls: () => detachCalls,
  };
};

const main = async () => {
  const fake = createController();
  const lifecycle = createLocalMelodyGuideDecodeControllerLifecycle(
    fake.controller,
  );
  lifecycle.mount();
  lifecycle.unmount();
  lifecycle.mount();
  await flushMicrotasks();
  assert.equal(fake.getAttachCalls(), 2);
  assert.equal(fake.getDetachCalls(), 0);
  lifecycle.unmount();
  await flushMicrotasks();
  assert.equal(fake.getDetachCalls(), 1);
  console.log("Local melody guide decode lifecycle tests passed.");
};

void main();
