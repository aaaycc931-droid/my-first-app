import assert from "node:assert/strict";

import type {
  LocalVocalReferencePlaybackPort,
  LocalVocalReferencePlaybackTone,
} from "../lib/audio/localVocalReferencePlayback.js";
import { createBrowserLocalVocalReferencePlaybackPort } from "../lib/audio/localVocalReferencePlayback.js";
import { createLocalVocalReferencePlaybackController } from "../lib/practice/localVocalReferencePlaybackController.js";

const EVENTS: LocalVocalReferencePlaybackTone[] = [
  { frequencyHz: 261.63, startSeconds: 0, durationSeconds: 0.5 },
  { frequencyHz: 329.63, startSeconds: 0.75, durationSeconds: 0.5 },
];
const ERROR = "当前手机无法播放练声参考音。";

const createFakePort = () => {
  const scheduled: LocalVocalReferencePlaybackTone[] = [];
  const timers = new Map<number, { callback: () => void; delayMs: number }>();
  const calls: string[] = [];
  let nextTimer = 1;
  let prepareImpl = async () => ({
    scheduleTone: (tone: LocalVocalReferencePlaybackTone) => {
      scheduled.push(tone);
    },
  });
  const port: LocalVocalReferencePlaybackPort = {
    prepare: () => prepareImpl(),
    stop: () => calls.push("stop"),
    dispose: () => calls.push("dispose"),
    setTimer: (callback, delayMs) => {
      const timer = nextTimer++;
      timers.set(timer, { callback, delayMs });
      return timer;
    },
    clearTimer: (timer) => {
      timers.delete(timer as number);
    },
  };
  return {
    port,
    scheduled,
    timers,
    calls,
    setNextTimer: (value: number) => {
      nextTimer = value;
    },
    setPrepare: (value: typeof prepareImpl) => {
      prepareImpl = value;
    },
  };
};

const testTimelineAndCompletion = async () => {
  const fake = createFakePort();
  const controller = createLocalVocalReferencePlaybackController(fake.port);
  assert.equal(await controller.play({ events: EVENTS, errorMessage: ERROR }), true);
  assert.deepEqual(fake.scheduled, EVENTS);
  assert.equal(fake.timers.get(1)?.delayMs, 1_400);
  assert.deepEqual(controller.getSnapshot(), { status: "playing", error: "" });
  fake.timers.get(1)?.callback();
  assert.deepEqual(controller.getSnapshot(), { status: "idle", error: "" });
};

const testPendingReplacementAndGlobalStopSemantics = async () => {
  const fake = createFakePort();
  const resolvers: Array<(value: Awaited<ReturnType<LocalVocalReferencePlaybackPort["prepare"]>>) => void> = [];
  fake.setPrepare(() => new Promise((resolve) => resolvers.push(resolve)));
  const controller = createLocalVocalReferencePlaybackController(fake.port);
  const first = controller.play({ events: EVENTS, errorMessage: ERROR });
  assert.equal(controller.getSnapshot().status, "preparing");
  controller.stop();
  resolvers[0]?.({ scheduleTone: (tone) => {
    fake.scheduled.push(tone);
  } });
  assert.equal(await first, false);
  assert.deepEqual(fake.scheduled, []);

  const second = controller.play({ events: EVENTS, errorMessage: ERROR });
  const third = controller.play({ events: [EVENTS[0]!], errorMessage: ERROR });
  resolvers[1]?.({ scheduleTone: (tone) => {
    fake.scheduled.push(tone);
  } });
  assert.equal(await second, false);
  resolvers[2]?.({ scheduleTone: (tone) => {
    fake.scheduled.push(tone);
  } });
  assert.equal(await third, true);
  assert.deepEqual(fake.scheduled, [EVENTS[0]]);
};

const testStaleCompletionTimerReuse = async () => {
  const fake = createFakePort();
  const controller = createLocalVocalReferencePlaybackController(fake.port);
  await controller.play({ events: EVENTS, errorMessage: ERROR });
  const staleCompletion = fake.timers.get(1)?.callback;
  fake.setNextTimer(1);
  await controller.play({ events: [EVENTS[0]!], errorMessage: ERROR });
  const callsBeforeStale = [...fake.calls];
  staleCompletion?.();
  assert.deepEqual(fake.calls, callsBeforeStale);
  assert.equal(controller.getSnapshot().status, "playing");
};

const testFailureRetryAndDispose = async () => {
  const fake = createFakePort();
  fake.setPrepare(async () => {
    throw new Error("blocked");
  });
  const controller = createLocalVocalReferencePlaybackController(fake.port);
  assert.equal(await controller.play({ events: EVENTS, errorMessage: ERROR }), false);
  assert.deepEqual(controller.getSnapshot(), { status: "idle", error: ERROR });
  fake.setPrepare(async () => ({
    scheduleTone: (tone) => {
      fake.scheduled.push(tone);
    },
  }));
  assert.equal(await controller.play({ events: EVENTS, errorMessage: ERROR }), true);
  assert.equal(controller.getSnapshot().error, "");
  controller.dispose();
  controller.dispose();
  assert.equal(await controller.play({ events: EVENTS, errorMessage: ERROR }), false);
  assert.equal(fake.calls.filter((call) => call === "dispose").length, 1);
};

const testBrowserEnvelope = async () => {
  const automation: Array<[string, number, number]> = [];
  const oscillator = {
    type: "sine",
    frequency: { value: 0 },
    connect: () => undefined,
    start: (time: number) => automation.push(["start", time, 0]),
    stop: (time: number) => automation.push(["stop", time, 0]),
  };
  const gain = {
    gain: {
      setValueAtTime: (value: number, time: number) =>
        automation.push(["gain", value, time]),
      exponentialRampToValueAtTime: (value: number, time: number) =>
        automation.push(["ramp", value, time]),
    },
    connect: () => undefined,
  };
  let trackedSource: unknown = null;
  const port = createBrowserLocalVocalReferencePlaybackPort({
    createChannel: () => ({
      prepareForUserGesture: async () => ({
        currentTime: 4,
        destination: {},
        createOscillator: () => oscillator,
        createGain: () => gain,
      }),
      trackSource: (source: unknown) => {
        trackedSource = source;
        return source;
      },
      stop: () => undefined,
    }) as never,
  });
  const prepared = await port.prepare();
  prepared.scheduleTone({ frequencyHz: 440, startSeconds: 0.5, durationSeconds: 0.4 });
  assert.equal(oscillator.type, "triangle");
  assert.equal(oscillator.frequency.value, 440);
  assert.equal(trackedSource, oscillator);
  assert.deepEqual(automation, [
    ["gain", 0.0001, 4.54],
    ["ramp", 0.09, 4.555],
    ["gain", 0.09, 4.9],
    ["ramp", 0.0001, 4.94],
    ["start", 4.54, 0],
    ["stop", 4.95, 0],
  ]);
};

const run = async () => {
  await testTimelineAndCompletion();
  await testPendingReplacementAndGlobalStopSemantics();
  await testStaleCompletionTimerReuse();
  await testFailureRetryAndDispose();
  await testBrowserEnvelope();
  console.log("local vocal reference playback controller tests passed");
};

void run();
