"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { adaptLocalVocalMicrophoneActivityEvidence, createLocalVocalMicrophoneActivityDefinition } from "../../lib/activity/localVocalMicrophoneActivityAdapter";
import type { ActivityCheckEvidence } from "../../lib/activity/activitySession";
import { midiToScientificNote } from "../../lib/practice/realtimePitchCurve";
import { generateLocalVocalExercise, localVocalExerciseManifest, type GeneratedLocalVocalExercise } from "../../lib/practice/localVocalExercise";
import { getLocalVocalTargetFeedback } from "../../lib/practice/localVocalTargetFeedback";
import { RealtimePitchCurveChart } from "./RealtimePitchCurveChart";
import { LocalVocalObservationPanel } from "./LocalVocalObservationPanel";
import { OfflinePitchAnalysisPanel } from "./OfflinePitchAnalysisPanel";
import type { OfflinePitchAnalysisInvalidationDetail, OfflinePitchAnalysisReadyDetail } from "./OfflinePitchAnalysisPanel";
import { ActivityProtocolState } from "./ActivityProtocolState";
import { useChoiceActivitySession } from "./useChoiceActivitySession";
import { useRealtimePitchMonitor } from "./useRealtimePitchMonitor";
import { createBrowserAudioChannel, stopAllBrowserAudio, subscribeBrowserAudioStopAll } from "../../lib/audio/browserAudioEngine";
import {
  clearLocalVocalPracticeRecords,
  createLocalVocalPracticeRecord,
  deleteLocalVocalPracticeRecord,
  listLocalVocalPracticeRecords,
  saveLocalVocalPracticeRecord,
  serializeLocalVocalPracticeRecord,
  type LocalVocalPracticeRecord,
} from "../../mobile/src/runtime/localVocalPracticeStorage";

const frameCopy = {
  quiet: "声音太轻，正在等待较稳定的单音。",
  uncertain: "当前声音不足以可靠判断，请持续唱一个清晰单音。",
  "out-of-range": "检测到的频率超出当前人声观察范围。",
  reliable: "已获得当前可靠音高帧。",
} as const;

const displayNote = (note: string | null): string => note?.replace("#", "♯") ?? "—";

const fixedA4ActivityExercise = generateLocalVocalExercise({
  patternId: "single",
  rootMidi: 69,
  direction: "ascending",
  bpm: 60,
  octaveShift: 0,
  loops: 1,
  referenceMode: "full",
  intervalSemitones: 7,
});
const fixedA4ActivityDefinition = createLocalVocalMicrophoneActivityDefinition(fixedA4ActivityExercise);

type PendingA4ActivityCheck = {
  attemptId: string;
  recording: Blob;
  checkEvidence: ActivityCheckEvidence;
};

