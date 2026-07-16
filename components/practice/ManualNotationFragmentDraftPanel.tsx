import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

import {
  addNotationDraftEvent,
  changeNotationDraftTimeSignature,
  clearNotationFragmentDraft,
  confirmNotationDraftWithCurrentSource,
  convertNotationDraftToIndependent,
  deleteNotationDraftEvent,
  getNotationDraftStatus,
  markNotationDraftChecked,
  maxNotationDraftEvents,
  notationDurations,
  notationMeasures,
  notationPitches,
  notationTimeSignatures,
  reconcileNotationDraftSource,
  resetNotationFragmentDraft,
  updateNotationDraftEvent,
  type NotationDraftEvent,
  type NotationDuration,
  type NotationEventType,
  type NotationFragmentDraft,
  type NotationMeasure,
  type NotationPitch,
  type NotationTimeSignature,
} from "../../lib/practice/localNotationFragmentDraft";

type ManualNotationFragmentDraftPanelProps = {
  currentSheetMusicSourceId: string | null;
  draft: NotationFragmentDraft;
  importNotice?: string | null;
  onDraftEventCountChange?: (eventCount: number) => void;
  onDraftChange: Dispatch<SetStateAction<NotationFragmentDraft>>;
};

const durationLabels: Record<NotationDuration, string> = {
  half: "二分",
  quarter: "四分",
  eighth: "八分",
};

const statusLabels = {
  empty: "空草稿",
  draft: "未检查草稿",
  invalid: "存在无效事件",
  checked: "已检查",
  stale: "参考来源已变更",
  cleared: "已清空",
};

const emptyInput = {
  type: "note" as NotationEventType,
  pitch: "C4" as NotationPitch,
  duration: "quarter" as NotationDuration,
  measure: 1 as NotationMeasure,
};

