import type { RecognizedNote } from "../recognition";
import { noteNameToFrequencyHz } from "../audio/noteFrequency";
import type {
  RecognitionNotesPlaybackPort,
  RecognitionNotesPlaybackTimer,
} from "../audio/recognitionNotesPlayback";

const durationToBeats: Record<RecognizedNote["duration"], number> = {
  eighth: 0.5,
  quarter: 1,
  half: 2,
  whole: 4,
};

export type RecognitionNotesPlaybackSnapshot = {
  status: "idle" | "playing" | "error";
  activeNoteIndex: number | null;
  error: string;
};

export type RecognitionNotesPlaybackController = {
  getSnapshot: () => RecognitionNotesPlaybackSnapshot;
  subscribe: (listener: () => void) => () => void;
  play: (request: {
    notes: RecognizedNote[];
    bpm: number;
    trackActiveNote: boolean;
    errorMessage: string;
  }) => boolean;
  stop: () => void;
  clearError: () => void;
  dispose: () => void;
};

const IDLE_SNAPSHOT: RecognitionNotesPlaybackSnapshot = {
  status: "idle",
  activeNoteIndex: null,
  error: "",
};

export const createRecognitionNotesPlaybackController = (
  port: RecognitionNotesPlaybackPort,
): RecognitionNotesPlaybackController => {
  let snapshot = IDLE_SNAPSHOT;
  let generation = 0;
  let disposed = false;
  const timers = new Set<RecognitionNotesPlaybackTimer>();
  const listeners = new Set<() => void>();

  const publish = (next: RecognitionNotesPlaybackSnapshot) => {
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
      // Cleanup remains terminal even if the browser adapter throws.
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
    let timer: RecognitionNotesPlaybackTimer;
    timer = port.setTimer(() => {
      if (!isCurrent(requestGeneration)) return;
      timers.delete(timer);
      callback();
    }, Math.max(0, delayMs));
    timers.add(timer);
  };

  const failCurrent = (requestGeneration: number, error: string) => {
    if (!isCurrent(requestGeneration)) return;
    cancelActive();
    publish({ status: "error", activeNoteIndex: null, error });
  };

  const finishCurrent = (requestGeneration: number) => {
    if (!isCurrent(requestGeneration)) return;
    cancelActive();
    publish(IDLE_SNAPSHOT);
  };

  const play: RecognitionNotesPlaybackController["play"] = ({
    notes,
    bpm,
    trackActiveNote,
    errorMessage,
  }) => {
    if (disposed || notes.length === 0) return false;
    cancelActive();
    const requestGeneration = generation;
    publish({ status: "playing", activeNoteIndex: null, error: "" });

    try {
      if (!Number.isFinite(bpm) || bpm < 40 || bpm > 240) {
        throw new Error("Invalid BPM");
      }
      const frozenNotes = notes.map((note) => ({ ...note }));
      const prepared = port.prepare();
      const startTimeSeconds = prepared.currentTimeSeconds + 0.04;
      let offsetSeconds = 0;

      frozenNotes.forEach(({ note, duration }, index) => {
        const noteOffsetSeconds = offsetSeconds;
        const durationSeconds = durationToBeats[duration] * (60 / bpm);
        const frequencyHz = noteNameToFrequencyHz(note);
        if (frequencyHz === null) throw new Error(`Unsupported note: ${note}`);
        prepared.scheduleTone({
          frequencyHz,
          startTimeSeconds: startTimeSeconds + noteOffsetSeconds,
          durationSeconds,
        });
        if (trackActiveNote) {
          setOwnedTimer(
            requestGeneration,
            () =>
              publish({
                status: "playing",
                activeNoteIndex: index,
                error: "",
              }),
            noteOffsetSeconds * 1_000,
          );
        }
        offsetSeconds += durationSeconds;
      });

      setOwnedTimer(
        requestGeneration,
        () => finishCurrent(requestGeneration),
        offsetSeconds * 1_000 + 500,
      );
      return true;
    } catch {
      failCurrent(requestGeneration, errorMessage);
      return false;
    }
  };

  const stop = () => {
    if (disposed) return;
    const error = snapshot.error;
    cancelActive();
    publish({ status: "idle", activeNoteIndex: null, error });
  };

  const clearError = () => {
    if (disposed || snapshot.error === "") return;
    publish({ ...snapshot, error: "" });
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
    clearError,
    dispose: () => {
      if (disposed) return;
      cancelActive("dispose");
      disposed = true;
      listeners.clear();
      snapshot = IDLE_SNAPSHOT;
    },
  };
};
