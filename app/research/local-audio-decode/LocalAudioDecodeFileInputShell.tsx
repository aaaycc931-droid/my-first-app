"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

import {
  DIAGNOSTIC_MAX_FREQUENCY_HZ,
  DIAGNOSTIC_MIN_FREQUENCY_HZ,
  isValidDiagnosticFrequencyEstimate,
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
};

const pitchFrameSize = 2048;
const pitchHopSize = 1024;
const minPitchHz = DIAGNOSTIC_MIN_FREQUENCY_HZ;
const maxPitchHz = DIAGNOSTIC_MAX_FREQUENCY_HZ;
const minAutocorrelationClarity = 0.62;

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

  if (bestLag === 0 || bestCorrelation < minAutocorrelationClarity) {
    return null;
  }

  const frequency = sampleRate / bestLag;
  if (!isValidDiagnosticFrequencyEstimate(frequency)) {
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
      statusText:
        "Decoded audio is shorter than one research pitch frame; no diagnostic frames were analyzed.",
    };
  }

  const channelData = audioBuffer.getChannelData(0);
  const frequencies: number[] = [];
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

    if (frequency !== null) {
      frequencies.push(frequency);
    }
  }

  const validFrequencySummary = summarizeDiagnosticFrequencies(frequencies);
  const voicedFrameCount = frequencies.length;
  const unvoicedFrameCount = frameCount - voicedFrameCount;

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
        ? "Exploratory diagnostic pitch frames were extracted locally from the decoded WAV buffer."
        : "No voiced diagnostic pitch frames were found by this exploratory local probe.",
  };
}

function getRejectedReason(file: File) {
  const hasWavExtension = file.name.toLowerCase().endsWith(".wav");
  const hasKnownWavMimeType = file.type ? wavMimeTypes.has(file.type) : false;

  if (!hasWavExtension) {
    return "Only .wav files are accepted in this research shell. No audio was decoded, played, uploaded, analyzed, or sent to Practice Mode.";
  }

  if (file.type && !hasKnownWavMimeType) {
    return "The browser reported a non-WAV MIME type for this file, so it was rejected before decoding. No audio was decoded, played, uploaded, analyzed, or sent to Practice Mode.";
  }

  return null;
}

