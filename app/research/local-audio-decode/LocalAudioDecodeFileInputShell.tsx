"use client";

import { ChangeEvent, useMemo, useState } from "react";

type FileSelectionState =
  | "idle"
  | "selected"
  | "rejected"
  | "ready-to-decode-later"
  | "cleared";

type SelectedFileSummary = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
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
  const [selectionState, setSelectionState] =
    useState<FileSelectionState>("idle");
  const [selectedFile, setSelectedFile] = useState<SelectedFileSummary | null>(
    null,
  );
  const [rejectedReason, setRejectedReason] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  const stateLabel = useMemo(() => {
    switch (selectionState) {
      case "selected":
        return "Selected locally only";
      case "rejected":
        return "Rejected before decoding";
      case "ready-to-decode-later":
        return "Ready for a future decode step";
      case "cleared":
        return "Cleared / reset";
      case "idle":
      default:
        return "Idle";
    }
  }, [selectionState]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      setRejectedReason(
        "No file was selected. The page remains idle, and no audio was decoded, played, uploaded, analyzed, or sent to Practice Mode.",
      );
      setSelectionState("rejected");
      return;
    }

    const summary = summarizeFile(file);
    const reason = getRejectedReason(file);

    setSelectedFile(summary);

    if (reason) {
      setRejectedReason(reason);
      setSelectionState("rejected");
      return;
    }

    setRejectedReason(null);
    setSelectionState("ready-to-decode-later");
  }

  function handleClear() {
    setSelectedFile(null);
    setRejectedReason(null);
    setSelectionState("cleared");
    setInputKey((currentKey) => currentKey + 1);
  }

  return (
    <section className="rounded-3xl border border-emerald-300/30 bg-emerald-300/10 p-6">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
            WAV-first local selection shell
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Select one local WAV file
          </h2>
          <p className="mt-3 leading-7 text-emerald-50/90">
            This control only records the browser file metadata shown below. It
            does not upload, decode, play, inspect audio bytes, track pitch, or
            generate a TargetPitchCurve.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200/20 bg-slate-950/60 p-4 text-sm leading-6 text-emerald-50/90">
          Select only a local WAV file that you created or have rights to use.
          This research route is local selection only: no upload, no decoding
          yet, no playback yet, no pitch tracking yet, no TargetPitchCurve
          generation yet, not connected to Practice Mode, and not APK-ready.
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

        <div className="rounded-2xl bg-slate-900 p-4">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            State
          </p>
          <p className="mt-2 text-lg font-semibold text-white">{stateLabel}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            File selection alone is not decoding. Accepted files are only marked
            as ready for a future explicit decode step.
          </p>
        </div>

        {selectedFile ? (
          <div className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-200">
            <p className="font-semibold text-white">
              Selected browser file metadata
            </p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">Name</dt>
                <dd className="break-all">{selectedFile.name}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Size</dt>
                <dd>{formatBytes(selectedFile.size)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">MIME type</dt>
                <dd>{selectedFile.type || "Not reported by browser"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Last modified</dt>
                <dd>{new Date(selectedFile.lastModified).toLocaleString()}</dd>
              </div>
            </dl>
            <p className="mt-3 text-emerald-100">
              This file has only been selected. It has not been decoded,
              played, uploaded, analyzed, pitch-tracked, converted to a
              TargetPitchCurve, or sent to Practice Mode.
            </p>
          </div>
        ) : null}

        {rejectedReason ? (
          <div className="rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4 text-sm leading-6 text-rose-50">
            {rejectedReason}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleClear}
          className="w-fit rounded-2xl border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-emerald-300 hover:text-emerald-100"
        >
          Clear selection
        </button>
      </div>
    </section>
  );
}
