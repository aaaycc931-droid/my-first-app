"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  deriveNoteLikeSegmentDiagnostics,
  type DiagnosticPitchFrame,
  type NoteLikeSegmentDiagnostic,
} from "../../../lib/research/local-audio-decode/note-like-segment-diagnostics";
import {
  convertNoteLikeSegmentsToResearchTargetPitchCurveDiagnostic,
  type ResearchTargetPitchCurveDiagnostic,
} from "../../../lib/research/local-audio-decode/research-target-pitch-curve-diagnostics";
import {
  DIAGNOSTIC_MAX_FREQUENCY_HZ,
  DIAGNOSTIC_MIN_FREQUENCY_HZ,
  isValidDiagnosticVoicedFrame,
  smoothDiagnosticFrequencies,
  summarizeDiagnosticFrequencies,
} from "../../../lib/research/local-audio-decode/pitch-frame-diagnostics";

type DecodeState =
  | "not-ready"
  | "ready-to-decode"
  | "decoding"
  | "decoded-metadata"
  | "decode-error"
  | "cleared";

type SelectedFileSummary = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
};

type DecodedAudioMetadata = {
  durationSeconds: number;
  sampleRate: number;
  numberOfChannels: number;
  frameCount: number;
};

type PitchExtractionState =
  | "not-ready"
  | "ready-to-extract"
  | "extracting"
  | "extracted"
  | "extract-error";

type PitchDiagnosticMetadata = {
  analyzedDurationSeconds: number;
  frameCount: number;
  voicedFrameCount: number;
  unvoicedFrameCount: number;
  frequencyMinHz: number | null;
  frequencyMedianHz: number | null;
  frequencyMaxHz: number | null;
  statusText: string;
  diagnosticFrames: DiagnosticPitchFrame[];
  noteLikeSegments: NoteLikeSegmentDiagnostic[];
  researchTargetPitchCurve: ResearchTargetPitchCurveDiagnostic;
};

const pitchFrameSize = 2048;
const pitchHopSize = 1024;
const minPitchHz = DIAGNOSTIC_MIN_FREQUENCY_HZ;
const maxPitchHz = DIAGNOSTIC_MAX_FREQUENCY_HZ;
const practiceResearchTargetCurveDiagnosticPreviewKey =
  "practiceResearchTargetCurveDiagnosticPreview";

const wavMimeTypes = new Set([
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/vnd.wave",
]);

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  const kb = size / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

function summarizeFile(file: File): SelectedFileSummary {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  };
}

function estimateResearchFrameFrequency(
  samples: Float32Array,
  sampleRate: number,
  frameStart: number,
) {
  let rms = 0;
  for (let index = 0; index < pitchFrameSize; index += 1) {
    const sample = samples[frameStart + index] ?? 0;
    rms += sample * sample;
  }

  rms = Math.sqrt(rms / pitchFrameSize);
  if (rms < 0.01) {
    return null;
  }

  const minLag = Math.floor(sampleRate / maxPitchHz);
  const maxLag = Math.min(
    Math.floor(sampleRate / minPitchHz),
    pitchFrameSize - 1,
  );
  let bestLag = 0;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    let energyA = 0;
    let energyB = 0;

    for (let index = 0; index < pitchFrameSize - lag; index += 1) {
      const sampleA = samples[frameStart + index] ?? 0;
      const sampleB = samples[frameStart + index + lag] ?? 0;
      correlation += sampleA * sampleB;
      energyA += sampleA * sampleA;
      energyB += sampleB * sampleB;
    }

    const normalizedCorrelation =
      energyA > 0 && energyB > 0
        ? correlation / Math.sqrt(energyA * energyB)
        : 0;

    if (normalizedCorrelation > bestCorrelation) {
      bestCorrelation = normalizedCorrelation;
      bestLag = lag;
    }
  }

  if (bestLag === 0) {
    return null;
  }

  const frequency = sampleRate / bestLag;
  if (!isValidDiagnosticVoicedFrame(frequency, bestCorrelation)) {
    return null;
  }

  return frequency;
}

