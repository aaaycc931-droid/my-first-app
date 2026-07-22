"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createBrowserAudioChannel,
  stopAllBrowserAudio,
  subscribeBrowserAudioStopAll,
  type BrowserAudioChannel,
} from "../../lib/audio/browserAudioEngine";
import {
  adaptMelodySightSingingActivityEvidence,
  createMelodySightSingingActivityDefinition,
  type MelodySightSingingActivityEvidenceBundle,
  type MelodySightSingingAnalysisBinding,
} from "../../lib/activity/melodySightSingingActivityAdapter";
import type { LocalEarTrainingMelodyQuestion } from "../../lib/practice/localEarTrainingMelodyDictation";
import { createLocalMelodyImitationTimeline } from "../../lib/practice/localMelodyImitation";
import {
  createLocalMelodySightSingingTarget,
  getLocalMelodySightSingingP113Targets,
} from "../../lib/practice/localMelodySightSinging";
import { OFFLINE_NOTE_ALIGNMENT_VERSION } from "../../lib/practice/offlineNoteAlignment";
import { ActivityProtocolState } from "./ActivityProtocolState";
import { LocalMelodySightSingingTarget } from "./LocalMelodySightSingingTarget";
import {
  OfflinePitchAnalysisPanel,
  type OfflinePitchAnalysisFailedDetail,
  type OfflinePitchAnalysisInvalidationDetail,
  type OfflinePitchAnalysisReadyDetail,
  type OfflinePitchAnalysisStartedDetail,
} from "./OfflinePitchAnalysisPanel";
import { useChoiceActivitySession } from "./useChoiceActivitySession";
import { useRealtimePitchMonitor } from "./useRealtimePitchMonitor";

type AttemptStage = "visible" | "count-in" | "recording" | "finishing" | "recorded";
const MAX_RECORDING_ZERO_DELTA_MS = 40;

type MelodySightSingingAudioChannel = Pick<
  BrowserAudioChannel,
  "prepareForUserGesture" | "stop" | "trackSource"
>;

type RecordingBinding = Omit<
  MelodySightSingingAnalysisBinding,
  "recordingPlaybackQualificationId" | "analysisRunId" | "algorithmVersion"
>;

