"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { subscribeBrowserAudioStopAll, type BrowserAudioChannel } from "../../lib/audio/browserAudioEngine";
import {
  adaptRhythmSightReadingFeedbackToEvidence,
  createRhythmSightReadingActivityDefinition,
} from "../../lib/activity/rhythmSightReadingActivityAdapter";
import {
  completeActivityCheck,
  createActivitySession,
  restartActivityAttempt,
  submitActivityAnswer,
  type ActivitySessionV1,
} from "../../lib/activity/activitySession";
import type { LocalEarTrainingRhythmQuestion } from "../../lib/practice/localEarTrainingRhythm";
import {
  createLocalRhythmSightReadingTargets,
  getLocalRhythmSightReadingOnsetLabel,
  LOCAL_RHYTHM_SIGHT_READING_COUNT_IN_BEATS,
} from "../../lib/practice/localRhythmSightReading";
import type { LocalPracticeAnswerResult } from "../../lib/practice/localPracticeReviewQueue";
import {
  createRhythmLatencyCalibrationTargets,
  getRhythmLatencyCalibration,
  type RhythmLatencyCalibrationTap,
} from "../../lib/rhythm/rhythmLatencyCalibration";
import {
  getRhythmTapFeedback,
  rhythmMatchWindowMs,
  type RhythmPracticePhase,
  type RhythmTapEvent,
  type RhythmTargetEvent,
} from "../../lib/rhythm/rhythmTapFeedback";
import { ActivityProtocolState } from "./ActivityProtocolState";
import { useLocalAudioPlayback } from "./useLocalAudioPlayback";

type RuntimeMode = "practice" | "calibration" | null;

const scheduleClick = (
  context: AudioContext,
  channel: BrowserAudioChannel,
  startTime: number,
  frequency: number,
) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.06);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.07);
  channel.trackSource(oscillator, [gain]);
};

