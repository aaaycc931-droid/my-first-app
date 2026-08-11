import type { BlobAudioPlaybackController } from "../audio/blobAudioPlayback";
import type { MediaRecorderCaptureHandle, MediaRecorderCapturePort } from "../audio/mediaRecorder";
import type { RealtimePitchInputHandle, RealtimePitchInputInterruption, RealtimePitchInputPort } from "../audio/realtimePitchInput";
import { analyzeRealtimePitchFrame, type RealtimePitchFrameAnalysis } from "./pitchEstimate";
import { appendRealtimePitchCurvePoint, type RealtimePitchCurvePoint } from "./realtimePitchCurve";

export type RealtimePitchMonitorStatus = "idle" | "requesting" | "listening" | "error";
export type RealtimePitchRecordingStatus = "empty" | "recording" | "ready" | "playing" | "error";
export type RealtimePitchMonitorStartResult = { ok: true } | { ok: false; error: string };

export type RealtimePitchMonitorSnapshot = {
  status: RealtimePitchMonitorStatus;
  frame: RealtimePitchFrameAnalysis | null;
  curvePoints: RealtimePitchCurvePoint[];
  listeningStartedAtMs: number | null;
  error: string;
  recordingStatus: RealtimePitchRecordingStatus;
  hasRecording: boolean;
  recordingBlob: Blob | null;
  hasCompletedRecordingPlayback: boolean;
  recordingStartedAtMs: number | null;
  recordingError: string;
};

export type RealtimePitchMonitorController = {
  getSnapshot: () => RealtimePitchMonitorSnapshot;
  subscribe: (listener: () => void) => () => void;
  attach: () => void;
  detach: () => void;
  start: (onInterrupted?: (message: string) => void) => Promise<RealtimePitchMonitorStartResult>;
  stop: () => void;
  clear: () => void;
  startRecording: (onFailure?: (message: string) => void) => boolean;
  stopRecording: () => void;
  playRecording: (onFailure?: (message: string) => void) => Promise<void>;
  stopPlayback: () => void;
  discardRecording: () => void;
  suppressNextGlobalStop: () => void;
  handleGlobalStop: () => void;
};

const initialSnapshot = (): RealtimePitchMonitorSnapshot => ({
  status: "idle", frame: null, curvePoints: [], listeningStartedAtMs: null, error: "",
  recordingStatus: "empty", hasRecording: false, recordingBlob: null,
  hasCompletedRecordingPlayback: false, recordingStartedAtMs: null, recordingError: "",
});

const describeMicrophoneError = (error: unknown): string => {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "麦克风权限未开启。请在系统设置中允许“视唱练耳”使用麦克风，然后重试。";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "没有找到可用麦克风。你仍可使用听辨练习和参考钢琴。";
  if (name === "NotReadableError" || name === "TrackStartError") return "麦克风暂时无法使用，可能正被其他应用占用。请关闭其他录音应用后重试。";
  return "无法启动本地实时音高反馈。请检查麦克风权限后重试。";
};

