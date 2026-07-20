"use client";

import { useMemo, useRef, useState } from "react";

import { noteNameToMidi } from "../../lib/audio/noteFrequency";
import {
  adaptLocalIntervalImitationActivityEvidence,
  createLocalIntervalImitationActivityDefinition,
} from "../../lib/activity/localVocalMicrophoneActivityAdapter";
import type { ActivityCheckEvidence } from "../../lib/activity/activitySession";
import type { LocalIntervalComparisonQuestion } from "../../lib/practice/localIntervalComparisons";
import { generateLocalVocalExercise, type GeneratedLocalVocalExercise } from "../../lib/practice/localVocalExercise";
import type { OfflinePitchAnalysisInvalidationDetail, OfflinePitchAnalysisReadyDetail } from "./OfflinePitchAnalysisPanel";
import { OfflinePitchAnalysisPanel } from "./OfflinePitchAnalysisPanel";
import { ActivityProtocolState } from "./ActivityProtocolState";
import { useChoiceActivitySession } from "./useChoiceActivitySession";
import { useLocalAudioPlayback } from "./useLocalAudioPlayback";
import { useRealtimePitchMonitor } from "./useRealtimePitchMonitor";

type Group = "first" | "second";

export function LocalIntervalImitationPanel({ question }: { question: LocalIntervalComparisonQuestion }) {
  const [group, setGroup] = useState<Group>("first");
  return (
    <section className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
      <p className="text-sm font-semibold text-cyan-800">可选：非评分模唱反馈</p>
      <h3 className="mt-1 text-lg font-black text-cyan-950">模唱根音、目标音、根音</h3>
      <p className="mt-1 text-sm leading-6 text-cyan-900">录音只留在当前页面内存，只在你二次确认后本机分析。反馈仅表达接近、偏高、偏低或证据不足；不是分数、等级、通过／失败或专业声乐评估。</p>
      <div className="mt-3 flex gap-2">
        {(["first", "second"] as Group[]).map((candidate) => <button key={candidate} type="button" aria-pressed={group === candidate} onClick={() => setGroup(candidate)} className={`rounded-xl border px-3 py-2 text-sm font-bold ${group === candidate ? "border-cyan-700 bg-cyan-100 text-cyan-950" : "border-cyan-200 bg-white text-cyan-800"}`}>{candidate === "first" ? "模唱第一组" : "模唱第二组"}</button>)}
      </div>
      <IntervalImitationAttempt key={`${question.variantId}:${group}`} question={question} group={group} />
    </section>
  );
}

