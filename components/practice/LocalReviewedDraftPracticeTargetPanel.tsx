import type { NonScoringImportedTargetPitchFeedback } from "../../lib/practice/nonScoringImportedTargetPitchFeedback";
import type { LocalReviewedDraftPracticeTarget } from "../../lib/practice/localReviewedDraftPracticeTarget";

type Props = {
  target: LocalReviewedDraftPracticeTarget | null;
  latestEstimatedPitchHz: number | null;
  pitchFeedback: NonScoringImportedTargetPitchFeedback | null;
  onClear: () => void;
};

const formatFrequency = (frequencyHz: number | null) =>
  frequencyHz === null ? "—" : `${frequencyHz.toFixed(1)} Hz`;
const formatPercent = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;
const formatSeconds = (seconds: number | null) =>
  seconds === null ? "—" : `${seconds.toFixed(2)} sec`;
const formatCents = (cents: number | null) =>
  cents === null ? "—" : `${cents.toFixed(1)} cents`;

export function LocalReviewedDraftPracticeTargetPanel({
  target,
  latestEstimatedPitchHz,
  pitchFeedback,
  onClear,
}: Props) {
  if (!target) {
    return null;
  }

  return (
    <section className="mt-6 rounded-3xl border border-fuchsia-200 bg-fuchsia-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-fuchsia-700">
            P40 temporary reviewed draft target alpha
          </p>
          <h2 className="mt-1 text-2xl font-bold text-fuchsia-950">
            Active temporary reviewed draft practice target
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-fuchsia-900">
            This target is temporary, session-only, browser-local,
            reviewed-selection-only, non-scoring, and diagnostic. It is not a
            final target, not an official transcription, not accuracy, not a
            grade, and not pass/fail.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-fuchsia-800 ring-1 ring-fuchsia-300"
        >
          Clear temporary target
        </button>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">Source</p>
          <p className="mt-2 break-words text-fuchsia-800">{target.source}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">Selected frame range</p>
          <p className="mt-2 text-fuchsia-800">
            {target.selectedStartFrameIndex} → {target.selectedEndFrameIndex}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">
            Selected voiced coverage
          </p>
          <p className="mt-2 text-fuchsia-800">
            {target.selectedVoicedFrameCount} / {target.selectedFrameCount} (
            {formatPercent(target.selectedVoicedCoverage)})
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">Duration</p>
          <p className="mt-2 text-fuchsia-800">
            {formatSeconds(target.durationSec)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">Reference frequency</p>
          <p className="mt-2 text-fuchsia-800">
            {formatFrequency(target.referenceFrequencyHz)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200 lg:col-span-2">
          <p className="font-semibold text-fuchsia-950">
            Frequency min / median / max
          </p>
          <p className="mt-2 text-fuchsia-800">
            {formatFrequency(target.frequencyMinHz)} ·{" "}
            {formatFrequency(target.frequencyMedianHz)} ·{" "}
            {formatFrequency(target.frequencyMaxHz)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">Created in session</p>
          <p className="mt-2 text-fuchsia-800">
            {new Date(target.createdAtMs).toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-fuchsia-200 bg-white p-4 text-sm">
        <p className="font-bold text-fuchsia-950">
          Non-scoring latest pitch comparison
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <p>
            <span className="font-semibold">Latest estimated pitch:</span>{" "}
            {formatFrequency(latestEstimatedPitchHz)}
          </p>
          <p>
            <span className="font-semibold">Temporary reviewed reference:</span>{" "}
            {formatFrequency(target.referenceFrequencyHz)}
          </p>
          <p>
            <span className="font-semibold">Cents difference:</span>{" "}
            {formatCents(pitchFeedback?.centsDifference ?? null)}
          </p>
          <p>
            <span className="font-semibold">Diagnostic category:</span>{" "}
            {pitchFeedback?.category ?? "waiting-for-local-estimate"}
          </p>
        </div>
        <p className="mt-3 text-xs leading-5 text-fuchsia-700">
          This comparison uses the latest local pitch estimate only as
          non-scoring diagnostic feedback. The reference pitch is draft-derived;
          it is not a final target, official transcription, accuracy result,
          grade, or pass/fail decision.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <p className="font-bold text-amber-900">Warnings and boundary copy</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
          {target.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
