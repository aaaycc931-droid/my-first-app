import type { ActivitySessionV1 } from "../../lib/activity/activitySession";
import { ActivityProtocolState } from "../practice/ActivityProtocolState";

export function PianoActivityProtocolPanel({
  session,
  expectedNoteIds,
  noteEventCount,
  noteEventProducers,
  active,
  transpose,
  onStart,
  onCheck,
  onRestart,
}: {
  session: ActivitySessionV1;
  expectedNoteIds: readonly string[];
  noteEventCount: number;
  noteEventProducers: string;
  active: boolean;
  transpose: number;
  onStart: () => void;
  onCheck: () => void;
  onRestart: () => void;
}) {
  const actualNoteIds = session.answer?.mode === "piano" ? session.answer.noteIds : [];
  const atInputLimit = actualNoteIds.length >= expectedNoteIds.length;
  const canStart = transpose === 0 && session.lifecycle !== "checked" && !atInputLimit;

  return (
    <section
      className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4"
      aria-labelledby="piano-activity-heading"
      data-note-event-count={noteEventCount}
      data-note-event-producers={noteEventProducers}
    >
      <h4 id="piano-activity-heading" className="font-black text-sky-950">项目原创谱面跟弹（统一活动协议）</h4>
      <p className="mt-1 text-sm leading-6 text-sky-900">本活动固定使用项目原创的「级进与小跳」确认谱面，与当前选择或导入的 MusicXML 草稿无关。只记录明确开始后由触摸、鼠标或键盘触发的屏幕琴键；参考播放、演奏回放、压力测试和 MIDI 都不会写入本轮答案。</p>
      <p className="mt-2 text-sm font-bold text-sky-950">目标顺序：{expectedNoteIds.join(" · ")}</p>
      <p className="mt-1 text-sm text-sky-900" aria-live="polite">本轮输入：{actualNoteIds.length > 0 ? actualNoteIds.join(" · ") : "尚未输入"}（{actualNoteIds.length}/{expectedNoteIds.length}）</p>
      {transpose !== 0 ? <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">请先把钢琴移调调回 0 半音，再开始本轮跟弹；活动期间不会改写你的钢琴设置。</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!canStart || active} onClick={onStart} className="min-h-11 rounded-xl bg-sky-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{session.lifecycle === "answering" ? "继续输入" : "开始屏幕跟弹"}</button>
        <button type="button" disabled={actualNoteIds.length === 0 || session.lifecycle === "checked"} onClick={onCheck} className="min-h-11 rounded-xl border border-sky-300 bg-white px-4 py-2 text-sm font-bold text-sky-950 disabled:opacity-50">检查本轮</button>
        <button type="button" disabled={session.attemptNumber === 1 && session.lifecycle === "ready" && !active} onClick={onRestart} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 disabled:opacity-50">重新尝试</button>
      </div>
      {active ? <p className="mt-2 text-sm font-bold text-sky-950" role="status">正在接收屏幕琴键输入；达到 {expectedNoteIds.length} 个音后会自动暂停。</p> : null}
      <div className="mt-3"><ActivityProtocolState session={session} /></div>
      {session.lifecycle === "checked" && session.checkEvidence ? <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-sky-950">{session.checkEvidence.explanation}</p> : null}
    </section>
  );
}
