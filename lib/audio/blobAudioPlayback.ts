export type BlobAudioPlaybackRequest = {
  blob: Blob;
  startMs?: number;
  durationMs?: number;
  onEnded: () => void;
  onError: () => void;
};

export type BlobAudioPlaybackHandle = {
  play: () => Promise<void>;
  stop: () => void;
  dispose: () => void;
};

export type BlobAudioPlaybackPort = {
  create: (request: BlobAudioPlaybackRequest) => BlobAudioPlaybackHandle;
};

export type BlobAudioPlaybackSnapshot = {
  status: "idle" | "starting" | "playing" | "error";
  key: string | null;
  error: string;
};

export type BlobAudioPlaybackController = {
  getSnapshot: () => BlobAudioPlaybackSnapshot;
  subscribe: (listener: () => void) => () => void;
  play: (request: {
    blob: Blob;
    key: string;
    startMs?: number;
    durationMs?: number;
    errorMessage: string;
    playErrorMessage?: string;
    onEnded?: () => void;
    onError?: (message: string) => void;
  }) => Promise<boolean>;
  stop: () => void;
  dispose: () => void;
};

const IDLE_SNAPSHOT: BlobAudioPlaybackSnapshot = {
  status: "idle",
  key: null,
  error: "",
};

export const createBlobAudioPlaybackController = (
  port: BlobAudioPlaybackPort,
): BlobAudioPlaybackController => {
  let snapshot = IDLE_SNAPSHOT;
  let generation = 0;
  let disposed = false;
  let active: { generation: number; handle: BlobAudioPlaybackHandle } | null = null;
  const listeners = new Set<() => void>();

  const publish = (next: BlobAudioPlaybackSnapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  const releaseHandle = (
    handle: BlobAudioPlaybackHandle,
    method: "stop" | "dispose" = "stop",
  ) => {
    try {
      handle[method]();
    } catch {
      // Adapter cleanup cannot be allowed to restore or corrupt controller state.
    }
  };

  const stopActive = (method: "stop" | "dispose" = "stop") => {
    const previous = active;
    active = null;
    if (!previous) return;
    releaseHandle(previous.handle, method);
  };

  const stop = () => {
    if (disposed) return;
    generation += 1;
    stopActive();
    publish(IDLE_SNAPSHOT);
  };

  const play: BlobAudioPlaybackController["play"] = async (request) => {
    if (disposed) return false;
    generation += 1;
    const requestGeneration = generation;
    stopActive();
    publish({ status: "starting", key: request.key, error: "" });
    if (disposed || generation !== requestGeneration) return false;

    let handle: BlobAudioPlaybackHandle | null = null;
    const isCurrent = () => !disposed
      && generation === requestGeneration
      && active?.generation === requestGeneration
      && active.handle === handle;
    const failCurrent = (message = request.errorMessage) => {
      if (!handle || !isCurrent()) return;
      active = null;
      releaseHandle(handle);
      publish({ status: "error", key: request.key, error: message });
      if (!disposed && generation === requestGeneration) {
        request.onError?.(message);
      }
    };
    try {
      handle = port.create({
        blob: request.blob,
        startMs: request.startMs,
        durationMs: request.durationMs,
        onEnded: () => {
          if (!isCurrent()) return;
          active = null;
          if (handle) releaseHandle(handle);
          publish(IDLE_SNAPSHOT);
          if (!disposed && generation === requestGeneration) {
            request.onEnded?.();
          }
        },
        onError: () => failCurrent(),
      });
    } catch {
      if (!disposed && generation === requestGeneration) {
        const message = request.playErrorMessage ?? request.errorMessage;
        publish({ status: "error", key: request.key, error: message });
        if (!disposed && generation === requestGeneration) {
          request.onError?.(message);
        }
      }
      return false;
    }

    if (disposed || generation !== requestGeneration) {
      releaseHandle(handle, "dispose");
      return false;
    }
    active = { generation: requestGeneration, handle };
    try {
      await handle.play();
    } catch {
      failCurrent(request.playErrorMessage ?? request.errorMessage);
      return false;
    }
    if (!isCurrent()) {
      releaseHandle(handle);
      return false;
    }
    publish({ status: "playing", key: request.key, error: "" });
    return isCurrent();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    play,
    stop,
    dispose: () => {
      if (disposed) return;
      generation += 1;
      disposed = true;
      stopActive("dispose");
      listeners.clear();
      snapshot = IDLE_SNAPSHOT;
    },
  };
};

type AudioElementLike = Pick<
  HTMLAudioElement,
  "currentTime" | "onended" | "onerror" | "play" | "pause"
>;

export const createBrowserBlobAudioPlaybackPort = ({
  createObjectUrl = (blob: Blob) => URL.createObjectURL(blob),
  revokeObjectUrl = (url: string) => URL.revokeObjectURL(url),
  createAudio = (url: string): AudioElementLike => new Audio(url),
  setTimer = (callback: () => void, delayMs: number) => globalThis.setTimeout(callback, delayMs),
  clearTimer = (timer: ReturnType<typeof globalThis.setTimeout>) => globalThis.clearTimeout(timer),
}: {
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  createAudio?: (url: string) => AudioElementLike;
  setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof globalThis.setTimeout>;
  clearTimer?: (timer: ReturnType<typeof globalThis.setTimeout>) => void;
} = {}): BlobAudioPlaybackPort => ({
  create: (request) => {
    const url = createObjectUrl(request.blob);
    let audio: AudioElementLike | null = null;
    let timer: ReturnType<typeof globalThis.setTimeout> | null = null;
    let stopped = false;

    const cleanup = () => {
      if (stopped) return;
      stopped = true;
      const ownedTimer = timer;
      timer = null;
      const ownedAudio = audio;
      audio = null;
      if (ownedTimer !== null) {
        try { clearTimer(ownedTimer); } catch { /* continue URL cleanup */ }
      }
      if (ownedAudio) {
        try {
          ownedAudio.onended = null;
          ownedAudio.onerror = null;
        } catch { /* continue remaining cleanup */ }
        try { ownedAudio.pause(); } catch { /* continue URL cleanup */ }
      }
      try { revokeObjectUrl(url); } catch { /* cleanup remains terminal */ }
    };
    const finish = (kind: "ended" | "error") => {
      if (stopped) return;
      cleanup();
      if (kind === "ended") request.onEnded();
      else request.onError();
    };

    try {
      audio = createAudio(url);
      audio.currentTime = Math.max(0, (request.startMs ?? 0) / 1_000);
      audio.onended = () => finish("ended");
      audio.onerror = () => finish("error");
    } catch (error) {
      cleanup();
      throw error;
    }

    return {
      play: async () => {
        if (stopped || !audio) throw new Error("回放已停止");
        try {
          await audio.play();
        } catch (error) {
          cleanup();
          throw error;
        }
        if (stopped) return;
        if (request.durationMs !== undefined) {
          timer = setTimer(
            () => finish("ended"),
            Math.max(100, request.durationMs),
          );
        }
      },
      stop: cleanup,
      dispose: cleanup,
    };
  },
});

export const browserBlobAudioPlaybackPort = createBrowserBlobAudioPlaybackPort();