export const createRealtimePitchMonitorController = ({ inputPort, recorderPort, playback, now = () => performance.now() }: {
  inputPort: RealtimePitchInputPort;
  recorderPort: MediaRecorderCapturePort;
  playback: BlobAudioPlaybackController;
  now?: () => number;
}): RealtimePitchMonitorController => {
  let snapshot = initialSnapshot();
  let attached = true;
  let inputGeneration = 0;
  let recordingGeneration = 0;
  let suppressGlobalStop = 0;
  let input: RealtimePitchInputHandle | null = null;
  let capture: MediaRecorderCaptureHandle | null = null;
  let captureFailure: ((message: string) => void) | null = null;
  let completedPlaybackRecording: Blob | null = null;
  const listeners = new Set<() => void>();

  const publish = (patch: Partial<RealtimePitchMonitorSnapshot>) => {
    if (!attached) return;
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };
  const releaseInput = () => {
    const owned = input;
    input = null;
    try { owned?.dispose(); } catch { /* cleanup remains terminal */ }
  };
  const stopPlayback = () => {
    playback.stop();
    if (snapshot.recordingStatus === "playing") publish({ recordingStatus: "ready" });
  };
  const failActiveRecording = (message: string, notifyFailure = true) => {
    const owned = capture;
    if (!owned) return false;
    recordingGeneration += 1;
    capture = null;
    const failure = captureFailure;
    captureFailure = null;
    try { owned.dispose(); } catch { /* cleanup remains terminal */ }
    completedPlaybackRecording = null;
    publish({
      recordingStatus: "error",
      recordingError: message,
      hasRecording: false,
      recordingBlob: null,
      hasCompletedRecordingPlayback: false,
      recordingStartedAtMs: null,
    });
    if (notifyFailure) failure?.(message);
    return true;
  };
  const stopRecording = () => {
    const owned = capture;
    if (!owned) return;
    try {
      if (owned.getState() === "recording") owned.stop();
    } catch {
      const message = "本次录音发生错误，已停止。你可以继续使用实时曲线或重试录音。";
      if (capture === owned) failActiveRecording(message);
      else try { owned.dispose(); } catch { /* cleanup remains terminal */ }
    }
  };
  const discardRecording = () => {
    recordingGeneration += 1;
    const owned = capture;
    capture = null;
    captureFailure = null;
    try { owned?.dispose(); } catch { /* cleanup remains terminal */ }
    stopPlayback();
    completedPlaybackRecording = null;
    publish({ recordingStatus: "empty", recordingError: "", hasRecording: false,
      recordingBlob: null, hasCompletedRecordingPlayback: false, recordingStartedAtMs: null });
  };
  const stop = () => {
    stopRecording();
    inputGeneration += 1;
    releaseInput();
    publish({ status: "idle" });
  };
  const clear = () => {
    stop();
    publish({ frame: null, curvePoints: [], listeningStartedAtMs: null, error: "" });
    discardRecording();
  };

  const start: RealtimePitchMonitorController["start"] = async (onInterrupted) => {
    const generation = ++inputGeneration;
    stopPlayback();
    releaseInput();
    publish({ frame: null, error: "" });
    if (!inputPort.isSupported()) {
      const message = "当前设备不支持浏览器本地麦克风分析。你仍可使用听辨练习和参考钢琴。";
      publish({ status: "error", error: message });
      return { ok: false, error: message };
    }
    publish({ status: "requesting" });
    let owned: RealtimePitchInputHandle | null = null;
    const interrupted = (kind: RealtimePitchInputInterruption) => {
      if (!attached || generation !== inputGeneration) return;
      const message = kind === "track-ended"
        ? "麦克风媒体轨已中断，本轮录音资格已作废。"
        : "麦克风音频上下文已中断，本轮录音资格已作废。";
      failActiveRecording(message, !onInterrupted);
      inputGeneration += 1;
      releaseInput();
      publish({ status: "error", error: message });
      onInterrupted?.(message);
    };
    try {
      owned = await inputPort.request({ onInterrupted: interrupted });
      if (!attached || generation !== inputGeneration) {
        owned.dispose();
        return { ok: false, error: "麦克风权限结果已过期，本轮没有启用输入。" };
      }
      input = owned;
      await owned.prepare();
      if (!attached || generation !== inputGeneration) {
        owned.dispose();
        if (input === owned) input = null;
        return { ok: false, error: "麦克风启动结果已过期，本轮没有启用输入。" };
      }
      publish({ listeningStartedAtMs: now(), status: "listening" });
      owned.start((samples, sampleRate) => {
        if (!attached || generation !== inputGeneration || input !== owned) return;
        const analysis = analyzeRealtimePitchFrame(samples, sampleRate);
        publish({ frame: analysis, curvePoints: appendRealtimePitchCurvePoint(snapshot.curvePoints, analysis, now()) });
      });
      return { ok: true };
    } catch (error) {
      try { owned?.dispose(); } catch { /* cleanup remains terminal */ }
      if (input === owned) input = null;
      const message = describeMicrophoneError(error);
      if (!attached || generation !== inputGeneration) {
        return { ok: false, error: "麦克风权限结果已过期，本轮没有启用输入。" };
      }
      publish({ status: "error", error: message });
      return { ok: false, error: message };
    }
  };

  const startRecording: RealtimePitchMonitorController["startRecording"] = (onFailure) => {
    const stream = input?.stream;
    if (!stream || snapshot.status !== "listening") {
      const message = "请先开始实时反馈，再开始本次会话录音。";
      publish({ recordingStatus: "error", recordingError: message }); onFailure?.(message); return false;
    }
    if (!recorderPort.isSupported()) {
      const message = "当前设备不支持会话内录音。实时曲线仍可继续使用。";
      publish({ recordingStatus: "error", recordingError: message }); onFailure?.(message); return false;
    }
    discardRecording();
    const generation = ++recordingGeneration;
    completedPlaybackRecording = null;
    let failureNotified = false;
    captureFailure = onFailure
      ? (message) => {
        if (failureNotified) return;
        failureNotified = true;
        onFailure(message);
      }
      : null;
    publish({ recordingError: "", hasCompletedRecordingPlayback: false });
    let owned: MediaRecorderCaptureHandle | null = null;
    try {
      owned = recorderPort.create({ stream, timesliceMs: 250,
        onError: () => {
          if (!attached || generation !== recordingGeneration || capture !== owned) return;
          const message = "本次录音发生错误，已停止。你可以继续使用实时曲线或重试录音。";
          failActiveRecording(message);
        },
        onStopped: (recording) => {
          if (!attached || generation !== recordingGeneration) return;
          if (capture === owned) capture = null;
          captureFailure = null;
          if (!recording) {
            const message = "没有获得可回放的录音数据，请重试。";
            publish({ recordingStatus: "error", recordingError: message });
            if (!failureNotified) {
              failureNotified = true;
              onFailure?.(message);
            }
            return;
          }
          publish({ recordingBlob: recording, hasRecording: true, recordingStatus: "ready" });
        },
      });
      capture = owned;
      publish({ recordingStartedAtMs: now(), recordingStatus: "recording" });
      owned.start();
      return generation === recordingGeneration && snapshot.recordingStatus !== "error";
    } catch {
      try { owned?.dispose(); } catch { /* cleanup remains terminal */ }
      if (generation !== recordingGeneration) return false;
      recordingGeneration += 1;
      if (capture === owned) capture = null;
      const failure = captureFailure;
      captureFailure = null;
      const message = "无法开始会话内录音。实时曲线仍可继续使用。";
      publish({ recordingStatus: "error", recordingError: message, hasRecording: false,
        recordingBlob: null, hasCompletedRecordingPlayback: false, recordingStartedAtMs: null });
      failure?.(message); return false;
    }
  };

  const playRecording: RealtimePitchMonitorController["playRecording"] = async (onFailure) => {
    const recording = snapshot.recordingBlob;
    if (!recording) {
      const message = "当前没有可回放的录音，请先完成一次录音。";
      publish({ recordingStatus: "error", recordingError: message }); onFailure?.(message); return;
    }
    stop(); stopPlayback(); completedPlaybackRecording = null;
    publish({ hasCompletedRecordingPlayback: false });
    const started = await playback.play({ blob: recording, key: "current-session-recording",
      errorMessage: "无法回放本次录音。你可以丢弃后重新录制。",
      playErrorMessage: "系统阻止了录音回放，请再次点击播放或重新录制。",
      onEnded: () => {
        if (!attached) return;
        completedPlaybackRecording = recording;
        publish({ recordingStatus: "ready", hasCompletedRecordingPlayback: snapshot.recordingBlob === recording });
      },
      onError: (message) => {
        if (!attached) return;
        publish({ recordingStatus: "error", recordingError: message }); onFailure?.(message);
      },
    });
    if (started && attached) publish({ recordingStatus: "playing" });
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    attach: () => { attached = true; },
    detach: () => {
      if (!attached) return;
      attached = false; inputGeneration += 1; recordingGeneration += 1;
      const owned = capture; capture = null; captureFailure = null;
      try { owned?.dispose(); } catch { /* cleanup */ }
      playback.stop(); releaseInput();
    },
    start, stop, clear, startRecording, stopRecording, playRecording, stopPlayback, discardRecording,
    suppressNextGlobalStop: () => { suppressGlobalStop += 1; },
    handleGlobalStop: () => {
      stopPlayback();
      if (suppressGlobalStop > 0) { suppressGlobalStop -= 1; return; }
      stop();
    },
  };
};
