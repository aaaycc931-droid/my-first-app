"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

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
  const [inputKey, setInputKey] = useState(0);
  const decodeRunIdRef = useRef(0);

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

  function resetDecodeResult() {
    setDecodedMetadata(null);
    setDecodeError(null);
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
        setDecodedMetadata({
          durationSeconds: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels,
          frameCount: audioBuffer.length,
        });
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
            then shows decoded metadata only: no playback, waveform analysis,
            pitch tracking, or TargetPitchCurve generation.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200/20 bg-slate-950/60 p-4 text-sm leading-6 text-emerald-50/90">
          Select only a local WAV file that you created or have rights to use.
          This research route is local-only: no upload, decode metadata only,
          no playback, no waveform analysis, no pitch tracking, no
          TargetPitchCurve generation, not connected to Practice Mode, and not
          APK-ready.
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
              connection, renders no waveform, performs no pitch tracking, and
              generates no TargetPitchCurve.
            </p>
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
