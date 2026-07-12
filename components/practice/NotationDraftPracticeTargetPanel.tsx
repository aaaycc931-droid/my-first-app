import {
  getNotationTemporaryPracticeTargetDisabledReason,
  notationTemporaryPracticeTargetModes,
  type NotationTemporaryPracticeTarget,
  type NotationTemporaryPracticeTargetMode,
} from "../../lib/practice/localNotationDraftPracticeTarget";
import type { NotationFragmentDraft } from "../../lib/practice/localNotationFragmentDraft";
import type { NotationDraftValidationResult } from "../../lib/practice/localNotationDraftValidation";

type Props = {
  draft: NotationFragmentDraft;
  validation: NotationDraftValidationResult | null;
  target: NotationTemporaryPracticeTarget | null;
  mode: NotationTemporaryPracticeTargetMode;
  onModeChange: (mode: NotationTemporaryPracticeTargetMode) => void;
  onConfirmCreate: () => void;
  onClear: () => void;
  onEnterPractice: () => void;
};

const modeLabels: Record<NotationTemporaryPracticeTargetMode, string> = {
  "sight-singing": "临时视唱练习目标",
  rhythm: "临时节奏练习目标",
};

const durationLabels = { half: "二分", quarter: "四分", eighth: "八分" } as const;

export function NotationDraftPracticeTargetPanel({
  draft,
  validation,
  target,
  mode,
  onModeChange,
  onConfirmCreate,
  onClear,
  onEnterPractice,
}: Props) {
  const disabledReason = getNotationTemporaryPracticeTargetDisabledReason(draft, validation);
  const canCreate = disabledReason === "当前草稿可生成临时练习目标。";

  return (
    <section className="mt-6 rounded-3xl border border-fuchsia-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-fuchsia-700">Stage E Runtime Alpha</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">生成临时乐谱练习目标</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            只有当前已检查且小节时值校验通过的手动草稿，才能在你确认后转换为临时目标。目标只用于本次会话内的不评分练习，不是最终目标或正式识谱结果。
          </p>
        </div>
        {target ? (
          <button type="button" onClick={onClear} className="rounded-full border border-fuchsia-300 px-4 py-2 text-sm font-semibold text-fuchsia-800 hover:bg-fuchsia-50">
            清除临时乐谱目标
          </button>
        ) : null}
      </div>

      {!target ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-[0.75fr_1.25fr]">
            <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800">
              目标类型
              <select value={mode} onChange={(event) => onModeChange(event.target.value as NotationTemporaryPracticeTargetMode)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                {notationTemporaryPracticeTargetModes.map((value) => <option key={value} value={value}>{modeLabels[value]}</option>)}
              </select>
            </label>
            <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-fuchsia-950">
              <p className="font-bold">生成前确认摘要</p>
              <p className="mt-2">来源：{draft.source.mode === "independent" ? "独立手动草稿" : "手动草稿（使用本地图片作为肉眼参考）"}</p>
              <p className="mt-1">范围：{draft.timeSignature}、2 小节、{draft.events.length} 个事件。</p>
              <p className="mt-1">检查与校验：{draft.checked && validation?.status === "valid" ? "当前草稿已检查且时值校验通过。" : "尚未满足生成条件。"}</p>
              <p className="mt-1">目标类型：{modeLabels[mode]}。</p>
            </div>
          </div>
          <button type="button" onClick={onConfirmCreate} disabled={!canCreate} className="mt-4 rounded-full bg-fuchsia-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
            确认生成{modeLabels[mode]}
          </button>
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {canCreate ? "请确认上方范围和类型；确认后才会生成当前会话内的临时目标。" : `暂不可生成：${disabledReason}`}
          </p>
        </>
      ) : target.status === "stale" ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">临时乐谱练习目标已失效。</p>
          <p className="mt-1">草稿内容、检查状态、校验结果或图片来源已经变化。请清除旧目标，重新检查并校验当前草稿后再创建。</p>
        </div>
      ) : (
        <div className="mt-5">
          <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-fuchsia-950">
            <p className="font-bold">已生成：{modeLabels[target.mode]}</p>
            <p className="mt-1">来源：{target.sourceDescription}；拍号：{target.timeSignature}；事件数量：{target.events.length}。</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {target.events.map((event, index) => (
              <div key={event.id} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                <p className="font-bold text-slate-950">练习事件 {index + 1} · 第 {event.measure} 小节</p>
                <p className="mt-1">{event.type === "note" ? `音符 ${event.pitch}` : "休止符"}，{durationLabels[event.duration]}。</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={onEnterPractice} className="mt-4 rounded-full bg-fuchsia-700 px-4 py-2 text-sm font-semibold text-white">
            进入临时乐谱练习
          </button>
        </div>
      )}
      <p className="mt-4 text-sm text-slate-600">会话边界：目标刷新后消失，不上传，不调用 /api/recognize，不读取图片内容，不写入 localStorage、IndexedDB 或数据库，也不产生分数、等级或正式成绩。</p>
    </section>
  );
}
