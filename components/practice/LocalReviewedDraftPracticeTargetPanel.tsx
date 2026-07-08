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
  seconds === null ? "—" : `${seconds.toFixed(2)} 秒`;
const formatCents = (cents: number | null) =>
  cents === null ? "—" : `${cents.toFixed(1)} 音分`;

const pitchFeedbackCategoryLabels: Record<string, string> = {
  "no-target-data": "无目标音高数据",
  "no-reliable-pitch": "未检测到可靠音高",
  close: "接近目标",
  above: "高于目标",
  below: "低于目标",
  "waiting-for-local-estimate": "等待本地音高估计",
};

const formatPitchFeedbackCategory = (category: string | null | undefined) =>
  pitchFeedbackCategoryLabels[category ?? "waiting-for-local-estimate"] ?? category ?? "等待本地音高估计";

export function LocalReviewedDraftPracticeTargetPanel({
  target,
  latestEstimatedPitchHz,
  pitchFeedback,
  onClear,
}: Props) {
  if (!target) {
    return (
      <section className="mt-6 rounded-3xl border border-dashed border-fuchsia-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-fuchsia-700">
          P40b 临时目标状态
        </p>
        <h2 className="mt-1 text-xl font-bold text-fuchsia-950">
          还没有临时检查草稿练习目标
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
          先导入本地旋律音频、生成目标音高曲线草稿，并在检查控制中确认一个有效选区。点击“使用当前检查选区作为临时练习目标”后，这里会显示它来自哪个检查选区，以及它只用于当前阶段的不评分诊断练习反馈。
        </p>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          空状态不会创建目标，也不会启动播放、录音、音高估计、评分或保存任何数据。
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-3xl border border-fuchsia-200 bg-fuchsia-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-fuchsia-700">
            P40b 临时检查草稿目标 UX
          </p>
          <h2 className="mt-1 text-2xl font-bold text-fuchsia-950">
            当前临时检查草稿练习目标
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-fuchsia-900">
            这是一个当前浏览器会话内的临时诊断练习参考，来源只限于你刚刚检查过的草稿选区。它不是最终目标、不是正式转写、不用于评分，也不代表正式歌曲分析结果。
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-fuchsia-800 ring-1 ring-fuchsia-300"
        >
          清除当前临时目标
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-fuchsia-200 bg-white p-4 text-sm text-fuchsia-900">
        <p className="font-bold text-fuchsia-950">当前目标来源</p>
        <p className="mt-2 leading-6">
          当前临时目标来自本次会话中的已检查草稿选区：帧 {target.selectedStartFrameIndex} → {target.selectedEndFrameIndex}。来源标记：
          <span className="break-words font-semibold"> {target.source}</span>。
        </p>
        <p className="mt-2 text-xs leading-5 text-fuchsia-700">
          如果重新生成草稿、重置检查控制，或清除本地旋律音频，此临时目标会被清除或失效；请在需要时重新从新的已检查选区创建。
        </p>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">目标性质</p>
          <p className="mt-2 text-fuchsia-800">临时 · 当前会话 · 浏览器本地 · 不评分</p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
          <p className="font-semibold text-fuchsia-950">检查选区帧范围</p>
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
            {formatPitchFeedbackCategory(pitchFeedback?.category)}
          </p>
        </div>
        <p className="mt-3 text-xs leading-5 text-fuchsia-700">
          此对比只把最新本地音高估计作为不评分的阶段性诊断反馈。临时检查参考来自草稿选区；它不是最终目标、正式转写、准确率结果、等级、通过/失败判断或正式歌曲分析结果。
        </p>
      </div>

      <div className="mt-5 grid gap-3 text-sm lg:grid-cols-2">
        <div className="rounded-2xl border border-fuchsia-200 bg-white p-4 text-fuchsia-900">
          <p className="font-bold text-fuchsia-950">会在这些情况下清除或失效</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>点击“清除当前临时目标”。</li>
            <li>重新生成本地目标音高曲线草稿。</li>
            <li>重置检查控制或改变到无效检查选区。</li>
            <li>清除本地旋律音频，或选择新的本地音频。</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-bold text-amber-900">警告与边界说明</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
            {target.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-amber-800">
            以上警告只解释当前临时诊断目标的可靠性边界，不会产生分数、等级或最终结论。
          </p>
        </div>
      </div>
    </section>
  );
}