export function LocalMelodySightSingingPanel({
  question,
  createChannel = createBrowserAudioChannel,
}: {
  question: LocalEarTrainingMelodyQuestion;
  createChannel?: () => MelodySightSingingAudioChannel;
}) {
  const timeline = useMemo(() => createLocalMelodyImitationTimeline({ question }), [question]);
  const target = useMemo(() => createLocalMelodySightSingingTarget({ timeline }), [timeline]);
  const alignmentTargets = useMemo(() => getLocalMelodySightSingingP113Targets(target), [target]);
  const definition = useMemo(() => createMelodySightSingingActivityDefinition(target), [target]);
  const activity = useChoiceActivitySession(definition, `melody-sight-singing:${question.id}`);
  const monitor = useRealtimePitchMonitor();
  const [stage, setStage] = useState<AttemptStage>("visible");
  const [countInBeat, setCountInBeat] = useState(0);
  const [notice, setNotice] = useState("目标已可见。你可以直接启用麦克风，不需要先听完整答案。");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{
    recording: Blob;
    bundle: MelodySightSingingActivityEvidenceBundle;
  } | null>(null);
  const [activeAnalysisRunId, setActiveAnalysisRunId] = useState<string | null>(null);
  const channelRef = useRef<MelodySightSingingAudioChannel | null>(null);
  const countInTimersRef = useRef<number[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const audioStateCleanupRef = useRef<(() => void) | null>(null);
  const generationRef = useRef(0);
  const countInRunSequenceRef = useRef(0);
  const recordingRunSequenceRef = useRef(0);
  const countInRunRef = useRef<{ id: string; attemptId: string } | null>(null);
  const recordingBindingRef = useRef<RecordingBinding | null>(null);
  const bindingRef = useRef<MelodySightSingingAnalysisBinding | null>(null);
  const capturedBindingRef = useRef<MelodySightSingingAnalysisBinding | null>(null);
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
    if (recordingTimerRef.current !== null) window.clearTimeout(recordingTimerRef.current);
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
    countInRunRef.current = null;
    recordingBindingRef.current = null;
    bindingRef.current = null;
    capturedBindingRef.current = null;
    setActiveAnalysisRunId(null);
    setPending(null);
    setCountInBeat(0);
    monitorRef.current.clear();
    setStage("visible");
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
      invalidateAttempt("本轮已因页面切换、后台或全局停止而作废。旧四拍运行、录音和分析不能复用，请重新开始。");
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

  const enableMicrophone = async () => {
    if (activity.session.lifecycle === "checked" || monitor.status === "requesting" || monitor.status === "listening") return;
    activeRef.current = true;
    const generation = generationRef.current;
    setError("");
    setNotice("正在请求麦克风；目标谱面与固定唱名保持可见。");
    const result = await monitor.start((message) => {
      if (generation === generationRef.current) invalidateAttempt(message);
    });
    if (!result.ok && generation === generationRef.current) {
      invalidateAttempt(result.error);
      return;
    }
    if (generation === generationRef.current) {
      setNotice("麦克风已就绪。请主动开始四拍预备与录音。");
    }
  };

  const beginRecording = useCallback((clockDeltaMs: number) => {
    const countInRun = countInRunRef.current;
    if (
      !countInRun
      || sessionRef.current.attemptId !== countInRun.attemptId
      || monitor.status !== "listening"
    ) {
      invalidateAttempt("当前麦克风、四拍运行或 Activity 尝试已经过期；请重新开始。");
      return;
    }
    recordingRunSequenceRef.current += 1;
    const recordingBinding: RecordingBinding = {
      definitionActivityId: definition.activityId,
      questionVariantId: target.variantId,
      visiblePresentationId: target.visiblePresentationId,
      timedTargetId: target.timedTargetId,
      countInRunId: countInRun.id,
      attemptId: countInRun.attemptId,
      recordingId: `sight-singing-recording-${recordingRunSequenceRef.current}:clock-delta-${clockDeltaMs.toFixed(3)}ms`,
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
    setNotice("正在按可见目标录制三个音；实时监听不会生成答案或评分。");
    const recordingDurationMs = target.recordingWindow.endMs - target.recordingWindow.startMs;
    recordingTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current || recordingBindingRef.current !== recordingBinding) return;
      setStage("finishing");
      setNotice("录音窗口已结束，正在准备当前会话录音。");
      monitor.stopRecording();
    }, recordingDurationMs);
  }, [definition.activityId, invalidateAttempt, monitor, stopOtherBrowserAudio, target]);

  const startCountIn = async () => {
    if (
      activity.session.lifecycle !== "ready"
      || stage !== "visible"
      || monitor.status !== "listening"
      || monitor.recordingStatus !== "empty"
    ) return;
    stopOtherBrowserAudio();
    const generation = generationRef.current;
    const attemptId = sessionRef.current.attemptId;
    countInRunSequenceRef.current += 1;
    const countInRun = {
      id: `${target.visiblePresentationId}:${attemptId}:count-in-${countInRunSequenceRef.current}`,
      attemptId,
    };
    countInRunRef.current = countInRun;
    setStage("count-in");
    setCountInBeat(1);
    setNotice("四拍预备进行中；预备拍只建立当前录音零点，不代表听过答案。");
    try {
      const channel = channelRef.current ?? createChannel();
      channelRef.current = channel;
      channel.stop();
      const context = await channel.prepareForUserGesture();
      if (!mountedRef.current || generation !== generationRef.current || countInRunRef.current !== countInRun) return;
      const beatMs = 60_000 / target.bpm;
      const base = context.currentTime + 0.04;
      const expectedRecordingZero = base + target.recordingZeroMs / 1_000;
      const handleStateChange = () => {
        if (generation === generationRef.current && context.state !== "running") {
          invalidateAttempt("四拍预备被音频中断，本轮录音没有开始；请重新开始。");
        }
      };
      context.addEventListener("statechange", handleStateChange);
      audioStateCleanupRef.current = () => context.removeEventListener("statechange", handleStateChange);
      for (let index = 0; index < target.countIn.beats; index += 1) {
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
          countInTimersRef.current.push(window.setTimeout(() => {
            if (countInRunRef.current === countInRun) setCountInBeat(index + 1);
          }, index * beatMs));
        }
      }
      countInTimersRef.current.push(window.setTimeout(() => {
        const clockDeltaMs = (context.currentTime - expectedRecordingZero) * 1_000;
        if (
          generation !== generationRef.current
          || countInRunRef.current !== countInRun
          || context.state !== "running"
          || Math.abs(clockDeltaMs) > MAX_RECORDING_ZERO_DELTA_MS
        ) {
          invalidateAttempt(clockDeltaMs < -MAX_RECORDING_ZERO_DELTA_MS
            ? "四拍预备时间线尚未到达录音零点，本轮录音没有开始；请重新开始。"
            : "四拍预备计时已严重迟于录音零点，本轮录音没有开始；请重新开始。");
          return;
        }
        beginRecording(clockDeltaMs);
      }, Math.ceil(40 + target.recordingZeroMs)));
    } catch {
      invalidateAttempt("预备拍无法播放，本轮没有开始录音；请重新开始后重试。");
      setError("当前设备无法播放四拍预备。");
    }
  };

  const stopRecording = () => {
    if (stage !== "recording") return;
    if (recordingTimerRef.current !== null) window.clearTimeout(recordingTimerRef.current);
    recordingTimerRef.current = null;
    setStage("finishing");
    setNotice("已停止本轮录音；请先完整回放，再二次确认是否只在本机分析。");
    monitor.stopRecording();
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
    const binding: MelodySightSingingAnalysisBinding = {
      ...recordingBinding,
      recordingPlaybackQualificationId: `${recordingBinding.recordingId}:natural-complete-playback`,
      analysisRunId: detail.analysisRunId,
      algorithmVersion: OFFLINE_NOTE_ALIGNMENT_VERSION,
    };
    bindingRef.current = binding;
    capturedBindingRef.current = { ...binding };
    setActiveAnalysisRunId(detail.analysisRunId);
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
    const bundle = adaptMelodySightSingingActivityEvidence({
      definition,
      target,
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
    setNotice("本机分析已完成；请主动查看本轮逐音与逐句非评分反馈。");
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
    if (activity.session.lifecycle === "checked") return;
    if (bindingRef.current || pending) {
      invalidateAttempt("录音或分析已经变化，旧证据与 Activity 尝试已作废；请重新开始。");
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
    setNotice("已显示本轮逐音与逐句非评分反馈。可以清除后重录，或由父练习进入下一题。");
  };

  const checked = activity.session.lifecycle === "checked";
  const resolvedStage = (stage === "recording" || stage === "finishing")
    && (monitor.recordingStatus === "ready" || monitor.recordingStatus === "playing")
    ? "recorded"
    : stage;
  const resolvedNotice = resolvedStage === "recorded" && stage !== "recorded"
    ? "本轮录音已准备好。请先完整回放；只有自然结束后才可二次确认本机分析。"
    : notice;
  const canStartCountIn = !checked
    && activity.session.lifecycle === "ready"
    && stage === "visible"
    && monitor.status === "listening"
    && monitor.recordingStatus === "empty";
  const canAnalyze = !checked && monitor.recordingBlob !== null && monitor.hasCompletedRecordingPlayback;
  const hasActiveAttempt = stage !== "visible"
    || monitor.status === "requesting"
    || monitor.status === "listening"
    || monitor.recordingStatus !== "empty";

  const toggleRecordingPlayback = () => {
    if (activeAnalysisRunId !== null || checked) return;
    if (monitor.recordingStatus === "playing") {
      monitor.stopPlayback();
      return;
    }
    stopOtherBrowserAudio();
    void monitor.playRecording((message) => invalidateAttempt(message));
  };

  const discard = () => invalidateAttempt("本轮录音、四拍运行与分析证据已丢弃；目标仍可见，请重新开始。");
  const stopAndInvalidate = () => invalidateAttempt("本轮已由你停止并作废。旧四拍运行、录音与分析不能复用，请重新开始。");

  return (
    <section className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 p-4" aria-labelledby="melody-sight-singing-title">
      <p className="text-sm font-semibold text-teal-800">P117e · 会话内非评分练习</p>
      <h3 id="melody-sight-singing-title" className="mt-1 text-lg font-black text-teal-950">看可见三音谱面，按四拍预备视唱</h3>
      <p className="mt-1 text-sm leading-6 text-teal-900">目标从本轮开始就可见，不播放完整答案。麦克风、四拍、录音和分析均由你主动开始；声音只留在当前页面内存，不保存、不上传。</p>
      <LocalMelodySightSingingTarget target={target} />
      <ActivityProtocolState session={activity.session} />
      <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-teal-950" role="status" aria-live="polite">{resolvedNotice}</p>
      {error ? <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{error}</p> : null}
      {monitor.error ? <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{monitor.error}</p> : null}
      {monitor.recordingStatus === "error" ? <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{monitor.recordingError || "本轮录音未完成，请重新开始。"}</p> : null}
      {stage === "count-in" ? <p className="mt-3 text-center text-2xl font-black text-teal-950" aria-live="assertive">预备拍 {countInBeat} / 4</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void enableMicrophone()} disabled={checked || stage !== "visible" || monitor.status === "requesting" || monitor.status === "listening"} className="min-h-11 rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-bold text-teal-950 disabled:opacity-50">{monitor.status === "requesting" ? "正在请求麦克风…" : monitor.status === "listening" ? "麦克风已就绪" : "启用麦克风"}</button>
        <button type="button" onClick={() => void startCountIn()} disabled={!canStartCountIn} className="min-h-11 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">开始四拍预备与录音</button>
        <button type="button" onClick={stopRecording} disabled={stage !== "recording"} className="min-h-11 rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-bold text-teal-950 disabled:opacity-50">停止本轮录音</button>
        <button type="button" onClick={toggleRecordingPlayback} disabled={checked || activeAnalysisRunId !== null || activity.session.lifecycle !== "ready" || resolvedStage !== "recorded" || (monitor.recordingStatus !== "ready" && monitor.recordingStatus !== "playing")} className="min-h-11 rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-bold text-teal-950 disabled:opacity-50">{monitor.recordingStatus === "playing" ? "停止录音回放" : monitor.hasCompletedRecordingPlayback ? "重新完整回放本次录音" : "完整回放本次录音"}</button>
        <button type="button" onClick={stopAndInvalidate} disabled={checked || !hasActiveAttempt} className="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 disabled:opacity-50">停止并作废本轮</button>
        <button type="button" onClick={discard} disabled={checked || resolvedStage !== "recorded"} className="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 disabled:opacity-50">丢弃并重新录制</button>
        <button type="button" onClick={checkFeedback} disabled={!pending || activity.session.lifecycle !== "answering"} className="min-h-11 rounded-xl border border-teal-400 bg-white px-4 py-2 text-sm font-bold text-teal-950 disabled:opacity-50">查看本轮非评分反馈</button>
      </div>
      {checked && activity.session.checkEvidence ? <p className="mt-3 rounded-xl border border-teal-200 bg-white p-3 text-sm leading-6 text-teal-950" role="status">{activity.session.checkEvidence.explanation}</p> : null}
      {!canAnalyze && monitor.recordingBlob && !checked ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950">请先完整回放本次录音。只有回放自然结束并绑定当前录音后，才能二次确认本机分析。</p> : null}
      {(canAnalyze || checked) ? <OfflinePitchAnalysisPanel
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
        analysisLocked={activeAnalysisRunId !== null || checked}
        resultLocked={activeAnalysisRunId !== null || checked}
      /> : null}
    </section>
  );
}
