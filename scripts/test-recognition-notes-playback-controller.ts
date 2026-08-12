import assert from "node:assert/strict";

import { createBrowserRecognitionNotesPlaybackPort } from "../lib/audio/recognitionNotesPlayback.js";
import type {
  RecognitionNotesPlaybackPort,
  RecognitionPlaybackTone,
} from "../lib/audio/recognitionNotesPlayback.js";
import type { RecognizedNote } from "../lib/recognition.js";
import { createRecognitionNotesPlaybackController } from "../lib/recognition/recognitionNotesPlaybackController.js";

const note = (
  value: string,
  duration: RecognizedNote["duration"],
): RecognizedNote => ({
  pitch: value,
  note: value,
  duration,
  measure: 1,
  beat: 1,
  confidence: 1,
});

const createFakePort = () => {
  let nextTimer = 1;
  let stopCalls = 0;
  let disposeCalls = 0;
  let currentTimeSeconds = 10;
  let throwOnPrepare = false;
  let throwOnSchedule = false;
  let throwOnTimer = false;
  let throwOnCleanup = false;
  const tones: RecognitionPlaybackTone[] = [];
  const timers = new Map<
    number,
    { callback: () => void; delayMs: number; cleared: boolean }
  >();
  const port: RecognitionNotesPlaybackPort = {
    prepare: () => {
      if (throwOnPrepare) throw new Error("prepare failed");
      return {
        currentTimeSeconds,
        scheduleTone: (tone) => {
          if (throwOnSchedule) throw new Error("schedule failed");
          tones.push(tone);
        },
      };
    },
    stop: () => {
      stopCalls += 1;
      if (throwOnCleanup) throw new Error("stop failed");
    },
    dispose: () => {
      disposeCalls += 1;
      if (throwOnCleanup) throw new Error("dispose failed");
    },
    setTimer: (callback, delayMs) => {
      if (throwOnTimer) throw new Error("timer failed");
      const id = nextTimer++;
      timers.set(id, { callback, delayMs, cleared: false });
      return id;
    },
    clearTimer: (timer) => {
      const owned = timers.get(timer as number);
      if (owned) owned.cleared = true;
      if (throwOnCleanup) throw new Error("clear failed");
    },
  };
  return {
    port,
    tones,
    timers,
    fire: (id: number, includeCleared = false) => {
      const timer = timers.get(id);
      if (timer && (includeCleared || !timer.cleared)) timer.callback();
    },
    setCurrentTime: (value: number) => {
      currentTimeSeconds = value;
    },
    setNextTimer: (value: number) => {
      nextTimer = value;
    },
    setFailure: (kind: "prepare" | "schedule" | "timer" | "cleanup") => {
      if (kind === "prepare") throwOnPrepare = true;
      if (kind === "schedule") throwOnSchedule = true;
      if (kind === "timer") throwOnTimer = true;
      if (kind === "cleanup") throwOnCleanup = true;
    },
    clearFailures: () => {
      throwOnPrepare = false;
      throwOnSchedule = false;
      throwOnTimer = false;
      throwOnCleanup = false;
    },
    getStopCalls: () => stopCalls,
    getDisposeCalls: () => disposeCalls,
  };
};

const testBrowserPort = () => {
  const calls: string[] = [];
  const oscillator = {
    type: "triangle",
    frequency: { value: 0 },
    connect: () => calls.push("osc-connect"),
    start: (time: number) => calls.push(`start:${time}`),
    stop: (time: number) => calls.push(`stop:${time}`),
  };
  const gain = {
    gain: {
      setValueAtTime: (value: number, time: number) =>
        calls.push(`set:${value}:${time}`),
      exponentialRampToValueAtTime: (value: number, time: number) =>
        calls.push(`ramp:${value}:${time}`),
    },
    connect: () => calls.push("gain-connect"),
  };
  const context = {
    currentTime: 2,
    destination: {},
    createOscillator: () => oscillator,
    createGain: () => gain,
  } as unknown as AudioContext;
  let stopCalls = 0;
  const tracked: unknown[] = [];
  const timers: Array<{ callback: () => void; delayMs: number }> = [];
  const cleared: unknown[] = [];
  const port = createBrowserRecognitionNotesPlaybackPort({
    createChannel: () => ({
      getContext: () => context,
      trackSource: (source: unknown, nodes: unknown[]) => {
        tracked.push(source, ...nodes);
        return source;
      },
      stop: () => {
        stopCalls += 1;
      },
    }) as never,
    setTimer: (callback, delayMs) => {
      timers.push({ callback, delayMs });
      return timers.length;
    },
    clearTimer: (timer) => {
      cleared.push(timer);
    },
  });
  const prepared = port.prepare();
  assert.equal(prepared.currentTimeSeconds, 2);
  prepared.scheduleTone({
    frequencyHz: 440,
    startTimeSeconds: 2.04,
    durationSeconds: 0.5,
  });
  assert.equal(oscillator.type, "sine");
  assert.equal(oscillator.frequency.value, 440);
  assert.deepEqual(tracked, [oscillator, gain]);
  assert.deepEqual(calls, [
    "set:0.0001:2.04",
    "ramp:0.16:2.055",
    "ramp:0.0001:2.52",
    "osc-connect",
    "gain-connect",
    "start:2.04",
    "stop:2.54",
  ]);
  const timer = port.setTimer(() => undefined, 25);
  port.clearTimer(timer);
  assert.equal(timers[0]?.delayMs, 25);
  assert.deepEqual(cleared, [1]);
  port.stop();
  port.dispose();
  assert.equal(stopCalls, 2);
};

