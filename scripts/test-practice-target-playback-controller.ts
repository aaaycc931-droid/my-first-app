import assert from "node:assert/strict";

import { createBrowserPracticeTargetPlaybackPort } from "../lib/audio/practiceTargetPlayback.js";
import type {
  PracticeTargetPlaybackPort,
  PracticeTargetPlaybackTimer,
  PreparedPracticeTargetPlayback,
  PracticeTargetTone,
} from "../lib/audio/practiceTargetPlayback.js";
import { createPracticeTargetPlaybackController } from "../lib/practice/practiceTargetPlaybackController.js";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};

const createFakePort = () => {
  let nextTimer = 1;
  let stopCalls = 0;
  let disposeCalls = 0;
  let throwOnSchedule = false;
  let throwOnTimer = false;
  const prepareRequests: ReturnType<
    typeof deferred<PreparedPracticeTargetPlayback>
  >[] = [];
  const tones: PracticeTargetTone[] = [];
  const timers = new Map<
    number,
    { callback: () => void; delayMs: number; cleared: boolean }
  >();
  const port: PracticeTargetPlaybackPort = {
    prepare: () => {
      const request = deferred<PreparedPracticeTargetPlayback>();
      prepareRequests.push(request);
      return request.promise;
    },
    stop: () => {
      stopCalls += 1;
    },
    dispose: () => {
      disposeCalls += 1;
    },
    setTimer: (callback, delayMs) => {
      if (throwOnTimer) throw new Error("timer failed");
      const timer = nextTimer;
      nextTimer += 1;
      timers.set(timer, { callback, delayMs, cleared: false });
      return timer;
    },
    clearTimer: (timer) => {
      const owned = timers.get(timer as number);
      if (owned) owned.cleared = true;
    },
  };
  const prepared = (): PreparedPracticeTargetPlayback => ({
    currentTimeSeconds: 10,
    scheduleTone: (tone) => {
      if (throwOnSchedule) throw new Error("schedule failed");
      tones.push(tone);
    },
  });
  return {
    port,
    prepareRequests,
    tones,
    timers,
    prepared,
    fireTimer: (timer: number, includeCleared = false) => {
      const owned = timers.get(timer);
      if (owned && (includeCleared || !owned.cleared)) owned.callback();
    },
    setThrowOnSchedule: (next: boolean) => {
      throwOnSchedule = next;
    },
    setThrowOnTimer: (next: boolean) => {
      throwOnTimer = next;
    },
    getStopCalls: () => stopCalls,
    getDisposeCalls: () => disposeCalls,
  };
};

const testBrowserPort = async () => {
  const calls: string[] = [];
  const oscillator = {
    type: "triangle",
    frequency: { value: 0 },
    connect: () => calls.push("oscillator-connect"),
    start: (time: number) => calls.push(`start:${time}`),
    stop: (time: number) => calls.push(`stop:${time}`),
  };
  const gain = {
    gain: {
      setValueAtTime: (value: number, time: number) =>
        calls.push(`gain-set:${value}:${time}`),
      exponentialRampToValueAtTime: (value: number, time: number) =>
        calls.push(`gain-ramp:${value}:${time}`),
    },
    connect: () => calls.push("gain-connect"),
  };
  const context = {
    currentTime: 2,
    destination: {},
    createOscillator: () => oscillator,
    createGain: () => gain,
  } as unknown as AudioContext;
  let channelStopCalls = 0;
  const tracked: unknown[] = [];
  const channel = {
    prepareForUserGesture: async () => context,
    trackSource: (source: unknown, disconnectNodes: unknown[]) => {
      tracked.push(source, ...disconnectNodes);
      return source;
    },
    stop: () => {
      channelStopCalls += 1;
    },
  };
  const timers: { callback: () => void; delayMs: number }[] = [];
  const port = createBrowserPracticeTargetPlaybackPort({
    createChannel: () => channel as never,
    setTimer: (callback, delayMs) => {
      timers.push({ callback, delayMs });
      return timers.length;
    },
    clearTimer: () => undefined,
  });
  const prepared = await port.prepare();
  assert.equal(prepared.currentTimeSeconds, 2);
  prepared.scheduleTone({
    frequencyHz: 440,
    startTimeSeconds: 2.05,
    durationSeconds: 1,
    stopAfterSeconds: 0.95,
  });
  assert.equal(oscillator.type, "sine");
  assert.equal(oscillator.frequency.value, 440);
  assert.deepEqual(tracked, [oscillator, gain]);
  assert.ok(calls.includes("start:2.05"));
  assert.ok(calls.includes("stop:3"));
  port.stop();
  port.dispose();
  assert.equal(channelStopCalls, 2);
};

