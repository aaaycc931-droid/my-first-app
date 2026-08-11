import type { BlobAudioPlaybackController } from "../audio/blobAudioPlayback";
import type {
  LocalRecordingInputPort,
  LocalRecordingPreviewPort,
} from "../audio/localRecordingInput";
import type {
  MediaRecorderCaptureHandle,
  MediaRecorderCapturePort,
} from "../audio/mediaRecorder";

export type LocalRecordingStatus =
  | "empty"
  | "requesting"
  | "recording"
  | "ready"
  | "playing"
  | "error";

export type LocalRecordingSnapshot = {
  status: LocalRecordingStatus;
  recordingBlob: Blob | null;
  recordingUrl: string | null;
  recordingStartedAtMs: number | null;
  error: string;
};

export type LocalRecordingController = {
  getSnapshot: () => LocalRecordingSnapshot;
  subscribe: (listener: () => void) => () => void;
  attach: () => void;
  detach: () => void;
  start: () => Promise<boolean>;
  stop: () => void;
  clear: () => void;
  play: () => Promise<boolean>;
  stopPlayback: () => void;
  handleGlobalStop: () => void;
};

const EMPTY_SNAPSHOT: LocalRecordingSnapshot = {
  status: "empty",
  recordingBlob: null,
  recordingUrl: null,
  recordingStartedAtMs: null,
  error: "",
};

const stopStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      // Every owned track still gets a cleanup attempt.
    }
  });
};

