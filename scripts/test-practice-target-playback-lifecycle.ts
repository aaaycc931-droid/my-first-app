import assert from "node:assert/strict";

import { createPracticeTargetPlaybackControllerLifecycle } from "../components/practice/usePracticeTargetPlaybackController.js";
import type { PracticeTargetPlaybackController } from "../lib/practice/practiceTargetPlaybackController.js";

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const createController = () => {
  let disposeCalls = 0;
  const controller = {
    dispose: () => {
      disposeCalls += 1;
    },
  } as unknown as PracticeTargetPlaybackController;
  return { controller, getDisposeCalls: () => disposeCalls };
};

const testStrictModeSyntheticUnmount = async () => {
  const fake = createController();
  const lifecycle = createPracticeTargetPlaybackControllerLifecycle(
    fake.controller,
  );
  lifecycle.mount();
  lifecycle.unmount();
  lifecycle.mount();
  await flushMicrotasks();
  assert.equal(fake.getDisposeCalls(), 0);
  lifecycle.unmount();
  await flushMicrotasks();
  assert.equal(fake.getDisposeCalls(), 1);
};

const testMultipleConsumersDisposeOnceAfterLastUnmount = async () => {
  const fake = createController();
  const lifecycle = createPracticeTargetPlaybackControllerLifecycle(
    fake.controller,
  );
  lifecycle.mount();
  lifecycle.mount();
  lifecycle.unmount();
  await flushMicrotasks();
  assert.equal(fake.getDisposeCalls(), 0);
  lifecycle.unmount();
  await flushMicrotasks();
  assert.equal(fake.getDisposeCalls(), 1);
};

const main = async () => {
  await testStrictModeSyntheticUnmount();
  await testMultipleConsumersDisposeOnceAfterLastUnmount();
  console.log("Practice target playback lifecycle tests passed.");
};

void main();