export function ManualNotationFragmentDraftPanel({
  currentSheetMusicSourceId,
  draft,
  importNotice,
  onDraftEventCountChange,
  onDraftChange,
}: ManualNotationFragmentDraftPanelProps) {
  const [input, setInput] = useState(emptyInput);
  const setDraft = onDraftChange;

  useEffect(() => {
    setDraft((currentDraft) =>
      reconcileNotationDraftSource(currentDraft, currentSheetMusicSourceId),
    );
  }, [currentSheetMusicSourceId, setDraft]);

  useEffect(() => {
    onDraftEventCountChange?.(draft.events.length);
  }, [draft.events.length, onDraftEventCountChange]);

  const status = getNotationDraftStatus(draft);
  const reachedLimit = draft.events.length >= maxNotationDraftEvents;
  const canCheck = draft.events.length > 0 && status !== "invalid" && status !== "stale";
  const sourceLabel = draft.source.mode === "visual-reference"
    ? "使用当前本地乐谱图片作为肉眼参考"
    : "独立手动草稿";

  const sourceActions = useMemo(() => {
    if (draft.source.mode === "visual-reference") return null;
    if (!currentSheetMusicSourceId) return "当前没有本地乐谱图片，也可以创建独立手动草稿。";
    return "当前有本地乐谱图片，可选择把它作为肉眼参考；系统不会读取或识别图片内容。";
  }, [currentSheetMusicSourceId, draft.source.mode]);

  const addEvent = (type: NotationEventType) => {
    if (reachedLimit) return;
    setDraft((currentDraft) =>
      addNotationDraftEvent(currentDraft, {
        ...input,
        type,
        pitch: type === "note" ? input.pitch : null,
        duration: type === "rest" ? "quarter" : input.duration,
      }),
    );
  };

  const updateEvent = (event: NotationDraftEvent, patch: Partial<NotationDraftEvent>) => {
    const nextType = patch.type ?? event.type;
    const nextDuration = nextType === "rest" ? "quarter" : patch.duration ?? event.duration;
    setDraft((currentDraft) =>
      updateNotationDraftEvent(currentDraft, event.id, {
        type: nextType,
        pitch: nextType === "note" ? patch.pitch ?? event.pitch ?? "C4" : null,
        duration: nextDuration,
        measure: patch.measure ?? event.measure,
      }),
    );
  };

  return (
    <section className="mt-6 rounded-3xl border border-violet-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Stage B Runtime Alpha</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">手动乐谱片段草稿</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            当前只创建会话内的手动草稿，可把本地乐谱图片作为肉眼参考；不会自动识别图片内容，只有完成检查和小节校验后才可在 Stage E 确认生成临时目标。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDraft(markNotationDraftChecked)} disabled={!canCheck} className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
            {draft.checked ? "重新检查" : "标记为已检查"}
          </button>
          <button type="button" onClick={() => setDraft(clearNotationFragmentDraft)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">清空草稿</button>
          <button type="button" onClick={() => setDraft(resetNotationFragmentDraft(draft.source))} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">重置草稿</button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-lg font-bold text-slate-950">输入范围</h3>
          <label className="mt-3 block text-sm font-semibold text-slate-700">拍号</label>
          <select value={draft.timeSignature} onChange={(event) => setDraft((currentDraft) => changeNotationDraftTimeSignature(currentDraft, event.target.value as NotationTimeSignature))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
            {notationTimeSignatures.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-semibold text-slate-700">音高
              <select value={input.pitch} onChange={(event) => setInput({ ...input, pitch: event.target.value as NotationPitch })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                {notationPitches.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">时值
              <select value={input.duration} onChange={(event) => setInput({ ...input, duration: event.target.value as NotationDuration })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                {notationDurations.map((value) => <option key={value} value={value}>{durationLabels[value]}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">所属小节
              <select value={input.measure} onChange={(event) => setInput({ ...input, measure: Number(event.target.value) as NotationMeasure })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
                {notationMeasures.map((value) => <option key={value} value={value}>第 {value} 小节</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => addEvent("note")} disabled={reachedLimit} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">添加音符</button>
            <button type="button" onClick={() => addEvent("rest")} disabled={reachedLimit} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">添加休止符</button>
          </div>
          {reachedLimit ? <p className="mt-2 text-sm font-semibold text-amber-800">最多只能添加 8 个事件；请先删除已有事件再继续添加。</p> : null}
          {sourceActions ? <p className="mt-4 text-sm text-slate-700">{sourceActions}</p> : null}
          {currentSheetMusicSourceId && draft.source.mode !== "visual-reference" ? <button type="button" onClick={() => setDraft((currentDraft) => confirmNotationDraftWithCurrentSource(currentDraft, currentSheetMusicSourceId))} className="mt-2 rounded-full border border-violet-300 px-4 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50">使用当前图片作为肉眼参考</button> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-lg font-bold text-slate-950">草稿预览</h3>
          {importNotice ? <p className="mt-2 rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-900">{importNotice}</p> : null}
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="font-semibold text-slate-700">当前拍号</dt><dd>{draft.timeSignature}</dd></div>
            <div><dt className="font-semibold text-slate-700">小节数量</dt><dd>2</dd></div>
            <div><dt className="font-semibold text-slate-700">事件数量</dt><dd>{draft.events.length} / {maxNotationDraftEvents}</dd></div>
            <div><dt className="font-semibold text-slate-700">草稿状态</dt><dd>{statusLabels[status]}</dd></div>
            <div><dt className="font-semibold text-slate-700">是否已检查</dt><dd>{draft.checked && !draft.stale ? "是" : "否"}</dd></div>
            <div><dt className="font-semibold text-slate-700">来源关系</dt><dd>{sourceLabel}</dd></div>
            <div><dt className="font-semibold text-slate-700">是否可进入校验</dt><dd>{draft.checked && !draft.stale ? "是，请使用下方 Stage D。" : "否，请先完成当前草稿检查。"}</dd></div>
            <div><dt className="font-semibold text-slate-700">是否可进入练习</dt><dd>需先通过下方小节校验并在 Stage E 确认。</dd></div>
          </dl>
          {status === "stale" ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-bold">参考图片已变更，旧检查状态已失效。</p><p className="mt-1">请基于当前图片重新确认，或改为独立手动草稿；之后仍需重新检查。</p><div className="mt-3 flex flex-wrap gap-2">{currentSheetMusicSourceId ? <button type="button" onClick={() => setDraft((currentDraft) => confirmNotationDraftWithCurrentSource(currentDraft, currentSheetMusicSourceId))} className="rounded-full bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white">基于当前图片重新确认</button> : null}<button type="button" onClick={() => setDraft(convertNotationDraftToIndependent)} className="rounded-full border border-amber-300 px-3 py-1.5 text-sm font-semibold text-amber-900">改为独立手动草稿</button></div></div> : null}
          {draft.checked && !draft.stale ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">已检查，请继续完成下方小节时值校验；检查本身不代表可以进入练习。</p> : <p className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">当前草稿尚未检查。修改草稿后，需要重新检查。</p>}

          <div className="mt-4 space-y-3">
            {draft.events.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">当前没有音符或休止符。请先添加至少一个事件。</p> : null}
            {draft.events.map((event, index) => <div key={event.id} className="rounded-2xl border border-slate-200 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-slate-950">事件 {index + 1}</p><button type="button" onClick={() => setDraft((currentDraft) => deleteNotationDraftEvent(currentDraft, event.id))} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">删除事件</button></div><div className="mt-3 grid gap-2 sm:grid-cols-4"><select aria-label={`事件 ${index + 1} 类型`} value={event.type} onChange={(e) => updateEvent(event, { type: e.target.value as NotationEventType })} className="rounded-xl border border-slate-300 px-2 py-2"><option value="note">音符</option><option value="rest">休止符</option></select><select aria-label={`事件 ${index + 1} 音高`} value={event.pitch ?? "C4"} disabled={event.type === "rest"} onChange={(e) => updateEvent(event, { pitch: e.target.value as NotationPitch })} className="rounded-xl border border-slate-300 px-2 py-2 disabled:bg-slate-100">{notationPitches.map((value) => <option key={value} value={value}>{value}</option>)}</select><select aria-label={`事件 ${index + 1} 时值`} value={event.duration} disabled={event.type === "rest"} onChange={(e) => updateEvent(event, { duration: e.target.value as NotationDuration })} className="rounded-xl border border-slate-300 px-2 py-2 disabled:bg-slate-100">{notationDurations.map((value) => <option key={value} value={value}>{durationLabels[value]}</option>)}</select><select aria-label={`事件 ${index + 1} 小节`} value={event.measure} onChange={(e) => updateEvent(event, { measure: Number(e.target.value) as NotationMeasure })} className="rounded-xl border border-slate-300 px-2 py-2">{notationMeasures.map((value) => <option key={value} value={value}>第 {value} 小节</option>)}</select></div><p className="mt-2 text-slate-600">顺序 {index + 1}：{event.type === "note" ? `音符 ${event.pitch}` : "四分休止符"}，{durationLabels[event.duration]}，第 {event.measure} 小节。</p></div>)}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
        <button type="button" disabled className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-left font-semibold text-slate-500">小节时值校验：请在下方 Stage D 面板中完成。</button>
        <button type="button" disabled className="rounded-2xl border border-slate-200 bg-slate-100 p-4 text-left font-semibold text-slate-500">进入练习：请先完成下方 Stage D 校验，再在 Stage E 明确确认临时目标。</button>
      </div>
      <p className="mt-4 text-sm text-slate-600">会话边界：草稿只存在于当前页面内存；刷新后消失，不写入 localStorage 或 IndexedDB，不上传，不保存到数据库或私人曲库。</p>
    </section>
  );
}
