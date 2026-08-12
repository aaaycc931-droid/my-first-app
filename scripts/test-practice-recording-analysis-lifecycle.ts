import assert from "node:assert/strict";

import { createPracticeRecordingAnalysisControllerLifecycle } from "../components/practice/usePracticeRecordingAnalysisController.js";
import type { PracticeRecordingAnalysisController } from "../lib/practice/practiceRecordingAnalysisController.js";

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
  } as unknown as PracticeRecordingAnalysisController;
  return {
    controller,
    getAttachCalls: () => attachCalls,
    getDetachCalls: () => detachCalls,
  };
};

const testStrictModeSyntheticUnmount = async () => {
  const fake = createController();
  const lifecycle = createPracticeRecordingAnalysisControllerLifecycle(
    fake.controller,
  );
  lifecycle.mount();
  assert.equal(fake.getAttachCalls(), 1);
  lifecycle.unmount();
  lifecycle.mount();
  await flushMicrotasks();
  assert.equal(fake.getAttachCalls(), 2);
  assert.equal(fake.getDetachCalls(), 0);
  lifecycle.unmount();
  await flushMicrotasks();
  assert.equal(fake.getDetachCalls(), 1);
};

const testMultipleConsumersDisposeAfterLastUnmount = async () => {
  const fake = createController();
  const lifecycle = createPracticeRecordingAnalysisControllerLifecycle(
    fake.controller,
  );
  lifecycle.mount();
  lifecycle.mount();
  assert.equal(fake.getAttachCalls(), 2);
  lifecycle.unmount();
  await flushMicrotasks();
  assert.equal(fake.getDetachCalls(), 0);
  lifecycle.unmount();
  await flushMicrotasks();
  assert.equal(fake.getDetachCalls(), 1);
};

const main = async () => {
  await testStrictModeSyntheticUnmount();
  await testMultipleConsumersDisposeAfterLastUnmount();
  console.log("Practice recording analysis lifecycle tests passed.");
};

void main();
