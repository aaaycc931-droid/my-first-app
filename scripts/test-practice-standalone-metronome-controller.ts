import assert from "node:assert/strict";

import type { MetronomeBeatMetadata } from "../lib/metronome/metronomeGrid.js";
import type {
  PracticeStandaloneMetronomePort,
  PracticeStandaloneMetronomeScheduler,
} from "../lib/metronome/practiceStandaloneMetronome.js";
import { createPracticeStandaloneMetronomeController } from "../lib/practice/practiceStandaloneMetronomeController.js";

const config = {
  bpm: 96,
  meter: "3/4" as const,
  countIn: { enabled: true, bars: 1 as const },
  subdivision: "eighth" as const,
};
const beat: MetronomeBeatMetadata = {
  phase: "count-in",
  beatIndex: 0,
  barNumber: 1,
  beatNumber: 1,
  scheduledTimeSeconds: 2,
  isStrongBeat: true,
  meter: "3/4",
  bpm: 96,
  subdivisionIndex: 0,
};

const createFakePort = () => {
  const starts: Array<{
    resolve: (value: boolean) => void;
    reject: (error: Error) => void;
  }> = [];
  const schedulers: Array<
    PracticeStandaloneMetronomeScheduler & {
      stopped: boolean;
      emitBeat: (value: MetronomeBeatMetadata) => void;
      config: typeof config;
    }
  > = [];
  let throwOnCreate = false;
  let throwOnStop = false;
  const port: PracticeStandaloneMetronomePort = {
    createScheduler: (options) => {
      if (throwOnCreate) throw new Error("create failed");
      const scheduler = {
        stopped: false,
        config: options.config as typeof config,
        emitBeat: (value: MetronomeBeatMetadata) => options.onBeat?.(value),
        start: () =>
          new Promise<boolean>((resolve, reject) => {
            starts.push({ resolve, reject });
          }),
        stop: () => {
          scheduler.stopped = true;
          if (throwOnStop) throw new Error("stop failed");
        },
      };
      schedulers.push(scheduler);
      return scheduler;
    },
  };
  return {
    port,
    starts,
    schedulers,
    setThrowOnCreate: (value: boolean) => {
      throwOnCreate = value;
    },
    setThrowOnStop: (value: boolean) => {
      throwOnStop = value;
    },
  };
};

const ERROR =
  "此浏览器无法启动 Web Audio 节拍器；请确认在用户手势中点击开始。";

const testStartBeatStopAndFrozenConfig = async () => {
  const fake = createFakePort();
  const controller = createPracticeStandaloneMetronomeController(fake.port);
  const requestConfig = { ...config, countIn: { ...config.countIn } };
  const request = controller.start({ config: requestConfig, errorMessage: ERROR });
  assert.equal(controller.getSnapshot().status, "starting");
  assert.deepEqual(fake.schedulers[0]?.config, config);
  requestConfig.bpm = 120;
  assert.equal(fake.schedulers[0]?.config.bpm, 96);
  fake.schedulers[0]?.emitBeat(beat);
  assert.equal(controller.getSnapshot().beat, beat);
  fake.starts[0]?.resolve(true);
  assert.equal(await request, true);
  assert.equal(controller.getSnapshot().status, "running");
  controller.stop();
  assert.equal(fake.schedulers[0]?.stopped, true);
  assert.deepEqual(controller.getSnapshot(), {
    status: "idle",
    beat: null,
    error: "",
  });
};

const testPendingStopAndSingleFlight = async () => {
  const fake = createFakePort();
  const controller = createPracticeStandaloneMetronomeController(fake.port);
  const first = controller.start({ config, errorMessage: ERROR });
  assert.equal(
    await controller.start({ config, errorMessage: ERROR }),
    false,
    "starting must reject duplicate start churn",
  );
  controller.stop();
  fake.starts[0]?.resolve(true);
  assert.equal(await first, false);
  assert.equal(controller.getSnapshot().status, "idle");
  assert.equal(fake.schedulers[0]?.stopped, true);
};

const testStaleBeatFailureAndRetry = async () => {
  const fake = createFakePort();
  const controller = createPracticeStandaloneMetronomeController(fake.port);
  const first = controller.start({ config, errorMessage: ERROR });
  const staleScheduler = fake.schedulers[0];
  controller.stop();
  staleScheduler?.emitBeat(beat);
  fake.starts[0]?.reject(new Error("late failure"));
  assert.equal(await first, false);
  assert.equal(controller.getSnapshot().beat, null);

  const retry = controller.start({ config, errorMessage: ERROR });
  fake.starts[1]?.reject(new Error("current failure"));
  assert.equal(await retry, false);
  assert.deepEqual(controller.getSnapshot(), {
    status: "idle",
    beat: null,
    error: ERROR,
  });
  const success = controller.start({ config, errorMessage: ERROR });
  fake.starts[2]?.resolve(true);
  assert.equal(await success, true);
  assert.equal(controller.getSnapshot().error, "");
};

const testCurrentCancellationIsSilentAndRetryable = async () => {
  const fake = createFakePort();
  const controller = createPracticeStandaloneMetronomeController(fake.port);
  const cancelled = controller.start({ config, errorMessage: ERROR });
  fake.starts[0]?.resolve(false);
  assert.equal(await cancelled, false);
  assert.deepEqual(controller.getSnapshot(), {
    status: "idle",
    beat: null,
    error: "",
  });
  assert.equal(fake.schedulers[0]?.stopped, true);

  const retry = controller.start({ config, errorMessage: ERROR });
  fake.starts[1]?.resolve(true);
  assert.equal(await retry, true);
  assert.equal(controller.getSnapshot().status, "running");
};

const testCreationCleanupAndDisposeFailures = async () => {
  const fake = createFakePort();
  const controller = createPracticeStandaloneMetronomeController(fake.port);
  fake.setThrowOnCreate(true);
  assert.equal(await controller.start({ config, errorMessage: ERROR }), false);
  assert.equal(controller.getSnapshot().error, ERROR);
  fake.setThrowOnCreate(false);
  const pending = controller.start({ config, errorMessage: ERROR });
  fake.setThrowOnStop(true);
  controller.stop();
  fake.starts[0]?.resolve(true);
  assert.equal(await pending, false);
  assert.equal(controller.getSnapshot().status, "idle");
  controller.dispose();
  controller.dispose();
  assert.equal(await controller.start({ config, errorMessage: ERROR }), false);
};

const run = async () => {
  await testStartBeatStopAndFrozenConfig();
  await testPendingStopAndSingleFlight();
  await testStaleBeatFailureAndRetry();
  await testCurrentCancellationIsSilentAndRetryable();
  await testCreationCleanupAndDisposeFailures();
  console.log("practice standalone metronome controller tests passed");
};

void run();
