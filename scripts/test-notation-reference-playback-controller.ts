import assert from "node:assert/strict";

import { createBrowserNotationReferencePlaybackPort } from "../lib/audio/notationReferencePlayback.js";
import type {
  NotationReferencePlaybackPort,
  NotationReferencePlaybackTone,
} from "../lib/audio/notationReferencePlayback.js";
import { createNotationReferencePlaybackController } from "../lib/practice/notationReferencePlaybackController.js";

const createFakePort = () => {
  let nextTimer = 1;
  let throwOnPrepare = false;
  let throwOnSchedule = false;
  let throwOnTimer = false;
  let throwOnClear = false;
  let throwOnStop = false;
  const tones: NotationReferencePlaybackTone[] = [];
  const calls: string[] = [];
  const timers = new Map<
    number,
    { callback: () => void; delayMs: number; cleared: boolean }
  >();
  const port: NotationReferencePlaybackPort = {
    prepare: async () => {
      if (throwOnPrepare) throw new Error("prepare failed");
      return {
        currentTimeSeconds: 10,
        scheduleTone: (tone) => {
          if (throwOnSchedule) throw new Error("schedule failed");
          tones.push(tone);
        },
      };
    },
    stop: () => {
      calls.push("stop");
      if (throwOnStop) throw new Error("stop failed");
    },
    dispose: () => calls.push("dispose"),
    setTimer: (callback, delayMs) => {
      if (throwOnTimer) throw new Error("timer failed");
      const timer = nextTimer++;
      timers.set(timer, { callback, delayMs, cleared: false });
      return timer;
    },
    clearTimer: (timer) => {
      const owned = timers.get(timer as number);
      if (owned) owned.cleared = true;
      if (throwOnClear) throw new Error("clear failed");
    },
  };
  return {
    port,
    tones,
    calls,
    timers,
    setNextTimer: (timer: number) => {
      nextTimer = timer;
    },
    setFailure: (
      kind: "prepare" | "schedule" | "timer" | "clear" | "stop",
      value: boolean,
    ) => {
      if (kind === "prepare") throwOnPrepare = value;
      if (kind === "schedule") throwOnSchedule = value;
      if (kind === "timer") throwOnTimer = value;
      if (kind === "clear") throwOnClear = value;
      if (kind === "stop") throwOnStop = value;
    },
  };
};

const TONE_ERROR =
  "当前浏览器无法播放参考音。你仍可继续查看音符并进行本地跟练。";
const MELODY_ERROR =
  "当前浏览器无法播放参考旋律。你仍可逐个查看音符并进行本地跟练。";

const testToneAndMelodyTiming = async () => {
  const fake = createFakePort();
  const controller = createNotationReferencePlaybackController(fake.port);
  assert.equal(
    await controller.playTone({ frequencyHz: 440, errorMessage: TONE_ERROR }),
    true,
  );
  assert.deepEqual(fake.tones, [{
    frequencyHz: 440,
    startTimeSeconds: 10.03,
    endTimeSeconds: 10.93,
    peakGain: 0.16,
    attackSeconds: 0.02,
    releaseTimeSeconds: 10.84,
  }]);
  assert.equal(fake.timers.get(1)?.delayMs, 1_050);
  assert.deepEqual(controller.getSnapshot(), {
    status: "playing",
    mode: "tone",
    error: "",
  });
  fake.timers.get(1)?.callback();
  assert.deepEqual(controller.getSnapshot(), {
    status: "idle",
    mode: null,
    error: "",
  });

  assert.equal(await controller.playMelody({
    events: [
      { eventIndex: 0, frequencyHz: 261.63, offsetSeconds: 0, durationSeconds: 0.6 },
      { eventIndex: 1, frequencyHz: null, offsetSeconds: 0.6, durationSeconds: 0.3 },
      { eventIndex: 2, frequencyHz: 329.63, offsetSeconds: 0.9, durationSeconds: 1.2 },
    ],
    totalDurationSeconds: 2.1,
    errorMessage: MELODY_ERROR,
  }), true);
  assert.deepEqual(fake.tones.slice(-2), [
    {
      frequencyHz: 261.63,
      startTimeSeconds: 10.05,
      endTimeSeconds: 10.65,
      peakGain: 0.13,
      attackSeconds: 0.02,
      releaseTimeSeconds: 10.620000000000001,
    },
    {
      frequencyHz: 329.63,
      startTimeSeconds: 10.950000000000001,
      endTimeSeconds: 12.15,
      peakGain: 0.13,
      attackSeconds: 0.02,
      releaseTimeSeconds: 12.120000000000001,
    },
  ]);
  assert.ok(Math.abs((fake.timers.get(2)?.delayMs ?? 0) - 2_300) < 0.001);
};