function extractResearchPitchDiagnostics(
  audioBuffer: AudioBuffer,
): PitchDiagnosticMetadata {
  if (audioBuffer.length < pitchFrameSize) {
    return {
      analyzedDurationSeconds: audioBuffer.duration,
      frameCount: 0,
      voicedFrameCount: 0,
      unvoicedFrameCount: 0,
      frequencyMinHz: null,
      frequencyMedianHz: null,
      frequencyMaxHz: null,
      statusText: "解码后的音频短于一个研究音高帧；没有分析诊断帧。",
      diagnosticFrames: [],
      noteLikeSegments: [],
      researchTargetPitchCurve:
        convertNoteLikeSegmentsToResearchTargetPitchCurveDiagnostic([]),
    };
  }

  const channelData = audioBuffer.getChannelData(0);
  const frameFrequencies: Array<number | null> = [];
  let frameCount = 0;

  for (
    let frameStart = 0;
    frameStart + pitchFrameSize <= channelData.length;
    frameStart += pitchHopSize
  ) {
    frameCount += 1;
    const frequency = estimateResearchFrameFrequency(
      channelData,
      audioBuffer.sampleRate,
      frameStart,
    );

    frameFrequencies.push(frequency);
  }

  const smoothedFrequencies = smoothDiagnosticFrequencies(frameFrequencies);
  const diagnosticFrames = smoothedFrequencies.map((frequencyHz, index) => ({
    timeSeconds: (index * pitchHopSize) / audioBuffer.sampleRate,
    frequencyHz,
  }));
  const validFrequencySummary = summarizeDiagnosticFrequencies(
    smoothedFrequencies.filter(
      (frequency): frequency is number => frequency !== null,
    ),
  );
  const voicedFrameCount = smoothedFrequencies.filter(
    (frequency) => frequency !== null,
  ).length;
  const unvoicedFrameCount = frameCount - voicedFrameCount;
  const noteLikeSegments = deriveNoteLikeSegmentDiagnostics(diagnosticFrames);
  const researchTargetPitchCurve =
    convertNoteLikeSegmentsToResearchTargetPitchCurveDiagnostic(
      noteLikeSegments,
    );

  return {
    analyzedDurationSeconds: audioBuffer.duration,
    frameCount,
    voicedFrameCount,
    unvoicedFrameCount,
    frequencyMinHz: validFrequencySummary.frequencyMinHz,
    frequencyMedianHz: validFrequencySummary.frequencyMedianHz,
    frequencyMaxHz: validFrequencySummary.frequencyMaxHz,
    statusText:
      voicedFrameCount > 0
        ? "已从解码后的 WAV 缓冲区本地提取研究音高帧。"
        : "这个本地研究探针没有找到有声诊断音高帧。",
    diagnosticFrames,
    noteLikeSegments,
    researchTargetPitchCurve,
  };
}

function getRejectedReason(file: File) {
  const hasWavExtension = file.name.toLowerCase().endsWith(".wav");
  const hasKnownWavMimeType = file.type ? wavMimeTypes.has(file.type) : false;

  if (!hasWavExtension) {
    return "此研究工具只接受 .wav 文件。未解码、播放、上传、分析音频，也未发送到练习页。";
  }

  if (file.type && !hasKnownWavMimeType) {
    return "浏览器报告的文件类型不是 WAV，因此已在解码前拒绝。未解码、播放、上传、分析音频，也未发送到练习页。";
  }

  return null;
}

