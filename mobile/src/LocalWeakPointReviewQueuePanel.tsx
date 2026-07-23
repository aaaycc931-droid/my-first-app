import { useMemo, useState } from "react";

import { buildLocalWeakPointReviewQueue } from "../../lib/learning/localWeakPointReviewQueue";
import {
  LOCAL_PRACTICE_REVIEW_QUEUE_MAX_ITEMS,
  getLocalPracticeReviewTargetKey,
  type LocalPracticeReviewQueue,
  type LocalPracticeReviewTarget,
} from "../../lib/practice/localPracticeReviewQueue";

const kindLabels: Record<LocalPracticeReviewTarget["kind"], string> = {
  "single-pitch": "单音听辨",
  interval: "音程听辨",
  "interval-comparison": "音程比较与模唱",
  "chord-inversion": "和弦与转位",
  "harmony-progression": "和声进行",
  "scale-mode": "音阶与调式",
  "seventh-chord": "七和弦听辨",
  "seventh-chord-spacing": "七和弦排列",
  modulation: "调制听辨",
  rhythm: "节奏听辨",
  "melody-dictation": "旋律听写",
};

export function LocalWeakPointReviewQueuePanel({
  queue,
  labelForTarget,
  onStartTarget,
  onClear,
}: {
  queue: LocalPracticeReviewQueue;
  labelForTarget: (target: LocalPracticeReviewTarget) => string;
  onStartTarget: (target: LocalPracticeReviewTarget) => void;
  onClear: () => void;
}) {
  const [isClearConfirmationVisible, setIsClearConfirmationVisible] = useState(false);
  const reviewModel = useMemo(() => buildLocalWeakPointReviewQueue(queue), [queue]);
  const positions = useMemo(
    () => reviewModel.status === "available"
      ? new Map(queue.map((target, index) => [getLocalPracticeReviewTargetKey(target), index + 1]))
      : new Map<string, number>(),
    [queue, reviewModel.status],
  );

  if (reviewModel.status === "unavailable") {
    return (
      <section className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm" aria-labelledby="review-heading">
        <h2 id="review-heading" className="text-xl font-black text-amber-950">当前待复练题不可用</h2>
        <p className="mt-3 text-sm leading-6 text-amber-900">本机复练数据不完整，未生成部分结果。你仍可继续随机练习。</p>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-3xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm" aria-labelledby="review-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-indigo-700">当前待复练题 · 仅保存在这台手机</p>
          <h2 id="review-heading" className="text-xl font-black text-indigo-950">
            本机复练（{reviewModel.pendingTargetCount}）
          </h2>
        </div>
        {reviewModel.pendingTargetCount > 0 ? (
          <button
            type="button"
            onClick={() => setIsClearConfirmationVisible(true)}
            className="min-h-11 rounded-xl border border-indigo-300 bg-white px-4 py-2 text-sm font-bold text-indigo-900"
          >
            清除记录
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-6 text-indigo-900">
        这里的“薄弱点”只表示当前尚未解决的错题事实，不是能力评级、正确率或推荐排序。最多保留 {LOCAL_PRACTICE_REVIEW_QUEUE_MAX_ITEMS} 题，顺序以最近答错为先。
      </p>

      {reviewModel.pendingTargetCount === 0 ? (
        <p className="mt-3 text-sm leading-6 text-indigo-900">
          暂无待复练题。查看答案后，答错的题会加入这里；答对同一道题会从这里移除。
        </p>
      ) : (
        <div className="mt-4 grid gap-4">
          {reviewModel.groups.map((group) => (
            <section key={group.kind} className="rounded-2xl border border-indigo-200 bg-white p-4" aria-labelledby={`review-group-${group.kind}`}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 id={`review-group-${group.kind}`} className="font-black text-indigo-950">{kindLabels[group.kind]}</h3>
                <span className="text-xs font-semibold text-indigo-600">待复练 {group.targets.length} 题</span>
              </div>
              <ul className="mt-3 grid gap-2">
                {group.targets.map((target) => {
                  const position = positions.get(getLocalPracticeReviewTargetKey(target));
                  return (
                    <li key={getLocalPracticeReviewTargetKey(target)}>
                      <button
                        type="button"
                        onClick={() => onStartTarget(target)}
                        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 px-4 py-3 text-left font-bold text-indigo-950"
                      >
                        <span>{labelForTarget(target)}</span>
                        <span className="shrink-0 text-xs font-semibold text-indigo-600">复练 {position}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {isClearConfirmationVisible ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-white p-4" role="alert">
          <p className="font-bold text-rose-950">确认清除全部本机复练记录？</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">清除后无法恢复，但不会清空学习画像，也不会影响继续随机练习。</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setIsClearConfirmationVisible(false);
                onClear();
              }}
              className="min-h-11 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white"
            >确认清除</button>
            <button type="button" onClick={() => setIsClearConfirmationVisible(false)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800">取消</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