export function RealtimePitchMonitorPanel({ targetExercise = null }: { targetExercise?: GeneratedLocalVocalExercise | null }) {
  const monitor = useRealtimePitchMonitor();
  const a4Activity = useChoiceActivitySession(fixedA4ActivityDefinition, "local-vocal-a4-microphone-session");
  const [windowSeconds, setWindowSeconds] = useState(10);
  const [targetMidi, setTargetMidi] = useState(69);
  const [recordNote, setRecordNote] = useState("");
  const [records, setRecords] = useState<LocalVocalPracticeRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LocalVocalPracticeRecord | null>(null);
  const [storageNotice, setStorageNotice] = useState("");
  const [confirmClearRecords, setConfirmClearRecords] = useState(false);
  const [isStorageLoading, setIsStorageLoading] = useState(true);
  const [storageBusy, setStorageBusy] = useState(false);
  const [playingSavedRecordId, setPlayingSavedRecordId] = useState<string | null>(null);
  const [recordingTargetSnapshot, setRecordingTargetSnapshot] = useState<GeneratedLocalVocalExercise | null>(null);
  const [pendingA4ActivityCheck, setPendingA4ActivityCheck] = useState<PendingA4ActivityCheck | null>(null);
  const [a4ReferenceError, setA4ReferenceError] = useState("");
  const a4RecordingAttemptIdRef = useRef<string | null>(null);
  const a4ReferenceChannelRef = useRef<ReturnType<typeof createBrowserAudioChannel> | null>(null);
  const savedPlaybackRef = useRef<HTMLAudioElement | null>(null);
  const savedPlaybackUrlRef = useRef<string | null>(null);
  const isActive = monitor.status === "requesting" || monitor.status === "listening";
  const reliable = monitor.frame?.state === "reliable" ? monitor.frame : null;
  const targetFeedback = getLocalVocalTargetFeedback(monitor.curvePoints, targetExercise?.events ?? [], monitor.listeningStartedAtMs);
  const targetLabel = localVocalExerciseManifest.find((pattern) => pattern.id === targetExercise?.config.patternId)?.title ?? "自由练唱";
  const targetFeedbackCopy = targetFeedback.state === "close" ? "接近目标音" : targetFeedback.state === "high" ? "当前偏高" : targetFeedback.state === "low" ? "当前偏低" : targetFeedback.state === "unreliable" ? "当前不足以可靠判断" : "等待目标时段或稳定人声";

  const stopSavedPlayback = useCallback(() => {
    savedPlaybackRef.current?.pause();
    savedPlaybackRef.current = null;
    if (savedPlaybackUrlRef.current) URL.revokeObjectURL(savedPlaybackUrlRef.current);
    savedPlaybackUrlRef.current = null;
    setPlayingSavedRecordId(null);
  }, []);

  useEffect(() => {
    let active = true;
    void listLocalVocalPracticeRecords().then((items) => { if (active) setRecords(items); }).catch(() => { if (active) setStorageNotice("本机记录暂时不可用；实时练习不受影响。"); }).finally(() => { if (active) setIsStorageLoading(false); });
    return () => { active = false; stopSavedPlayback(); };
  }, [stopSavedPlayback]);

  useEffect(() => subscribeBrowserAudioStopAll(stopSavedPlayback), [stopSavedPlayback]);

  useEffect(() => () => a4ReferenceChannelRef.current?.stop(), []);

  const saveSession = async () => {
    if (storageBusy || isStorageLoading) return;
    setStorageBusy(true);
    try {
      const record = createLocalVocalPracticeRecord({ note: recordNote, targetLabel, targetMidi, curvePoints: monitor.curvePoints, recording: monitor.recordingBlob });
      await saveLocalVocalPracticeRecord(record);
      setRecords((items) => [record, ...items.filter((item) => item.id !== record.id)]);
      setSelectedRecord(record);
      setRecordNote("");
      setStorageNotice("已保存到本机应用私有记录。卸载或清除应用数据会删除记录。");
    } catch (caught) { setStorageNotice(caught instanceof Error ? caught.message : "无法保存本机记录"); }
    finally { setStorageBusy(false); }
  };

  const playSavedRecording = async (record: LocalVocalPracticeRecord) => {
    if (!record.recording) return;
    stopAllBrowserAudio();
    stopSavedPlayback();
    try {
      const url = URL.createObjectURL(record.recording);
      const audio = new Audio(url);
      savedPlaybackUrlRef.current = url;
      savedPlaybackRef.current = audio;
      setPlayingSavedRecordId(record.id);
      audio.onended = stopSavedPlayback;
      audio.onerror = () => { stopSavedPlayback(); setStorageNotice("无法回放这条本机录音。"); };
      await audio.play();
    } catch { stopSavedPlayback(); setStorageNotice("系统阻止了本机录音回放，请重试。"); }
  };

  const exportRecord = (record: LocalVocalPracticeRecord) => {
    const url = URL.createObjectURL(new Blob([serializeLocalVocalPracticeRecord(record)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `视唱练耳-${record.createdAt.slice(0, 10)}-${record.id.slice(0, 8)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const startMonitoring = () => { stopSavedPlayback(); void monitor.start(); };
  const playA4Reference = async () => {
    stopSavedPlayback();
    stopAllBrowserAudio();
    setA4ReferenceError("");
    try {
      const channel = a4ReferenceChannelRef.current ?? createBrowserAudioChannel();
      a4ReferenceChannelRef.current = channel;
      const context = await channel.prepareForUserGesture();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startAt = context.currentTime + 0.03;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.16, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.85);
      oscillator.connect(gain);
      gain.connect(context.destination);
      channel.trackSource(oscillator, [gain]);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.9);
    } catch {
      setA4ReferenceError("当前设备无法播放 A4 参考音。你仍可查看目标并稍后重试。");
    }
  };
  const playCurrentRecording = () => { stopSavedPlayback(); void monitor.playRecording(); };
  const startSessionRecording = () => {
    setPendingA4ActivityCheck(null);
    a4Activity.restartIfDirty();
    a4RecordingAttemptIdRef.current = null;
    setRecordingTargetSnapshot(targetExercise ? {
      ...targetExercise,
      config: { ...targetExercise.config },
      events: targetExercise.events.map((event) => ({ ...event })),
      playbackEvents: targetExercise.playbackEvents.map((event) => ({ ...event })),
    } : null);
    monitor.startRecording();
  };
  const startA4ActivityRecording = () => {
    const current = a4Activity.session;
    const dirty = current.lifecycle !== "ready" || current.answer !== undefined || current.checkEvidence !== undefined;
    const attemptId = dirty
      ? `${current.sessionId}:attempt:${current.attemptNumber + 1}`
      : current.attemptId;
    if (dirty) a4Activity.restart();
    setPendingA4ActivityCheck(null);
    a4RecordingAttemptIdRef.current = attemptId;
    setRecordingTargetSnapshot(fixedA4ActivityExercise);
    monitor.startRecording();
  };
  const discardSessionRecording = () => {
    setRecordingTargetSnapshot(null);
    setPendingA4ActivityCheck(null);
    a4RecordingAttemptIdRef.current = null;
    a4Activity.restartIfDirty();
    monitor.discardRecording();
  };

  const handleAnalysisReady = (detail: OfflinePitchAnalysisReadyDetail) => {
    const attemptId = a4RecordingAttemptIdRef.current;
    if (
      !attemptId
      || detail.recording !== monitor.recordingBlob
      || attemptId !== a4Activity.session.attemptId
      || recordingTargetSnapshot !== fixedA4ActivityExercise
    ) return;
    const bundle = adaptLocalVocalMicrophoneActivityEvidence({
      definition: fixedA4ActivityDefinition,
      attemptId,
      result: detail.noteAlignment,
    });
    if (!bundle.answer) return;
    a4Activity.submitAnswer(bundle.answer);
    setPendingA4ActivityCheck({ attemptId, recording: detail.recording, checkEvidence: bundle.checkEvidence });
  };

  const handleAnalysisInvalidated = (detail: OfflinePitchAnalysisInvalidationDetail) => {
    setPendingA4ActivityCheck(null);
    a4Activity.restartIfDirty();
    if (
      detail.reason === "analysis-cleared"
      || (detail.nextRecording === null && monitor.recordingStatus !== "recording")
    ) {
      a4RecordingAttemptIdRef.current = null;
    }
  };

  const checkA4ActivityEvidence = () => {
    if (
      !pendingA4ActivityCheck
      || pendingA4ActivityCheck.attemptId !== a4Activity.session.attemptId
      || pendingA4ActivityCheck.recording !== monitor.recordingBlob
      || a4Activity.session.lifecycle !== "answering"
    ) return;
    a4Activity.completeCheck(pendingA4ActivityCheck.checkEvidence);
    setPendingA4ActivityCheck(null);
  };

  const retryA4Activity = () => {
    monitor.clear();
    setRecordingTargetSnapshot(null);
    setPendingA4ActivityCheck(null);
    a4RecordingAttemptIdRef.current = null;
    a4Activity.restart();
  };

  const deleteRecord = async (record: LocalVocalPracticeRecord) => {
    if (storageBusy) return;
    setStorageBusy(true);
    stopSavedPlayback();
    try {
      await deleteLocalVocalPracticeRecord(record.id);
      setRecords((items) => items.filter((item) => item.id !== record.id));
      if (selectedRecord?.id === record.id) setSelectedRecord(null);
    } catch { setStorageNotice("删除失败，请重试。"); }
    finally { setStorageBusy(false); }
  };

  const clearRecords = async () => {
    if (storageBusy) return;
    setStorageBusy(true);
    stopSavedPlayback();
    try {
      await clearLocalVocalPracticeRecords();
      setRecords([]);
      setSelectedRecord(null);
      setConfirmClearRecords(false);
    } catch { setStorageNotice("清除失败，请重试。"); }
    finally { setStorageBusy(false); }
  };

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
      <LocalVocalObservationPanel points={monitor.curvePoints} />

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
          <button type="button" onClick={startSessionRecording} disabled={monitor.status !== "listening" || monitor.recordingStatus === "recording" || monitor.recordingStatus === "playing"} className="min-h-11 rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-violet-300">开始会话录音</button>
          <button type="button" onClick={monitor.stopRecording} disabled={monitor.recordingStatus !== "recording"} className="min-h-11 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-950 disabled:cursor-not-allowed disabled:opacity-50">停止录音</button>
          <button type="button" onClick={playCurrentRecording} disabled={!monitor.hasRecording || monitor.recordingStatus === "playing" || monitor.recordingStatus === "recording"} className="min-h-11 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-950 disabled:cursor-not-allowed disabled:opacity-50">播放本次录音</button>
          <button type="button" onClick={monitor.stopPlayback} disabled={monitor.recordingStatus !== "playing"} className="min-h-11 rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-bold text-violet-950 disabled:cursor-not-allowed disabled:opacity-50">停止回放</button>
          <button type="button" onClick={discardSessionRecording} disabled={monitor.recordingStatus === "empty"} className="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 disabled:cursor-not-allowed disabled:opacity-50">丢弃本次录音</button>
        </div>
        <section className="mt-4 rounded-2xl border border-cyan-200 bg-white p-4" aria-labelledby="a4-microphone-activity-title">
          <h3 id="a4-microphone-activity-title" className="font-black text-cyan-950">A4 单音长音活动</h3>
          <p className="mt-1 text-sm leading-6 text-cyan-900">固定目标 A4 · 440 Hz。请先主动开始实时反馈，再单独开始活动录音；分析证据只属于本次尝试，不自动保存，也不生成分数。</p>
          <ActivityProtocolState session={a4Activity.session} />
          {a4Activity.session.checkEvidence ? <p className="mt-2 rounded-xl bg-cyan-50 p-3 text-sm leading-6 text-cyan-950" role="status">{a4Activity.session.checkEvidence.explanation}</p> : null}
          {a4ReferenceError ? <p className="mt-2 text-sm text-amber-800" role="alert">{a4ReferenceError}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void playA4Reference()} className="min-h-11 rounded-xl border border-cyan-300 bg-white px-4 py-2 text-sm font-bold text-cyan-950">播放 A4 参考音</button>
            <button type="button" onClick={startA4ActivityRecording} disabled={monitor.status !== "listening" || monitor.recordingStatus === "recording" || monitor.recordingStatus === "playing"} className="min-h-11 rounded-xl bg-cyan-800 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">开始 A4 活动录音</button>
            <button type="button" onClick={checkA4ActivityEvidence} disabled={!pendingA4ActivityCheck || a4Activity.session.lifecycle !== "answering"} className="min-h-11 rounded-xl border border-cyan-300 bg-white px-4 py-2 text-sm font-bold text-cyan-950 disabled:cursor-not-allowed disabled:opacity-50">检查本次 A4 证据</button>
            <button type="button" onClick={retryA4Activity} disabled={a4Activity.session.lifecycle === "ready" && !monitor.recordingBlob && !pendingA4ActivityCheck} className="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 disabled:cursor-not-allowed disabled:opacity-50">重新尝试 A4</button>
          </div>
        </section>
        <OfflinePitchAnalysisPanel
          recording={monitor.recordingBlob}
          onBeforeAnalyze={() => { stopSavedPlayback(); monitor.stopPlayback(); monitor.stop(); }}
          targetExercise={recordingTargetSnapshot}
          recordingStartedAtMs={monitor.recordingStartedAtMs}
          targetStartedAtMs={recordingTargetSnapshot === fixedA4ActivityExercise ? monitor.recordingStartedAtMs : monitor.listeningStartedAtMs}
          onAnalysisReady={handleAnalysisReady}
          onAnalysisInvalidated={handleAnalysisInvalidated}
        />
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={startMonitoring} disabled={isActive} className="min-h-12 rounded-xl bg-cyan-700 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-cyan-300">{monitor.status === "requesting" ? "正在请求权限…" : monitor.status === "listening" ? "正在监听" : "开始实时反馈"}</button>
        <button type="button" onClick={monitor.stop} disabled={!isActive} className="min-h-12 rounded-xl border border-cyan-300 bg-white px-5 py-3 font-bold text-cyan-900 disabled:cursor-not-allowed disabled:opacity-50">停止监听</button>
        <button type="button" onClick={monitor.clear} disabled={!monitor.frame && monitor.curvePoints.length === 0 && !monitor.error && monitor.status === "idle"} className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50">停止并清空曲线</button>
      </div>

      <div className="mt-5 rounded-2xl bg-cyan-50 p-4 text-sm leading-6 text-cyan-950">
        <p className="font-bold">使用提示</p>
        <ul className="mt-2 grid gap-1"><li>• 手机距离嘴部约 20–40 厘米，尽量避开风声和伴奏。</li><li>• 扬声器播放参考音时先停止监听，避免把参考音当作你的声音。</li><li>• “不足以判断”是正常保护状态，不会强行显示一个可能错误的音名。</li></ul>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="local-records-title">
        <h2 id="local-records-title" className="font-black text-slate-950">本机练声记录</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">只有点击保存才写入应用私有 IndexedDB；不上传。最多 20 条，单条录音最多 5 MB。导出 JSON 包含曲线和目标摘要，不包含录音文件。</p>
        <label className="mt-3 block text-sm font-bold text-slate-900">本次备注（最多 200 字）<textarea value={recordNote} maxLength={200} onChange={(event) => setRecordNote(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" /></label>
        <button type="button" onClick={() => void saveSession()} disabled={isStorageLoading || storageBusy || (monitor.curvePoints.length === 0 && !monitor.recordingBlob)} className="mt-3 min-h-11 rounded-xl bg-slate-900 px-4 font-bold text-white disabled:bg-slate-300">{storageBusy ? "正在处理…" : "保存当前曲线与录音"}</button>
        {storageNotice ? <p className="mt-2 text-sm text-slate-700" role="status">{storageNotice}</p> : null}
        <div className="mt-4 grid gap-2">{records.map((record) => { const accessibleName = `${new Date(record.createdAt).toLocaleString("zh-CN")} ${record.targetLabel}`; return <article key={record.id} className="rounded-xl border border-slate-200 bg-white p-3"><p className="font-bold text-slate-950">{accessibleName}</p><p className="mt-1 text-sm text-slate-600">{record.curvePoints.length} 帧 · {record.recording ? "含录音" : "仅曲线"}{record.note ? ` · ${record.note}` : ""}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" aria-label={`回看曲线：${accessibleName}`} aria-pressed={selectedRecord?.id === record.id} onClick={() => setSelectedRecord(record)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold">回看曲线</button>{record.recording ? <button type="button" aria-label={`${playingSavedRecordId === record.id ? "停止" : "回放"}录音：${accessibleName}`} onClick={() => playingSavedRecordId === record.id ? stopSavedPlayback() : void playSavedRecording(record)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold">{playingSavedRecordId === record.id ? "停止回放" : "回放录音"}</button> : null}<button type="button" aria-label={`导出 JSON：${accessibleName}`} onClick={() => exportRecord(record)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold">导出 JSON</button><button type="button" aria-label={`删除：${accessibleName}`} disabled={storageBusy} onClick={() => void deleteRecord(record)} className="min-h-10 rounded-lg border border-rose-300 px-3 text-sm font-bold text-rose-800 disabled:opacity-50">删除</button></div></article>; })}</div>
        {selectedRecord ? <div className="mt-4"><RealtimePitchCurveChart points={selectedRecord.curvePoints} windowSeconds={Math.min(15, Math.max(5, Math.ceil((((selectedRecord.curvePoints[selectedRecord.curvePoints.length - 1]?.timestampMs) ?? 0) - (selectedRecord.curvePoints[0]?.timestampMs ?? 0)) / 1_000)))} targetMidi={selectedRecord.targetMidi} /><LocalVocalObservationPanel points={selectedRecord.curvePoints} label="已保存片段" /></div> : null}
        {records.length > 0 ? <div className="mt-4">{confirmClearRecords ? <div className="flex flex-wrap items-center gap-2" role="alert" aria-live="assertive"><span className="text-sm font-bold text-rose-900">确认清除全部本机练声记录？</span><button type="button" disabled={storageBusy} onClick={() => void clearRecords()} className="min-h-10 rounded-lg bg-rose-700 px-3 text-sm font-bold text-white disabled:opacity-50">确认全部清除</button><button type="button" onClick={() => setConfirmClearRecords(false)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold">取消</button></div> : <button type="button" onClick={() => setConfirmClearRecords(true)} className="min-h-10 rounded-lg border border-rose-300 px-3 text-sm font-bold text-rose-800">清除全部记录</button>}</div> : null}
      </section>
    </section>
  );
}