export default function LocalAudioDecodeFileInputShell() {
  const router = useRouter();
  const [decodeState, setDecodeState] = useState<DecodeState>("not-ready");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileSummary, setSelectedFileSummary] =
    useState<SelectedFileSummary | null>(null);
  const [rejectedReason, setRejectedReason] = useState<string | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [decodedMetadata, setDecodedMetadata] =
    useState<DecodedAudioMetadata | null>(null);
  const [pitchExtractionState, setPitchExtractionState] =
    useState<PitchExtractionState>("not-ready");
  const [pitchDiagnostics, setPitchDiagnostics] =
    useState<PitchDiagnosticMetadata | null>(null);
  const [pitchExtractionError, setPitchExtractionError] = useState<
    string | null
  >(null);
  const [copyDiagnosticJsonStatus, setCopyDiagnosticJsonStatus] = useState<
    string | null
  >(null);
  const [sendPreviewError, setSendPreviewError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const decodeRunIdRef = useRef(0);
  const pitchExtractionRunIdRef = useRef(0);
  const decodedAudioBufferRef = useRef<AudioBuffer | null>(null);

  const stateLabel = useMemo(() => {
    switch (decodeState) {
      case "ready-to-decode":
        return "可解码音频信息";
      case "decoding":
        return "正在解码音频信息";
      case "decoded-metadata":
        return "已解码音频信息";
      case "decode-error":
        return "解码失败";
      case "cleared":
        return "已清除 / 重置";
      case "not-ready":
      default:
        return "未准备好";
    }
  }, [decodeState]);

  const canDecode = selectedFile !== null && decodeState === "ready-to-decode";
  const canExtractPitch =
    decodedAudioBufferRef.current !== null &&
    pitchExtractionState === "ready-to-extract";
  const researchTargetPitchCurveDiagnosticJson = pitchDiagnostics
    ? JSON.stringify(pitchDiagnostics.researchTargetPitchCurve, null, 2)
    : "";

  function resetPitchExtractionResult() {
    pitchExtractionRunIdRef.current += 1;
    decodedAudioBufferRef.current = null;
    setPitchExtractionState("not-ready");
    setPitchDiagnostics(null);
    setPitchExtractionError(null);
    setCopyDiagnosticJsonStatus(null);
    setSendPreviewError(null);
  }

  function resetDecodeResult() {
    setDecodedMetadata(null);
    setDecodeError(null);
    resetPitchExtractionResult();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    decodeRunIdRef.current += 1;
    resetDecodeResult();

    if (!file) {
      setSelectedFile(null);
      setSelectedFileSummary(null);
      setRejectedReason(
        "未选择文件。页面仍未准备好；未解码、播放、上传、分析音频，也未发送到练习页。",
      );
      setDecodeState("not-ready");
      return;
    }

    const summary = summarizeFile(file);
    const reason = getRejectedReason(file);

    setSelectedFileSummary(summary);

    if (reason) {
      setSelectedFile(null);
      setRejectedReason(reason);
      setDecodeState("not-ready");
      return;
    }

    setSelectedFile(file);
    setRejectedReason(null);
    setDecodeState("ready-to-decode");
  }

  async function handleDecodeMetadata() {
    if (!canDecode || !selectedFile) {
      return;
    }

    const decodeRunId = decodeRunIdRef.current + 1;
    decodeRunIdRef.current = decodeRunId;

    let audioContext: AudioContext | null = null;
    setDecodeState("decoding");
    resetDecodeResult();

    try {
      const AudioContextConstructor = window.AudioContext;

      if (!AudioContextConstructor) {
        throw new Error("AudioContext is not available in this browser.");
      }

      const audioBytes = await selectedFile.arrayBuffer();
      audioContext = new AudioContextConstructor();
      const audioBuffer = await audioContext.decodeAudioData(audioBytes);

      if (decodeRunIdRef.current === decodeRunId) {
        decodedAudioBufferRef.current = audioBuffer;
        setDecodedMetadata({
          durationSeconds: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels,
          frameCount: audioBuffer.length,
        });
        setPitchExtractionState("ready-to-extract");
        setDecodeState("decoded-metadata");
      }
    } catch (error) {
      if (decodeRunIdRef.current === decodeRunId) {
        setDecodeError(
          error instanceof Error
            ? error.message
            : "此浏览器无法解码这个 WAV 文件。",
        );
        setDecodeState("decode-error");
      }
    } finally {
      if (audioContext && audioContext.state !== "closed") {
        try {
          await audioContext.close();
        } catch {
          // Best-effort cleanup only. The route still does not create playback nodes.
        }
      }
    }
  }

  async function handleExtractPitchFrames() {
    if (!canExtractPitch || !decodedAudioBufferRef.current) {
      return;
    }

    const pitchExtractionRunId = pitchExtractionRunIdRef.current + 1;
    pitchExtractionRunIdRef.current = pitchExtractionRunId;

    setPitchExtractionState("extracting");
    setPitchDiagnostics(null);
    setPitchExtractionError(null);
    setCopyDiagnosticJsonStatus(null);
    setSendPreviewError(null);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      const diagnostics = extractResearchPitchDiagnostics(
        decodedAudioBufferRef.current,
      );

      if (pitchExtractionRunIdRef.current === pitchExtractionRunId) {
        setPitchDiagnostics(diagnostics);
        setPitchExtractionState("extracted");
      }
    } catch (error) {
      if (pitchExtractionRunIdRef.current === pitchExtractionRunId) {
        setPitchExtractionError(
          error instanceof Error ? error.message : "研究音高诊断探针运行失败。",
        );
        setPitchExtractionState("extract-error");
      }
    }
  }

  async function handleCopyDiagnosticJson() {
    if (!researchTargetPitchCurveDiagnosticJson) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        researchTargetPitchCurveDiagnosticJson,
      );
      setCopyDiagnosticJsonStatus("已复制诊断 JSON。");
    } catch {
      setCopyDiagnosticJsonStatus("复制失败。请手动复制。");
    }
  }

  function handleSendDiagnosticPreviewToPractice() {
    if (!pitchDiagnostics) {
      return;
    }

    try {
      window.sessionStorage.setItem(
        practiceResearchTargetCurveDiagnosticPreviewKey,
        JSON.stringify(pitchDiagnostics.researchTargetPitchCurve),
      );
      setSendPreviewError(null);
      router.push("/practice");
    } catch {
      setSendPreviewError("发送失败。你仍然可以使用下方的诊断 JSON 手动复制。");
    }
  }

  function handleClear() {
    decodeRunIdRef.current += 1;
    setSelectedFile(null);
    setSelectedFileSummary(null);
    setRejectedReason(null);
    resetDecodeResult();
    setDecodeState("cleared");
    setInputKey((currentKey) => currentKey + 1);
  }

  return (
    <section className="rounded-3xl border border-emerald-300/30 bg-emerald-300/10 p-6">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
            本地音频研究工具
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            选择本地 WAV 文件
          </h2>
          <p className="mt-3 leading-7 text-emerald-50/90">
            请选择一个本地 WAV
            文件。只有点击「解码音频信息」后，浏览器才会在本地读取并解码；只有解码成功后，才能点击「提取音高帧」运行研究诊断。仅在本浏览器中处理，不上传。
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200/20 bg-slate-950/60 p-4 text-sm leading-6 text-emerald-50/90">
          请选择你自己创建或有权使用的本地 WAV
          文件。此页面是研究预览，不是正式旋律识别；不上传音频，不调用
          API，不写入账号或数据库。
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-100">
          WAV 文件
          <input
            key={inputKey}
            type="file"
            accept=".wav,audio/wav,audio/wave,audio/x-wav,audio/vnd.wave"
            onChange={handleFileChange}
            className="block w-full rounded-2xl border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-slate-100 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-300 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:border-emerald-300"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDecodeMetadata}
            disabled={!canDecode}
            className="rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            解码音频信息
          </button>
          <button
            type="button"
            onClick={handleExtractPitchFrames}
            disabled={!canExtractPitch}
            className="rounded-2xl bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            提取音高帧
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-2xl border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-emerald-300 hover:text-emerald-100"
          >
            清除选择
          </button>
        </div>

        <div className="rounded-2xl bg-slate-900 p-4">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            解码状态
          </p>
          <p className="mt-2 text-lg font-semibold text-white">{stateLabel}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            只选择文件不会读取音频字节，也不会创建 AudioContext。只有接受 WAV
            文件并点击「解码音频信息」后才会本地解码。
          </p>
        </div>

        {selectedFileSummary ? (
          <div className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-200">
            <p className="font-semibold text-white">已选择的浏览器文件信息</p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">名称</dt>
                <dd className="break-all">{selectedFileSummary.name}</dd>
              </div>
              <div>
                <dt className="text-slate-400">大小</dt>
                <dd>{formatBytes(selectedFileSummary.size)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">MIME 类型</dt>
                <dd>{selectedFileSummary.type || "Not reported by browser"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">最后修改时间</dt>
                <dd>
                  {new Date(selectedFileSummary.lastModified).toLocaleString()}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-emerald-100">
              当前只是选择文件。点击「解码音频信息」前不会解码；不会播放、上传、做正式练习目标转换，也不会自动发送到练习页。
            </p>
          </div>
        ) : null}

        {decodedMetadata ? (
          <div className="rounded-2xl border border-emerald-300/30 bg-slate-900 p-4 text-sm text-slate-200">
            <p className="font-semibold text-white">仅解码音频信息</p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">时长（秒）</dt>
                <dd>{decodedMetadata.durationSeconds.toFixed(3)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">采样率</dt>
                <dd>{decodedMetadata.sampleRate} Hz</dd>
              </div>
              <div>
                <dt className="text-slate-400">声道数</dt>
                <dd>{decodedMetadata.numberOfChannels}</dd>
              </div>
              <div>
                <dt className="text-slate-400">帧数 / 长度</dt>
                <dd>{decodedMetadata.frameCount}</dd>
              </div>
            </dl>
            <p className="mt-3 text-emerald-100">
              解码后的 AudioBuffer
              仅用于展示音频信息。页面不会创建播放节点，不连接音频输出；只有点击「提取音高帧」后才会做研究诊断。
            </p>
          </div>
        ) : null}

        <div className="rounded-2xl bg-slate-900 p-4 text-sm leading-6 text-slate-300">
          <p className="font-semibold text-white">音高帧诊断开关</p>
          <p className="mt-2">
            解码成功前不能提取音高帧。解码本身不会提取音高；只有点击「提取音高帧」后才读取已解码的通道数据。输出只是研究诊断数据，不是评分，不是正式练习目标。
          </p>
        </div>

        {pitchDiagnostics ? (
          <div className="rounded-2xl border border-sky-300/30 bg-slate-900 p-4 text-sm text-slate-200">
            <p className="font-semibold text-white">音高帧诊断</p>
            <p className="mt-2 leading-6 text-sky-100">
              这些数值汇总了解码 WAV
              帧的本地研究诊断。它们不是正式评分，不是正式旋律识别，也不是正式练习结果。
            </p>
            <div className="mt-3 rounded-2xl border border-sky-200/20 bg-slate-950/60 p-3 leading-6 text-sky-50/90">
              本地研究诊断：不上传、不使用云端、不调用 AI
              API、不是旋律识别、不是评分、不是正式练习目标，也不是 APK-ready。
            </div>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">分析时长</dt>
                <dd>{pitchDiagnostics.analyzedDurationSeconds.toFixed(3)} s</dd>
                <dd className="text-xs text-slate-500">
                  Decoded duration inspected for research diagnostics.
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">分析帧数</dt>
                <dd>{pitchDiagnostics.frameCount}</dd>
                <dd className="text-xs text-slate-500">
                  Number of diagnostic frames inspected.
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">有声诊断帧</dt>
                <dd>{pitchDiagnostics.voicedFrameCount}</dd>
                <dd className="text-xs text-slate-500">
                  Frames where the diagnostic extractor found a pitch-like
                  signal.
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">无声诊断帧</dt>
                <dd>{pitchDiagnostics.unvoicedFrameCount}</dd>
                <dd className="text-xs text-slate-500">
                  Frames where no pitch-like signal was detected.
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">频率摘要</dt>
                <dd>
                  {pitchDiagnostics.frequencyMinHz === null
                    ? "暂无"
                    : `${pitchDiagnostics.frequencyMinHz.toFixed(1)} Hz`}
                </dd>
                <dd className="text-xs text-slate-500">
                  Min / median / max frequency estimates across voiced
                  diagnostic frames.
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">中位频率估计</dt>
                <dd>
                  {pitchDiagnostics.frequencyMedianHz === null
                    ? "暂无"
                    : `${pitchDiagnostics.frequencyMedianHz.toFixed(1)} Hz`}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">最高频率估计</dt>
                <dd>
                  {pitchDiagnostics.frequencyMaxHz === null
                    ? "暂无"
                    : `${pitchDiagnostics.frequencyMaxHz.toFixed(1)} Hz`}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-sky-100">
              {pitchDiagnostics.statusText}{" "}
              这是研究预览，不是正式评分，不是正式练习目标，不替换当前练习旋律。
            </p>

            <div className="mt-4 rounded-2xl border border-amber-200/20 bg-slate-950/60 p-3 leading-6 text-amber-50/90">
              <p className="font-semibold text-white">类音符片段诊断</p>
              <p className="mt-2">
                研究预览。不是正式音符识别，不是正式旋律识别，不参与评分；这里只把当前提取的音高帧分组为便于查看的诊断片段。
              </p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-slate-400">片段数量</dt>
                  <dd>{pitchDiagnostics.noteLikeSegments.length}</dd>
                </div>
              </dl>
              {pitchDiagnostics.noteLikeSegments.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {pitchDiagnostics.noteLikeSegments.map((segment, index) => (
                    <div
                      key={`${segment.startTimeSeconds}-${segment.endTimeSeconds}-${index}`}
                      className="rounded-xl border border-amber-200/10 bg-slate-900/80 p-3"
                    >
                      <p className="font-semibold text-amber-100">
                        片段 {index + 1}
                      </p>
                      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div>
                          <dt className="text-slate-400">开始 / 结束</dt>
                          <dd>
                            {segment.startTimeSeconds.toFixed(3)} s /{" "}
                            {segment.endTimeSeconds.toFixed(3)} s
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">时长</dt>
                          <dd>{segment.durationSeconds.toFixed(3)} s</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">代表频率</dt>
                          <dd>
                            {segment.representativeFrequencyHz.toFixed(1)} Hz
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">最近音名标签</dt>
                          <dd>{segment.nearestNoteName ?? "暂无"}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">有声帧数量</dt>
                          <dd>{segment.voicedFrameCount}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">桥接空帧数量</dt>
                          <dd>{segment.bridgedNullFrameCount}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">诊断置信度</dt>
                          <dd>{segment.diagnosticConfidence}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-amber-100">
                  当前提取的音高帧没有可用的类音符片段诊断。
                </p>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-fuchsia-200/20 bg-slate-950/60 p-3 leading-6 text-fuchsia-50/90">
              <p className="font-semibold text-white">研究用目标音高曲线诊断</p>
              <p className="mt-2">
                研究预览。不是正式目标音高曲线生成，不是正式练习页集成，不参与评分；这里只把当前类音符片段转换为便于查看的研究对象。
              </p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-slate-400">曲线来源</dt>
                  <dd>{pitchDiagnostics.researchTargetPitchCurve.source}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">片段数量</dt>
                  <dd>
                    {
                      pitchDiagnostics.researchTargetPitchCurve.summary
                        .segmentCount
                    }
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">总时长</dt>
                  <dd>
                    {pitchDiagnostics.researchTargetPitchCurve.summary.totalDurationSeconds.toFixed(
                      3,
                    )}{" "}
                    s
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">低诊断置信度片段数量</dt>
                  <dd>
                    {
                      pitchDiagnostics.researchTargetPitchCurve.summary
                        .lowConfidenceSegmentCount
                    }
                  </dd>
                </div>
              </dl>

              <div className="mt-4 rounded-2xl border border-fuchsia-200/20 bg-slate-950/60 p-3 leading-6 text-fuchsia-50/90">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">
                      诊断 JSON（开发/调试备用入口）
                    </p>
                    <p className="mt-2">
                      主流程请点击「发送到练习页预览」。下方复制 / 粘贴 JSON
                      仅作为开发/调试备用入口；不上传音频，不写入服务器，不参与评分，也不是正式练习目标。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendDiagnosticPreviewToPractice}
                    className="rounded-2xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-200"
                  >
                    发送到练习页预览
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyDiagnosticJson}
                    disabled={!researchTargetPitchCurveDiagnosticJson}
                    className="rounded-2xl bg-fuchsia-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-fuchsia-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    复制诊断 JSON（开发/调试）
                  </button>
                </div>
                {sendPreviewError ? (
                  <p className="mt-3 font-semibold text-amber-100">
                    {sendPreviewError}
                  </p>
                ) : null}
                {copyDiagnosticJsonStatus ? (
                  <p className="mt-3 font-semibold text-fuchsia-100">
                    {copyDiagnosticJsonStatus}
                  </p>
                ) : null}
                <label className="mt-3 flex flex-col gap-2 text-sm font-medium text-fuchsia-100">
                  诊断 JSON
                  <textarea
                    readOnly
                    value={researchTargetPitchCurveDiagnosticJson}
                    rows={10}
                    className="w-full rounded-xl border border-fuchsia-200/20 bg-slate-950 p-3 font-mono text-xs text-fuchsia-50"
                  />
                </label>
              </div>

              {pitchDiagnostics.researchTargetPitchCurve.segments.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {pitchDiagnostics.researchTargetPitchCurve.segments.map(
                    (segment) => (
                      <div
                        key={`${segment.segmentIndex}-${segment.startTimeSeconds}-${segment.endTimeSeconds}`}
                        className="rounded-xl border border-fuchsia-200/10 bg-slate-900/80 p-3"
                      >
                        <p className="font-semibold text-fuchsia-100">
                          曲线片段 {segment.segmentIndex}
                        </p>
                        <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div>
                            <dt className="text-slate-400">开始 / 结束</dt>
                            <dd>
                              {segment.startTimeSeconds.toFixed(3)} s /{" "}
                              {segment.endTimeSeconds.toFixed(3)} s
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">时长</dt>
                            <dd>{segment.durationSeconds.toFixed(3)} s</dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">目标频率</dt>
                            <dd>{segment.targetFrequencyHz.toFixed(1)} Hz</dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">诊断目标音标签</dt>
                            <dd>{segment.targetNoteLabel ?? "暂无"}</dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">诊断置信度</dt>
                            <dd>{segment.diagnosticConfidence}</dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">来源帧数量</dt>
                            <dd>{segment.sourceFrameCount}</dd>
                          </div>
                          <div>
                            <dt className="text-slate-400">桥接空帧数量</dt>
                            <dd>{segment.bridgedNullFrameCount}</dd>
                          </div>
                        </dl>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="mt-3 text-fuchsia-100">
                  当前类音符片段没有可用的研究目标音高曲线诊断。
                </p>
              )}
            </div>
          </div>
        ) : null}

        {pitchExtractionError ? (
          <div className="rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4 text-sm leading-6 text-rose-50">
            音高帧提取失败。未播放或上传音频，未生成正式练习目标，未参与评分，也未发送到练习页。浏览器信息：
            {pitchExtractionError}
          </div>
        ) : null}

        {rejectedReason ? (
          <div className="rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4 text-sm leading-6 text-rose-50">
            {rejectedReason}
          </div>
        ) : null}

        {decodeError ? (
          <div className="rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4 text-sm leading-6 text-rose-50">
            解码失败。未播放或上传音频，未做波形分析，未提取音高，未生成正式练习目标，也未发送到练习页。浏览器信息：
            {decodeError}
          </div>
        ) : null}
      </div>
    </section>
  );
}
