import type { MetronomeConfig } from "../metronome/metronomeConfig";
import type { MetronomeBeatMetadata } from "../metronome/metronomeGrid";
import type {
  PracticeStandaloneMetronomePort,
  PracticeStandaloneMetronomeScheduler,
} from "../metronome/practiceStandaloneMetronome";

export type PracticeStandaloneMetronomeSnapshot = {
  status: "idle" | "starting" | "running";
  beat: MetronomeBeatMetadata | null;
  error: string;
};

export type PracticeStandaloneMetronomeController = {
  getSnapshot: () => PracticeStandaloneMetronomeSnapshot;
  subscribe: (listener: () => void) => () => void;
  start: (request: {
    config: MetronomeConfig;
    errorMessage: string;
  }) => Promise<boolean>;
  stop: () => void;
  dispose: () => void;
};

const IDLE_SNAPSHOT: PracticeStandaloneMetronomeSnapshot = {
  status: "idle",
  beat: null,
  error: "",
};

export const createPracticeStandaloneMetronomeController = (
  port: PracticeStandaloneMetronomePort,
): PracticeStandaloneMetronomeController => {
  let snapshot = IDLE_SNAPSHOT;
  let scheduler: PracticeStandaloneMetronomeScheduler | null = null;
  let generation = 0;
  let disposed = false;
  const listeners = new Set<() => void>();

  const publish = (next: PracticeStandaloneMetronomeSnapshot) => {
    if (disposed) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  const stopScheduler = (owned: PracticeStandaloneMetronomeScheduler | null) => {
    try {
      owned?.stop();
    } catch {
      // Ownership invalidation and terminal UI state remain authoritative.
    }
  };

  const invalidate = () => {
    generation += 1;
    const owned = scheduler;
    scheduler = null;
    stopScheduler(owned);
  };

  const isCurrent = (
    requestGeneration: number,
    owned: PracticeStandaloneMetronomeScheduler,
  ) =>
    !disposed &&
    generation === requestGeneration &&
    scheduler === owned;

  const start: PracticeStandaloneMetronomeController["start"] = async ({
    config,
    errorMessage,
  }) => {
    if (disposed || snapshot.status !== "idle") return false;
    invalidate();
    const requestGeneration = generation;
    const frozenConfig: MetronomeConfig = {
      ...config,
      countIn: config.countIn ? { ...config.countIn } : undefined,
    };
    let owned: PracticeStandaloneMetronomeScheduler;
    try {
      owned = port.createScheduler({
        config: frozenConfig,
        onBeat: (beat) => {
          if (!isCurrent(requestGeneration, owned)) return;
          publish({ status: snapshot.status, beat, error: "" });
        },
      });
    } catch {
      publish({ status: "idle", beat: null, error: errorMessage });
      return false;
    }
    scheduler = owned;
    publish({ status: "starting", beat: null, error: "" });
    try {
      const started = await owned.start();
      if (!isCurrent(requestGeneration, owned)) {
        stopScheduler(owned);
        return false;
      }
      if (!started) {
        invalidate();
        publish(IDLE_SNAPSHOT);
        return false;
      }
      publish({ status: "running", beat: snapshot.beat, error: "" });
      return true;
    } catch {
      if (!isCurrent(requestGeneration, owned)) {
        stopScheduler(owned);
        return false;
      }
      invalidate();
      publish({ status: "idle", beat: null, error: errorMessage });
      return false;
    }
  };

  const stop = () => {
    if (disposed) return;
    const error = snapshot.error;
    invalidate();
    publish({ status: "idle", beat: null, error });
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start,
    stop,
    dispose: () => {
      if (disposed) return;
      invalidate();
      disposed = true;
      listeners.clear();
      snapshot = IDLE_SNAPSHOT;
    },
  };
};
