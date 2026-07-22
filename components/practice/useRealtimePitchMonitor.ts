"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  analyzeRealtimePitchFrame,
  REALTIME_PITCH_FRAME_SIZE,
  type RealtimePitchFrameAnalysis,
} from "../../lib/practice/pitchEstimate";
import {
  appendRealtimePitchCurvePoint,
  type RealtimePitchCurvePoint,
} from "../../lib/practice/realtimePitchCurve";
import { subscribeBrowserAudioStopAll } from "../../lib/audio/browserAudioEngine";

export type RealtimePitchMonitorStatus = "idle" | "requesting" | "listening" | "error";
export type RealtimePitchRecordingStatus = "empty" | "recording" | "ready" | "playing" | "error";
export type RealtimePitchMonitorStartResult = { ok: true } | { ok: false; error: string };

const describeMicrophoneError = (error: unknown): string => {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "麦克风权限未开启。请在系统设置中允许“视唱练耳”使用麦克风，然后重试。";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "没有找到可用麦克风。你仍可使用听辨练习和参考钢琴。";
  if (name === "NotReadableError" || name === "TrackStartError") return "麦克风暂时无法使用，可能正被其他应用占用。请关闭其他录音应用后重试。";
  return "无法启动本地实时音高反馈。请检查麦克风权限后重试。";
};

