import type { LocalTargetPitchCurveDraft } from "../../lib/practice/localTargetPitchCurveDraft";

type LocalTargetPitchCurveDraftPanelProps = {
  draft: LocalTargetPitchCurveDraft | null;
  isAnalysisReady: boolean;
  onGenerate: () => void;
  disabled?: boolean;
};

const formatFrequency = (frequencyHz: number | null) =>
  frequencyHz === null ? "—" : `${frequencyHz.toFixed(1)} Hz`;

export function LocalTargetPitchCurveDraftPanel({
  draft,
  isAnalysisReady,
  onGenerate,
  disabled = false,
}: LocalTargetPitchCurveDraftPanelProps) {
  const statusLabel = draft?.status ?? (isAnalysisReady ? "ready" : "waiting for decoded guide");

  return (
    <section className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">
            P37 browser-local draft foundation
          </p>
          <h2 className="mt-1 text-2xl font-bold text-violet-950">
            Local Target Pitch Curve Draft
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-violet-900">
            Generate a diagnostic, estimated target pitch curve draft from the decoded local melody guide audio. This uses session-only channel data in this browser and does not create a final target, official transcription, score, grade, pass/fail result, or accuracy percentage.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled || !isAnalysisReady}
          className="rounded-full bg-violet-700 px-5 py-3 text-sm font-bold text-white shadow-sm disabled:bg-slate-300 disabled:text-slate-600"
        >
          Generate target pitch curve draft
        </button>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200">
          <p className="font-semibold text-violet-950">Status</p>
          <p className="mt-2 text-violet-800">{statusLabel}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200">
          <p className="font-semibold text-violet-950">Frames</p>
          <p className="mt-2 text-violet-800">{draft ? `${draft.frameCount} total` : "—"}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200">
          <p className="font-semibold text-violet-950">Voiced / unvoiced</p>
          <p className="mt-2 text-violet-800">{draft ? `${draft.voicedFrameCount} / ${draft.unvoicedFrameCount}` : "—"}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200">
          <p className="font-semibold text-violet-950">Duration</p>
          <p className="mt-2 text-violet-800">{draft ? `${(draft.durationMs / 1000).toFixed(2)}s` : "—"}</p>
        </div>
      </div>

      {draft ? (
        <div className="mt-5 grid gap-3 text-sm lg:grid-cols-2">
          <div className="rounded-2xl border border-violet-200 bg-white p-4">
            <p className="font-bold text-violet-950">Frequency summary</p>
            <p className="mt-2 text-violet-800">
              Min {formatFrequency(draft.frequencyMinHz)} · Median {formatFrequency(draft.frequencyMedianHz)} · Max {formatFrequency(draft.frequencyMaxHz)}
            </p>
            <p className="mt-3 font-semibold text-violet-950">First draft frames</p>
            <ul className="mt-2 space-y-1 text-violet-800">
              {draft.frames.slice(0, 5).map((frame) => (
                <li key={frame.frameIndex}>
                  #{frame.frameIndex} · {frame.timeMs.toFixed(0)}ms · {frame.voiced && frame.frequencyHz ? `${frame.frequencyHz.toFixed(1)} Hz` : "unvoiced"} · confidence {frame.confidence.toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-bold text-amber-900">Draft warnings / limitations</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
              {draft.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-violet-200 bg-white p-4 text-sm text-violet-900">
        <p className="font-bold text-violet-950">P37 boundaries</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Browser-local only; no upload and no cloud processing.</li>
          <li>Uses session-only decoded PCM/channel data; it is not saved to localStorage, IndexedDB, account, database, or private storage.</li>
          <li>Draft only, estimated, diagnostic, and needs review before formal scoring.</li>
          <li>Not scoring, not final target, and not official transcription.</li>
          <li>Best for clean vocal guide, humming, or a single melody instrument.</li>
          <li>Full mixed songs are deferred to future private cloud song analysis; no source separation or full-song vocal melody extraction in P37.</li>
          <li>P38 may add review/correction or safe practice integration, but this panel does not connect the draft to imported target practice flow.</li>
        </ul>
      </div>
    </section>
  );
}
