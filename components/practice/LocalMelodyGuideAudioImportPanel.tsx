import type { ChangeEvent, Ref } from "react";

import {
  localMelodyGuideBestSourceCopy,
  localMelodyGuideBrowserDecodeSupportCopy,
  localMelodyGuideLocalOnlyCopy,
  type LocalMelodyGuideAudioSource,
} from "../../lib/practice/localMelodyGuideAudio";

type LocalMelodyGuideAudioImportPanelProps = {
  source: LocalMelodyGuideAudioSource | null;
  decodeError: string;
  inputRef: Ref<HTMLInputElement>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
};

export function LocalMelodyGuideAudioImportPanel({
  source,
  decodeError,
  inputRef,
  onFileChange,
  onClear,
}: LocalMelodyGuideAudioImportPanelProps) {
  return (
    <section className="mt-6 rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">
            P36 browser-local foundation
          </p>
          <h2 className="mt-1 text-2xl font-bold text-cyan-950">
            Local Melody Guide Audio Import
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-900">
            Select a local audio file to use as the melody guide source for future target pitch curve drafting. {localMelodyGuideBrowserDecodeSupportCopy}
          </p>
          <p className="mt-3 text-sm font-semibold text-cyan-900">
            {localMelodyGuideBestSourceCopy}
          </p>
        </div>
        <div className="rounded-2xl border border-cyan-200 bg-white p-4 text-sm text-cyan-950 shadow-sm lg:min-w-64">
          <p className="font-semibold">Browser decode status</p>
          <p className="mt-2 text-3xl font-bold">{source?.status ?? "idle"}</p>
          <p className="mt-1 font-medium">
            {source ? "Session-only melody guide source" : "No local guide selected"}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-200 bg-white p-4">
        <label className="block text-sm font-bold text-cyan-950">
          Choose local melody guide audio
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.wav,.mp3,.m4a"
            onChange={onFileChange}
            className="mt-3 block w-full rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClear}
            disabled={!source}
            className="rounded-full border border-cyan-300 bg-white px-4 py-2 text-sm font-semibold text-cyan-800 disabled:text-slate-400"
          >
            Clear / reset local guide
          </button>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
            Melody guide source only · not formal scoring
          </span>
        </div>
      </div>

      {source ? (
        <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-cyan-200">
            <p className="font-semibold text-cyan-950">Selected file</p>
            <p className="mt-2 break-words text-cyan-800">{source.fileName}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-cyan-200">
            <p className="font-semibold text-cyan-950">File metadata</p>
            <p className="mt-2 text-cyan-800">
              {source.fileType} · {source.fileSizeLabel}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-cyan-200">
            <p className="font-semibold text-cyan-950">Decoded metadata</p>
            <p className="mt-2 text-cyan-800">
              Duration {source.decodedDurationSeconds === null ? "—" : `${source.decodedDurationSeconds.toFixed(2)}s`} · Sample rate {source.sampleRate ?? "—"} Hz · Channels {source.channelCount ?? "—"}
            </p>
          </div>
        </div>
      ) : null}

      {decodeError ? (
        <p className="mt-3 text-sm font-semibold text-red-700">{decodeError}</p>
      ) : null}

      <div className="mt-5 grid gap-3 text-sm lg:grid-cols-2">
        <div className="rounded-2xl border border-cyan-200 bg-white p-4">
          <p className="font-bold text-cyan-950">MVP boundaries</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-cyan-900">
            {localMelodyGuideLocalOnlyCopy.map((item) => (
              <li key={item}>{item}</li>
            ))}
            <li>No private cloud song analysis in P36.</li>
            <li>No target pitch curve generation until P37.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900">Source guidance</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
            <li>{localMelodyGuideBestSourceCopy}</li>
            <li>Full mixed songs should wait for future private cloud song analysis.</li>
            <li>Audio stays in browser for this MVP.</li>
          </ul>
        </div>
      </div>

      {source?.warnings.length ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4 text-sm">
          <p className="font-bold text-amber-900">Warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
            {source.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