const testStaleCompletionAndTimerReuse = async () => {
  const fake = createFakePort();
  const controller = createNotationReferencePlaybackController(fake.port);
  await controller.playMelody({
    events: [],
    totalDurationSeconds: 1,
    errorMessage: MELODY_ERROR,
  });
  const staleCompletion = fake.timers.get(1)?.callback;
  fake.setNextTimer(1);
  await controller.playTone({ frequencyHz: 440, errorMessage: TONE_ERROR });
  const callsBeforeStale = [...fake.calls];
  staleCompletion?.();
  assert.deepEqual(fake.calls, callsBeforeStale);
  assert.deepEqual(controller.getSnapshot(), {
    status: "playing",
    mode: "tone",
    error: "",
  });
  assert.equal(fake.timers.get(1)?.cleared, false);
  controller.stop();
  assert.equal(fake.timers.get(1)?.cleared, true);
};

const testPendingPrepareReplacement = async () => {
  const resolvers: Array<
    (prepared: Awaited<ReturnType<NotationReferencePlaybackPort["prepare"]>>) =>
      void
  > = [];
  const tones: number[] = [];
  const timers = new Map<number, () => void>();
  let nextTimer = 1;
  const port: NotationReferencePlaybackPort = {
    prepare: () =>
      new Promise((resolve) => {
        resolvers.push(resolve);
      }),
    stop: () => undefined,
    dispose: () => undefined,
    setTimer: (callback) => {
      const timer = nextTimer++;
      timers.set(timer, callback);
      return timer;
    },
    clearTimer: (timer) => {
      timers.delete(timer as number);
    },
  };
  const prepared = {
    currentTimeSeconds: 1,
    scheduleTone: ({ frequencyHz }: NotationReferencePlaybackTone) => {
      tones.push(frequencyHz);
    },
  };
  const controller = createNotationReferencePlaybackController(port);
  const first = controller.playTone({
    frequencyHz: 440,
    errorMessage: TONE_ERROR,
  });
  assert.equal(controller.getSnapshot().status, "preparing");
  const second = controller.playTone({
    frequencyHz: 523.25,
    errorMessage: TONE_ERROR,
  });
  resolvers[0]?.(prepared);
  assert.equal(await first, false);
  assert.deepEqual(tones, []);
  resolvers[1]?.(prepared);
  assert.equal(await second, true);
  assert.deepEqual(tones, [523.25]);
  assert.deepEqual(controller.getSnapshot(), {
    status: "playing",
    mode: "tone",
    error: "",
  });
};

const testFailuresRetryAndDispose = async () => {
  for (const failure of ["prepare", "schedule", "timer"] as const) {
    const fake = createFakePort();
    const controller = createNotationReferencePlaybackController(fake.port);
    fake.setFailure(failure, true);
    assert.equal(
      await controller.playTone({ frequencyHz: 440, errorMessage: TONE_ERROR }),
      false,
    );
    assert.deepEqual(controller.getSnapshot(), {
      status: "idle",
      mode: null,
      error: TONE_ERROR,
    });
    fake.setFailure(failure, false);
    assert.equal(
      await controller.playTone({ frequencyHz: 440, errorMessage: TONE_ERROR }),
      true,
    );
    assert.equal(controller.getSnapshot().error, "");
  }

  const cleanup = createFakePort();
  const controller = createNotationReferencePlaybackController(cleanup.port);
  await controller.playTone({ frequencyHz: 440, errorMessage: TONE_ERROR });
  const stale = cleanup.timers.get(1)?.callback;
  cleanup.setFailure("clear", true);
  cleanup.setFailure("stop", true);
  controller.stop();
  stale?.();
  assert.equal(controller.getSnapshot().status, "idle");
  controller.dispose();
  controller.dispose();
  assert.equal(
    await controller.playTone({ frequencyHz: 440, errorMessage: TONE_ERROR }),
    false,
  );
};

const testBrowserPortEnvelope = async () => {
  const automation: Array<[string, number, number]> = [];
  const oscillator = {
    type: "square",
    frequency: {
      setValueAtTime: (value: number, time: number) =>
        automation.push(["frequency", value, time]),
    },
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
  const channel = {
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
  };
  const port = createBrowserNotationReferencePlaybackPort({
    createChannel: () => channel as never,
  });
  const prepared = await port.prepare();
  prepared.scheduleTone({
    frequencyHz: 440,
    startTimeSeconds: 4.03,
    endTimeSeconds: 4.93,
    peakGain: 0.16,
    attackSeconds: 0.02,
    releaseTimeSeconds: 4.84,
  });
  assert.equal(prepared.currentTimeSeconds, 4);
  assert.equal(oscillator.type, "sine");
  assert.equal(trackedSource, oscillator);
  assert.deepEqual(automation, [
    ["frequency", 440, 4.03],
    ["gain", 0.0001, 4.03],
    ["ramp", 0.16, 4.05],
    ["ramp", 0.0001, 4.84],
    ["start", 4.03, 0],
    ["stop", 4.93, 0],
  ]);
};

const run = async () => {
  await testToneAndMelodyTiming();
  await testStaleCompletionAndTimerReuse();
  await testPendingPrepareReplacement();
  await testFailuresRetryAndDispose();
  await testBrowserPortEnvelope();
  console.log("notation reference playback controller tests passed");
};

void run();