const testSequenceScheduleAndCompletion = async () => {
  const fake = createFakePort();
  const controller = createPracticeTargetPlaybackController(fake.port);
  const started = controller.playSequence({
    frequenciesHz: [440, 493.88],
    noteSeconds: 0.5,
    errorMessage: "sequence failed",
  });
  assert.deepEqual(controller.getSnapshot(), {
    status: "preparing",
    mode: "sequence",
    activeNoteIndex: null,
    error: "",
  });
  fake.prepareRequests[0]?.resolve(fake.prepared());
  assert.equal(await started, true);
  assert.deepEqual(fake.tones, [
    {
      frequencyHz: 440,
      startTimeSeconds: 10.05,
      durationSeconds: 0.5,
      stopAfterSeconds: 0.475,
    },
    {
      frequencyHz: 493.88,
      startTimeSeconds: 10.55,
      durationSeconds: 0.5,
      stopAfterSeconds: 0.475,
    },
  ]);
  assert.deepEqual(
    Array.from(fake.timers.values()).map(({ delayMs }) => delayMs),
    [0, 500, 1500],
  );
  fake.fireTimer(1);
  assert.equal(controller.getSnapshot().activeNoteIndex, 0);
  fake.fireTimer(2);
  assert.equal(controller.getSnapshot().activeNoteIndex, 1);
  fake.fireTimer(3);
  assert.equal(controller.getSnapshot().status, "idle");
};

const testPendingReplacementAndStaleCallbacks = async () => {
  const fake = createFakePort();
  const controller = createPracticeTargetPlaybackController(fake.port);
  const firstPending = controller.playSequence({
    frequenciesHz: [440],
    noteSeconds: 1,
    errorMessage: "old failure",
  });
  const replacementPending = controller.playNote({
    frequencyHz: 523.25,
    noteSeconds: 1,
    errorMessage: "new failure",
  });
  fake.prepareRequests[0]?.resolve(fake.prepared());
  assert.equal(await firstPending, false);
  assert.equal(fake.tones.length, 0);
  fake.prepareRequests[1]?.resolve(fake.prepared());
  assert.equal(await replacementPending, true);
  assert.equal(controller.getSnapshot().mode, "note");

  const oldReject = controller.playSequence({
    frequenciesHz: [440],
    noteSeconds: 1,
    errorMessage: "stale rejection",
  });
  const current = controller.playNote({
    frequencyHz: 659.25,
    noteSeconds: 1,
    errorMessage: "current failure",
  });
  fake.prepareRequests[2]?.reject(new Error("late"));
  assert.equal(await oldReject, false);
  assert.equal(controller.getSnapshot().status, "preparing");
  fake.prepareRequests[3]?.resolve(fake.prepared());
  assert.equal(await current, true);
  assert.equal(controller.getSnapshot().mode, "note");
};

const testClearedOldTimersCannotOverwriteReplacement = async () => {
  const fake = createFakePort();
  const controller = createPracticeTargetPlaybackController(fake.port);
  const sequence = controller.playSequence({
    frequenciesHz: [440, 493.88],
    noteSeconds: 0.5,
    errorMessage: "sequence failure",
  });
  fake.prepareRequests[0]?.resolve(fake.prepared());
  assert.equal(await sequence, true);
  const staleTimerIds = Array.from(fake.timers.keys());

  const note = controller.playNote({
    frequencyHz: 659.25,
    noteSeconds: 1,
    errorMessage: "note failure",
  });
  fake.prepareRequests[1]?.resolve(fake.prepared());
  assert.equal(await note, true);
  staleTimerIds.forEach((timer) => fake.fireTimer(timer, true));
  assert.deepEqual(controller.getSnapshot(), {
    status: "playing",
    mode: "note",
    activeNoteIndex: null,
    error: "",
  });
};

