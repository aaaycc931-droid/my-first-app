import type {
  PracticeTargetPlaybackPort,
  PracticeTargetPlaybackTimer,
  PreparedPracticeTargetPlayback,
} from "../audio/practiceTargetPlayback";

export type PracticeTargetPlaybackMode = "sequence" | "note" | null;

export type PracticeTargetPlaybackSnapshot = {
  status: "idle" | "preparing" | "playing" | "error";
  mode: PracticeTargetPlaybackMode;
  activeNoteIndex: number | null;
  error: string;
};

export type PracticeTargetPlaybackController = {
  getSnapshot: () => PracticeTargetPlaybackSnapshot;
  subscribe: (listener: () => void) => () => void;
  playSequence: (request: {
    frequenciesHz: number[];
    noteSeconds: number;
    errorMessage: string;
  }) => Promise<boolean>;
  playNote: (request: {
    frequencyHz: number;
    noteSeconds: number;
    errorMessage: string;
  }) => Promise<boolean>;
  stop: () => void;
  dispose: () => void;
};

const IDLE_SNAPSHOT: PracticeTargetPlaybackSnapshot = {
  status: "idle",
  mode: null,
  activeNoteIndex: null,
  error: "",
};

const isValidFrequency = (frequencyHz: number) =>
  Number.isFinite(frequencyHz) && frequencyHz > 0;

const isValidDuration = (durationSeconds: number) =>
  Number.isFinite(durationSeconds) && durationSeconds > 0;

export const createPracticeTargetPlaybackController = (
  port: PracticeTargetPlaybackPort,
): PracticeTargetPlaybackController => {
  let snapshot = IDLE_SNAPSHOT;
  let generation = 0;
  let disposed = false;
  const timers = new Set<PracticeTargetPlaybackTimer>();
  const listeners = new Set<() => void>();

  const publish = (next: PracticeTargetPlaybackSnapshot) => {
    if (disposed) return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  const clearTimers = () => {
    timers.forEach((timer) => {
      try {
        port.clearTimer(timer);
      } catch {
        // Continue clearing every owned timer.
      }
    });
    timers.clear();
  };

  const stopPort = (method: "stop" | "dispose" = "stop") => {
    try {
      port[method]();
    } catch {
      // Cleanup remains terminal even if the platform adapter throws.
    }
  };

  const cancelActive = (method: "stop" | "dispose" = "stop") => {
    generation += 1;
    clearTimers();
    stopPort(method);
  };

  const isCurrent = (requestGeneration: number) =>
    !disposed && generation === requestGeneration;

  const setOwnedTimer = (
    requestGeneration: number,
    callback: () => void,
    delayMs: number,
  ) => {
    let timer: PracticeTargetPlaybackTimer;
    timer = port.setTimer(() => {
      timers.delete(timer);
      if (isCurrent(requestGeneration)) callback();
    }, Math.max(0, delayMs));
    timers.add(timer);
  };

  const failCurrent = (
    requestGeneration: number,
    mode: Exclude<PracticeTargetPlaybackMode, null>,
    error: string,
  ) => {
    if (!isCurrent(requestGeneration)) return;
    generation += 1;
    clearTimers();
    stopPort();
    publish({ status: "error", mode, activeNoteIndex: null, error });
  };

  const finishCurrent = (requestGeneration: number) => {
    if (!isCurrent(requestGeneration)) return;
    generation += 1;
    clearTimers();
    stopPort();
    publish(IDLE_SNAPSHOT);
  };

  const prepare = async (
    requestGeneration: number,
    mode: Exclude<PracticeTargetPlaybackMode, null>,
    errorMessage: string,
  ): Promise<PreparedPracticeTargetPlayback | null> => {
    try {
      const prepared = await port.prepare();
      return isCurrent(requestGeneration) ? prepared : null;
    } catch {
      failCurrent(requestGeneration, mode, errorMessage);
      return null;
    }
  };

  const playSequence: PracticeTargetPlaybackController["playSequence"] =
    async ({ frequenciesHz, noteSeconds, errorMessage }) => {
      if (disposed) return false;
      cancelActive();
      const requestGeneration = generation;
      const mode = "sequence";
      publish({
        status: "preparing",
        mode,
        activeNoteIndex: null,
        error: "",
      });

      if (
        frequenciesHz.length === 0 ||
        frequenciesHz.some((frequencyHz) => !isValidFrequency(frequencyHz)) ||
        !isValidDuration(noteSeconds)
      ) {
        failCurrent(requestGeneration, mode, errorMessage);
        return false;
      }

      const prepared = await prepare(
        requestGeneration,
        mode,
        errorMessage,
      );
      if (!prepared) return false;

      try {
        const startTimeSeconds = prepared.currentTimeSeconds + 0.05;
        frequenciesHz.forEach((frequencyHz, index) => {
          const noteOffsetSeconds = index * noteSeconds;
          prepared.scheduleTone({
            frequencyHz,
            startTimeSeconds: startTimeSeconds + noteOffsetSeconds,
            durationSeconds: noteSeconds,
            stopAfterSeconds: noteSeconds * 0.95,
          });
          setOwnedTimer(
            requestGeneration,
            () => {
              publish({
                status: "playing",
                mode,
                activeNoteIndex: index,
                error: "",
              });
            },
            noteOffsetSeconds * 1_000,
          );
        });
        setOwnedTimer(
          requestGeneration,
          () => finishCurrent(requestGeneration),
          frequenciesHz.length * noteSeconds * 1_000 + 500,
        );
        if (!isCurrent(requestGeneration)) return false;
        publish({
          status: "playing",
          mode,
          activeNoteIndex: null,
          error: "",
        });
        return true;
      } catch {
        failCurrent(requestGeneration, mode, errorMessage);
        return false;
      }
    };

  const playNote: PracticeTargetPlaybackController["playNote"] = async ({
    frequencyHz,
    noteSeconds,
    errorMessage,
  }) => {
    if (disposed) return false;
    cancelActive();
    const requestGeneration = generation;
    const mode = "note";
    publish({
      status: "preparing",
      mode,
      activeNoteIndex: null,
      error: "",
    });

    if (!isValidFrequency(frequencyHz) || !isValidDuration(noteSeconds)) {
      failCurrent(requestGeneration, mode, errorMessage);
      return false;
    }

    const prepared = await prepare(requestGeneration, mode, errorMessage);
    if (!prepared) return false;

    try {
      prepared.scheduleTone({
        frequencyHz,
        startTimeSeconds: prepared.currentTimeSeconds + 0.05,
        durationSeconds: noteSeconds,
        stopAfterSeconds: noteSeconds,
      });
      setOwnedTimer(
        requestGeneration,
        () => finishCurrent(requestGeneration),
        noteSeconds * 1_000 + 200,
      );
      if (!isCurrent(requestGeneration)) return false;
      publish({
        status: "playing",
        mode,
        activeNoteIndex: null,
        error: "",
      });
      return true;
    } catch {
      failCurrent(requestGeneration, mode, errorMessage);
      return false;
    }
  };

  const stop = () => {
    if (disposed) return;
    cancelActive();
    publish(IDLE_SNAPSHOT);
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    playSequence,
    playNote,
    stop,
    dispose: () => {
      if (disposed) return;
      cancelActive("dispose");
      disposed = true;
      listeners.clear();
      snapshot = IDLE_SNAPSHOT;
    },
  };
};