export default function LocalAudioDecodeFileInputShell() {
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
  const [inputKey, setInputKey] = useState(0);
  const decodeRunIdRef = useRef(0);
  const pitchExtractionRunIdRef = useRef(0);
  const decodedAudioBufferRef = useRef<AudioBuffer | null>(null);

  const stateLabel = useMemo(() => {
    switch (decodeState) {
      case "ready-to-decode":
        return "Ready to decode metadata";
      case "decoding":
        return "Decoding metadata";
      case "decoded-metadata":
        return "Decoded metadata only";
      case "decode-error":
        return "Decode error";
      case "cleared":
        return "Cleared / reset";
      case "not-ready":
      default:
        return "Not ready";
    }
  }, [decodeState]);

  const canDecode = selectedFile !== null && decodeState === "ready-to-decode";
  const canExtractPitch =
    decodedAudioBufferRef.current !== null &&
    pitchExtractionState === "ready-to-extract";

  function resetPitchExtractionResult() {
    pitchExtractionRunIdRef.current += 1;
    decodedAudioBufferRef.current = null;
    setPitchExtractionState("not-ready");
    setPitchDiagnostics(null);
    setPitchExtractionError(null);
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
        "No file was selected. The page remains not-ready, and no audio was decoded, played, uploaded, analyzed, or sent to Practice Mode.",
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
            : "The browser could not decode this WAV file.",
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
          error instanceof Error
            ? error.message
            : "The exploratory pitch diagnostic probe failed.",
        );
        setPitchExtractionState("extract-error");
      }
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
            WAV-first local decode metadata POC
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Select one local WAV file
          </h2>
          <p className="mt-3 leading-7 text-emerald-50/90">
            This control keeps file selection separate from decoding. It only
            attempts browser decodeAudioData after you click Decode metadata,
            then shows decoded metadata. A separate Extract pitch frames button
            can run exploratory diagnostic pitch-frame extraction only after
            decode succeeds: no playback, waveform analysis UI, scoring, or
            TargetPitchCurve generation.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200/20 bg-slate-950/60 p-4 text-sm leading-6 text-emerald-50/90">
          Select only a local WAV file that you created or have rights to use.
          This research route is local-only: no upload, decode metadata only, no
          playback, no waveform analysis UI, exploratory diagnostic pitch
          metadata only after a separate click, no TargetPitchCurve generation,
          not connected to Practice Mode, and not APK-ready.
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-100">
          WAV file
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
            Decode metadata
          </button>
          <button
            type="button"
            onClick={handleExtractPitchFrames}
            disabled={!canExtractPitch}
            className="rounded-2xl bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            Extract pitch frames
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-2xl border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-emerald-300 hover:text-emerald-100"
          >
            Clear selection
          </button>
        </div>

        <div className="rounded-2xl bg-slate-900 p-4">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Decode state
          </p>
          <p className="mt-2 text-lg font-semibold text-white">{stateLabel}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            File selection alone does not read bytes, create AudioContext, or
            call decodeAudioData. Decode is available only for an accepted WAV
            file and only after pressing the separate Decode metadata button.
          </p>
        </div>

        {selectedFileSummary ? (
          <div className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-200">
            <p className="font-semibold text-white">
              Selected browser file metadata
            </p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">Name</dt>
                <dd className="break-all">{selectedFileSummary.name}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Size</dt>
                <dd>{formatBytes(selectedFileSummary.size)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">MIME type</dt>
                <dd>{selectedFileSummary.type || "Not reported by browser"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Last modified</dt>
                <dd>
                  {new Date(selectedFileSummary.lastModified).toLocaleString()}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-emerald-100">
              This file has only been selected. It has not been decoded until
              you press Decode metadata, and it is never played, uploaded,
              waveform-analyzed, pitch-tracked, converted to a TargetPitchCurve,
              or sent to Practice Mode.
            </p>
          </div>
        ) : null}

        {decodedMetadata ? (
          <div className="rounded-2xl border border-emerald-300/30 bg-slate-900 p-4 text-sm text-slate-200">
            <p className="font-semibold text-white">Decoded metadata only</p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">Duration seconds</dt>
                <dd>{decodedMetadata.durationSeconds.toFixed(3)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Sample rate</dt>
                <dd>{decodedMetadata.sampleRate} Hz</dd>
              </div>
              <div>
                <dt className="text-slate-400">Channels</dt>
                <dd>{decodedMetadata.numberOfChannels}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Frame count / length</dt>
                <dd>{decodedMetadata.frameCount}</dd>
              </div>
            </dl>
            <p className="mt-3 text-emerald-100">
              The decoded AudioBuffer was used only for metadata fields. This
              route creates no playback nodes, makes no audio destination
              connection, renders no waveform, does not extract pitch until the
              separate Extract pitch frames button is clicked, and generates no
              TargetPitchCurve.
            </p>
          </div>
        ) : null}

        <div className="rounded-2xl bg-slate-900 p-4 text-sm leading-6 text-slate-300">
          <p className="font-semibold text-white">
            Pitch-frame diagnostic gate
          </p>
          <p className="mt-2">
            Exploratory pitch extraction is disabled until decoded metadata
            exists. Decode alone does not extract pitch; extraction reads
            decoded channel data only after pressing Extract pitch frames.
            Output is diagnostic research metadata only, not a score, grade,
            pass/fail result, TargetPitchCurve, or Practice Mode input.
          </p>
        </div>

        {pitchDiagnostics ? (
          <div className="rounded-2xl border border-sky-300/30 bg-slate-900 p-4 text-sm text-slate-200">
            <p className="font-semibold text-white">
              Pitch frame diagnostics
            </p>
            <p className="mt-2 leading-6 text-sky-100">
              These values summarize local research diagnostics from decoded
              WAV frames. They are not a formal pitch score, melody
              transcription, or Practice Mode result. No TargetPitchCurve is
              generated from this output.
            </p>
            <div className="mt-3 rounded-2xl border border-sky-200/20 bg-slate-950/60 p-3 leading-6 text-sky-50/90">
              Local-only research diagnostics: no upload, no cloud, no AI API,
              no melody recognition, no scoring, no TargetPitchCurve
              generation, not Practice Mode, and not APK-ready.
            </div>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">Analyzed duration</dt>
                <dd>{pitchDiagnostics.analyzedDurationSeconds.toFixed(3)} s</dd>
                <dd className="text-xs text-slate-500">
                  Decoded duration inspected for research diagnostics.
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Analysis frames</dt>
                <dd>{pitchDiagnostics.frameCount}</dd>
                <dd className="text-xs text-slate-500">
                  Number of diagnostic frames inspected.
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Voiced diagnostic frames</dt>
                <dd>{pitchDiagnostics.voicedFrameCount}</dd>
                <dd className="text-xs text-slate-500">
                  Frames where the diagnostic extractor found a pitch-like
                  signal.
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Unvoiced diagnostic frames</dt>
                <dd>{pitchDiagnostics.unvoicedFrameCount}</dd>
                <dd className="text-xs text-slate-500">
                  Frames where no pitch-like signal was detected.
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Frequency summary</dt>
                <dd>
                  {pitchDiagnostics.frequencyMinHz === null
                    ? "Not available"
                    : `${pitchDiagnostics.frequencyMinHz.toFixed(1)} Hz`}
                </dd>
                <dd className="text-xs text-slate-500">
                  Min / median / max frequency estimates across voiced
                  diagnostic frames.
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Median frequency estimate</dt>
                <dd>
                  {pitchDiagnostics.frequencyMedianHz === null
                    ? "Not available"
                    : `${pitchDiagnostics.frequencyMedianHz.toFixed(1)} Hz`}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Max frequency estimate</dt>
                <dd>
                  {pitchDiagnostics.frequencyMaxHz === null
                    ? "Not available"
                    : `${pitchDiagnostics.frequencyMaxHz.toFixed(1)} Hz`}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-sky-100">
              {pitchDiagnostics.statusText} This is exploratory research data
              only and is not a score, grade, pass/fail assessment, product
              import result, TargetPitchCurve, or Practice Mode state.
            </p>
          </div>
        ) : null}

        {pitchExtractionError ? (
          <div className="rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4 text-sm leading-6 text-rose-50">
            Pitch-frame extraction failed. No audio was played, uploaded,
            converted to a TargetPitchCurve, scored, graded, assessed, or sent
            to Practice Mode. Browser message: {pitchExtractionError}
          </div>
        ) : null}

        {rejectedReason ? (
          <div className="rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4 text-sm leading-6 text-rose-50">
            {rejectedReason}
          </div>
        ) : null}

        {decodeError ? (
          <div className="rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4 text-sm leading-6 text-rose-50">
            Decode failed. No audio was played, uploaded, waveform-analyzed,
            pitch-tracked, converted to a TargetPitchCurve, or sent to Practice
            Mode. Browser message: {decodeError}
          </div>
        ) : null}
      </div>
    </section>
  );
}