export function LocalRhythmSightReadingPanel({
  question,
  sessionSeed,
  onLocalAnswerResult,
}: {
  question: LocalEarTrainingRhythmQuestion;
  sessionSeed: number | null;
  onLocalAnswerResult?: (result: LocalPracticeAnswerResult) => void;
}) {
  const definition = useMemo(
    () => createRhythmSightReadingActivityDefinition(question),
    [question],
  );
  const [session, setSession] = useState<ActivitySessionV1>(() =>
    createActivitySession(definition, `rhythm-sight-reading:${question.id}`),
  );
  const sessionRef = useRef(session);
  const [mode, setMode] = useState<RuntimeMode>(null);
  const modeRef = useRef<RuntimeMode>(null);
  const [phase, setPhase] = useState<RhythmPracticePhase>("idle");
  const phaseRef = useRef<RhythmPracticePhase>("idle");
  const [targets, setTargets] = useState<RhythmTargetEvent[]>([]);
  const targetsRef = useRef<RhythmTargetEvent[]>([]);
  const [taps, setTaps] = useState<RhythmTapEvent[]>([]);
  const tapsRef = useRef<RhythmTapEvent[]>([]);
  const [nowMs, setNowMs] = useState(0);
  const [calibrationTargets, setCalibrationTargets] = useState<RhythmTargetEvent[]>([]);
  const [calibrationTaps, setCalibrationTaps] = useState<RhythmLatencyCalibrationTap[]>([]);
  const [applyCalibration, setApplyCalibration] = useState(false);
  const [notice, setNotice] = useState("");
  const timerIdsRef = useRef<number[]>([]);
  const intervalIdRef = useRef<number | null>(null);
  const runtimeTokenRef = useRef(0);
  const tapIdRef = useRef(0);
  const practiceStartTimeMsRef = useRef<number | null>(null);
  const reportedAttemptRef = useRef<string | null>(null);
  const { isPlaying, play, stop: stopPlayback } = useLocalAudioPlayback();

  const calibration = useMemo(() => getRhythmLatencyCalibration({
    targets: calibrationTargets,
    taps: calibrationTaps,
    status: calibrationTargets.length === 0 ? "not-started" : "collecting",
  }), [calibrationTaps, calibrationTargets]);
  const activeLatencyOffsetMs = applyCalibration && calibration.offsetMs !== null
    ? calibration.offsetMs
    : 0;
  const feedback = useMemo(() => getRhythmTapFeedback({
    targets,
    taps,
    phase,
    nowMs,
    latencyOffsetMs: activeLatencyOffsetMs,
  }), [activeLatencyOffsetMs, nowMs, phase, taps, targets]);

  const clearTimers = useCallback(() => {
    timerIdsRef.current.forEach((id) => window.clearTimeout(id));
    timerIdsRef.current = [];
    if (intervalIdRef.current !== null) window.clearInterval(intervalIdRef.current);
    intervalIdRef.current = null;
  }, []);

  const setRuntimePhase = useCallback((next: RhythmPracticePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const updateSession = useCallback((transform: (current: ActivitySessionV1) => ActivitySessionV1) => {
    const next = transform(sessionRef.current);
    sessionRef.current = next;
    setSession(next);
    return next;
  }, []);

  const restartSession = useCallback(() => {
    updateSession((current) => restartActivityAttempt(current, current.revision));
  }, [updateSession]);

  const preparePracticeSession = useCallback(() => {
    updateSession((current) => current.lifecycle === "ready" && !current.answer && !current.checkEvidence
      ? current
      : restartActivityAttempt(current, current.revision));
  }, [updateSession]);

  const clearRuntime = useCallback((message = "", shouldRestartSession = true) => {
    runtimeTokenRef.current += 1;
    clearTimers();
    modeRef.current = null;
    setMode(null);
    setRuntimePhase("idle");
    stopPlayback();
    setTargets([]);
    targetsRef.current = [];
    setTaps([]);
    tapsRef.current = [];
    setCalibrationTargets([]);
    setCalibrationTaps([]);
    setApplyCalibration(false);
    setNowMs(0);
    practiceStartTimeMsRef.current = null;
    reportedAttemptRef.current = null;
    if (shouldRestartSession) restartSession();
    setNotice(message);
  }, [clearTimers, restartSession, setRuntimePhase, stopPlayback]);

  useEffect(() => {
    const unsubscribe = subscribeBrowserAudioStopAll(() => {
      if (modeRef.current !== null || phaseRef.current === "count-in" || phaseRef.current === "practice") {
        clearRuntime(
          "练习已因页面切换、后台或全局停止而清除，请重新开始。",
          modeRef.current === "practice",
        );
      }
    });
    return () => unsubscribe();
  }, [clearRuntime]);

  useEffect(() => () => {
    runtimeTokenRef.current += 1;
    clearTimers();
  }, [clearTimers]);

  const finishRuntime = useCallback(() => {
    if (phaseRef.current !== "count-in" && phaseRef.current !== "practice") return;
    const finishingMode = modeRef.current;
    const finishedAt = performance.now();
    clearTimers();
    stopPlayback();
    setNowMs(finishedAt);
    setRuntimePhase("stopped");
    if (finishingMode !== "practice" || sessionRef.current.lifecycle === "checked") return;

    const finalFeedback = getRhythmTapFeedback({
      targets: targetsRef.current,
      taps: tapsRef.current,
      phase: "stopped",
      nowMs: finishedAt,
      latencyOffsetMs: activeLatencyOffsetMs,
    });
    const evidence = adaptRhythmSightReadingFeedbackToEvidence(finalFeedback);
    const attemptId = sessionRef.current.attemptId;
    updateSession((current) => completeActivityCheck(current, evidence, current.revision));
    if (
      evidence.state !== "insufficient"
      && sessionSeed !== null
      && onLocalAnswerResult
      && reportedAttemptRef.current !== attemptId
    ) {
      reportedAttemptRef.current = attemptId;
      onLocalAnswerResult({
        target: {
          kind: "rhythm",
          difficulty: question.difficulty,
          seed: sessionSeed,
          sequence: question.sequence,
          variantId: question.variantId,
        },
        isCorrect: evidence.state === "consistent",
      });
    }
  }, [activeLatencyOffsetMs, clearTimers, onLocalAnswerResult, question, sessionSeed, setRuntimePhase, stopPlayback, updateSession]);

  const scheduleRuntime = async (runtimeMode: Exclude<RuntimeMode, null>) => {
    runtimeTokenRef.current += 1;
    const token = runtimeTokenRef.current;
    clearTimers();
    stopPlayback();
    modeRef.current = null;
    setMode(null);
    setRuntimePhase("idle");
    setNotice("");
    setTargets([]);
    targetsRef.current = [];
    setTaps([]);
    tapsRef.current = [];
    if (runtimeMode === "calibration") {
      setCalibrationTargets([]);
      setCalibrationTaps([]);
      setApplyCalibration(false);
    }
    reportedAttemptRef.current = null;
    if (runtimeMode === "practice") preparePracticeSession();

    const playbackError = await play((context, channel) => {
      if (token !== runtimeTokenRef.current) return 1;
      const beatDurationMs = 60_000 / question.bpm;
      const countInDurationMs = LOCAL_RHYTHM_SIGHT_READING_COUNT_IN_BEATS * beatDurationMs;
      const practiceBeatCount = runtimeMode === "calibration" ? 8 : question.beatsPerMeasure;
      const startDelayMs = 80;
      const audioStart = context.currentTime + startDelayMs / 1000;
      const clockStart = performance.now() + startDelayMs;
      const practiceStartTimeMs = clockStart + countInDurationMs;
      practiceStartTimeMsRef.current = practiceStartTimeMs;

      Array.from({ length: LOCAL_RHYTHM_SIGHT_READING_COUNT_IN_BEATS }, (_, index) => {
        scheduleClick(context, channel, audioStart + index * beatDurationMs / 1000, index === 0 ? 880 : 660);
      });
      Array.from({ length: practiceBeatCount }, (_, index) => {
        scheduleClick(
          context,
          channel,
          audioStart + (LOCAL_RHYTHM_SIGHT_READING_COUNT_IN_BEATS + index) * beatDurationMs / 1000,
          index % 4 === 0 ? 760 : 560,
        );
      });

      if (runtimeMode === "practice") {
        const nextTargets = createLocalRhythmSightReadingTargets({ question, practiceStartTimeMs });
        targetsRef.current = nextTargets;
        setTargets(nextTargets);
      } else {
        setCalibrationTargets(createRhythmLatencyCalibrationTargets({
          config: { bpm: question.bpm, meter: "4/4", countIn: { enabled: false, bars: 0 }, subdivision: "quarter" },
          calibrationStartTimeMs: practiceStartTimeMs,
          barCount: 2,
        }));
      }
      modeRef.current = runtimeMode;
      setMode(runtimeMode);
      setRuntimePhase("count-in");
      setNowMs(performance.now());
      intervalIdRef.current = window.setInterval(() => setNowMs(performance.now()), 50);
      timerIdsRef.current.push(window.setTimeout(() => {
        if (token === runtimeTokenRef.current) setRuntimePhase("practice");
      }, startDelayMs + countInDurationMs));
      const practiceDurationMs = practiceBeatCount * beatDurationMs;
      timerIdsRef.current.push(window.setTimeout(() => {
        if (token !== runtimeTokenRef.current) return;
        finishRuntime();
      }, startDelayMs + countInDurationMs + practiceDurationMs + rhythmMatchWindowMs));
      return startDelayMs + countInDurationMs + practiceDurationMs + rhythmMatchWindowMs + 200;
    });

    if (playbackError && token === runtimeTokenRef.current) {
      clearRuntime(playbackError, runtimeMode === "practice");
    }
  };

  const handleTap = () => {
    if (phaseRef.current !== "practice") return;
    const timestampMs = performance.now();
    const id = tapIdRef.current + 1;
    tapIdRef.current = id;
    if (modeRef.current === "calibration") {
      setCalibrationTaps((current) => [...current, { id, timestampMs }]);
      return;
    }
    if (
      modeRef.current !== "practice"
      || targets.length === 0
      || practiceStartTimeMsRef.current === null
    ) return;
    const next = [...tapsRef.current, { id, timestampMs, phase: "practice" as const }];
    tapsRef.current = next;
    setTaps(next);
    updateSession((currentSession) => submitActivityAnswer(
      definition,
      currentSession,
      { mode: "tap", onsetMs: next.map((tap) => Math.max(0, Math.round(tap.timestampMs - practiceStartTimeMsRef.current!))) },
      currentSession.revision,
    ));
    setNowMs(timestampMs);
  };

  const stopAndInspect = () => finishRuntime();

  return (
    <section className="mt-6 rounded-3xl border border-cyan-200 bg-cyan-50 p-5" aria-label="节奏视读练习">
      <p className="text-sm font-semibold tracking-wide text-cyan-700">P116a · 本地节奏视读</p>
      <h3 className="mt-1 text-xl font-bold text-cyan-950">看节奏目标，预备拍后点击</h3>
      <p className="mt-2 text-sm leading-6 text-cyan-900">只使用屏幕触控和本机时间戳。逐拍反馈仅表达接近、偏早、偏晚、漏掉或额外；不是分数、等级、通过／失败，也不是教师或真实设备证据。</p>

      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-cyan-200" data-testid="rhythm-sight-reading-target">
        <p className="font-bold text-cyan-950">可见目标：{question.pattern.label} · 4/4 · {question.bpm} BPM</p>
        <div className="relative mt-4 h-16 overflow-hidden rounded-xl border border-cyan-300 bg-cyan-50" aria-label="四拍节奏目标图">
          {[0, 1, 2, 3].map((beat) => <span key={beat} className="absolute inset-y-0 border-l border-cyan-200" style={{ left: `${beat * 25}%` }} />)}
          {question.pattern.onsetBeats.map((onset, index) => <span key={`${onset}-${index}`} className="absolute top-3 h-10 w-2 -translate-x-1/2 rounded-full bg-cyan-700" style={{ left: `${Math.min(99, (onset / 4) * 100)}%` }} title={getLocalRhythmSightReadingOnsetLabel(onset)} />)}
        </div>
        <p className="mt-3 text-xs leading-5 text-cyan-800">起点：{question.pattern.onsetBeats.map(getLocalRhythmSightReadingOnsetLabel).join(" · ")}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={isPlaying || phase === "count-in" || phase === "practice"} onClick={() => void scheduleRuntime("practice")} className="rounded-xl bg-cyan-800 px-4 py-3 font-semibold text-white disabled:bg-cyan-300">开始节奏视读</button>
        <button type="button" disabled={phase !== "count-in" && phase !== "practice"} onClick={stopAndInspect} className="rounded-xl border border-cyan-300 bg-white px-4 py-3 font-semibold text-cyan-900 disabled:opacity-50">停止并查看反馈</button>
        <button type="button" onClick={() => clearRuntime()} className="rounded-xl border border-cyan-300 bg-white px-4 py-3 font-semibold text-cyan-900">清除并重来</button>
      </div>
      <button type="button" disabled={phase !== "practice"} onClick={handleTap} className="mt-3 min-h-16 w-full rounded-2xl bg-cyan-700 px-5 text-lg font-bold text-white disabled:bg-slate-300">{mode === "calibration" ? "校准点击" : "按目标点击"}</button>
      <p className="mt-3 text-sm font-semibold text-cyan-950" aria-live="polite">状态：{phase === "count-in" ? "预备拍" : phase === "practice" ? "练习中" : phase === "stopped" ? "本轮已停止" : "尚未开始"}</p>
      {notice ? <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{notice}</p> : null}

      <div className="mt-4 rounded-2xl border border-indigo-200 bg-white p-4">
        <p className="font-bold text-indigo-950">当前会话点击延迟校准</p>
        <p className="mt-1 text-sm leading-6 text-indigo-800">跟随八次本地四分点击；只有样本足够且稳定时才可应用。它不测量麦克风或硬件往返延迟，刷新后消失。</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={phase === "count-in" || phase === "practice"} onClick={() => void scheduleRuntime("calibration")} className="rounded-xl bg-indigo-700 px-4 py-2.5 font-semibold text-white disabled:bg-indigo-300">开始八次校准</button>
          <label className="rounded-xl border border-indigo-200 px-3 py-2 text-sm text-indigo-950"><input type="checkbox" className="mr-2" disabled={calibration.status !== "estimated"} checked={applyCalibration} onChange={(event) => setApplyCalibration(event.target.checked)} />应用稳定估计</label>
        </div>
        <p className="mt-2 text-sm text-indigo-800">校准状态：{calibration.status}；已接受 {calibration.acceptedSampleCount}/8；{calibration.offsetMs === null ? "暂无可用偏移" : `估计 ${Math.round(calibration.offsetMs)}ms`}。</p>
      </div>

      <ActivityProtocolState session={session} />
      {phase === "stopped" && mode === "practice" ? (
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-cyan-200">
          <p className="font-bold text-cyan-950">逐拍非评分反馈</p>
          {feedback.feedback.length === 0 ? <p className="mt-2 text-sm text-cyan-800">证据不足：本轮没有可比较的练习点击。</p> : (
            <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">{feedback.feedback.map((item, index) => <li key={`${item.targetIndex}-${item.tapId}-${index}`} className="rounded-xl bg-cyan-50 p-3 text-cyan-900">{item.targetIndex === null ? "额外点击" : `目标 ${item.targetIndex + 1}`}：{item.message}</li>)}</ul>
          )}
          <p className="mt-3 text-xs leading-5 text-slate-500">当前反馈不生成百分比、总分、等级或通过／失败结论。</p>
        </div>
      ) : null}
    </section>
  );
}
