import type { LocalExplainablePracticeRecommendation } from "../../lib/learning/localExplainablePracticeRecommendation";
import type { LocalPracticeReviewTarget } from "../../lib/practice/localPracticeReviewQueue";

export function LocalExplainablePracticeRecommendationPanel({
  recommendation,
  labelForTarget,
  onStartTarget,
  onToggle,
}: {
  recommendation: LocalExplainablePracticeRecommendation;
  labelForTarget: (target: LocalPracticeReviewTarget) => string;
  onStartTarget: (target: LocalPracticeReviewTarget) => void;
  onToggle: () => void;
}) {
  const enabled = recommendation.status !== "disabled";

  return (
    <section className="mt-5 rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm" aria-labelledby="recommendation-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-violet-700">可解释 · 非评分 · 仅在本机</p>
          <h2 id="recommendation-heading" className="text-xl font-black text-violet-950">下一题复练建议</h2>
        </div>
        <button
          type="button"
          aria-pressed={enabled}
          onClick={onToggle}
          className="min-h-11 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-900"
        >
          {enabled ? "关闭建议" : "开启建议"}
        </button>
      </div>

      {recommendation.status === "available" ? (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-white p-4">
          <p className="font-black text-violet-950">建议下一步：{labelForTarget(recommendation.target)}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            为什么是这题：它是当前复练队列第 {recommendation.source.queuePosition} 项，来自最近加入或更新的未解决错题；该题型有 {recommendation.source.sameKindPendingCount} 题，全部有 {recommendation.source.pendingTargetCount} 题待复练。
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            规则固定为复用现有队列顺序，不读取答案 outcome，也不计算正确率、分数、等级、能力判断或诊断。
          </p>
          <button
            type="button"
            onClick={() => onStartTarget(recommendation.target)}
            className="mt-3 min-h-11 rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white"
          >
            开始这题复练
          </button>
        </div>
      ) : null}

      {recommendation.status === "empty" ? (
        <p className="mt-3 text-sm leading-6 text-violet-900">
          当前没有未解决错题，缺少生成复练建议所需的本机事实；未生成建议。
        </p>
      ) : null}
      {recommendation.status === "disabled" ? (
        <p className="mt-3 text-sm leading-6 text-violet-900">
          复练建议已关闭；练习、学习画像和复练队列不受影响。
        </p>
      ) : null}
      {recommendation.status === "unavailable" ? (
        <p className="mt-3 text-sm leading-6 text-amber-900">
          本机复练数据不完整，无法解释来源，因此未生成建议。你仍可继续随机练习。
        </p>
      ) : null}
    </section>
  );
}
