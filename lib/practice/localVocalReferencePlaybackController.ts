import type {
  LocalVocalReferencePlaybackPort,
  LocalVocalReferencePlaybackTimer,
  LocalVocalReferencePlaybackTone,
} from "../audio/localVocalReferencePlayback";

export type LocalVocalReferencePlaybackSnapshot = {
  status: "idle" | "preparing" | "playing";
  error: string;
};

export type LocalVocalReferencePlaybackController = {
  getSnapshot: () => LocalVocalReferencePlaybackSnapshot;
  subscribe: (listener: () => void) => () => void;
  play: (request: {
    events: readonly LocalVocalReferencePlaybackTone[];
    errorMessage: string;
  }) => Promise<boolean>;
  stop: () => void;
  dispose: () => void;
};

const IDLE_SNAPSHOT: LocalVocalReferencePlaybackSnapshot = {
  status: "idle",
  error: "",
};

export const createLocalVocalReferencePlaybackController = (
  port: LocalVocalReferencePlaybackPort,
): LocalVocalReferencePlaybackController => {
  let snapshot = IDLE_SNAPSHOT;
  let generation = 0;
  let disposed = false;
  let completionTimer: LocalVocalReferencePlaybackTimer | null = null;
  const listeners = new Set<() => void>();

  const publish = (next: LocalVocalReferencePlaybackSnapshot) => {
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
      // Generation invalidation remains authoritative.
    }
  };

  const stopPort = (method: "stop" | "dispose" = "stop") => {
    try {
      port[method]();
    } catch {
      // Cleanup remains terminal even if the browser adapter throws.
    }
  };

  const invalidate = (method: "stop" | "dispose" = "stop") => {
    generation += 1;
    clearCompletion();
    stopPort(method);
  };

  const isCurrent = (requestGeneration: number) =>
    !disposed && generation === requestGeneration;

  const stop = () => {
    if (disposed) return;
    const error = snapshot.error;
    invalidate();
    publish({ status: "idle", error });
  };

  const play: LocalVocalReferencePlaybackController["play"] = ({
    events,
    errorMessage,
  }) => {
    if (
      events.length === 0
      || events.some((event) => (
        !Number.isFinite(event.frequencyHz)
        || event.frequencyHz <= 0
        || !Number.isFinite(event.startSeconds)
        || event.startSeconds < 0
        || !Number.isFinite(event.durationSeconds)
        || event.durationSeconds <= 0
      ))
    ) {
      return Promise.resolve(false);
    }

    const frozenEvents = events.map((event) => ({ ...event }));
    const playbackEndSeconds = frozenEvents.reduce(
      (maximum, event) => Math.max(
        maximum,
        event.startSeconds + event.durationSeconds,
      ),
      0,
    );

    const start = async () => {
      if (disposed) return false;
      invalidate();
      const requestGeneration = generation;
      publish({ status: "preparing", error: "" });
      try {
        const prepared = await port.prepare();
        if (!isCurrent(requestGeneration)) return false;
        frozenEvents.forEach(prepared.scheduleTone);
        let timer: LocalVocalReferencePlaybackTimer;
        timer = port.setTimer(() => {
          if (!isCurrent(requestGeneration)) return;
          if (completionTimer === timer) completionTimer = null;
          invalidate();
          publish(IDLE_SNAPSHOT);
        }, Math.ceil(playbackEndSeconds * 1_000) + 150);
        completionTimer = timer;
        if (!isCurrent(requestGeneration)) {
          try {
            port.clearTimer(timer);
          } catch {
            // A stale callback is still guarded by generation.
          }
          return false;
        }
        publish({ status: "playing", error: "" });
        return true;
      } catch {
        if (!isCurrent(requestGeneration)) return false;
        invalidate();
        publish({ status: "idle", error: errorMessage });
        return false;
      }
    };

    return start();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    play,
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
