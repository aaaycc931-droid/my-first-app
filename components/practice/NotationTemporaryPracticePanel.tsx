import { useEffect, useRef, useState } from "react";

import type { NotationTemporaryPracticeTarget } from "../../lib/practice/localNotationDraftPracticeTarget";
import type { NotationDraftEvent } from "../../lib/practice/localNotationFragmentDraft";
import type { NotationTemporaryPracticeProgress } from "../../lib/practice/notationTemporaryPracticeProgress";
import { isNotationTemporaryPracticeRoundComplete } from "../../lib/practice/notationTemporaryPracticeProgress";
import { getNotationTargetPitchFrequencyHz } from "../../lib/practice/nonScoringNotationTargetPitchFeedback";
import { getNotationReferenceMelodyPlaybackDurationSeconds, getNotationReferenceMelodyPlaybackPlan } from "../../lib/practice/notationReferenceMelodyPlayback";

type Props = {
  target: NotationTemporaryPracticeTarget | null;
  onGoToSheetMusic: () => void;
  onClear: () => void;
  onPracticeCurrentNote: (event: NotationDraftEvent, eventIndex: number) => void;
  onPracticeRhythmTarget: () => void;
  progress: NotationTemporaryPracticeProgress | null;
  onToggleEventCompletion: (eventIndex: number) => void;
  onRestartPracticeRound: () => void;
};

const durationLabels = { half: "二分", quarter: "四分", eighth: "八分" } as const;

