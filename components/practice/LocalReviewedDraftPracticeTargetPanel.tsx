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
            P40 临时检查草稿目标 Alpha
          </p>
          <h2 className="mt-1 text-2xl font-bold text-fuchsia-950">
            当前临时检查草稿练习目标
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-fuchsia-900">
            此目标是临时的、仅当前会话、仅浏览器本地、仅来自已检查选区、不用于评分且仅供诊断。它不是最终目标，不是正式转写，不代表准确率，不是等级，也不是通过/失败判断。
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-fuchsia-800 ring-1 ring-fuchsia-300"
        >
          清除临时目标
        </button>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">来源</p>
          <p className="mt-2 break-words text-fuchsia-800">{target.source}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">已选帧范围</p>
          <p className="mt-2 text-fuchsia-800">
            {target.selectedStartFrameIndex} → {target.selectedEndFrameIndex}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">
            已选有声音高覆盖率
          </p>
          <p className="mt-2 text-fuchsia-800">
            {target.selectedVoicedFrameCount} / {target.selectedFrameCount} (
            {formatPercent(target.selectedVoicedCoverage)})
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">时长</p>
          <p className="mt-2 text-fuchsia-800">
            {formatSeconds(target.durationSec)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">参考频率</p>
          <p className="mt-2 text-fuchsia-800">
            {formatFrequency(target.referenceFrequencyHz)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200 lg:col-span-2">
          <p className="font-semibold text-fuchsia-950">
            频率最小值 / 中位数 / 最大值
          </p>
          <p className="mt-2 text-fuchsia-800">
            {formatFrequency(target.frequencyMinHz)} ·{" "}
            {formatFrequency(target.frequencyMedianHz)} ·{" "}
            {formatFrequency(target.frequencyMaxHz)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">当前会话创建时间</p>
          <p className="mt-2 text-fuchsia-800">
            {new Date(target.createdAtMs).toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-fuchsia-200 bg-white p-4 text-sm">
        <p className="font-bold text-fuchsia-950">
          不评分的最新音高对比
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <p>
            <span className="font-semibold">最新估计音高：</span>{" "}
            {formatFrequency(latestEstimatedPitchHz)}
          </p>
          <p>
            <span className="font-semibold">临时检查参考：</span>{" "}
            {formatFrequency(target.referenceFrequencyHz)}
          </p>
          <p>
            <span className="font-semibold">音分差：</span>{" "}
            {formatCents(pitchFeedback?.centsDifference ?? null)}
          </p>
          <p>
            <span className="font-semibold">诊断类别：</span>{" "}
            {pitchFeedback?.category ?? "waiting-for-local-estimate"}
          </p>
        </div>
        <p className="mt-3 text-xs leading-5 text-fuchsia-700">
          此对比只把最新本地音高估计作为不评分的诊断反馈。参考音高来自草稿；它不是最终目标、正式转写、准确率结果、等级或通过/失败判断。
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <p className="font-bold text-amber-900">警告 and boundary copy</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
          {target.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
