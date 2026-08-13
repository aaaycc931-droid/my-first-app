import type { NotationReferenceMelodyPlaybackEvent } from "./notationReferenceMelodyPlayback";
import type {
  NotationReferencePlaybackPort,
  NotationReferencePlaybackTimer,
} from "../audio/notationReferencePlayback";

export type NotationReferencePlaybackMode = "tone" | "melody" | null;

export type NotationReferencePlaybackSnapshot = {
  status: "idle" | "preparing" | "playing";
  mode: NotationReferencePlaybackMode;
  error: string;
};

export type NotationReferencePlaybackController = {
  getSnapshot: () => NotationReferencePlaybackSnapshot;
  subscribe: (listener: () => void) => () => void;
  playTone: (request: {
    frequencyHz: number;
    releaseOffsetSeconds?: number;
    errorMessage: string;
  }) => Promise<boolean>;
  playMelody: (request: {
    events: readonly NotationReferenceMelodyPlaybackEvent[];
    totalDurationSeconds: number;
    errorMessage: string;
  }) => Promise<boolean>;
  stop: () => void;
  dispose: () => void;
};

const IDLE_SNAPSHOT: NotationReferencePlaybackSnapshot = {
  status: "idle",
  mode: null,
  error: "",
};

export const createNotationReferencePlaybackController = (
  port: NotationReferencePlaybackPort,
): NotationReferencePlaybackController => {
  let snapshot = IDLE_SNAPSHOT;
  let generation = 0;
  let disposed = false;
  let completionTimer: NotationReferencePlaybackTimer | null = null;
  const listeners = new Set<() => void>();

  const publish = (next: NotationReferencePlaybackSnapshot) => {
    if (disposed) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  const clearCompletion = () => {
    const timer = completionTimer;
    completionTimer = null;
    if (timer === null) return;
    try {
      port.clearTimer(timer);
    } catch {
      // Termination and generation invalidation remain authoritative.
    }
  };

  const stopPort = (method: "stop" | "dispose" = "stop") => {
    try {
      port[method]();
    } catch {
      // Cleanup remains terminal even when the browser adapter throws.
    }
  };

  const invalidate = (method: "stop" | "dispose" = "stop") => {
    generation += 1;
    clearCompletion();
    stopPort(method);
  };

  const isCurrent = (requestGeneration: number) =>
    !disposed && generation === requestGeneration;

  const failCurrent = (requestGeneration: number, error: string) => {
    if (!isCurrent(requestGeneration)) return;
    invalidate();
    publish({ status: "idle", mode: null, error });
  };

  const setCompletion = (
    requestGeneration: number,
    delayMs: number,
  ) => {
    let timer: NotationReferencePlaybackTimer;
    timer = port.setTimer(() => {
      if (!isCurrent(requestGeneration)) return;
      if (completionTimer === timer) completionTimer = null;
      invalidate();
      publish(IDLE_SNAPSHOT);
    }, Math.max(0, delayMs));
    completionTimer = timer;
    if (!isCurrent(requestGeneration)) {
      try {
        port.clearTimer(timer);
      } catch {
        // The stale callback is still guarded by generation.
      }
      return false;
    }
    return true;
  };

  const start = async (
    mode: Exclude<NotationReferencePlaybackMode, null>,
    errorMessage: string,
    schedule: (
      prepared: Awaited<ReturnType<NotationReferencePlaybackPort["prepare"]>>,
      requestGeneration: number,
    ) => boolean,
  ) => {
    if (disposed) return false;
    invalidate();
    const requestGeneration = generation;
    publish({ status: "preparing", mode, error: "" });
    try {
      const prepared = await port.prepare();
      if (!isCurrent(requestGeneration)) return false;
      if (!schedule(prepared, requestGeneration)) {
        return false;
      }
      if (!isCurrent(requestGeneration)) return false;
      publish({ status: "playing", mode, error: "" });
      return true;
    } catch {
      failCurrent(requestGeneration, errorMessage);
      return false;
    }
  };

  const playTone: NotationReferencePlaybackController["playTone"] = ({
    frequencyHz,
    releaseOffsetSeconds = 0.81,
    errorMessage,
  }) => {
    if (
      !Number.isFinite(frequencyHz) ||
      frequencyHz <= 0 ||
      !Number.isFinite(releaseOffsetSeconds) ||
      releaseOffsetSeconds < 0.02 ||
      releaseOffsetSeconds > 0.9
    ) {
      return Promise.resolve(false);
    }
    return start("tone", errorMessage, (prepared, requestGeneration) => {
      const startTimeSeconds = prepared.currentTimeSeconds + 0.03;
      const durationSeconds = 0.9;
      prepared.scheduleTone({
        frequencyHz,
        startTimeSeconds,
        endTimeSeconds: startTimeSeconds + durationSeconds,
        peakGain: 0.16,
        attackSeconds: 0.02,
        releaseTimeSeconds: startTimeSeconds + releaseOffsetSeconds,
      });
      return setCompletion(
        requestGeneration,
        (durationSeconds + 0.15) * 1_000,
      );
    });
  };

  const playMelody: NotationReferencePlaybackController["playMelody"] = ({
    events,
    totalDurationSeconds,
    errorMessage,
  }) => {
    if (!Number.isFinite(totalDurationSeconds) || totalDurationSeconds < 0) {
      return Promise.resolve(false);
    }
    const frozenEvents = events.map((event) => ({ ...event }));
    return start("melody", errorMessage, (prepared, requestGeneration) => {
      const startTimeSeconds = prepared.currentTimeSeconds + 0.05;
      frozenEvents.forEach((event) => {
        if (event.frequencyHz === null) return;
        const noteStartTime = startTimeSeconds + event.offsetSeconds;
        const noteEndTime = noteStartTime + event.durationSeconds;
        prepared.scheduleTone({
          frequencyHz: event.frequencyHz,
          startTimeSeconds: noteStartTime,
          endTimeSeconds: noteEndTime,
          peakGain: 0.13,
          attackSeconds: 0.02,
          releaseTimeSeconds: Math.max(
            noteStartTime + 0.03,
            noteEndTime - 0.03,
          ),
        });
      });
      return setCompletion(
        requestGeneration,
        (totalDurationSeconds + 0.2) * 1_000,
      );
    });
  };

  const stop = () => {
    if (disposed) return;
    const error = snapshot.error;
    invalidate();
    publish({ status: "idle", mode: null, error });
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    playTone,
    playMelody,
    stop,
    dispose: () => {
      if (disposed) return;
      invalidate("dispose");
      disposed = true;
      listeners.clear();
      snapshot = IDLE_SNAPSHOT;
    },
  };
};
