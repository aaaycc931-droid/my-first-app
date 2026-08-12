import {
  getBeatDurationSeconds,
  sanitizeMetronomeConfig,
  type MetronomeConfig,
} from "../metronome/metronomeConfig";
import { getBeatsPerBar } from "../metronome/metronomeGrid";
import type {
  PracticeRhythmRuntimePort,
  PracticeRhythmRuntimeScheduler,
  PracticeRhythmRuntimeTimer,
} from "../metronome/practiceRhythmRuntime";
import {
  createRhythmTargetPattern,
  rhythmMatchWindowMs,
  type RhythmPracticePhase,
  type RhythmTargetEvent,
  type RhythmTargetPattern,
  type RhythmTapEvent,
} from "../rhythm/rhythmTapFeedback";
import type { NotationTemporaryPracticeTarget } from "./localNotationDraftPracticeTarget";
import {
  createNotationTemporaryRhythmTapTargets,
  getNotationTemporaryRhythmTotalBeats,
} from "./notationTemporaryRhythmTap";

const practiceStartDelayMs = 80;
const practiceTailMs = rhythmMatchWindowMs + 120;
const nowRefreshIntervalMs = 60;

export type PracticeRhythmRunPlan = {
  config: MetronomeConfig;
  createdAtMs: number;
  practiceStartTimeMs: number;
  initialPhase: Extract<RhythmPracticePhase, "count-in" | "practice">;
  targets: RhythmTargetEvent[];
  runDurationMs: number;
  startError: string;
};

export type PracticeRhythmRunPlanResult =
  | { ok: true; plan: PracticeRhythmRunPlan }
  | { ok: false; error: string };

export type PracticeRhythmRuntimeSnapshot = {
  phase: RhythmPracticePhase;
  targets: RhythmTargetEvent[];
  taps: RhythmTapEvent[];
  nowMs: number;
  error: string;
};

export type PracticeRhythmRuntimeController = {
  getSnapshot: () => PracticeRhythmRuntimeSnapshot;
  subscribe: (listener: () => void) => () => void;
  start: (plan: PracticeRhythmRunPlan) => Promise<boolean>;
  rejectStart: (error: string) => void;
  tap: () => RhythmTapEvent | null;
  stop: () => void;
  reset: () => void;
  cancel: () => void;
  dispose: () => void;
};

const IDLE_SNAPSHOT: PracticeRhythmRuntimeSnapshot = {
  phase: "idle",
  targets: [],
  taps: [],
  nowMs: 0,
  error: "",
};

const freezeConfig = (config: MetronomeConfig): MetronomeConfig => {
  const safe = sanitizeMetronomeConfig(config);
  return {
    ...safe,
    countIn: safe.countIn ? { ...safe.countIn } : undefined,
  };
};

const getPlanTiming = (config: MetronomeConfig, nowMs: number) => {
  const beatDurationMs = getBeatDurationSeconds(config.bpm) * 1_000;
  const countInBeatCount =
    config.countIn?.enabled && config.countIn.bars
      ? config.countIn.bars * getBeatsPerBar(config.meter)
      : 0;
  return {
    beatDurationMs,
    practiceStartTimeMs:
      nowMs + practiceStartDelayMs + countInBeatCount * beatDurationMs,
    initialPhase:
      countInBeatCount > 0 ? ("count-in" as const) : ("practice" as const),
  };
};

export const createPatternRhythmRunPlan = ({
  config,
  pattern,
  barCount,
  nowMs,
  startError,
}: {
  config: MetronomeConfig;
  pattern: RhythmTargetPattern;
  barCount: number;
  nowMs: number;
  startError: string;
}): PracticeRhythmRunPlan => {
  const frozenConfig = freezeConfig(config);
  const timing = getPlanTiming(frozenConfig, nowMs);
  return {
    config: frozenConfig,
    createdAtMs: nowMs,
    practiceStartTimeMs: timing.practiceStartTimeMs,
    initialPhase: timing.initialPhase,
    targets: createRhythmTargetPattern({
      config: frozenConfig,
      practiceStartTimeMs: timing.practiceStartTimeMs,
      barCount,
      pattern,
    }),
    runDurationMs:
      barCount * getBeatsPerBar(frozenConfig.meter) * timing.beatDurationMs +
      practiceTailMs,
    startError,
  };
};

export const createNotationRhythmRunPlan = ({
  config,
  target,
  nowMs,
  startError,
  emptyTargetError,
}: {
  config: MetronomeConfig;
  target: NotationTemporaryPracticeTarget;
  nowMs: number;
  startError: string;
  emptyTargetError: string;
}): PracticeRhythmRunPlanResult => {
  const targetEventCount = target.events.filter(
    (event) => event.type === "note",
  ).length;
  if (targetEventCount === 0) return { ok: false, error: emptyTargetError };

  const frozenConfig = freezeConfig({ ...config, meter: target.timeSignature });
  const timing = getPlanTiming(frozenConfig, nowMs);
  return {
    ok: true,
    plan: {
      config: frozenConfig,
      createdAtMs: nowMs,
      practiceStartTimeMs: timing.practiceStartTimeMs,
      initialPhase: timing.initialPhase,
      targets: createNotationTemporaryRhythmTapTargets({
        draft: target,
        config: frozenConfig,
        practiceStartTimeMs: timing.practiceStartTimeMs,
      }),
      runDurationMs:
        getNotationTemporaryRhythmTotalBeats(target.events) *
          timing.beatDurationMs +
        practiceTailMs,
      startError,
    },
  };
};