const testStopFailureAndDispose = async () => {
  const fake = createFakePort();
  const controller = createPracticeTargetPlaybackController(fake.port);
  const pending = controller.playNote({
    frequencyHz: 440,
    noteSeconds: 1,
    errorMessage: "note failure",
  });
  controller.stop();
  fake.prepareRequests[0]?.resolve(fake.prepared());
  assert.equal(await pending, false);
  assert.equal(controller.getSnapshot().status, "idle");

  fake.setThrowOnSchedule(true);
  const failure = controller.playNote({
    frequencyHz: 440,
    noteSeconds: 1,
    errorMessage: "note failure",
  });
  fake.prepareRequests[1]?.resolve(fake.prepared());
  assert.equal(await failure, false);
  assert.deepEqual(controller.getSnapshot(), {
    status: "error",
    mode: "note",
    activeNoteIndex: null,
    error: "note failure",
  });

  fake.setThrowOnSchedule(false);
  const detached = controller.playSequence({
    frequenciesHz: [440],
    noteSeconds: 1,
    errorMessage: "sequence failure",
  });
  controller.dispose();
  fake.prepareRequests[2]?.resolve(fake.prepared());
  assert.equal(await detached, false);
  assert.equal(fake.getDisposeCalls(), 1);
  assert.equal(await controller.playNote({
    frequencyHz: 440,
    noteSeconds: 1,
    errorMessage: "ignored",
  }), false);
};

const testCurrentPrepareAndTimerFailuresCanRetry = async () => {
  const fake = createFakePort();
  const controller = createPracticeTargetPlaybackController(fake.port);
  const prepareFailure = controller.playNote({
    frequencyHz: 440,
    noteSeconds: 1,
    errorMessage: "prepare failure",
  });
  fake.prepareRequests[0]?.reject(new Error("resume failed"));
  assert.equal(await prepareFailure, false);
  assert.equal(controller.getSnapshot().status, "error");
  assert.equal(controller.getSnapshot().error, "prepare failure");

  fake.setThrowOnTimer(true);
  const timerFailure = controller.playSequence({
    frequenciesHz: [440, 493.88],
    noteSeconds: 0.5,
    errorMessage: "timer failure",
  });
  fake.prepareRequests[1]?.resolve(fake.prepared());
  assert.equal(await timerFailure, false);
  assert.equal(controller.getSnapshot().status, "error");
  assert.equal(controller.getSnapshot().error, "timer failure");
  assert.equal(fake.tones.length, 1, "the first tone was stopped after timer failure");

  fake.setThrowOnTimer(false);
  const retry = controller.playNote({
    frequencyHz: 659.25,
    noteSeconds: 1,
    errorMessage: "retry failure",
  });
  fake.prepareRequests[2]?.resolve(fake.prepared());
  assert.equal(await retry, true);
  assert.equal(controller.getSnapshot().status, "playing");
  controller.stop();
  controller.stop();
  assert.equal(controller.getSnapshot().status, "idle");
};

const testInvalidRequestsFailClosed = async () => {
  const fake = createFakePort();
  const controller = createPracticeTargetPlaybackController(fake.port);
  assert.equal(await controller.playSequence({
    frequenciesHz: [],
    noteSeconds: 1,
    errorMessage: "invalid sequence",
  }), false);
  assert.equal(controller.getSnapshot().error, "invalid sequence");
  assert.equal(await controller.playNote({
    frequencyHz: 0,
    noteSeconds: 1,
    errorMessage: "invalid note",
  }), false);
  assert.equal(controller.getSnapshot().error, "invalid note");
  assert.equal(fake.prepareRequests.length, 0);
};

const main = async () => {
  await testBrowserPort();
  await testSequenceScheduleAndCompletion();
  await testPendingReplacementAndStaleCallbacks();
  await testClearedOldTimersCannotOverwriteReplacement();
  await testStopFailureAndDispose();
  await testCurrentPrepareAndTimerFailuresCanRetry();
  await testInvalidRequestsFailClosed();
  console.log("Practice target playback controller tests passed.");
};

void main();
