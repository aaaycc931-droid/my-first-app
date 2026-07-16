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

export type RealtimePitchMonitorStatus = "idle" | "requesting" | "listening" | "error";

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
  const [error, setError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);

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
    generationRef.current += 1;
    releaseResources();
    if (mountedRef.current) setStatus("idle");
  }, [releaseResources]);

  const clear = useCallback(() => {
    stop();
    setFrame(null);
    setCurvePoints([]);
    setError("");
  }, [stop]);

  const start = useCallback(async () => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
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
  }, [releaseResources]);

  useEffect(() => {
    // React StrictMode intentionally replays effects during development. Mark
    // the second setup as mounted again so the real Android entry behaves the
    // same in development and production builds.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      releaseResources();
    };
  }, [releaseResources]);

  return { status, frame, curvePoints, error, start, stop, clear };
}
