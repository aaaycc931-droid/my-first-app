import assert from "node:assert/strict";

import type {
  PianoPlaybackRuntimeEvent,
  PianoPlaybackRuntimePort,
} from "../lib/piano/pianoPlaybackRuntimeController.js";
import { createPianoPlaybackRuntimeController } from "../lib/piano/pianoPlaybackRuntimeController.js";

const createFakePort = () => {
  let nextTimer = 1;
  let throwOnTimer = false;
  let throwOnClear = false;
  let throwOnAction = false;
  let throwOnStop = false;
  const calls: string[] = [];
  const timers = new Map<
    number,
    { callback: () => void; delayMs: number; cleared: boolean }
  >();
  const port: PianoPlaybackRuntimePort = {
    setTimer: (callback, delayMs) => {
      if (throwOnTimer) throw new Error("timer failed");
      const id = nextTimer++;
      timers.set(id, { callback, delayMs, cleared: false });
      return id;
    },
    clearTimer: (timer) => {
      const owned = timers.get(timer as number);
      if (owned) owned.cleared = true;
      if (throwOnClear) throw new Error("clear failed");
    },
    pressKey: (pointerId, keyId, velocity) => {
      if (throwOnAction) throw new Error("press failed");
      calls.push(`press:${pointerId}:${keyId}:${velocity}`);
    },
    releasePointer: (pointerId) => {
      if (throwOnAction) throw new Error("release failed");
      calls.push(`release:${pointerId}`);
    },
    setSustain: (down) => {
      if (throwOnAction) throw new Error("pedal failed");
      calls.push(`pedal:${down}`);
    },
    stopAll: () => {
      calls.push("stop");
      if (throwOnAction || throwOnStop) throw new Error("stop failed");
    },
  };
  return {
    port,
    calls,
    timers,
    fire: (timer: number, includeCleared = false) => {
      const owned = timers.get(timer);
      if (owned && (includeCleared || !owned.cleared)) owned.callback();
    },
    setNextTimer: (value: number) => {
      nextTimer = value;
    },
    setFailure: (
      kind: "timer" | "clear" | "action" | "stop",
      value: boolean,
    ) => {
      if (kind === "timer") throwOnTimer = value;
      if (kind === "clear") throwOnClear = value;
      if (kind === "action") throwOnAction = value;
      if (kind === "stop") throwOnStop = value;
    },
  };
};

const performanceEvents: PianoPlaybackRuntimeEvent[] = [
  {
    type: "note-on",
    delayMs: 0,
    pointerId: "playback-c4",
    keyId: "c4",
    velocity: 0.65,
  },
  { type: "pedal", delayMs: 20, down: true },
  { type: "note-off", delayMs: 40, pointerId: "playback-c4" },
  { type: "all-notes-off", delayMs: 50 },
];

const learningEvents: PianoPlaybackRuntimeEvent[] = [
  {
    type: "note-on",
    delayMs: 0,
    pointerId: "score-note-1",
    keyId: "d4",
    velocity: 0.68,
  },
  { type: "note-off", delayMs: 88, pointerId: "score-note-1" },
  { type: "all-notes-off", delayMs: 100 },
];

const testEventMappingAndCompletion = () => {
  const fake = createFakePort();
  const controller = createPianoPlaybackRuntimeController(fake.port);
  assert.equal(controller.play({
    events: performanceEvents,
    baseDelayMs: 60,
    loop: false,
  }), true);
  assert.equal(controller.getSnapshot().status, "playing");
  assert.deepEqual(
    Array.from(fake.timers.values()).map(({ delayMs }) => delayMs),
    [60, 80, 100, 110, 140],
  );
  [1, 2, 3, 4].forEach((timer) => fake.fire(timer));
  assert.deepEqual(fake.calls, [
    "press:playback-c4:c4:0.65",
    "pedal:true",
    "release:playback-c4",
    "stop",
  ]);
  fake.fire(5);
  assert.equal(controller.getSnapshot().status, "idle");
  assert.deepEqual(fake.calls.slice(-1), ["stop"]);

  assert.equal(controller.play({
    events: learningEvents,
    baseDelayMs: 0,
    loop: false,
  }), true);
  const learningIds = Array.from(fake.timers.keys()).slice(-4);
  learningIds.forEach((timer) => fake.fire(timer));
  assert.ok(fake.calls.includes("press:score-note-1:d4:0.68"));
  assert.ok(fake.calls.includes("release:score-note-1"));
  assert.equal(controller.getSnapshot().status, "idle");
};

