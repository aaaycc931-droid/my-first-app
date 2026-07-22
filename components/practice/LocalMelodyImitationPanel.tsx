"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createBrowserAudioChannel,
  stopAllBrowserAudio,
  subscribeBrowserAudioStopAll,
  type BrowserAudioChannel,
} from "../../lib/audio/browserAudioEngine";
import {
  adaptMelodyImitationActivityEvidence,
  createMelodyImitationActivityDefinition,
  type MelodyImitationActivityEvidenceBundle,
  type MelodyImitationAnalysisBinding,
} from "../../lib/activity/melodyImitationActivityAdapter";
import { OFFLINE_NOTE_ALIGNMENT_VERSION } from "../../lib/practice/offlineNoteAlignment";
import {
  createLocalMelodyImitationTimeline,
  getLocalMelodyImitationP113Targets,
  getLocalMelodyImitationPlaybackEvents,
} from "../../lib/practice/localMelodyImitation";
import {
  earTrainingMelodyNotes,
  type LocalEarTrainingMelodyQuestion,
} from "../../lib/practice/localEarTrainingMelodyDictation";
import { ActivityProtocolState } from "./ActivityProtocolState";
import {
  OfflinePitchAnalysisPanel,
  type OfflinePitchAnalysisFailedDetail,
  type OfflinePitchAnalysisInvalidationDetail,
  type OfflinePitchAnalysisReadyDetail,
  type OfflinePitchAnalysisStartedDetail,
} from "./OfflinePitchAnalysisPanel";
import { RealtimePitchCurveChart } from "./RealtimePitchCurveChart";
import { useChoiceActivitySession } from "./useChoiceActivitySession";
import { useRealtimePitchMonitor } from "./useRealtimePitchMonitor";

type AttemptStage = "waiting" | "playing-target" | "qualified" | "count-in" | "recording" | "finishing" | "recorded";
const MAX_RECORDING_ZERO_DELTA_MS = 40;

type MelodyImitationAudioChannel = Pick<
  BrowserAudioChannel,
  "prepareForUserGesture" | "stop" | "trackSource"
>;

