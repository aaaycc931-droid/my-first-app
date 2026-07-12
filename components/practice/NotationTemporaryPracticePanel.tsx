import { useEffect, useState } from "react";

import type { NotationTemporaryPracticeTarget } from "../../lib/practice/localNotationDraftPracticeTarget";
import type { NotationDraftEvent } from "../../lib/practice/localNotationFragmentDraft";

type Props = {
  target: NotationTemporaryPracticeTarget | null;
  onGoToSheetMusic: () => void;
  onClear: () => void;
  onPracticeCurrentNote: (event: NotationDraftEvent, eventIndex: number) => void;
  onPracticeRhythmTarget: () => void;
};

const durationLabels = { half: "二分", quarter: "四分", eighth: "八分" } as const;

export function NotationTemporaryPracticePanel({ target, onGoToSheetMusic, onClear, onPracticeCurrentNote, onPracticeRhythmTarget }: Props) {
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
      <p className="mt-2 max-w-3xl text-sm leading-6 text-fuchsia-900">按当前事件顺序练习。此目标只存在于当前会话，不自动播放或评分；视唱音符可由你主动带到“练习反馈”中进行本地录音和非评分音高参考，也不会替换“本地旋律”的既有流程。</p>
      <div className="mt-5 rounded-3xl border border-fuchsia-200 bg-white p-6 text-center text-fuchsia-950">
        <p className="text-sm font-semibold">事件 {eventIndex + 1} / {target.events.length} · 第 {event.measure} 小节 · {target.timeSignature}</p>
        <p className="mt-4 text-4xl font-bold">{isRest ? "休止" : event.pitch}</p>
        <p className="mt-3 text-lg font-semibold">{durationLabels[event.duration]}{isSightSinging ? (isRest ? "：保持休止。" : "：按此音高视唱。") : (isRest ? "：保持休止。" : "：按此时值拍读或拍击。")}</p>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setEventIndex((current) => Math.max(0, current - 1))} disabled={eventIndex === 0} className="rounded-full border border-fuchsia-300 px-4 py-2 text-sm font-semibold text-fuchsia-800 disabled:text-slate-400">上一个事件</button><button type="button" onClick={() => setEventIndex((current) => Math.min(target.events.length - 1, current + 1))} disabled={eventIndex === target.events.length - 1} className="rounded-full bg-fuchsia-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-fuchsia-300">下一个事件</button><button type="button" onClick={() => setEventIndex(0)} className="rounded-full border border-fuchsia-300 px-4 py-2 text-sm font-semibold text-fuchsia-800">从头开始</button></div>
      {isSightSinging && !isRest ? <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left text-sm text-violet-950"><p className="font-semibold">当前视唱音符的本地跟练</p><p className="mt-1 leading-6">主动进入后，可使用现有的浏览器本地录音与音高估计查看这一个音符的参考提示。不会自动打开麦克风，也不是正式评分。</p><button type="button" onClick={() => onPracticeCurrentNote(event, eventIndex)} className="mt-3 rounded-full bg-violet-700 px-4 py-2 font-semibold text-white">使用当前音符进行本地跟练</button></div> : !isSightSinging ? <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-left text-sm text-indigo-950"><p className="font-semibold">此临时节奏目标的本地拍击练习</p><p className="mt-1 leading-6">主动进入后，可复用现有浏览器节拍器与 tap / 空格键输入，按非休止事件的起点获得非评分节奏提示。不会打开麦克风，不会生成正式成绩。</p><button type="button" onClick={onPracticeRhythmTarget} className="mt-3 rounded-full bg-indigo-700 px-4 py-2 font-semibold text-white">使用此临时节奏目标进行拍击练习</button></div> : <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">休止事件不需要音高跟练；请保持休止并继续下一个事件。</p>}
      <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={onGoToSheetMusic} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">返回目标预览</button><button type="button" onClick={onClear} className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700">清除临时目标</button></div>
    </section>
  );
}