const testReplacementAndRecorderIsolation = () => {
  const fake = createFakePort();
  const controller = createPianoPlaybackRuntimeController(fake.port);
  controller.play({ events: performanceEvents, baseDelayMs: 0, loop: false });
  const oldTimers = Array.from(fake.timers.keys());
  controller.play({ events: learningEvents, baseDelayMs: 0, loop: false });
  const beforeStale = [...fake.calls];
  oldTimers.forEach((timer) => fake.fire(timer, true));
  assert.deepEqual(fake.calls, beforeStale);
  assert.equal(controller.getSnapshot().status, "playing");

  const currentTimers = Array.from(fake.timers.keys()).slice(-4);
  controller.stop();
  const beforeRecorder = [...fake.calls];
  currentTimers.forEach((timer) => fake.fire(timer, true));
  assert.deepEqual(
    fake.calls,
    beforeRecorder,
    "stopped playback callbacks must not emit events into a new recorder",
  );
};

const testEveryReplacementDirectionRejectsStaleCallbacks = () => {
  const replacements = [
    [performanceEvents, performanceEvents],
    [performanceEvents, learningEvents],
    [learningEvents, performanceEvents],
    [learningEvents, learningEvents],
  ] as const;
  replacements.forEach(([first, second]) => {
    const fake = createFakePort();
    const controller = createPianoPlaybackRuntimeController(fake.port);
    assert.equal(controller.play({ events: first, baseDelayMs: 0, loop: false }), true);
    const staleCallbacks = Array.from(fake.timers.values()).map(({ callback }) => callback);
    assert.equal(controller.play({ events: second, baseDelayMs: 0, loop: false }), true);
    const callsBeforeStale = [...fake.calls];
    const timerCountBeforeStale = fake.timers.size;
    staleCallbacks.forEach((callback) => callback());
    assert.deepEqual(fake.calls, callsBeforeStale);
    assert.equal(fake.timers.size, timerCountBeforeStale);
    assert.equal(controller.getSnapshot().status, "playing");
  });
};

const testLoopUsesIndependentCycleGeneration = () => {
  const fake = createFakePort();
  const controller = createPianoPlaybackRuntimeController(fake.port);
  controller.play({ events: performanceEvents, baseDelayMs: 60, loop: true });
  const firstCycleIds = Array.from(fake.timers.keys());
  fake.fire(firstCycleIds.at(-1) as number);
  const secondCycleIds = Array.from(fake.timers.keys()).slice(firstCycleIds.length);
  assert.deepEqual(
    secondCycleIds.map((timer) => fake.timers.get(timer)?.delayMs),
    [0, 20, 40, 50, 80],
    "later cycles must not repeat the transpose delay",
  );
  const beforeStale = [...fake.calls];
  firstCycleIds.slice(0, -1).forEach((timer) => fake.fire(timer, true));
  assert.deepEqual(fake.calls, beforeStale);

  const staleLoopFinish = fake.timers.get(secondCycleIds.at(-1) as number)?.callback;
  controller.play({ events: learningEvents, baseDelayMs: 0, loop: false });
  const timerCount = fake.timers.size;
  staleLoopFinish?.();
  assert.equal(fake.timers.size, timerCount, "old loop finish must not create a new cycle");
  assert.equal(controller.getSnapshot().status, "playing");
};

