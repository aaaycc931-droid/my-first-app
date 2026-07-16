"use client";

import { useRealtimePitchMonitor } from "./useRealtimePitchMonitor";

const frameCopy = {
  quiet: "声音太轻，正在等待较稳定的单音。",
  uncertain: "当前声音不足以可靠判断，请持续唱一个清晰单音。",
  "out-of-range": "检测到的频率超出当前人声观察范围。",
  reliable: "已获得当前可靠音高帧。",
} as const;

const displayNote = (note: string | null): string => note?.replace("#", "♯") ?? "—";

export function RealtimePitchMonitorPanel() {
  const monitor = useRealtimePitchMonitor();
  const isActive = monitor.status === "requesting" || monitor.status === "listening";
  const reliable = monitor.frame?.state === "reliable" ? monitor.frame : null;

  return (
    <section className="rounded-3xl border border-cyan-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold tracking-wide text-cyan-700">本地麦克风</p>
      <h1 className="mt-1 text-2xl font-black text-slate-950">实时音高反馈</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        点击开始后，应用只在手机内存中读取麦克风帧并显示当前音名、频率和偏移趋势；不录音、不保存、不上传，也不生成分数、等级或通过判断。
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
      </div>

      {monitor.error ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="alert"><p className="font-bold">无法使用麦克风</p><p className="mt-1">{monitor.error}</p></div> : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => void monitor.start()} disabled={isActive} className="min-h-12 rounded-xl bg-cyan-700 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-cyan-300">{monitor.status === "requesting" ? "正在请求权限…" : monitor.status === "listening" ? "正在监听" : "开始实时反馈"}</button>
        <button type="button" onClick={monitor.stop} disabled={!isActive} className="min-h-12 rounded-xl border border-cyan-300 bg-white px-5 py-3 font-bold text-cyan-900 disabled:cursor-not-allowed disabled:opacity-50">停止监听</button>
        <button type="button" onClick={monitor.clear} disabled={!monitor.frame && !monitor.error && monitor.status === "idle"} className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50">停止并清空</button>
      </div>

      <div className="mt-5 rounded-2xl bg-cyan-50 p-4 text-sm leading-6 text-cyan-950">
        <p className="font-bold">使用提示</p>
        <ul className="mt-2 grid gap-1"><li>• 手机距离嘴部约 20–40 厘米，尽量避开风声和伴奏。</li><li>• 扬声器播放参考音时先停止监听，避免把参考音当作你的声音。</li><li>• “不足以判断”是正常保护状态，不会强行显示一个可能错误的音名。</li></ul>
      </div>
    </section>
  );
}