function IntervalImitationAttempt({ question, group }: { question: LocalIntervalComparisonQuestion; group: Group }) {
  const source = group === "first" ? question.first : question.second;
  const rootMidi = noteNameToMidi(source.rootLabel);
  if (rootMidi === null) throw new Error("音程模唱根音无效。");
  const exercise = useMemo(() => generateLocalVocalExercise({
    patternId: "interval",
    rootMidi,
    direction: source.direction === "上行" ? "ascending" : "descending",
    bpm: 60,
    octaveShift: 0,
    loops: 1,
    referenceMode: "full",
    intervalSemitones: source.interval.semitones,
  }), [rootMidi, source.direction, source.interval.semitones]);
  const groupLabel = group === "first" ? "第一组" : "第二组";
  const definition = useMemo(() => createLocalIntervalImitationActivityDefinition({
    exercise, comparisonVariantId: question.variantId, groupLabel,
  }), [exercise, groupLabel, question.variantId]);
  const activity = useChoiceActivitySession(definition, `interval-imitation:${question.variantId}:${group}`);
  const monitor = useRealtimePitchMonitor();
  const playback = useLocalAudioPlayback();
  const [recordingTargetSnapshot, setRecordingTargetSnapshot] = useState<GeneratedLocalVocalExercise | null>(null);
  const [pending, setPending] = useState<{ attemptId: string; recording: Blob; evidence: ActivityCheckEvidence } | null>(null);
  const attemptRef = useRef<string | null>(null);

  const playReference = async () => {
    monitor.stop();
    await playback.play((context, channel) => {
      const base = context.currentTime + 0.04;
      for (const event of exercise.playbackEvents) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = base + event.startSeconds;
        oscillator.type = "sine";
        oscillator.frequency.value = event.frequencyHz;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.15, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + event.durationSeconds);
        oscillator.connect(gain);
        gain.connect(context.destination);
        channel.trackSource(oscillator, [gain]);
        oscillator.start(start);
        oscillator.stop(start + event.durationSeconds + 0.02);
      }
      return Math.ceil((exercise.durationSeconds + 0.1) * 1_000);
    });
  };

  const startRecording = () => {
    const current = activity.session;
    const dirty = current.lifecycle !== "ready" || current.answer !== undefined || current.checkEvidence !== undefined;
    const attemptId = dirty ? `${current.sessionId}:attempt:${current.attemptNumber + 1}` : current.attemptId;
    if (dirty) activity.restart();
    setPending(null);
    attemptRef.current = attemptId;
    setRecordingTargetSnapshot(exercise);
    monitor.startRecording();
  };
  const invalidate = (clearRecording: boolean) => {
    const hadAttempt = attemptRef.current !== null || monitor.recordingBlob !== null;
    setPending(null);
    setRecordingTargetSnapshot(null);
    attemptRef.current = null;
    if (hadAttempt) activity.restart();
    else activity.restartIfDirty();
    if (clearRecording) monitor.discardRecording();
  };
  const handleReady = (detail: OfflinePitchAnalysisReadyDetail) => {
    const attemptId = attemptRef.current;
    if (!attemptId || attemptId !== activity.session.attemptId || detail.recording !== monitor.recordingBlob || recordingTargetSnapshot !== exercise) return;
    const bundle = adaptLocalIntervalImitationActivityEvidence({ definition, attemptId, result: detail.noteAlignment });
    if (!bundle.answer) return;
    activity.submitAnswer(bundle.answer);
    setPending({ attemptId, recording: detail.recording, evidence: bundle.checkEvidence });
  };
  const handleInvalidated = (detail: OfflinePitchAnalysisInvalidationDetail) => {
    setPending(null);
    if (detail.reason === "analysis-cleared") {
      activity.restart();
      attemptRef.current = null;
      setRecordingTargetSnapshot(null);
    } else if (detail.nextRecording === null) {
      attemptRef.current = null;
      setRecordingTargetSnapshot(null);
    }
  };
  const check = () => {
    if (!pending || pending.attemptId !== activity.session.attemptId || pending.recording !== monitor.recordingBlob || activity.session.lifecycle !== "answering") return;
    activity.completeCheck(pending.evidence);
    setPending(null);
  };

  return <div className="mt-4 rounded-xl border border-cyan-200 bg-white p-4">
    <p className="text-sm font-bold text-cyan-950">当前目标：{groupLabel} · {source.direction}{source.interval.label}</p>
    <ActivityProtocolState session={activity.session} />
    {activity.session.checkEvidence ? <p role="status" className="mt-2 rounded-xl bg-cyan-50 p-3 text-sm leading-6 text-cyan-950">{activity.session.checkEvidence.explanation}</p> : null}
    {monitor.error ? <p role="alert" className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{monitor.error}</p> : null}
    {monitor.recordingError ? <p role="alert" className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{monitor.recordingError}</p> : null}
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={() => void playReference()} disabled={playback.isPlaying || monitor.recordingStatus === "recording"} className="rounded-xl border border-cyan-300 px-3 py-2 text-sm font-bold disabled:opacity-50">{playback.isPlaying ? "正在播放参考音…" : "播放模唱参考音"}</button>
      <button type="button" onClick={() => void monitor.start()} disabled={monitor.status === "requesting" || monitor.status === "listening" || playback.isPlaying} className="rounded-xl bg-cyan-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{monitor.status === "requesting" ? "正在请求麦克风…" : monitor.status === "listening" ? "麦克风已就绪" : "启用麦克风"}</button>
      <button type="button" onClick={startRecording} disabled={monitor.status !== "listening" || monitor.recordingStatus !== "empty"} className="rounded-xl bg-cyan-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">开始模唱录音</button>
      <button type="button" onClick={monitor.stopRecording} disabled={monitor.recordingStatus !== "recording"} className="rounded-xl border border-cyan-300 px-3 py-2 text-sm font-bold disabled:opacity-50">停止录音</button>
      <button type="button" onClick={() => invalidate(true)} disabled={monitor.recordingStatus === "empty" && activity.session.lifecycle === "ready"} className="rounded-xl border border-rose-300 px-3 py-2 text-sm font-bold text-rose-800 disabled:opacity-50">清除并重录</button>
      <button type="button" onClick={check} disabled={!pending || activity.session.lifecycle !== "answering"} className="rounded-xl border border-cyan-300 px-3 py-2 text-sm font-bold disabled:opacity-50">查看非评分模唱反馈</button>
    </div>
    <OfflinePitchAnalysisPanel recording={monitor.recordingBlob} onBeforeAnalyze={() => { playback.stop(); monitor.stopPlayback(); monitor.stop(); }} targetExercise={recordingTargetSnapshot} recordingStartedAtMs={monitor.recordingStartedAtMs} targetStartedAtMs={monitor.recordingStartedAtMs} onAnalysisReady={handleReady} onAnalysisInvalidated={handleInvalidated} />
  </div>;
}
