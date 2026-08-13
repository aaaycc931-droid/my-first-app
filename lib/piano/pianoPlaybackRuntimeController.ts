export type PianoPlaybackRuntimeEvent =
  | {
      type: "note-on";
      delayMs: number;
      pointerId: string;
      keyId: string;
      velocity: number;
    }
  | { type: "note-off"; delayMs: number; pointerId: string }
  | { type: "pedal"; delayMs: number; down: boolean }
  | { type: "all-notes-off"; delayMs: number };

export type PianoPlaybackTimer = unknown;

export type PianoPlaybackRuntimePort = {
  setTimer: (callback: () => void, delayMs: number) => PianoPlaybackTimer;
  clearTimer: (timer: PianoPlaybackTimer) => void;
  pressKey: (pointerId: string, keyId: string, velocity: number) => void;
  releasePointer: (pointerId: string) => void;
  setSustain: (down: boolean) => void;
  stopAll: () => void;
};

export type PianoPlaybackRuntimeSnapshot = {
  status: "idle" | "playing";
};

export type PianoPlaybackRuntimeController = {
  getSnapshot: () => PianoPlaybackRuntimeSnapshot;
  subscribe: (listener: () => void) => () => void;
  play: (request: {
    events: readonly PianoPlaybackRuntimeEvent[];
    baseDelayMs: number;
    loop: boolean;
  }) => boolean;
  stop: () => boolean;
  cancel: () => void;
  dispose: () => void;
};

const IDLE_SNAPSHOT: PianoPlaybackRuntimeSnapshot = { status: "idle" };

export const createPianoPlaybackRuntimeController = (
  port: PianoPlaybackRuntimePort,
): PianoPlaybackRuntimeController => {
  let snapshot = IDLE_SNAPSHOT;
  let generation = 0;
  let disposed = false;
  const timers = new Set<PianoPlaybackTimer>();
  const listeners = new Set<() => void>();

  const publish = (next: PianoPlaybackRuntimeSnapshot) => {
    if (disposed || snapshot.status === next.status) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  const clearTimers = () => {
    let succeeded = true;
    timers.forEach((timer) => {
      try {
        port.clearTimer(timer);
      } catch {
        succeeded = false;
      }
    });
    timers.clear();
    return succeeded;
  };

  const invalidate = () => {
    generation += 1;
    return clearTimers();
  };

  const stopVoices = () => {
    try {
      port.stopAll();
      return true;
    } catch {
      return false;
    }
  };

  const runEvent = (event: PianoPlaybackRuntimeEvent) => {
    if (event.type === "note-on") {
      port.pressKey(event.pointerId, event.keyId, event.velocity);
    } else if (event.type === "note-off") {
      port.releasePointer(event.pointerId);
    } else if (event.type === "pedal") {
      port.setSustain(event.down);
    } else {
      port.stopAll();
    }
  };

  const play: PianoPlaybackRuntimeController["play"] = ({
    events,
    baseDelayMs,
    loop,
  }) => {
    if (disposed || events.length === 0) return false;
    const replacingActivePlayback = snapshot.status === "playing";
    const clearedPreviousTimers = invalidate();
    const stoppedPreviousVoices = replacingActivePlayback ? stopVoices() : true;
    if (!clearedPreviousTimers || !stoppedPreviousVoices) {
      publish(IDLE_SNAPSHOT);
      return false;
    }
    const frozenEvents = events.map((event) => ({ ...event }));
    const safeBaseDelayMs = Number.isFinite(baseDelayMs)
      ? Math.max(0, baseDelayMs)
      : 0;
    publish({ status: "playing" });
    let cycleIndex = 0;

    const setOwnedTimer = (
      cycleGeneration: number,
      callback: () => void,
      delayMs: number,
    ) => {
      let timer: PianoPlaybackTimer;
      timer = port.setTimer(() => {
        if (disposed || generation !== cycleGeneration) return;
        timers.delete(timer);
        callback();
      }, Math.max(0, delayMs));
      timers.add(timer);
    };

    const runCycle = () => {
      if (disposed || snapshot.status !== "playing") return;
      generation += 1;
      if (!clearTimers()) {
        stopVoices();
        publish(IDLE_SNAPSHOT);
        return;
      }
      const cycleGeneration = generation;
      const cycleBaseDelayMs = cycleIndex === 0 ? safeBaseDelayMs : 0;
      cycleIndex += 1;
      try {
        frozenEvents.forEach((event) => {
          setOwnedTimer(
            cycleGeneration,
            () => {
              try {
                runEvent(event);
              } catch {
                invalidate();
                stopVoices();
                publish(IDLE_SNAPSHOT);
              }
            },
            cycleBaseDelayMs + event.delayMs,
          );
        });
        const durationMs =
          cycleBaseDelayMs + (frozenEvents.at(-1)?.delayMs ?? 0) + 30;
        setOwnedTimer(
          cycleGeneration,
          () => {
            if (loop) {
              if (!stopVoices()) {
                invalidate();
                publish(IDLE_SNAPSHOT);
                return;
              }
              runCycle();
            } else {
              invalidate();
              stopVoices();
              publish(IDLE_SNAPSHOT);
            }
          },
          durationMs,
        );
      } catch {
        invalidate();
        stopVoices();
        publish(IDLE_SNAPSHOT);
      }
    };

    runCycle();
    return snapshot.status === "playing";
  };

  const cancel = () => {
    if (disposed) return;
    invalidate();
    publish(IDLE_SNAPSHOT);
  };

  const stop = () => {
    if (disposed) return false;
    const clearedTimers = invalidate();
    const stoppedVoices = stopVoices();
    publish(IDLE_SNAPSHOT);
    return clearedTimers && stoppedVoices;
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
    cancel,
    dispose: () => {
      if (disposed) return;
      invalidate();
      stopVoices();
      disposed = true;
      listeners.clear();
      snapshot = IDLE_SNAPSHOT;
    },
  };
};
