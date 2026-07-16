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

  const start = useCallback(async () => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    stopPlayback();
    releaseResources();
    setFrame(null);
    setError("");

    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") {
      setStatus("error");
      setError("当前设备不支持浏览器本地麦克风分析。你仍可使用听辨练习和参考钢琴。");
      return;
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
        return;
      }

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
        return;
      }

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
    } catch (caught) {
      releaseOwnedResources();
      if (!mountedRef.current || generation !== generationRef.current) return;
      setStatus("error");
      setError(describeMicrophoneError(caught));
    }
  }, [releaseResources, stopPlayback]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || status !== "listening") {
      setRecordingStatus("error");
      setRecordingError("请先开始实时反馈，再开始本次会话录音。");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setRecordingStatus("error");
      setRecordingError("当前设备不支持会话内录音。实时曲线仍可继续使用。");
      return;
    }
    discardRecording();
    const generation = recordingGenerationRef.current + 1;
    recordingGenerationRef.current = generation;
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
        setRecordingStatus("error");
        setRecordingError("本次录音发生错误，已停止。你可以继续使用实时曲线或重试录音。");
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
          setRecordingStatus("error");
          setRecordingError("没有获得可回放的录音数据，请重试。");
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        try {
          if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
          recordingUrlRef.current = URL.createObjectURL(blob);
          setHasRecording(true);
          setRecordingStatus("ready");
        } catch {
          recordingUrlRef.current = null;
          setHasRecording(false);
          setRecordingStatus("error");
          setRecordingError("无法在当前会话中准备录音回放，请重新录制。");
        }
      };
      recorder.start(250);
      setRecordingStatus("recording");
    } catch {
      recorderRef.current = null;
      recordingChunksRef.current = [];
      setRecordingStatus("error");
      setRecordingError("无法开始会话内录音。实时曲线仍可继续使用。");
    }
  }, [discardRecording, status]);

  const playRecording = useCallback(async () => {
    const url = recordingUrlRef.current;
    if (!url) {
      setRecordingStatus("error");
      setRecordingError("当前没有可回放的录音，请先完成一次录音。");
      return;
    }
    stop();
    stopPlayback();
    try {
      const playback = new Audio(url);
      playbackRef.current = playback;
      playback.onended = () => {
        if (playbackRef.current === playback) playbackRef.current = null;
        if (mountedRef.current) setRecordingStatus("ready");
      };
      playback.onerror = () => {
        if (playbackRef.current === playback) playbackRef.current = null;
        if (mountedRef.current) {
          setRecordingStatus("error");
          setRecordingError("无法回放本次录音。你可以丢弃后重新录制。");
        }
      };
      await playback.play();
      if (playbackRef.current === playback && mountedRef.current) setRecordingStatus("playing");
    } catch {
      playbackRef.current = null;
      if (mountedRef.current) {
        setRecordingStatus("error");
        setRecordingError("系统阻止了录音回放，请再次点击播放或重新录制。");
      }
    }
  }, [stop, stopPlayback]);

  useEffect(() => subscribeBrowserAudioStopAll(stop), [stop]);

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
    recordingError,
    startRecording,
    stopRecording: finishRecording,
    playRecording,
    stopPlayback,
    discardRecording,
  };
}