export function useRealtimePitchMonitor() {
  const [status, setStatus] = useState<RealtimePitchMonitorStatus>("idle");
  const [frame, setFrame] = useState<RealtimePitchFrameAnalysis | null>(null);
  const [curvePoints, setCurvePoints] = useState<RealtimePitchCurvePoint[]>([]);
  const [listeningStartedAtMs, setListeningStartedAtMs] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [recordingStatus, setRecordingStatus] = useState<RealtimePitchRecordingStatus>("empty");
  const [recordingError, setRecordingError] = useState("");
  const [hasRecording, setHasRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [completedPlaybackRecording, setCompletedPlaybackRecording] = useState<Blob | null>(null);
  const [recordingStartedAtMs, setRecordingStartedAtMs] = useState<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const generationRef = useRef(0);
  const recordingGenerationRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingUrlRef = useRef<string | null>(null);
  const playbackRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(true);
  const suppressGlobalStopRef = useRef(0);

  const stopPlayback = useCallback(() => {
    const playback = playbackRef.current;
    playbackRef.current = null;
    if (playback) {
      playback.onended = null;
      playback.onerror = null;
      playback.pause();
      playback.currentTime = 0;
    }
    if (mountedRef.current) setRecordingStatus((current) => current === "playing" ? "ready" : current);
  }, []);

  const discardRecording = useCallback(() => {
    recordingGenerationRef.current += 1;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state === "recording") recorder.stop();
    }
    recordingChunksRef.current = [];
    stopPlayback();
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    recordingUrlRef.current = null;
    if (mountedRef.current) {
      setRecordingStatus("empty");
      setRecordingError("");
      setHasRecording(false);
      setRecordingBlob(null);
      setCompletedPlaybackRecording(null);
      setRecordingStartedAtMs(null);
    }
  }, [stopPlayback]);

  const finishRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const releaseResources = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
  }, []);

  const stop = useCallback(() => {
    finishRecording();
    generationRef.current += 1;
    releaseResources();
    if (mountedRef.current) setStatus("idle");
  }, [finishRecording, releaseResources]);

  const clear = useCallback(() => {
    stop();
    setFrame(null);
    setCurvePoints([]);
    setListeningStartedAtMs(null);
    setError("");
    discardRecording();
  }, [discardRecording, stop]);

  const start = useCallback(async (
    onInterrupted?: (message: string) => void,
  ): Promise<RealtimePitchMonitorStartResult> => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    stopPlayback();
    releaseResources();
    setFrame(null);
    setError("");

    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") {
      const message = "当前设备不支持浏览器本地麦克风分析。你仍可使用听辨练习和参考钢琴。";
      setStatus("error");
      setError(message);
      return { ok: false, error: message };
    }

    setStatus("requesting");
    let ownedStream: MediaStream | null = null;
    let ownedContext: AudioContext | null = null;
    let ownedSource: MediaStreamAudioSourceNode | null = null;
    const releaseOwnedResources = () => {
      ownedSource?.disconnect();
      ownedStream?.getTracks().forEach((track) => track.stop());
      if (ownedContext && ownedContext.state !== "closed") void ownedContext.close().catch(() => undefined);
      if (streamRef.current === ownedStream) streamRef.current = null;
      if (contextRef.current === ownedContext) contextRef.current = null;
      if (sourceRef.current === ownedSource) sourceRef.current = null;
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      ownedStream = stream;
      if (!mountedRef.current || generation !== generationRef.current) {
        releaseOwnedResources();
        return { ok: false, error: "麦克风权限结果已过期，本轮没有启用输入。" };
      }
      stream.getTracks().forEach((track) => track.addEventListener?.("ended", () => {
        if (!mountedRef.current || generation !== generationRef.current) return;
        const message = "麦克风媒体轨已中断，本轮录音资格已作废。";
        generationRef.current += 1;
        releaseResources();
        setStatus("error");
        setError(message);
        onInterrupted?.(message);
      }, { once: true }));

      const context = new AudioContext({ latencyHint: "interactive" });
      const source = context.createMediaStreamSource(stream);
      ownedContext = context;
      ownedSource = source;
      const analyser = context.createAnalyser();
      analyser.fftSize = REALTIME_PITCH_FRAME_SIZE;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);
      streamRef.current = stream;
      contextRef.current = context;
      sourceRef.current = source;
      await context.resume();
      if (!mountedRef.current || generation !== generationRef.current) {
        releaseOwnedResources();
        return { ok: false, error: "麦克风启动结果已过期，本轮没有启用输入。" };
      }
      context.addEventListener?.("statechange", () => {
        if (
          !mountedRef.current
          || generation !== generationRef.current
          || context.state === "running"
        ) return;
        const message = "麦克风音频上下文已中断，本轮录音资格已作废。";
        generationRef.current += 1;
        releaseResources();
        setStatus("error");
        setError(message);
        onInterrupted?.(message);
      });

      const samples = new Float32Array(REALTIME_PITCH_FRAME_SIZE);
      setListeningStartedAtMs(performance.now());
      const analyze = () => {
        if (!mountedRef.current || generation !== generationRef.current) return;
        analyser.getFloatTimeDomainData(samples);
        const analysis = analyzeRealtimePitchFrame(samples, context.sampleRate);
        const timestampMs = performance.now();
        setFrame(analysis);
        setCurvePoints((points) => appendRealtimePitchCurvePoint(points, analysis, timestampMs));
        timerRef.current = window.setTimeout(analyze, 50);
      };
      setStatus("listening");
      analyze();
      return { ok: true };
    } catch (caught) {
      releaseOwnedResources();
      const message = describeMicrophoneError(caught);
      if (!mountedRef.current || generation !== generationRef.current) {
        return { ok: false, error: "麦克风权限结果已过期，本轮没有启用输入。" };
      }
      setStatus("error");
      setError(message);
      return { ok: false, error: message };
    }
  }, [releaseResources, stopPlayback]);

  const startRecording = useCallback((onFailure?: (message: string) => void): boolean => {
    const stream = streamRef.current;
    if (!stream || status !== "listening") {
      const message = "请先开始实时反馈，再开始本次会话录音。";
      setRecordingStatus("error");
      setRecordingError(message);
      onFailure?.(message);
      return false;
    }
    if (typeof MediaRecorder === "undefined") {
      const message = "当前设备不支持会话内录音。实时曲线仍可继续使用。";
      setRecordingStatus("error");
      setRecordingError(message);
      onFailure?.(message);
      return false;
    }
    discardRecording();
    const generation = recordingGenerationRef.current + 1;
    recordingGenerationRef.current = generation;
    setCompletedPlaybackRecording(null);
    setRecordingError("");
    try {
      const supportedMimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find((mimeType) => typeof MediaRecorder.isTypeSupported !== "function" || MediaRecorder.isTypeSupported(mimeType));
      const recorder = supportedMimeType ? new MediaRecorder(stream, { mimeType: supportedMimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recordingChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (generation === recordingGenerationRef.current && event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        if (!mountedRef.current || generation !== recordingGenerationRef.current) return;
        const message = "本次录音发生错误，已停止。你可以继续使用实时曲线或重试录音。";
        setRecordingStatus("error");
        setRecordingError(message);
        onFailure?.(message);
      };
      recorder.onstop = () => {
        if (!mountedRef.current || generation !== recordingGenerationRef.current) {
          recordingChunksRef.current = [];
          return;
        }
        recorderRef.current = null;
        const chunks = recordingChunksRef.current;
        recordingChunksRef.current = [];
        if (chunks.length === 0) {
          const message = "没有获得可回放的录音数据，请重试。";
          setRecordingStatus("error");
          setRecordingError(message);
          onFailure?.(message);
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        setRecordingBlob(blob);
        try {
          if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
          recordingUrlRef.current = URL.createObjectURL(blob);
          setHasRecording(true);
          setRecordingStatus("ready");
        } catch {
          const message = "无法在当前会话中准备录音回放，请重新录制。";
          recordingUrlRef.current = null;
          setHasRecording(false);
          setRecordingStatus("error");
          setRecordingError(message);
          onFailure?.(message);
        }
      };
      recorder.start(250);
      setRecordingStartedAtMs(performance.now());
      setRecordingStatus("recording");
      return true;
    } catch {
      recorderRef.current = null;
      recordingChunksRef.current = [];
      const message = "无法开始会话内录音。实时曲线仍可继续使用。";
      setRecordingStatus("error");
      setRecordingError(message);
      setRecordingStartedAtMs(null);
      onFailure?.(message);
      return false;
    }
  }, [discardRecording, status]);

  const playRecording = useCallback(async (onFailure?: (message: string) => void) => {
    const url = recordingUrlRef.current;
    if (!url) {
      const message = "当前没有可回放的录音，请先完成一次录音。";
      setRecordingStatus("error");
      setRecordingError(message);
      onFailure?.(message);
      return;
    }
    stop();
    stopPlayback();
    setCompletedPlaybackRecording(null);
    let playback: HTMLAudioElement | null = null;
    try {
      playback = new Audio(url);
      const playbackRecording = recordingBlob;
      playbackRef.current = playback;
      playback.onended = () => {
        if (playbackRef.current !== playback) return;
        playbackRef.current = null;
        if (mountedRef.current) {
          setCompletedPlaybackRecording(playbackRecording);
          setRecordingStatus("ready");
        }
      };
      playback.onerror = () => {
        if (playbackRef.current !== playback) return;
        playbackRef.current = null;
        if (mountedRef.current) {
          const message = "无法回放本次录音。你可以丢弃后重新录制。";
          setRecordingStatus("error");
          setRecordingError(message);
          onFailure?.(message);
        }
      };
      await playback.play();
      if (playbackRef.current === playback && mountedRef.current) setRecordingStatus("playing");
    } catch {
      if (playback !== null && playbackRef.current !== playback) return;
      playbackRef.current = null;
      if (mountedRef.current) {
        const message = "系统阻止了录音回放，请再次点击播放或重新录制。";
        setRecordingStatus("error");
        setRecordingError(message);
        onFailure?.(message);
      }
    }
  }, [recordingBlob, stop, stopPlayback]);

  const suppressNextGlobalStop = useCallback(() => {
    suppressGlobalStopRef.current += 1;
  }, []);

  useEffect(() => subscribeBrowserAudioStopAll(() => {
    if (suppressGlobalStopRef.current > 0) {
      suppressGlobalStopRef.current -= 1;
      return;
    }
    stop();
    stopPlayback();
  }), [stop, stopPlayback]);

  useEffect(() => {
    // React StrictMode intentionally replays effects during development. Mark
    // the second setup as mounted again so the real Android entry behaves the
    // same in development and production builds.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      recordingGenerationRef.current += 1;
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state === "recording") recorder.stop();
      }
      recordingChunksRef.current = [];
      stopPlayback();
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
      recordingUrlRef.current = null;
      releaseResources();
    };
  }, [releaseResources, stopPlayback]);

  return {
    status,
    frame,
    curvePoints,
    listeningStartedAtMs,
    error,
    start,
    stop,
    clear,
    recordingStatus,
    hasRecording,
    recordingBlob,
    hasCompletedRecordingPlayback: recordingBlob !== null && completedPlaybackRecording === recordingBlob,
    recordingStartedAtMs,
    recordingError,
    startRecording,
    stopRecording: finishRecording,
    playRecording,
    stopPlayback,
    discardRecording,
    suppressNextGlobalStop,
  };
}