const testTimerIdentityFailuresAndDispose = () => {
  const fake = createFakePort();
  const controller = createPianoPlaybackRuntimeController(fake.port);
  controller.play({ events: learningEvents, baseDelayMs: 0, loop: false });
  const oldCompletionId = Math.max(...Array.from(fake.timers.keys()));
  const oldCompletion = fake.timers.get(oldCompletionId)?.callback;
  fake.setNextTimer(oldCompletionId);
  controller.play({
    events: [{ ...learningEvents[0] }],
    baseDelayMs: 0,
    loop: false,
  });
  oldCompletion?.();
  assert.equal(fake.timers.get(oldCompletionId)?.cleared, false);
  controller.stop();
  assert.equal(fake.timers.get(oldCompletionId)?.cleared, true);

  fake.setFailure("timer", true);
  assert.equal(controller.play({
    events: learningEvents,
    baseDelayMs: 0,
    loop: false,
  }), false);
  assert.equal(controller.getSnapshot().status, "idle");
  fake.setFailure("timer", false);
  assert.equal(controller.play({
    events: learningEvents,
    baseDelayMs: 0,
    loop: false,
  }), true);
  const retryTimers = Array.from(fake.timers.keys()).slice(-4);
  fake.setFailure("clear", true);
  fake.setFailure("action", true);
  controller.stop();
  assert.equal(controller.getSnapshot().status, "idle");
  retryTimers.forEach((timer) => fake.fire(timer, true));
  assert.equal(controller.getSnapshot().status, "idle");

  controller.dispose();
  controller.dispose();
  assert.equal(controller.play({
    events: learningEvents,
    baseDelayMs: 0,
    loop: false,
  }), false);
};

const testCleanupFailuresStayIdle = () => {
  const replacementStopFailure = createFakePort();
  const replacementStopController = createPianoPlaybackRuntimeController(
    replacementStopFailure.port,
  );
  assert.equal(replacementStopController.play({
    events: performanceEvents,
    baseDelayMs: 0,
    loop: false,
  }), true);
  replacementStopFailure.setFailure("stop", true);
  assert.equal(replacementStopController.play({
    events: learningEvents,
    baseDelayMs: 0,
    loop: false,
  }), false);
  assert.equal(replacementStopController.getSnapshot().status, "idle");

  const replacementClearFailure = createFakePort();
  const replacementController = createPianoPlaybackRuntimeController(
    replacementClearFailure.port,
  );
  assert.equal(replacementController.play({
    events: performanceEvents,
    baseDelayMs: 0,
    loop: false,
  }), true);
  replacementClearFailure.setFailure("clear", true);
  assert.equal(replacementController.play({
    events: learningEvents,
    baseDelayMs: 0,
    loop: false,
  }), false);
  assert.equal(replacementController.getSnapshot().status, "idle");

  const loopStopFailure = createFakePort();
  const loopStopController = createPianoPlaybackRuntimeController(
    loopStopFailure.port,
  );
  assert.equal(loopStopController.play({
    events: performanceEvents,
    baseDelayMs: 0,
    loop: true,
  }), true);
  const loopCompletion = Math.max(...Array.from(loopStopFailure.timers.keys()));
  loopStopFailure.setFailure("stop", true);
  loopStopFailure.fire(loopCompletion);
  assert.equal(loopStopController.getSnapshot().status, "idle");
  assert.equal(
    Array.from(loopStopFailure.timers.entries()).filter(
      ([timer, { cleared }]) => timer !== loopCompletion && !cleared,
    ).length,
    0,
  );

  const loopClearFailure = createFakePort();
  const loopClearController = createPianoPlaybackRuntimeController(
    loopClearFailure.port,
  );
  assert.equal(loopClearController.play({
    events: performanceEvents,
    baseDelayMs: 0,
    loop: true,
  }), true);
  const clearFailureCompletion = Math.max(
    ...Array.from(loopClearFailure.timers.keys()),
  );
  loopClearFailure.setFailure("clear", true);
  loopClearFailure.fire(clearFailureCompletion);
  assert.equal(loopClearController.getSnapshot().status, "idle");
  assert.equal(
    Array.from(loopClearFailure.timers.entries()).filter(
      ([timer, { cleared }]) => timer !== clearFailureCompletion && !cleared,
    ).length,
    0,
  );
};

testEventMappingAndCompletion();
testReplacementAndRecorderIsolation();
testEveryReplacementDirectionRejectsStaleCallbacks();
testLoopUsesIndependentCycleGeneration();
testTimerIdentityFailuresAndDispose();
testCleanupFailuresStayIdle();
console.log("piano playback controller tests passed");