export function NotationTemporaryPracticePanel({ target, onGoToSheetMusic, onClear, onPracticeCurrentNote, onPracticeRhythmTarget, progress, onToggleEventCompletion, onRestartPracticeRound }: Props) {
  const [eventIndex, setEventIndex] = useState(0);
  const [isReferenceTonePlaying, setIsReferenceTonePlaying] = useState(false);
  const [referencePlaybackKind, setReferencePlaybackKind] = useState<"tone" | "melody" | null>(null);
  const [referenceToneError, setReferenceToneError] = useState("");
  const referenceToneContextRef = useRef<AudioContext | null>(null);
  const referenceToneOscillatorRef = useRef<OscillatorNode | null>(null);
  const referenceMelodyOscillatorsRef = useRef<OscillatorNode[]>([]);
  const referenceMelodyTimeoutRef = useRef<number | null>(null);

  const stopReferenceTone = () => {
    if (referenceMelodyTimeoutRef.current !== null) {
      window.clearTimeout(referenceMelodyTimeoutRef.current);
      referenceMelodyTimeoutRef.current = null;
    }
    const oscillator = referenceToneOscillatorRef.current;
    if (oscillator) {
      try { oscillator.stop(); } catch { /* The short tone may already have stopped. */ }
    }
    referenceToneOscillatorRef.current = null;
    for (const melodyOscillator of referenceMelodyOscillatorsRef.current) {
      try { melodyOscillator.stop(); } catch { /* The scheduled note may already have stopped. */ }
    }
    referenceMelodyOscillatorsRef.current = [];
    const context = referenceToneContextRef.current;
    referenceToneContextRef.current = null;
    if (context) void context.close();
    setIsReferenceTonePlaying(false);
    setReferencePlaybackKind(null);
  };

  useEffect(() => {
    setEventIndex(0);
    stopReferenceTone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.id]);

  useEffect(() => () => stopReferenceTone(), []);

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
  const isCurrentEventCompleted = progress?.completedEventIndexes.includes(eventIndex) ?? false;
  const completedEventCount = progress?.completedEventIndexes.length ?? 0;
  const isRoundComplete = isNotationTemporaryPracticeRoundComplete(progress, target);
  const referenceToneHz = isSightSinging && !isRest
    ? getNotationTargetPitchFrequencyHz(event.pitch)
    : null;

  const playReferenceTone = async () => {
    if (referenceToneHz === null) return;
    stopReferenceTone();
    setReferenceToneError("");

    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startTime = context.currentTime + 0.03;
      const durationSeconds = 0.9;

      referenceToneContextRef.current = context;
      referenceToneOscillatorRef.current = oscillator;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(referenceToneHz, startTime);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSeconds * 0.9);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + durationSeconds);
      setIsReferenceTonePlaying(true);
      setReferencePlaybackKind("tone");
      window.setTimeout(() => {
        if (referenceToneOscillatorRef.current === oscillator) stopReferenceTone();
      }, (durationSeconds + 0.15) * 1000);
    } catch {
      setReferenceToneError("当前浏览器无法播放参考音。你仍可继续查看音符并进行本地跟练。");
      stopReferenceTone();
    }
  };

  const playReferenceMelody = async () => {
    if (!isSightSinging) return;
    stopReferenceTone();
    setReferenceToneError("");

    try {
      const context = new AudioContext();
      const startTime = context.currentTime + 0.05;
      const plan = getNotationReferenceMelodyPlaybackPlan(target.events);
      const oscillators: OscillatorNode[] = [];

      referenceToneContextRef.current = context;
      for (const playbackEvent of plan) {
        if (playbackEvent.frequencyHz === null) continue;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const noteStartTime = startTime + playbackEvent.offsetSeconds;
        const noteEndTime = noteStartTime + playbackEvent.durationSeconds;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(playbackEvent.frequencyHz, noteStartTime);
        gain.gain.setValueAtTime(0.0001, noteStartTime);
        gain.gain.exponentialRampToValueAtTime(0.13, noteStartTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, Math.max(noteStartTime + 0.03, noteEndTime - 0.03));
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(noteStartTime);
        oscillator.stop(noteEndTime);
        oscillators.push(oscillator);
      }
      referenceMelodyOscillatorsRef.current = oscillators;
      setIsReferenceTonePlaying(true);
      setReferencePlaybackKind("melody");
      referenceMelodyTimeoutRef.current = window.setTimeout(() => stopReferenceTone(), (getNotationReferenceMelodyPlaybackDurationSeconds(target.events) + 0.2) * 1000);
    } catch {
      setReferenceToneError("当前浏览器无法播放参考旋律。你仍可逐个查看音符并进行本地跟练。");
      stopReferenceTone();
    }
  };

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
      <div className="mt-5 rounded-2xl border border-fuchsia-200 bg-white p-4 text-sm leading-6 text-fuchsia-950"><p className="font-semibold">本轮手动练习进度：{completedEventCount} / {target.events.length} 个事件已标记完成</p><p className="mt-1">此标记只帮助你安排本轮复练，不代表唱准、拍准、评分、通过或正式结果。</p></div>
      {isRoundComplete ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><p className="font-semibold">本轮事件已全部手动标记完成</p><p className="mt-1">这只表示你已按自己的判断完成本轮练习；不是系统评分或正式完成结果。你可以从头重新练习，或返回目标预览继续检查。</p></div> : null}
      <div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setEventIndex((current) => Math.max(0, current - 1))} disabled={eventIndex === 0} className="rounded-full border border-fuchsia-300 px-4 py-2 text-sm font-semibold text-fuchsia-800 disabled:text-slate-400">上一个事件</button><button type="button" onClick={() => setEventIndex((current) => Math.min(target.events.length - 1, current + 1))} disabled={eventIndex === target.events.length - 1} className="rounded-full bg-fuchsia-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-fuchsia-300">下一个事件</button><button type="button" onClick={() => onToggleEventCompletion(eventIndex)} className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900">{isCurrentEventCompleted ? "取消本事件完成标记" : "标记本事件已练习"}</button><button type="button" onClick={() => { setEventIndex(0); onRestartPracticeRound(); }} className="rounded-full border border-fuchsia-300 px-4 py-2 text-sm font-semibold text-fuchsia-800">从头重新练习</button></div>
      {isSightSinging ? <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-left text-sm text-violet-950"><p className="font-semibold">本地参考与跟练</p><p className="mt-1 leading-6">可主动播放整段参考旋律；播放会保留休止时长。当前音符不是休止时，还可播放一次短参考音或进入现有的浏览器本地录音与音高估计查看参考提示。播放中可随时停止。不会自动播放、自动打开麦克风，也不是正式评分。</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void playReferenceMelody()} disabled={isReferenceTonePlaying} className="rounded-full border border-violet-300 px-4 py-2 font-semibold text-violet-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400">{referencePlaybackKind === "melody" ? "正在播放参考旋律" : "播放完整参考旋律"}</button>{!isRest ? <><button type="button" onClick={() => void playReferenceTone()} disabled={isReferenceTonePlaying || referenceToneHz === null} className="rounded-full border border-violet-300 px-4 py-2 font-semibold text-violet-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400">{referencePlaybackKind === "tone" ? "正在播放参考音" : "播放当前参考音"}</button><button type="button" onClick={() => onPracticeCurrentNote(event, eventIndex)} className="rounded-full bg-violet-700 px-4 py-2 font-semibold text-white">使用当前音符进行本地跟练</button></> : null}{isReferenceTonePlaying ? <button type="button" onClick={stopReferenceTone} className="rounded-full border border-rose-300 bg-white px-4 py-2 font-semibold text-rose-700">停止参考播放</button> : null}</div>{isRest ? <p className="mt-3 text-slate-700">当前是休止事件，不提供单音跟练；完整参考旋律会保留这段安静时长。</p> : null}{referenceToneError ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">{referenceToneError}</p> : null}</div> : <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-left text-sm text-indigo-950"><p className="font-semibold">此临时节奏目标的本地拍击练习</p><p className="mt-1 leading-6">主动进入后，可复用现有浏览器节拍器与 tap / 空格键输入，按非休止事件的起点获得非评分节奏提示。不会打开麦克风，不会生成正式成绩。</p><button type="button" onClick={onPracticeRhythmTarget} className="mt-3 rounded-full bg-indigo-700 px-4 py-2 font-semibold text-white">使用此临时节奏目标进行拍击练习</button></div>}
      <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={onGoToSheetMusic} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">返回目标预览</button><button type="button" onClick={onClear} className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700">清除临时目标</button></div>
    </section>
  );
}
