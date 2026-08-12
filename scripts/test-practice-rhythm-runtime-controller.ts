import assert from "node:assert/strict";

import type {
  PracticeRhythmRuntimePort,
  PracticeRhythmRuntimeScheduler,
} from "../lib/metronome/practiceRhythmRuntime";
import type { NotationTemporaryPracticeTarget } from "../lib/practice/localNotationDraftPracticeTarget";
import { createRhythmLatencyCalibrationTargets } from "../lib/rhythm/rhythmLatencyCalibration";
import {
  createNotationRhythmRunPlan,
  createPatternRhythmRunPlan,
  createPracticeRhythmRuntimeController,
} from "../lib/practice/practiceRhythmRuntimeController";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const config = {
  bpm: 120,
  meter: "4/4" as const,
  countIn: { enabled: true, bars: 1 as const },
  subdivision: "quarter" as const,
};

const patternPlan = createPatternRhythmRunPlan({
  config,
  pattern: "quarter-note-pulse",
  barCount: 2,
  nowMs: 100,
  startError: "pattern failed",
});
assert.equal(patternPlan.practiceStartTimeMs, 2180);
assert.equal(patternPlan.initialPhase, "count-in");
assert.equal(patternPlan.targets.length, 8);
assert.equal(patternPlan.runDurationMs, 4300);
assert.deepEqual(
  patternPlan.targets,
  createRhythmLatencyCalibrationTargets({
    config,
    calibrationStartTimeMs: patternPlan.practiceStartTimeMs,
    barCount: 2,
  }),
  "latency calibration must reuse the same frozen quarter-pulse plan",
);

const notationTarget = {
  id: "notation-1",
  mode: "rhythm",
  status: "active",
  localOnly: true,
  sessionOnly: true,
  nonScoring: true,
  temporary: true,
  createdAtMs: 1,
  draftFingerprint: "fingerprint",
  sourceDescription: "独立手动草稿",
  timeSignature: "4/4",
  events: [
    { id: "note-1", type: "note", pitch: "C4", duration: "quarter", measure: 1 },
    { id: "rest-1", type: "rest", pitch: null, duration: "quarter", measure: 1 },
    { id: "note-2", type: "note", pitch: "D4", duration: "half", measure: 1 },
  ],
  warnings: [],
} as NotationTemporaryPracticeTarget;
const notationResult = createNotationRhythmRunPlan({
  config,
  target: notationTarget,
  nowMs: 100,
  startError: "notation failed",
  emptyTargetError: "empty",
});
assert.equal(notationResult.ok, true);
if (!notationResult.ok) throw new Error("expected notation plan");
assert.equal(notationResult.plan.targets.length, 2);
assert.deepEqual(notationResult.plan.targets.map((target) => target.targetTimeMs), [2180, 3180]);
assert.equal(notationResult.plan.runDurationMs, 2300);
assert.equal(createNotationRhythmRunPlan({
  config,
  target: { ...notationTarget, events: [{ ...notationTarget.events[1] }] },
  nowMs: 0,
  startError: "failed",
  emptyTargetError: "empty",
}).ok, false);

let nowMs = 100;
let nextTimer = 1;
const timerCallbacks = new Map<number, () => void>();
const clearedTimers = new Set<number>();
const starts: ReturnType<typeof deferred<boolean>>[] = [];
const schedulers: Array<PracticeRhythmRuntimeScheduler & { stopCount: number }> = [];
const port: PracticeRhythmRuntimePort = {
  now: () => nowMs,
  createScheduler: () => {
    const start = deferred<boolean>();
    starts.push(start);
    const scheduler = {
      stopCount: 0,
      start: () => start.promise,
      stop() { this.stopCount += 1; },
    };
    schedulers.push(scheduler);
    return scheduler;
  },
  setTimeout: (callback) => {
    const id = nextTimer++;
    timerCallbacks.set(id, callback);
    return id;
  },
  clearTimeout: (timer) => { clearedTimers.add(timer); },
  setInterval: (callback) => {
    const id = nextTimer++;
    timerCallbacks.set(id, callback);
    return id;
  },
  clearInterval: (timer) => { clearedTimers.add(timer); },
};