export function LocalMelodyImitationPanel({
  question,
  createChannel = createBrowserAudioChannel,
}: {
  question: LocalEarTrainingMelodyQuestion;
  createChannel?: () => MelodyImitationAudioChannel;
}) {
  const timeline = useMemo(() => createLocalMelodyImitationTimeline({ question }), [question]);
  const playbackEvents = useMemo(() => getLocalMelodyImitationPlaybackEvents(timeline), [timeline]);
  const alignmentTargets = useMemo(() => getLocalMelodyImitationP113Targets(timeline), [timeline]);
  const definition = useMemo(() => createMelodyImitationActivityDefinition(timeline), [timeline]);
  const activity = useChoiceActivitySession(definition, `melody-imitation:${question.id}`);
  const monitor = useRealtimePitchMonitor();
  const [stage, setStage] = useState<AttemptStage>("waiting");
  const [countInBeat, setCountInBeat] = useState(0);
  const [notice, setNotice] = useState("请先完整听完隐藏的三音旋律。本活动不会提前显示目标音名。");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{
    recording: Blob;
    bundle: MelodyImitationActivityEvidenceBundle;
  } | null>(null);
  const channelRef = useRef<MelodyImitationAudioChannel | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const countInTimersRef = useRef<number[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const audioStateCleanupRef = useRef<(() => void) | null>(null);
  const generationRef = useRef(0);
  const qualificationRef = useRef<{ id: string; attemptId: string } | null>(null);
  const bindingRef = useRef<MelodyImitationAnalysisBinding | null>(null);
  const capturedBindingRef = useRef<MelodyImitationAnalysisBinding | null>(null);
  const recordingBindingRef = useRef<Omit<
    MelodyImitationAnalysisBinding,
    "analysisRunId" | "algorithmVersion"
  > | null>(null);
  const recordingRunRef = useRef(0);
  const [activeAnalysisRunId, setActiveAnalysisRunId] = useState<string | null>(null);
  const sessionRef = useRef(activity.session);
  const monitorRef = useRef(monitor);
  const mountedRef = useRef(true);
  const activeRef = useRef(false);
  const suppressOwnGlobalStopRef = useRef(0);

  useEffect(() => {
    sessionRef.current = activity.session;
  }, [activity.session]);

  useEffect(() => {
    monitorRef.current = monitor;
  }, [monitor]);

  const clearTimers = useCallback(() => {
    if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
    if (recordingTimerRef.current !== null) window.clearTimeout(recordingTimerRef.current);
    completionTimerRef.current = null;
    recordingTimerRef.current = null;
    countInTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    countInTimersRef.current = [];
    audioStateCleanupRef.current?.();
    audioStateCleanupRef.current = null;
  }, []);

  const stopOtherBrowserAudio = useCallback(() => {
    suppressOwnGlobalStopRef.current += 1;
    monitorRef.current.suppressNextGlobalStop();
    stopAllBrowserAudio();
  }, []);

  const clearLocalAttempt = useCallback(() => {
    generationRef.current += 1;
    activeRef.current = false;
    clearTimers();
    channelRef.current?.stop();
    qualificationRef.current = null;
    bindingRef.current = null;
    capturedBindingRef.current = null;
    recordingBindingRef.current = null;
    setActiveAnalysisRunId(null);
    setPending(null);
    setCountInBeat(0);
    monitorRef.current.clear();
    setStage("waiting");
  }, [clearTimers]);

  const invalidateAttempt = useCallback((message: string) => {
    clearLocalAttempt();
    activity.restart();
    setError("");
    setNotice(message);
  }, [activity, clearLocalAttempt]);

  useEffect(() => subscribeBrowserAudioStopAll(() => {
    if (suppressOwnGlobalStopRef.current > 0) {
      suppressOwnGlobalStopRef.current -= 1;
      return;
    }
    if (activeRef.current) {
      invalidateAttempt("本轮已因页面切换、后台或全局停止而作废。旧播放资格、录音和分析不能复用，请重新完整听题。");
    }
  }), [invalidateAttempt]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      activeRef.current = false;
      clearTimers();
      channelRef.current?.stop();
      monitorRef.current.clear();
    };
  }, [clearTimers]);

  const playHiddenTarget = async () => {
    if (activity.session.lifecycle === "checked") return;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    clearTimers();
    channelRef.current?.stop();
    monitor.clear();
    qualificationRef.current = null;
    bindingRef.current = null;
    capturedBindingRef.current = null;
    recordingBindingRef.current = null;
    setActiveAnalysisRunId(null);
    setPending(null);
    setCountInBeat(0);
    setError("");
    setStage("playing-target");
    setNotice("正在播放隐藏旋律；播放完整结束前不能启用麦克风或开始回唱。");
    stopOtherBrowserAudio();
    activeRef.current = true;

    const current = sessionRef.current;
    const attemptId = `${current.sessionId}:attempt:${current.attemptNumber + 1}`;
    activity.restart();

    try {
      const channel = channelRef.current ?? createChannel();
      channelRef.current = channel;
      const context = await channel.prepareForUserGesture();
      if (!mountedRef.current || generation !== generationRef.current) return;
      const startDelayMs = 80;
      const startTime = context.currentTime + startDelayMs / 1_000;
      playbackEvents.forEach((event) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const noteStart = startTime + event.startOffsetMs / 1_000;
        oscillator.type = "sine";
        oscillator.frequency.value = earTrainingMelodyNotes[event.noteId].frequencyHz;
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.16, noteStart + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + event.durationMs / 1_000);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteStart + event.durationMs / 1_000);
        channel.trackSource(oscillator, [gain]);
      });
      const last = playbackEvents.at(-1)!;
      const expectedEnd = startTime + (last.startOffsetMs + last.durationMs) / 1_000;
      const durationMs = Math.ceil(startDelayMs + last.startOffsetMs + last.durationMs);
      const handleStateChange = () => {
        if (generation === generationRef.current && context.state !== "running") {
          invalidateAttempt("隐藏旋律播放被音频中断，本轮没有获得回唱资格；请重新完整听题。");
        }
      };
      context.addEventListener("statechange", handleStateChange);
      audioStateCleanupRef.current = () => context.removeEventListener("statechange", handleStateChange);
      completionTimerRef.current = window.setTimeout(() => {
        if (!mountedRef.current || generation !== generationRef.current) return;
        if (context.state !== "running" || context.currentTime + 0.02 < expectedEnd) {
          invalidateAttempt("隐藏旋律时间线没有完整结束，本轮没有获得回唱资格；请重新播放。");
          return;
        }
        clearTimers();
        channel.stop();
        const qualificationId = `${timeline.targetId}:${attemptId}:playback-${generation}`;
        qualificationRef.current = { id: qualificationId, attemptId };
        setStage("qualified");
        setNotice("已完整听完隐藏旋律。请主动启用麦克风，再开始四拍预备与本轮录音。");
      }, durationMs);
    } catch {
      if (!mountedRef.current || generation !== generationRef.current) return;
      invalidateAttempt("当前设备无法播放隐藏旋律；请确认媒体音量后重试。");
      setError("本地声音准备失败，没有授予回唱资格。");
    }
  };

  const enableMicrophone = async () => {
    if (stage !== "qualified" || !qualificationRef.current) return;
    const generation = generationRef.current;
    setError("");
    const result = await monitor.start((message) => {
      if (generation === generationRef.current) invalidateAttempt(message);
    });
    if (!result.ok && generation === generationRef.current) invalidateAttempt(result.error);
  };

  const beginRecording = useCallback((clockDeltaMs: number) => {
    const qualification = qualificationRef.current;
    if (
      !qualification
      || sessionRef.current.attemptId !== qualification.attemptId
      || monitor.status !== "listening"
    ) {
      invalidateAttempt("当前麦克风、播放资格或 Activity 尝试已经过期；请重新完整听题。");
      return;
    }
    recordingRunRef.current += 1;
    const recordingBinding: Omit<MelodyImitationAnalysisBinding, "analysisRunId" | "algorithmVersion"> = {
      definitionActivityId: definition.activityId,
      questionVariantId: timeline.variantId,
      attemptId: qualification.attemptId,
      playbackQualificationId: qualification.id,
      timedTargetId: timeline.targetId,
      recordingId: `recording-${recordingRunRef.current}:clock-delta-${clockDeltaMs.toFixed(3)}ms`,
    };
    recordingBindingRef.current = recordingBinding;
    bindingRef.current = null;
    capturedBindingRef.current = null;
    stopOtherBrowserAudio();
    const started = monitor.startRecording((message) => {
      if (recordingBindingRef.current === recordingBinding) invalidateAttempt(message);
    });
    if (!started) return;
    setStage("recording");
    setCountInBeat(0);
    setNotice("正在录制三个音的回唱；实时曲线保持隐藏目标，不提供即时分数。");
    const recordingDurationMs = timeline.recordingWindow.endMs - timeline.recordingWindow.startMs;
    recordingTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current || recordingBindingRef.current !== recordingBinding) return;
      setStage("finishing");
      setNotice("录音窗口已结束，正在准备当前会话录音。");
      monitor.stopRecording();
    }, recordingDurationMs);
  }, [definition.activityId, invalidateAttempt, monitor, stopOtherBrowserAudio, timeline]);

  const startCountIn = async () => {
    if (
      stage !== "qualified"
      || monitor.status !== "listening"
      || monitor.recordingStatus !== "empty"
      || !qualificationRef.current
    ) return;
    stopOtherBrowserAudio();
    const generation = generationRef.current;
    setStage("count-in");
    setCountInBeat(1);
    setNotice("四拍预备进行中；预备拍不会写入回唱录音。");
    try {
      const channel = channelRef.current ?? createChannel();
      channelRef.current = channel;
      channel.stop();
      const context = await channel.prepareForUserGesture();
      if (!mountedRef.current || generation !== generationRef.current) return;
      const beatMs = 60_000 / timeline.bpm;
      const base = context.currentTime + 0.04;
      const expectedRecordingZero = base + timeline.recordingZeroMs / 1_000;
      const handleStateChange = () => {
        if (generation === generationRef.current && context.state !== "running") {
          invalidateAttempt("四拍预备被音频中断，本轮录音没有开始；请重新完整听题。");
        }
      };
      context.addEventListener("statechange", handleStateChange);
      audioStateCleanupRef.current = () => context.removeEventListener("statechange", handleStateChange);
      for (let index = 0; index < timeline.countIn.beats; index += 1) {
        const start = base + index * beatMs / 1_000;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = index === 0 ? 1_000 : 760;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.1, start + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.07);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.08);
        channel.trackSource(oscillator, [gain]);
        if (index > 0) {
          countInTimersRef.current.push(window.setTimeout(() => setCountInBeat(index + 1), index * beatMs));
        }
      }
      countInTimersRef.current.push(window.setTimeout(() => {
        const clockDeltaMs = (context.currentTime - expectedRecordingZero) * 1_000;
        if (
          generation !== generationRef.current
          || context.state !== "running"
          || Math.abs(clockDeltaMs) > MAX_RECORDING_ZERO_DELTA_MS
        ) {
          invalidateAttempt(clockDeltaMs < -MAX_RECORDING_ZERO_DELTA_MS
            ? "四拍预备时间线尚未到达录音零点，本轮录音没有开始；请重新完整听题。"
            : "四拍预备计时已严重迟于录音零点，本轮录音没有开始；请重新完整听题。");
          return;
        }
        beginRecording(clockDeltaMs);
      }, Math.ceil(40 + timeline.recordingZeroMs)));
    } catch {
      invalidateAttempt("预备拍无法播放，本轮没有开始录音；请重新完整听题后重试。");
      setError("当前设备无法播放四拍预备。");
    }
  };

  const stopRecording = () => {
    if (stage !== "recording") return;
    if (recordingTimerRef.current !== null) window.clearTimeout(recordingTimerRef.current);
    recordingTimerRef.current = null;
    setStage("finishing");
    setNotice("已停止本轮录音；可以先回放，再二次确认是否在本机分析。");
    monitor.stopRecording();
  };

  const handleAnalysisReady = (detail: OfflinePitchAnalysisReadyDetail) => {
    const currentBinding = bindingRef.current;
    const capturedBinding = capturedBindingRef.current;
    if (
      !currentBinding
      || !capturedBinding
      || detail.recording !== monitor.recordingBlob
      || detail.analysisRunId !== currentBinding.analysisRunId
      || detail.analysisRunId !== activeAnalysisRunId
      || currentBinding.attemptId !== sessionRef.current.attemptId
    ) return;
    const bundle = adaptMelodyImitationActivityEvidence({
      definition,
      timeline,
      currentBinding,
      capturedBinding,
      result: detail.noteAlignment,
    });
    if (!bundle.answer) {
      setError(bundle.checkEvidence.explanation);
      return;
    }
    activity.submitAnswer(bundle.answer);
    setPending({ recording: detail.recording, bundle });
    setNotice("本机分析已完成，目标仍保持隐藏；请主动查看本轮非评分反馈。");
  };

  const handleAnalysisStarted = (detail: OfflinePitchAnalysisStartedDetail) => {
    const recordingBinding = recordingBindingRef.current;
    if (
      !recordingBinding
      || detail.recording !== monitor.recordingBlob
      || !monitor.hasCompletedRecordingPlayback
      || sessionRef.current.attemptId !== recordingBinding.attemptId
    ) {
      invalidateAttempt("分析运行没有绑定当前完整回放录音，旧资格已作废。");
      return;
    }
    const binding: MelodyImitationAnalysisBinding = {
      ...recordingBinding,
      analysisRunId: detail.analysisRunId,
      algorithmVersion: OFFLINE_NOTE_ALIGNMENT_VERSION,
    };
    bindingRef.current = binding;
    capturedBindingRef.current = { ...binding };
    setActiveAnalysisRunId(detail.analysisRunId);
  };

  const handleAnalysisFailed = (detail: OfflinePitchAnalysisFailedDetail) => {
    if (
      detail.recording !== monitor.recordingBlob
      || detail.analysisRunId !== bindingRef.current?.analysisRunId
    ) return;
    invalidateAttempt(`本机分析失败，旧录音与证据已作废：${detail.message}`);
  };

  const handleAnalysisInvalidated = (detail: OfflinePitchAnalysisInvalidationDetail) => {
    if (detail.reason === "recording-changed" && detail.previousRecording === null && detail.nextRecording !== null) return;
    if (detail.reason === "recording-changed" && detail.nextRecording === monitor.recordingBlob) return;
    if (bindingRef.current || pending) {
      invalidateAttempt("录音或分析已经变化，旧证据与 Activity 尝试已作废；请重新完整听题。");
    }
  };

  const checkFeedback = () => {
    if (
      !pending
      || pending.recording !== monitor.recordingBlob
      || sessionRef.current.lifecycle !== "answering"
    ) return;
    activity.completeCheck(pending.bundle.checkEvidence);
    setPending(null);
    setNotice("已显示本轮逐音与逐句非评分反馈。可回放定位片段，或清除后重新完整练习。");
  };

  const discard = () => invalidateAttempt("本轮录音、播放资格与分析证据已丢弃；请重新完整听题后再录制。");
  const stopAndInvalidate = () => invalidateAttempt("本轮已由你停止并作废。旧播放资格、录音与分析不能复用，请重新完整听题。");
  const checked = activity.session.lifecycle === "checked";
  const resolvedStage = (stage === "recording" || stage === "finishing")
    && (monitor.recordingStatus === "ready" || monitor.recordingStatus === "playing")
    ? "recorded"
    : stage;
  const resolvedNotice = resolvedStage === "recorded" && stage !== "recorded"
    ? "本轮录音已准备好。你可以回放或丢弃；只有二次确认后才会在本机分析。"
    : notice;
  const canStartCountIn = stage === "qualified" && monitor.status === "listening" && monitor.recordingStatus === "empty";
  const canAnalyze = monitor.recordingBlob !== null && monitor.hasCompletedRecordingPlayback;

  const toggleRecordingPlayback = () => {
    if (monitor.recordingStatus === "playing") {
      monitor.stopPlayback();
      return;
    }
    stopOtherBrowserAudio();
    void monitor.playRecording((message) => invalidateAttempt(message));
  };

  return (
    <section className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4" aria-labelledby="melody-imitation-title">
      <p className="text-sm font-semibold text-cyan-800">P117d · 会话内非评分练习</p>
      <h3 id="melody-imitation-title" className="mt-1 text-lg font-black text-cyan-950">听隐藏三音旋律，再按四拍预备回唱</h3>
      <p className="mt-1 text-sm leading-6 text-cyan-900">麦克风、实时曲线、录音和分析都必须由你主动开始。录音只留在当前页面内存，不保存、不上传；反馈不是分数、等级或通过／失败。</p>
      <ActivityProtocolState session={activity.session} />
      <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-cyan-950" role="status" aria-live="polite">{resolvedNotice}</p>
      {error ? <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{error}</p> : null}
      {monitor.error ? <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{monitor.error}</p> : null}
      {monitor.recordingStatus === "error" ? <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{monitor.recordingError || "本轮录音未完成，请重新完整听题后重试。"}</p> : null}
      {stage === "count-in" ? <p className="mt-3 text-center text-2xl font-black text-cyan-950" aria-live="assertive">预备拍 {countInBeat} / 4</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void playHiddenTarget()} disabled={checked || stage === "playing-target" || stage === "count-in" || stage === "recording" || stage === "finishing"} className="min-h-11 rounded-xl bg-cyan-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{stage === "playing-target" ? "正在播放隐藏旋律…" : "完整播放隐藏旋律"}</button>
        <button type="button" onClick={stopAndInvalidate} disabled={stage === "waiting"} className="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 disabled:opacity-50">停止并作废本轮</button>
        <button type="button" onClick={() => void enableMicrophone()} disabled={stage !== "qualified" || monitor.status === "requesting" || monitor.status === "listening"} className="min-h-11 rounded-xl border border-cyan-300 bg-white px-4 py-2 text-sm font-bold text-cyan-950 disabled:opacity-50">{monitor.status === "requesting" ? "正在请求麦克风…" : monitor.status === "listening" ? "麦克风已就绪" : "启用麦克风"}</button>
        <button type="button" onClick={() => void startCountIn()} disabled={!canStartCountIn} className="min-h-11 rounded-xl bg-cyan-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">开始四拍预备与录音</button>
        <button type="button" onClick={stopRecording} disabled={stage !== "recording"} className="min-h-11 rounded-xl border border-cyan-300 bg-white px-4 py-2 text-sm font-bold text-cyan-950 disabled:opacity-50">停止本轮录音</button>
        <button type="button" onClick={toggleRecordingPlayback} disabled={activity.session.lifecycle !== "ready" || resolvedStage !== "recorded" || (monitor.recordingStatus !== "ready" && monitor.recordingStatus !== "playing")} className="min-h-11 rounded-xl border border-cyan-300 bg-white px-4 py-2 text-sm font-bold text-cyan-950 disabled:opacity-50">{monitor.recordingStatus === "playing" ? "停止录音回放" : monitor.hasCompletedRecordingPlayback ? "重新完整回放本次录音" : "完整回放本次录音"}</button>
        <button type="button" onClick={discard} disabled={stage === "waiting" || stage === "playing-target"} className="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 disabled:opacity-50">丢弃并重新听题</button>
        <button type="button" onClick={checkFeedback} disabled={!pending || activity.session.lifecycle !== "answering"} className="min-h-11 rounded-xl border border-cyan-400 bg-white px-4 py-2 text-sm font-bold text-cyan-950 disabled:opacity-50">查看本轮非评分反馈</button>
      </div>
      {monitor.status === "listening" || stage === "recording" || stage === "finishing" ? (
        <RealtimePitchCurveChart points={monitor.curvePoints} windowSeconds={8} targetMidi={60} showTarget={false} />
      ) : null}
      {checked && activity.session.checkEvidence ? <p className="mt-3 rounded-xl border border-cyan-200 bg-white p-3 text-sm leading-6 text-cyan-950" role="status">{activity.session.checkEvidence.explanation}</p> : null}
      {!canAnalyze && monitor.recordingBlob ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950">请先完整回放本次录音。只有回放自然结束并绑定当前录音后，才能二次确认本机分析。</p> : null}
      {canAnalyze ? <OfflinePitchAnalysisPanel
        recording={monitor.recordingBlob}
        alignmentTargets={alignmentTargets}
        showAlignmentEvidence={checked}
        onBeforeAnalyze={() => {
          stopOtherBrowserAudio();
          channelRef.current?.stop();
          monitor.stopPlayback();
          monitor.stop();
        }}
        onAnalysisReady={handleAnalysisReady}
        onAnalysisStarted={handleAnalysisStarted}
        onAnalysisInvalidated={handleAnalysisInvalidated}
        onAnalysisFailed={handleAnalysisFailed}
        analysisLocked={activeAnalysisRunId !== null}
      /> : null}
    </section>
  );
}