export const createLocalRecordingController = ({
  inputPort,
  previewPort,
  recorderPort,
  playback,
  now = () => performance.now(),
}: {
  inputPort: LocalRecordingInputPort;
  previewPort: LocalRecordingPreviewPort;
  recorderPort: MediaRecorderCapturePort;
  playback: BlobAudioPlaybackController;
  now?: () => number;
}): LocalRecordingController => {
  let snapshot = EMPTY_SNAPSHOT;
  let attached = true;
  let generation = 0;
  let stream: MediaStream | null = null;
  let capture: MediaRecorderCaptureHandle | null = null;
  let previewUrl: string | null = null;
  const listeners = new Set<() => void>();

  const publish = (patch: Partial<LocalRecordingSnapshot>) => {
    if (!attached) return;
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };

  const releaseStream = () => {
    const owned = stream;
    stream = null;
    stopStream(owned);
  };

  const releaseCapture = () => {
    const owned = capture;
    capture = null;
    try {
      owned?.dispose();
    } catch {
      // Cleanup remains terminal even if the platform adapter throws.
    }
  };

  const releasePreviewUrl = () => {
    const owned = previewUrl;
    previewUrl = null;
    if (!owned) return;
    try {
      previewPort.revokeUrl(owned);
    } catch {
      // URL cleanup remains terminal.
    }
  };

  const stopPlayback = () => {
    playback.stop();
    if (snapshot.status === "playing") publish({ status: "ready" });
  };

  const cancelActive = () => {
    generation += 1;
    stopPlayback();
    releaseCapture();
    releaseStream();
    releasePreviewUrl();
  };

  const failCurrent = (
    requestGeneration: number,
    message: string,
    recordingBlob: Blob | null = null,
  ) => {
    if (!attached || requestGeneration !== generation) return;
    generation += 1;
    releaseCapture();
    releaseStream();
    publish({
      status: "error",
      recordingBlob,
      recordingUrl: recordingBlob ? previewUrl : null,
      recordingStartedAtMs: null,
      error: message,
    });
  };

  const start: LocalRecordingController["start"] = async () => {
    cancelActive();
    const requestGeneration = generation;
    publish({
      status: "requesting",
      recordingBlob: null,
      recordingUrl: null,
      recordingStartedAtMs: null,
      error: "",
    });

    if (!inputPort.isSupported() || !recorderPort.isSupported()) {
      failCurrent(requestGeneration, "此浏览器不支持本地录音。");
      return false;
    }

    let requestedStream: MediaStream | null = null;
    let ownedCapture: MediaRecorderCaptureHandle | null = null;

    try {
      requestedStream = await inputPort.request();
      if (!attached || requestGeneration !== generation) {
        stopStream(requestedStream);
        return false;
      }

      stream = requestedStream;
      ownedCapture = recorderPort.create({
        stream: requestedStream,
        timesliceMs: 250,
        onError: () => {
          if (
            attached &&
            requestGeneration === generation &&
            capture === ownedCapture
          ) {
            failCurrent(
              requestGeneration,
              "本次录音发生错误，已安全停止。请重试录音。",
            );
          }
        },
        onStopped: (recording) => {
          if (!attached || requestGeneration !== generation) return;
          if (capture === ownedCapture) capture = null;
          releaseStream();
          if (!recording) {
            publish({
              status: "error",
              recordingBlob: null,
              recordingUrl: null,
              recordingStartedAtMs: null,
              error: "没有获得可回放的录音数据，请重试。",
            });
            return;
          }
          releasePreviewUrl();
          try {
            previewUrl = previewPort.createUrl(recording);
          } catch {
            previewUrl = null;
          }
          publish({
            status: "ready",
            recordingBlob: recording,
            recordingUrl: previewUrl,
            recordingStartedAtMs: null,
            error: "",
          });
        },
      });
      capture = ownedCapture;
      publish({ status: "recording", recordingStartedAtMs: now() });
      ownedCapture.start();
      return (
        attached &&
        requestGeneration === generation &&
        capture === ownedCapture &&
        snapshot.status === "recording"
      );
    } catch {
      if (ownedCapture && capture !== ownedCapture) {
        try {
          ownedCapture.dispose();
        } catch {
          // A stale capture cannot be allowed to affect the current request.
        }
      }
      if (requestedStream && stream !== requestedStream) {
        stopStream(requestedStream);
      }
      if (!attached || requestGeneration !== generation) return false;
      failCurrent(
        requestGeneration,
        requestedStream
          ? "无法开始本地录音，请重试。"
          : "需要麦克风权限才能录制本地练习。",
      );
      return false;
    }
  };

  const stop = () => {
    if (snapshot.status === "requesting") {
      cancelActive();
      publish(EMPTY_SNAPSHOT);
      return;
    }
    const owned = capture;
    if (!owned) return;
    try {
      if (owned.getState() === "recording") owned.stop();
    } catch {
      failCurrent(
        generation,
        "本次录音发生错误，已安全停止。请重试录音。",
      );
    }
  };

  const clear = () => {
    cancelActive();
    publish(EMPTY_SNAPSHOT);
  };

  const play: LocalRecordingController["play"] = async () => {
    const recording = snapshot.recordingBlob;
    if (!recording) {
      publish({ status: "error", error: "请先完成一次本地录音。" });
      return false;
    }
    stopPlayback();
    const started = await playback.play({
      blob: recording,
      key: "practice-local-recording",
      errorMessage: "此浏览器无法播放已录制的练习。",
      playErrorMessage: "此浏览器无法播放已录制的练习。",
      onEnded: () => {
        if (attached && snapshot.recordingBlob === recording) {
          publish({ status: "ready", error: "" });
        }
      },
      onError: (message) => {
        if (attached && snapshot.recordingBlob === recording) {
          publish({ status: "error", error: message });
        }
      },
    });
    if (started && attached && snapshot.recordingBlob === recording) {
      publish({ status: "playing", error: "" });
      return true;
    }
    return false;
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    attach: () => {
      attached = true;
    },
    detach: () => {
      if (!attached) return;
      attached = false;
      generation += 1;
      releaseCapture();
      releaseStream();
      releasePreviewUrl();
      playback.dispose();
      listeners.clear();
      snapshot = EMPTY_SNAPSHOT;
    },
    start,
    stop,
    clear,
    play,
    stopPlayback,
    handleGlobalStop: () => {
      if (snapshot.status === "requesting") {
        cancelActive();
        publish(EMPTY_SNAPSHOT);
      } else if (snapshot.status === "recording") {
        stop();
      } else {
        stopPlayback();
      }
    },
  };
};