const run = async () => {
const controller = createPracticeRhythmRuntimeController(port);
let publications = 0;
controller.subscribe(() => { publications += 1; });
const startA = controller.start(patternPlan);
assert.equal(controller.getSnapshot().phase, "count-in");
assert.equal(controller.tap(), null);
const aTimerIds = Array.from(timerCallbacks.keys());

const noCountInPlan = createPatternRhythmRunPlan({
  config: { ...config, countIn: { enabled: false, bars: 0 } },
  pattern: "eighth-note-pulse",
  barCount: 1,
  nowMs: 200,
  startError: "replacement failed",
});
const startB = controller.start(noCountInPlan);
assert.equal(schedulers[0].stopCount, 1);
starts[0].resolve(true);
assert.equal(await startA, false);
assert.equal(controller.getSnapshot().targets.length, 8);
starts[1].resolve(true);
assert.equal(await startB, true);
assert.equal(controller.getSnapshot().phase, "practice");

for (const id of aTimerIds) timerCallbacks.get(id)?.();
assert.equal(controller.getSnapshot().phase, "practice", "late A timers must be inert");
nowMs = 275;
const firstTap = controller.tap();
nowMs = 310;
const secondTap = controller.tap();
assert.deepEqual([firstTap?.id, secondTap?.id], [1, 2]);
assert.deepEqual(controller.getSnapshot().taps.map((tap) => tap.timestampMs), [275, 310]);
assert.equal(controller.getSnapshot().nowMs, 310);

controller.stop();
assert.equal(controller.getSnapshot().phase, "stopped");
assert.equal(controller.getSnapshot().taps.length, 2);
assert.equal(controller.getSnapshot().nowMs, 310);
assert.equal(controller.tap(), null);
controller.reset();
assert.deepEqual(controller.getSnapshot(), {
  phase: "idle", targets: [], taps: [], nowMs: 0, error: "",
});

controller.rejectStart("invalid target");
assert.equal(controller.getSnapshot().error, "invalid target");
assert.equal(controller.getSnapshot().phase, "idle");

const failingStart = controller.start({ ...noCountInPlan, startError: "中文启动错误" });
starts[2].reject(new Error("platform failure"));
assert.equal(await failingStart, false);
assert.equal(controller.getSnapshot().error, "中文启动错误");
assert.equal(controller.getSnapshot().phase, "idle");

const falseStart = controller.start(noCountInPlan);
starts[3].resolve(false);
assert.equal(await falseStart, false);
assert.equal(controller.getSnapshot().phase, "idle");

const staleFalseA = controller.start(patternPlan);
const staleFalseAIndex = starts.length - 1;
const staleFalseB = controller.start(noCountInPlan);
const staleFalseBIndex = starts.length - 1;
starts[staleFalseBIndex].resolve(true);
assert.equal(await staleFalseB, true);
starts[staleFalseAIndex].resolve(false);
assert.equal(await staleFalseA, false);
assert.equal(controller.getSnapshot().phase, "practice");
assert.equal(controller.getSnapshot().targets.length, 8);

const staleRejectA = controller.start(patternPlan);
const staleRejectAIndex = starts.length - 1;
const staleRejectB = controller.start(noCountInPlan);
const staleRejectBIndex = starts.length - 1;
starts[staleRejectBIndex].resolve(true);
assert.equal(await staleRejectB, true);
starts[staleRejectAIndex].reject(new Error("late A rejection"));
assert.equal(await staleRejectA, false);
assert.equal(controller.getSnapshot().phase, "practice");
assert.equal(controller.getSnapshot().error, "");

const beforeDispose = publications;
const disposedStart = controller.start(patternPlan);
controller.dispose();
starts.at(-1)?.resolve(true);
assert.equal(await disposedStart, false);
for (const callback of Array.from(timerCallbacks.values())) callback();
assert.equal(publications, beforeDispose + 1, "dispose and late work must not publish");
assert.ok(clearedTimers.size > 0);

let phaseNowMs = patternPlan.createdAtMs;
const phaseTimeouts: Array<() => void> = [];
let phaseInterval: () => void = () => undefined;
let throwingStopCount = 0;
const phaseController = createPracticeRhythmRuntimeController({
  now: () => phaseNowMs,
  createScheduler: () => ({
    start: () => Promise.resolve(true),
    stop: () => {
      throwingStopCount += 1;
      throw new Error("cleanup failure");
    },
  }),
  setTimeout: (callback) => {
    phaseTimeouts.push(callback);
    return phaseTimeouts.length;
  },
  clearTimeout: () => { throw new Error("clear timeout failure"); },
  setInterval: (callback) => {
    phaseInterval = callback;
    return 100;
  },
  clearInterval: () => { throw new Error("clear interval failure"); },
});
assert.equal(await phaseController.start(patternPlan), true);
phaseNowMs = patternPlan.practiceStartTimeMs;
phaseTimeouts[0]?.();
assert.equal(phaseController.getSnapshot().phase, "practice");
phaseNowMs += 50;
phaseInterval();
assert.equal(phaseController.getSnapshot().nowMs, phaseNowMs);
assert.equal(phaseController.tap()?.id, 1);
phaseNowMs = patternPlan.practiceStartTimeMs + patternPlan.runDurationMs;
phaseTimeouts[1]?.();
assert.equal(phaseController.getSnapshot().phase, "stopped");
assert.equal(phaseController.getSnapshot().nowMs, phaseNowMs);
assert.equal(throwingStopCount, 1);

const isolatedRhythm = createPracticeRhythmRuntimeController(port);
const isolatedLatency = createPracticeRhythmRuntimeController(port);
const isolatedRhythmStart = isolatedRhythm.start(noCountInPlan);
const isolatedRhythmStartIndex = starts.length - 1;
const isolatedLatencyStart = isolatedLatency.start(noCountInPlan);
const isolatedLatencyStartIndex = starts.length - 1;
starts[isolatedRhythmStartIndex].resolve(true);
starts[isolatedLatencyStartIndex].resolve(true);
assert.equal(await isolatedRhythmStart, true);
assert.equal(await isolatedLatencyStart, true);
nowMs = 350;
assert.equal(isolatedRhythm.tap()?.id, 1);
assert.equal(isolatedLatency.getSnapshot().taps.length, 0);
nowMs = 375;
assert.equal(isolatedLatency.tap()?.id, 1);
assert.equal(isolatedRhythm.getSnapshot().taps.length, 1);
const rhythmBeforeLatencyStop = isolatedRhythm.getSnapshot();
isolatedLatency.stop();
assert.equal(isolatedLatency.getSnapshot().phase, "stopped");
assert.deepEqual(isolatedRhythm.getSnapshot(), rhythmBeforeLatencyStop);
const latencyBeforeRhythmReset = isolatedLatency.getSnapshot();
isolatedRhythm.reset();
assert.equal(isolatedRhythm.getSnapshot().phase, "idle");
assert.deepEqual(isolatedLatency.getSnapshot(), latencyBeforeRhythmReset);
const latencyTimerIds = Array.from(timerCallbacks.keys()).slice(-2);
isolatedLatency.reset();
for (const id of latencyTimerIds) timerCallbacks.get(id)?.();
assert.equal(isolatedLatency.getSnapshot().phase, "idle");
assert.equal(isolatedRhythm.getSnapshot().phase, "idle");
isolatedRhythm.dispose();
isolatedLatency.dispose();

console.log("practice rhythm runtime controller tests passed");
};

void run();
