import { useEffect, useState } from "react";

import type { NotationTemporaryPracticeTarget } from "../../lib/practice/localNotationDraftPracticeTarget";

type Props = {
  target: NotationTemporaryPracticeTarget | null;
  onGoToSheetMusic: () => void;
  onClear: () => void;
};

const durationLabels = { half: "二分", quarter: "四分", eighth: "八分" } as const;

export function NotationTemporaryPracticePanel({ target, onGoToSheetMusic, onClear }: Props) {
  const [eventIndex, setEventIndex] = useState(0);

  useEffect(() => setEventIndex(0), [target?.id]);

  if (!target) {
    return (
      <section className="mt-6 rounded-3xl border border-dashed border-fuchsia-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-fuchsia-700">Stage E 临时乐谱练习</p>
        <h2 className="mt-1 text-2xl font-bold text-fuchsia-950">还没有临时乐谱练习目标</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">请先在“乐谱预览”中检查手动草稿、通过小节时值校验，并明确确认创建临时目标。</p>
        <button type="button" onClick={onGoToSheetMusic} className="mt-4 rounded-full bg-fuchsia-700 px-4 py-2 text-sm font-semibold text-white">前往乐谱预览</button>
      </section>
    );
  }

  if (target.status === "stale") {
    return (
      <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Stage E 临时乐谱练习</p>
        <h2 className="mt-1 text-2xl font-bold text-amber-950">临时目标已失效</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">草稿或校验已经变化，不能继续使用旧目标。请清除后重新完成检查、校验和确认。</p>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={onClear} className="rounded-full bg-amber-700 px-4 py-2 text-sm font-semibold text-white">清除旧目标</button><button type="button" onClick={onGoToSheetMusic} className="rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900">返回乐谱预览</button></div>
      </section>
    );
  }

  const event = target.events[eventIndex];
  const isRest = event.type === "rest";
  const isSightSinging = target.mode === "sight-singing";

  return (
    <section className="mt-6 rounded-3xl border border-fuchsia-200 bg-fuchsia-50 p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-fuchsia-700">Stage E 临时乐谱练习</p>
      <h2 className="mt-1 text-2xl font-bold text-fuchsia-950">{isSightSinging ? "临时视唱练习" : "临时节奏练习"}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-fuchsia-900">按当前事件顺序练习。此目标只存在于当前会话，不录音、不自动播放、不评分，也不会替换“本地旋律”的既有练习流程。</p>
      <div className="mt-5 rounded-3xl border border-fuchsia-200 bg-white p-6 text-center text-fuchsia-950">
        <p className="text-sm font-semibold">事件 {eventIndex + 1} / {target.events.length} · 第 {event.measure} 小节 · {target.timeSignature}</p>
        <p className="mt-4 text-4xl font-bold">{isRest ? "休止" : event.pitch}</p>
        <p className="mt-3 text-lg font-semibold">{durationLabels[event.duration]}{isSightSinging ? (isRest ? "：保持休止。" : "：按此音高视唱。") : (isRest ? "：保持休止。" : "：按此时值拍读或拍击。")}</p>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setEventIndex((current) => Math.max(0, current - 1))} disabled={eventIndex === 0} className="rounded-full border border-fuchsia-300 px-4 py-2 text-sm font-semibold text-fuchsia-800 disabled:text-slate-400">上一个事件</button><button type="button" onClick={() => setEventIndex((current) => Math.min(target.events.length - 1, current + 1))} disabled={eventIndex === target.events.length - 1} className="rounded-full bg-fuchsia-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-fuchsia-300">下一个事件</button><button type="button" onClick={() => setEventIndex(0)} className="rounded-full border border-fuchsia-300 px-4 py-2 text-sm font-semibold text-fuchsia-800">从头开始</button></div>
      <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={onGoToSheetMusic} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">返回目标预览</button><button type="button" onClick={onClear} className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700">清除临时目标</button></div>
    </section>
  );
}
