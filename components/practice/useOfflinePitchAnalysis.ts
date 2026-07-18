"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  analyzeOfflinePitchPcm,
  standardizeOfflinePcm,
  type OfflinePitchAnalysisResult,
} from "../../lib/practice/offlinePitchAnalysis";

export type OfflinePitchAnalysisState =
  | { status: "idle"; result: null; error: "" }
  | { status: "processing"; result: null; error: "" }
  | { status: "ready"; result: OfflinePitchAnalysisResult; error: ""; processingMs: number; realtimeFactor: number }
  | { status: "error"; result: null; error: string };

const readBlobAsArrayBuffer = (blob: Blob) => {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => reader.result instanceof ArrayBuffer
      ? resolve(reader.result)
      : reject(new Error("录音读取结果不是有效二进制数据。"));
    reader.onerror = () => reject(new Error("当前设备无法读取本次录音。"));
    reader.onabort = () => reject(new Error("本次录音读取已取消。"));
    reader.readAsArrayBuffer(blob);
  });
};

export function useOfflinePitchAnalysis(recording: Blob | null) {
  const [state, setState] = useState<OfflinePitchAnalysisState>({ status: "idle", result: null, error: "" });
  const generationRef = useRef(0);
  const mountedRef = useRef(true);

  const clear = useCallback(() => {
    generationRef.current += 1;
    if (mountedRef.current) setState({ status: "idle", result: null, error: "" });
  }, []);

  useEffect(() => {
    clear();
  }, [clear, recording]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
    };
  }, []);

  const analyze = useCallback(async () => {
    if (!recording) {
      setState({ status: "error", result: null, error: "请先完成一次会话录音。" });
      return;
    }
    if (typeof AudioContext === "undefined") {
      setState({ status: "error", result: null, error: "当前设备无法在本机解码录音；实时曲线仍可使用。" });
      return;
    }
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setState({ status: "processing", result: null, error: "" });
    const startedAt = performance.now();
    let context: AudioContext | null = null;
    try {
      context = new AudioContext({ latencyHint: "playback" });
      const decoded = await context.decodeAudioData(await readBlobAsArrayBuffer(recording));
      if (!mountedRef.current || generation !== generationRef.current) return;
      const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) =>
        new Float32Array(decoded.getChannelData(index)),
      );
      const pcm = standardizeOfflinePcm({ sampleRate: decoded.sampleRate, channels });
      const result = analyzeOfflinePitchPcm(pcm);
      const processingMs = Math.max(0, performance.now() - startedAt);
      if (!mountedRef.current || generation !== generationRef.current) return;
      setState({
        status: "ready",
        result,
        error: "",
        processingMs,
        realtimeFactor: processingMs / (result.pcm.durationSeconds * 1_000),
      });
    } catch (error) {
      if (!mountedRef.current || generation !== generationRef.current) return;
      setState({
        status: "error",
        result: null,
        error: error instanceof Error ? error.message : "无法完成本机录音分析，请缩短录音后重试。",
      });
    } finally {
      if (context && context.state !== "closed") await context.close().catch(() => undefined);
    }
  }, [recording]);

  return { state, analyze, clear };
}