const testScheduleAndNaturalCompletion = () => {
  const fake = createFakePort();
  const controller = createRecognitionNotesPlaybackController(fake.port);
  assert.equal(controller.play({
    notes: [
      note("A4", "eighth"),
      note("B4", "quarter"),
      note("C5", "half"),
      note("D5", "whole"),
    ],
    bpm: 120,
    trackActiveNote: true,
    errorMessage: "failed",
  }), true);
  assert.equal(controller.getSnapshot().status, "playing");
  assert.deepEqual(fake.tones.map(({ startTimeSeconds, durationSeconds }) => ({
    startTimeSeconds,
    durationSeconds,
  })), [
    { startTimeSeconds: 10.04, durationSeconds: 0.25 },
    { startTimeSeconds: 10.29, durationSeconds: 0.5 },
    { startTimeSeconds: 10.79, durationSeconds: 1 },
    { startTimeSeconds: 11.79, durationSeconds: 2 },
  ]);
  assert.deepEqual(
    Array.from(fake.timers.values()).map(({ delayMs }) => delayMs),
    [0, 250, 750, 1750, 4250],
  );
  fake.fire(1);
  assert.equal(controller.getSnapshot().activeNoteIndex, 0);
  fake.fire(4);
  assert.equal(controller.getSnapshot().activeNoteIndex, 3);
  fake.fire(5);
  assert.deepEqual(controller.getSnapshot(), {
    status: "idle",
    activeNoteIndex: null,
    error: "",
  });
};

const testStaleCallbacksCannotOverwriteReplacement = () => {
  const fake = createFakePort();
  const controller = createRecognitionNotesPlaybackController(fake.port);
  controller.play({
    notes: [note("A4", "quarter"), note("B4", "quarter")],
    bpm: 120,
    trackActiveNote: true,
    errorMessage: "old",
  });
  const oldTimers = Array.from(fake.timers.keys());
  const stopCallsBeforeReplacement = fake.getStopCalls();
  fake.setCurrentTime(20);
  controller.play({
    notes: [note("C5", "half")],
    bpm: 60,
    trackActiveNote: false,
    errorMessage: "new",
  });
  const replacementTimer = Math.max(...Array.from(fake.timers.keys()));
  assert.equal(fake.getStopCalls(), stopCallsBeforeReplacement + 1);
  oldTimers.forEach((timer) => fake.fire(timer, true));
  assert.equal(controller.getSnapshot().status, "playing");
  assert.equal(controller.getSnapshot().activeNoteIndex, null);
  assert.equal(fake.getStopCalls(), stopCallsBeforeReplacement + 1);
  assert.equal(fake.timers.get(replacementTimer)?.cleared, false);
  fake.fire(replacementTimer);
  assert.equal(controller.getSnapshot().status, "idle");

  controller.play({
    notes: [note("D5", "quarter")],
    bpm: 120,
    trackActiveNote: false,
    errorMessage: "preview",
  });
  const previewCompletion = Math.max(...Array.from(fake.timers.keys()));
  controller.play({
    notes: [note("E5", "quarter")],
    bpm: 120,
    trackActiveNote: true,
    errorMessage: "main",
  });
  fake.fire(previewCompletion, true);
  assert.equal(controller.getSnapshot().status, "playing");
};