export const createPracticeRhythmRuntimeController = (
  port: PracticeRhythmRuntimePort,
): PracticeRhythmRuntimeController => {
  let snapshot = IDLE_SNAPSHOT;
  let generation = 0;
  let disposed = false;
  let scheduler: PracticeRhythmRuntimeScheduler | null = null;
  let interval: PracticeRhythmRuntimeTimer | null = null;
  const timeouts = new Set<PracticeRhythmRuntimeTimer>();
  const listeners = new Set<() => void>();
  let tapId = 0;

  const publish = (next: PracticeRhythmRuntimeSnapshot) => {
    if (disposed) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  const clearOwnedRuntime = () => {
    generation += 1;
    const ownedScheduler = scheduler;
    scheduler = null;
    if (ownedScheduler) {
      try {
        ownedScheduler.stop();
      } catch {
        // Cleanup remains terminal.
      }
    }
    timeouts.forEach((timer) => {
      try {
        port.clearTimeout(timer);
      } catch {
        // Continue clearing every owned timer.
      }
    });
    timeouts.clear();
    if (interval !== null) {
      try {
        port.clearInterval(interval);
      } catch {
        // Cleanup remains terminal.
      }
      interval = null;
    }
  };

  const isCurrent = (
    requestGeneration: number,
    requestScheduler: PracticeRhythmRuntimeScheduler,
  ) =>
    !disposed &&
    generation === requestGeneration &&
    scheduler === requestScheduler;

  const addTimeout = (
    requestGeneration: number,
    requestScheduler: PracticeRhythmRuntimeScheduler,
    callback: () => void,
    delayMs: number,
  ) => {
    let timer: PracticeRhythmRuntimeTimer;
    timer = port.setTimeout(() => {
      timeouts.delete(timer);
      if (isCurrent(requestGeneration, requestScheduler)) callback();
    }, Math.max(0, delayMs));
    timeouts.add(timer);
  };

  const reset = () => {
    if (disposed) return;
    clearOwnedRuntime();
    tapId = 0;
    publish(IDLE_SNAPSHOT);
  };

  const start: PracticeRhythmRuntimeController["start"] = async (plan) => {
    if (disposed) return false;
    clearOwnedRuntime();
    tapId = 0;
    const requestScheduler = port.createScheduler(plan.config);
    scheduler = requestScheduler;
    const requestGeneration = generation;
    publish({
      phase: plan.initialPhase,
      targets: plan.targets,
      taps: [],
      nowMs: plan.createdAtMs,
      error: "",
    });

    interval = port.setInterval(() => {
      if (!isCurrent(requestGeneration, requestScheduler)) return;
      publish({ ...snapshot, nowMs: port.now() });
    }, nowRefreshIntervalMs);

    if (plan.initialPhase === "count-in") {
      addTimeout(
        requestGeneration,
        requestScheduler,
        () => publish({ ...snapshot, phase: "practice" }),
        plan.practiceStartTimeMs - port.now(),
      );
    }
    addTimeout(
      requestGeneration,
      requestScheduler,
      () => {
        clearOwnedRuntime();
        publish({ ...snapshot, phase: "stopped", nowMs: port.now() });
      },
      plan.practiceStartTimeMs - plan.createdAtMs + plan.runDurationMs,
    );

    try {
      const started = await requestScheduler.start();
      if (!started) {
        if (isCurrent(requestGeneration, requestScheduler)) {
          clearOwnedRuntime();
          publish({ ...snapshot, phase: "idle" });
        } else {
          try {
            requestScheduler.stop();
          } catch {
            // Stale cleanup is best-effort.
          }
        }
        return false;
      }
      if (!isCurrent(requestGeneration, requestScheduler)) {
        try {
          requestScheduler.stop();
        } catch {
          // Stale cleanup is best-effort.
        }
        return false;
      }
      return true;
    } catch {
      if (!isCurrent(requestGeneration, requestScheduler)) {
        try {
          requestScheduler.stop();
        } catch {
          // Stale cleanup is best-effort.
        }
        return false;
      }
      clearOwnedRuntime();
      publish({ ...snapshot, phase: "idle", error: plan.startError });
      return false;
    }
  };

  const rejectStart = (error: string) => {
    if (disposed) return;
    clearOwnedRuntime();
    tapId = 0;
    publish({ ...IDLE_SNAPSHOT, error });
  };

  const tap = () => {
    if (disposed || snapshot.phase !== "practice") return null;
    const event: RhythmTapEvent = {
      id: ++tapId,
      timestampMs: port.now(),
      phase: "practice",
    };
    publish({ ...snapshot, taps: [...snapshot.taps, event] });
    return event;
  };

  const stop = () => {
    if (disposed) return;
    clearOwnedRuntime();
    publish({ ...snapshot, phase: "stopped", nowMs: port.now() });
  };

  const dispose = () => {
    if (disposed) return;
    clearOwnedRuntime();
    disposed = true;
    listeners.clear();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start,
    rejectStart,
    tap,
    stop,
    reset,
    cancel: reset,
    dispose,
  };
};
