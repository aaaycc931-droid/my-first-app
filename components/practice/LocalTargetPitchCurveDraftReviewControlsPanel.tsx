import type {
  LocalTargetPitchCurveDraftReviewMode,
  LocalTargetPitchCurveDraftReviewSelection,
  LocalTargetPitchCurveDraftSelectedDiagnostics,
} from "../../lib/practice/localTargetPitchCurveDraftReviewControls";

type Props = {
  selection: LocalTargetPitchCurveDraftReviewSelection;
  diagnostics: LocalTargetPitchCurveDraftSelectedDiagnostics;
  hasDraft: boolean;
  onUseFullDraft: () => void;
  onUseVoicedSpan: () => void;
  onUseManualFrameRange: () => void;
  onManualStartFrameChange: (frameIndex: number) => void;
  onManualEndFrameChange: (frameIndex: number) => void;
  onReset: () => void;
};

const modeLabels: Record<LocalTargetPitchCurveDraftReviewMode, string> = {
  "full-draft": "Full draft",
  "voiced-span": "Voiced span",
  "manual-frame-range": "Manual frame range",
};

const formatFrequency = (frequencyHz: number | null) =>
  frequencyHz === null ? "—" : `${frequencyHz.toFixed(1)} Hz`;
const formatCoverage = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;
const formatFrame = (frameIndex: number | null) => frameIndex === null ? "—" : String(frameIndex);

export function LocalTargetPitchCurveDraftReviewControlsPanel({
  selection,
  diagnostics,
  hasDraft,
  onUseFullDraft,
  onUseVoicedSpan,
  onUseManualFrameRange,
  onManualStartFrameChange,
  onManualEndFrameChange,
  onReset,
}: Props) {
  return (
    <section className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">P39 minimal review controls</p>
          <h2 className="mt-1 text-2xl font-bold text-violet-950">Local Target Pitch Curve Draft Review Controls</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-violet-900">
            This is a review preview only. Review is required before practice integration. It is not a final target, not an official transcription, and not a score. Confidence and coverage are diagnostic only. Browser-local and session-only: no upload, no cloud, no account, and no database.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
          <span className="rounded-full bg-white px-3 py-2 text-violet-800 ring-1 ring-violet-200">draftOnly: {String(diagnostics.draftOnly)}</span>
          <span className="rounded-full bg-white px-3 py-2 text-violet-800 ring-1 ring-violet-200">needsReview: {String(diagnostics.needsReview)}</span>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-violet-200 bg-white p-4">
        <p className="text-sm font-bold text-violet-950">Current review mode: {modeLabels[selection.mode]}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onUseFullDraft} disabled={!hasDraft} className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Use full draft</button>
          <button type="button" onClick={onUseVoicedSpan} disabled={!hasDraft} className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Use voiced span</button>
          <button type="button" onClick={onUseManualFrameRange} disabled={!hasDraft} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-800 ring-1 ring-violet-300 disabled:cursor-not-allowed disabled:text-slate-400 disabled:ring-slate-200">Use manual frame range</button>
          <button type="button" onClick={onReset} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-800 ring-1 ring-violet-300">Reset review controls</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-violet-950">
            Manual start frame
            <input type="number" value={selection.manualStartFrame} onChange={(event) => onManualStartFrameChange(Number(event.target.value))} disabled={!hasDraft} className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2 text-violet-950 disabled:bg-slate-100" />
          </label>
          <label className="text-sm font-semibold text-violet-950">
            Manual end frame
            <input type="number" value={selection.manualEndFrame} onChange={(event) => onManualEndFrameChange(Number(event.target.value))} disabled={!hasDraft} className="mt-1 w-full rounded-xl border border-violet-200 px-3 py-2 text-violet-950 disabled:bg-slate-100" />
          </label>
        </div>
        <p className="mt-3 text-xs leading-5 text-violet-700">
          Requested manual boundary: frame {selection.manualStartFrame} → {selection.manualEndFrame}. Applied boundary after helper validation: frame {formatFrame(diagnostics.selectedStartFrame)} → {formatFrame(diagnostics.selectedEndFrame)}.
        </p>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200"><p className="font-semibold text-violet-950">Selected frames</p><p className="mt-2 text-violet-800">{diagnostics.selectedFrameCount}</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200"><p className="font-semibold text-violet-950">Selected voiced frames</p><p className="mt-2 text-violet-800">{diagnostics.selectedVoicedFrameCount}</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200"><p className="font-semibold text-violet-950">Selected voiced coverage</p><p className="mt-2 text-violet-800">{formatCoverage(diagnostics.selectedVoicedCoverageRatio)}</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200"><p className="font-semibold text-violet-950">Selected duration</p><p className="mt-2 text-violet-800">{diagnostics.selectedDurationMs.toFixed(0)} ms</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200"><p className="font-semibold text-violet-950">Boundary frames</p><p className="mt-2 text-violet-800">{formatFrame(diagnostics.selectedStartFrame)} → {formatFrame(diagnostics.selectedEndFrame)}</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200"><p className="font-semibold text-violet-950">First / last voiced frame</p><p className="mt-2 text-violet-800">{formatFrame(diagnostics.selectedFirstVoicedFrame)} / {formatFrame(diagnostics.selectedLastVoicedFrame)}</p></div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-violet-200 lg:col-span-2"><p className="font-semibold text-violet-950">Selected frequency min / median / max</p><p className="mt-2 text-violet-800">{formatFrequency(diagnostics.selectedFrequencyMinHz)} · {formatFrequency(diagnostics.selectedFrequencyMedianHz)} · {formatFrequency(diagnostics.selectedFrequencyMaxHz)}</p></div>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <p className="font-bold text-amber-900">Warnings and boundary copy</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
          {diagnostics.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
      </div>
    </section>
  );
}
