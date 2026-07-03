import type { LocalTargetPitchCurveDraft } from "../../lib/practice/localTargetPitchCurveDraft";
import { createLocalTargetPitchCurveDraftReviewPreview } from "../../lib/practice/localTargetPitchCurveReview";

type LocalTargetPitchCurveReviewPreviewPanelProps = {
  draft: LocalTargetPitchCurveDraft | null;
};

const formatTime = (timeMs: number | null) =>
  timeMs === null ? "—" : `${timeMs.toFixed(0)} ms`;

const formatCoverage = (ratio: number) => `${(ratio * 100).toFixed(1)}% coverage`;

export function LocalTargetPitchCurveReviewPreviewPanel({
  draft,
}: LocalTargetPitchCurveReviewPreviewPanelProps) {
  const preview = createLocalTargetPitchCurveDraftReviewPreview(draft);

  return (
    <section className="mt-6 rounded-3xl border border-fuchsia-200 bg-fuchsia-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-fuchsia-700">
            P38 review preview foundation
          </p>
          <h2 className="mt-1 text-2xl font-bold text-fuchsia-950">
            Local Target Pitch Curve Draft Review Preview
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-fuchsia-900">
            Browser-local, session-only review preview for the P37 draft. It helps inspect coverage, voiced regions, and estimated pitch range before any future review controls or safe practice integration.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
          <span className="rounded-full bg-white px-3 py-2 text-fuchsia-800 ring-1 ring-fuchsia-200">
            draftOnly: {String(preview.draftOnly)}
          </span>
          <span className="rounded-full bg-white px-3 py-2 text-fuchsia-800 ring-1 ring-fuchsia-200">
            needsReview: {String(preview.needsReview)}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">Draft exists</p>
          <p className="mt-2 text-fuchsia-800">{draft ? "Yes" : "No"}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">Frames</p>
          <p className="mt-2 text-fuchsia-800">{preview.frameCount}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">Voiced / unvoiced</p>
          <p className="mt-2 text-fuchsia-800">{preview.voicedFrameCount} / {preview.unvoicedFrameCount}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">Voiced coverage</p>
          <p className="mt-2 text-fuchsia-800">{formatCoverage(preview.voicedCoverageRatio)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">First voiced frame</p>
          <p className="mt-2 text-fuchsia-800">{formatTime(preview.firstVoicedFrameTimeMs)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">Last voiced frame</p>
          <p className="mt-2 text-fuchsia-800">{formatTime(preview.lastVoicedFrameTimeMs)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm lg:grid-cols-2">
        <div className="rounded-2xl border border-fuchsia-200 bg-white p-4">
          <p className="font-bold text-fuchsia-950">Estimated pitch range</p>
          <p className="mt-2 text-fuchsia-800">{preview.estimatedRangeLabel}</p>
          <p className="mt-3 text-fuchsia-800">
            Diagnostic confidence remains diagnostic-only; this panel does not produce scores, grades, pass/fail decisions, or accuracy percentages.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900">Warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
            {preview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-fuchsia-200 bg-white p-4 text-sm text-fuchsia-900">
        <p className="font-bold text-fuchsia-950">P38 limitations</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Review required before practice integration.</li>
          <li>Draft only; not a final target and not an official transcription.</li>
          <li>Not scoring and not connected to the imported target practice flow.</li>
          <li>No upload, no cloud processing, no account, no database, and no private storage.</li>
          <li>Full mixed songs are deferred to future private cloud song analysis.</li>
          <li>No correction editor, draggable editing, or approve-as-final-target action in P38.</li>
        </ul>
      </div>
    </section>
  );
}
