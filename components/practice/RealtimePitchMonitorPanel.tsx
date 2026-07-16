"use client";

import { useState } from "react";

import { midiToScientificNote } from "../../lib/practice/realtimePitchCurve";
import type { GeneratedLocalVocalExercise } from "../../lib/practice/localVocalExercise";
import { getLocalVocalTargetFeedback } from "../../lib/practice/localVocalTargetFeedback";
import { RealtimePitchCurveChart } from "./RealtimePitchCurveChart";
import { useRealtimePitchMonitor } from "./useRealtimePitchMonitor";

const frameCopy = {
  quiet: "声音太轻，正在等待较稳定的单音。",
  uncertain: "当前声音不足以可靠判断，请持续唱一个清晰单音。",
  "out-of-range": "检测到的频率超出当前人声观察范围。",
  reliable: "已获得当前可靠音高帧。",
} as const;

const displayNote = (note: string | null): string => note?.replace("#", "♯") ?? "—";

export function RealtimePitchMonitorPanel({ targetExercise = null }: { targetExercise?: GeneratedLocalVocalExercise | null }) {
  const monitor = useRealtimePitchMonitor();
  const [windowSeconds, setWindowSeconds] = useState(10);
  const [targetMidi, setTargetMidi] = useState(69);
  const isActive = monitor.status === "requesting" || monitor.status === "listening";
  const reliable = monitor.frame?.state === "reliable" ? monitor.frame : null;
  const targetFeedback = getLocalVocalTargetFeedback(monitor.curvePoints, targetExercise?.events ?? [], monitor.listeningStartedAtMs);
  const targetFeedbackCopy = targetFeedback.state === "close" ? "接近目标音" : targetFeedback.state === "high" ? "当前偏高" : targetFeedback.state === "low" ? "当前偏低" : targetFeedback.state === "unreliable" ? "当前不足以可靠判断" : "等待目标时段或稳定人声";

  return (
    <section className="rounded-3xl border border-cyan-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold tracking-wide text-cyan-700">本地麦克风</p>
      <h1 className="mt-1 text-2xl font-black text-slate-950">实时音高反馈</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        点击开始后，应用只在手机内存中读取麦克风帧并显示当前音名、频率和偏移趋势。录音也必须再次主动开始，默认只留在本次页面会话；不自动保存、不上传，也不生成分数、等级或通过判断。
      </p>

      <div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white" aria-live="polite">
        <p className="text-sm font-semibold text-cyan-200">
          {monitor.status === "requesting" ? "正在请求麦克风权限…" : monitor.status === "listening" ? "正在本地监听" : monitor.status === "error" ? "麦克风未启动" : "尚未开始"}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-slate-300">当前音名</p><p className="mt-1 text-4xl font-black">{displayNote(reliable?.nearestNote ?? null)}</p></div>
          <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-slate-300">当前频率</p><p className="mt-1 text-2xl font-black">{reliable?.frequencyHz ? `${reliable.frequencyHz.toFixed(1)} Hz` : "—"}</p></div>
          <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-slate-300">相对最近音</p><p className="mt-1 text-2xl font-black">{reliable?.centsOffset !== null && reliable?.centsOffset !== undefined ? `${reliable.centsOffset >= 0 ? "+" : ""}${reliable.centsOffset.toFixed(1)} cents` : "—"}</p></div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          {monitor.frame ? frameCopy[monitor.frame.state] : "开始后请持续唱一个清晰、稳定的单音。"}
        </p>
        <RealtimePitchCurveChart points={monitor.curvePoints} windowSeconds={windowSeconds} targetMidi={targetMidi} targetEvents={targetExercise?.events} targetStartedAtMs={monitor.listeningStartedAtMs} />
        {targetExercise ? <div className="mt-3 rounded-xl border border-lime-700/60 bg-lime-950/40 p-3 text-sm"><p className="font-bold text-lime-200">练声目标对照（非评分）</p><p className="mt-1 text-white">{targetFeedbackCopy}{targetFeedback.cents !== null ? `：${targetFeedback.cents >= 0 ? "+" : ""}${targetFeedback.cents.toFixed(0)} cents` : ""}</p></div> : null}
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-bold text-slate-900">时间窗口</legend>
          <div className="mt-2 flex gap-2" aria-label="曲线时间缩放">
            {[5, 10, 15].map((seconds) => <button key={seconds} type="button" aria-pressed={windowSeconds === seconds} onClick={() => setWindowSeconds(seconds)} className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-sm font-bold ${windowSeconds === seconds ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-800"}`}>{seconds} 秒</button>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-bold text-slate-900">目标参考线（不计分）</legend>
          <div className="mt-2 grid grid-cols-[44px_1fr_44px] items-center gap-2">
            <button type="button" aria-label="目标音降低半音" onClick={() => setTargetMidi((value) => Math.max(48, value - 1))} className="min-h-11 rounded-xl border border-slate-300 bg-white text-xl font-black">−</button>
            <output className="text-center text-lg font-black text-slate-950" aria-live="polite">{midiToScientificNote(targetMidi)}</output>
            <button type="button" aria-label="目标音升高半音" onClick={() => setTargetMidi((value) => Math.min(84, value + 1))} className="min-h-11 rounded-xl border border-slate-300 bg-white text-xl font-black">＋</button>
          </div>
        </fieldset>
      </div>

      {monitor.error ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="alert"><p className="font-bold">无法使用麦克风</p><p className="mt-1">{monitor.error}</p></div> : null}

      <section className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4" aria-labelledby="session-recording-title">
        <h2 id="session-recording-title" className="font-black text-violet-950">本次会话录音与回放</h2>
        <p className="mt-1 text-sm leading-6 text-violet-900">录音只保存在当前页面内存，离开页面或点击丢弃后不可恢复。回放前会停止麦克风监听，避免扬声器声音被当作你的演唱。</p>
        <p className="mt-2 text-sm font-bold text-violet-950" aria-live="polite">状态：{monitor.recordingStatus === "recording" ? "正在录音" : monitor.recordingStatus === "ready" ? "可以回放" : monitor.recordingStatus === "playing" ? "正在回放" : monitor.recordingStatus === "error" ? "录音或回放失败" : "尚未录音"}</p>
        {monitor.recordingError ? <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{monitor.recordingError}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={monitor.startRecording} disabled={monitor.status !== "listening" || monitor.recordingStatus === "recording" || monitor.recordingStatus === "playing"} className="min-h-11 rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-violet-300">开始会话录音</button>
          <button type="button" onClick={monitor.stopRecording} disabled={monitor.recordingStatus !== "recording"} className="min-h-11 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-950 disabled:cursor-not-allowed disabled:opacity-50">停止录音</button>
          <button type="button" onClick={() => void monitor.playRecording()} disabled={!monitor.hasRecording || monitor.recordingStatus === "playing" || monitor.recordingStatus === "recording"} className="min-h-11 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-950 disabled:cursor-not-allowed disabled:opacity-50">播放本次录音</button>
          <button type="button" onClick={monitor.stopPlayback} disabled={monitor.recordingStatus !== "playing"} className="min-h-11 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-950 disabled:cursor-not-allowed disabled:opacity-50">停止回放</button>
          <button type="button" onClick={monitor.discardRecording} disabled={monitor.recordingStatus === "empty"} className="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 disabled:cursor-not-allowed disabled:opacity-50">丢弃本次录音</button>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => void monitor.start()} disabled={isActive} className="min-h-12 rounded-xl bg-cyan-700 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-cyan-300">{monitor.status === "requesting" ? "正在请求权限…" : monitor.status === "listening" ? "正在监听" : "开始实时反馈"}</button>
        <button type="button" onClick={monitor.stop} disabled={!isActive} className="min-h-12 rounded-xl border border-cyan-300 bg-white px-5 py-3 font-bold text-cyan-900 disabled:cursor-not-allowed disabled:opacity-50">停止监听</button>
        <button type="button" onClick={monitor.clear} disabled={!monitor.frame && monitor.curvePoints.length === 0 && !monitor.error && monitor.status === "idle"} className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50">停止并清空曲线</button>
      </div>

      <div className="mt-5 rounded-2xl bg-cyan-50 p-4 text-sm leading-6 text-cyan-950">
        <p className="font-bold">使用提示</p>
        <ul className="mt-2 grid gap-1"><li>• 手机距离嘴部约 20–40 厘米，尽量避开风声和伴奏。</li><li>• 扬声器播放参考音时先停止监听，避免把参考音当作你的声音。</li><li>• “不足以判断”是正常保护状态，不会强行显示一个可能错误的音名。</li></ul>
      </div>
    </section>
  );
}