const testReusedTimerIdKeepsReplacementOwnership = () => {
  const fake = createFakePort();
  const controller = createRecognitionNotesPlaybackController(fake.port);
  controller.play({
    notes: [note("A4", "quarter")],
    bpm: 120,
    trackActiveNote: false,
    errorMessage: "old",
  });
  const reusedId = Math.max(...Array.from(fake.timers.keys()));
  const staleCompletion = fake.timers.get(reusedId)?.callback;
  assert.ok(staleCompletion);
  fake.setNextTimer(reusedId);
  controller.play({
    notes: [note("B4", "quarter")],
    bpm: 120,
    trackActiveNote: false,
    errorMessage: "new",
  });
  staleCompletion();
  assert.equal(controller.getSnapshot().status, "playing");
  assert.equal(fake.timers.get(reusedId)?.cleared, false);
  controller.stop();
  assert.equal(fake.timers.get(reusedId)?.cleared, true);
};

const testNoopFailureRetryStopAndDispose = () => {
  const fake = createFakePort();
  const controller = createRecognitionNotesPlaybackController(fake.port);
  assert.equal(controller.play({
    notes: [note("A4", "quarter")],
    bpm: 120,
    trackActiveNote: true,
    errorMessage: "failed",
  }), true);
  const beforeEmpty = controller.getSnapshot();
  assert.equal(controller.play({
    notes: [], bpm: 120, trackActiveNote: false, errorMessage: "ignored",
  }), false);
  assert.deepEqual(controller.getSnapshot(), beforeEmpty);

  controller.stop();
  assert.equal(controller.getSnapshot().status, "idle");
  fake.setFailure("prepare");
  assert.equal(controller.play({
    notes: [note("A4", "quarter")],
    bpm: 120,
    trackActiveNote: true,
    errorMessage: "播放失败，请稍后再试。",
  }), false);
  assert.equal(controller.getSnapshot().error, "播放失败，请稍后再试。");
  controller.stop();
  assert.equal(controller.getSnapshot().error, "播放失败，请稍后再试。");
  controller.clearError();
  assert.equal(controller.getSnapshot().error, "");

  fake.setFailure("prepare");
  controller.play({
    notes: [note("A4", "quarter")],
    bpm: 120,
    trackActiveNote: true,
    errorMessage: "existing error",
  });
  const errorBeforeEmpty = controller.getSnapshot();
  assert.equal(controller.play({
    notes: [], bpm: 120, trackActiveNote: false, errorMessage: "ignored",
  }), false);
  assert.deepEqual(controller.getSnapshot(), errorBeforeEmpty);

  fake.clearFailures();
  fake.setFailure("schedule");
  assert.equal(controller.play({
    notes: [note("A4", "quarter")],
    bpm: 120,
    trackActiveNote: true,
    errorMessage: "schedule failed",
  }), false);
  assert.equal(controller.getSnapshot().error, "schedule failed");
  fake.clearFailures();
  fake.setFailure("timer");
  assert.equal(controller.play({
    notes: [note("A4", "quarter")],
    bpm: 120,
    trackActiveNote: true,
    errorMessage: "timer failed",
  }), false);
  assert.equal(controller.getSnapshot().error, "timer failed");
  fake.clearFailures();
  assert.equal(controller.play({
    notes: [note("A4", "quarter")],
    bpm: 0,
    trackActiveNote: true,
    errorMessage: "invalid bpm",
  }), false);
  assert.equal(controller.getSnapshot().error, "invalid bpm");
  assert.equal(controller.play({
    notes: [note("not-a-note", "quarter")],
    bpm: 120,
    trackActiveNote: true,
    errorMessage: "invalid note",
  }), false);
  assert.equal(controller.getSnapshot().error, "invalid note");
  assert.equal(controller.play({
    notes: [note("A4", "quarter")],
    bpm: 120,
    trackActiveNote: true,
    errorMessage: "retry failed",
  }), true);
  fake.setFailure("cleanup");
  controller.stop();
  assert.equal(controller.getSnapshot().status, "idle");
  controller.dispose();
  controller.dispose();
  assert.equal(fake.getDisposeCalls(), 1);
  Array.from(fake.timers.keys()).forEach((timer) => fake.fire(timer, true));
  assert.equal(controller.play({
    notes: [note("A4", "quarter")],
    bpm: 120,
    trackActiveNote: true,
    errorMessage: "ignored",
  }), false);
};

testBrowserPort();
testScheduleAndNaturalCompletion();
testStaleCallbacksCannotOverwriteReplacement();
testReusedTimerIdKeepsReplacementOwnership();
testNoopFailureRetryStopAndDispose();
console.log("recognition notes playback controller tests passed");
