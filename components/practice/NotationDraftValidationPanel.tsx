import { useEffect, useMemo, useState } from "react";

import type { NotationFragmentDraft } from "../../lib/practice/localNotationFragmentDraft";
import {
  getNotationDraftValidationDisabledReason,
  reconcileNotationDraftValidation,
  validateNotationDraftMeasures,
  type NotationDraftValidationResult,
  type NotationMeasureValidationState,
} from "../../lib/practice/localNotationDraftValidation";

type NotationDraftValidationPanelProps = {
  draft: NotationFragmentDraft;
};

const measureStateLabels: Record<NotationMeasureValidationState, string> = {
  valid: "时值完整",
  underfilled: "时值不足",
  overfilled: "时值超出",
};

const formatQuarterBeats = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

export function NotationDraftValidationPanel({
  draft,
}: NotationDraftValidationPanelProps) {
  const [result, setResult] = useState<NotationDraftValidationResult | null>(null);

  useEffect(() => {
    setResult((currentResult) =>
      reconcileNotationDraftValidation(currentResult, draft),
    );
  }, [draft]);

  const disabledReason = useMemo(
    () => getNotationDraftValidationDisabledReason(draft),
    [draft],
  );

  const runValidation = () => {
    const nextResult = validateNotationDraftMeasures(draft);
    if (nextResult) setResult(nextResult);
  };

  return (
    <section className="mt-6 rounded-3xl border border-teal-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Stage D Runtime Alpha</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">小节时值校验</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            对已检查的手动草稿逐小节汇总时值，并与当前拍号要求比较。校验只检查时值总和，不判断音高、识谱正确率或演唱表现。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runValidation}
            disabled={Boolean(disabledReason)}
            className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {result && result.status !== "stale" ? "重新校验" : "运行小节时值校验"}
          </button>
          <button
            type="button"
            onClick={() => setResult(null)}
            disabled={!result}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            清除校验结果
          </button>
        </div>
      </div>

      {disabledReason ? (
        <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          暂不可校验：{disabledReason}
        </p>
      ) : (
        <p className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm font-semibold text-teal-900">
          当前草稿已检查，可以运行小节时值校验。
        </p>
      )}

      {!result ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
          当前没有校验结果。校验结果只存在于当前页面内存，刷新后消失。
        </div>
      ) : result.status === "stale" ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">旧校验结果已失效。</p>
          <p className="mt-1">草稿内容、拍号、检查状态或来源已经变化。请重新检查草稿后再次校验。</p>
        </div>
      ) : (
        <div className="mt-4">
          <div className={`rounded-2xl border p-4 text-sm ${result.status === "valid" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}>
            <p className="font-bold">
              {result.status === "valid"
                ? "校验通过：两个小节的时值总和均符合当前拍号。"
                : "校验未通过：至少一个小节的时值总和不符合当前拍号。"}
            </p>
            <p className="mt-1">当前拍号 {result.timeSignature}；每小节应为 {formatQuarterBeats(result.expectedQuarterBeatsPerMeasure)} 个四分音符拍。</p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {result.measures.map((measure) => (
              <article key={measure.measure} className="rounded-2xl border border-slate-200 p-4 text-sm">
                <h3 className="font-bold text-slate-950">第 {measure.measure} 小节</h3>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-slate-700">
                  <div><dt className="font-semibold">应有时值</dt><dd>{formatQuarterBeats(measure.expectedQuarterBeats)} 拍</dd></div>
                  <div><dt className="font-semibold">实际时值</dt><dd>{formatQuarterBeats(measure.actualQuarterBeats)} 拍</dd></div>
                  <div><dt className="font-semibold">校验状态</dt><dd>{measureStateLabels[measure.state]}</dd></div>
                  <div><dt className="font-semibold">相差</dt><dd>{measure.differenceQuarterBeats === 0 ? "0" : `${measure.differenceQuarterBeats > 0 ? "+" : ""}${formatQuarterBeats(measure.differenceQuarterBeats)}`} 拍</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
          <p className="font-semibold">下一阶段就绪状态</p>
          <p className="mt-1">{result?.status === "valid" ? "时值校验已通过，可供未来 Stage E 使用。" : "尚未获得当前草稿的有效通过结果。"}</p>
        </div>
        <button type="button" disabled className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-left font-semibold text-slate-500">
          进入练习：Stage E 尚未实现，当前不会创建临时练习目标。
        </button>
      </div>
      <p className="mt-4 text-sm text-slate-600">
        边界说明：这不是正式识谱、最终目标、正确率或评分结果；不调用 /api/recognize，不上传，不写入 localStorage、IndexedDB 或数据库。
      </p>
    </section>
  );
}
