"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { subscribeBrowserAudioStopAll, type BrowserAudioChannel } from "../../lib/audio/browserAudioEngine";
import {
  adaptRhythmImitationFeedbackToEvidence,
  createRhythmImitationActivityDefinition,
} from "../../lib/activity/rhythmImitationActivityAdapter";
import {
  completeActivityCheck,
  createActivitySession,
  restartActivityAttempt,
  submitActivityAnswer,
  type ActivitySessionV1,
} from "../../lib/activity/activitySession";
import type { LocalEarTrainingRhythmQuestion } from "../../lib/practice/localEarTrainingRhythm";
import {
  createLocalRhythmImitationTargets,
  getLocalRhythmImitationDurationMs,
  LOCAL_RHYTHM_IMITATION_COUNT_IN_BEATS,
} from "../../lib/practice/localRhythmImitation";
import { getLocalRhythmSightReadingOnsetLabel } from "../../lib/practice/localRhythmSightReading";
import type { LocalPracticeAnswerResult } from "../../lib/practice/localPracticeReviewQueue";
import {
  getRhythmTapFeedback,
  rhythmMatchWindowMs,
  type RhythmTapEvent,
  type RhythmTargetEvent,
} from "../../lib/rhythm/rhythmTapFeedback";
import { ActivityProtocolState } from "./ActivityProtocolState";
import { useLocalAudioPlayback } from "./useLocalAudioPlayback";

type ImitationStage = "idle" | "reference" | "ready" | "count-in" | "practice" | "stopped";

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
  gain.gain.exponentialRampToValueAtTime(0.13, startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.06);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.07);
  channel.trackSource(oscillator, [gain]);
};

export function LocalRhythmImitationPanel({
  question,
  sessionSeed,
  onLocalAnswerResult,
}: {
  question: LocalEarTrainingRhythmQuestion;
  sessionSeed: number | null;
  onLocalAnswerResult?: (result: LocalPracticeAnswerResult) => void;
}) {
  const definition = useMemo(() => createRhythmImitationActivityDefinition(question), [question]);
  const [session, setSession] = useState<ActivitySessionV1>(() =>
    createActivitySession(definition, `rhythm-imitation:${question.id}`),
  );
  const sessionRef = useRef(session);
  const [stage, setStage] = useState<ImitationStage>("idle");
  const stageRef = useRef<ImitationStage>("idle");
  const [targets, setTargets] = useState<RhythmTargetEvent[]>([]);
  const targetsRef = useRef<RhythmTargetEvent[]>([]);
  const [taps, setTaps] = useState<RhythmTapEvent[]>([]);
  const tapsRef = useRef<RhythmTapEvent[]>([]);
  const [nowMs, setNowMs] = useState(0);
  const [notice, setNotice] = useState("");
  const timerIdsRef = useRef<number[]>([]);
  const intervalIdRef = useRef<number | null>(null);
  const runtimeTokenRef = useRef(0);
  const tapIdRef = useRef(0);
  const practiceStartTimeMsRef = useRef<number | null>(null);
  const reportedAttemptRef = useRef<string | null>(null);
  const { isPlaying, play, stop: stopPlayback } = useLocalAudioPlayback();

  const feedback = useMemo(() => getRhythmTapFeedback({
    targets,
    taps,
    phase: stage === "count-in" || stage === "practice" ? stage : stage === "stopped" ? "stopped" : "idle",
    nowMs,
  }), [nowMs, stage, taps, targets]);

  const clearTimers = useCallback(() => {
    timerIdsRef.current.forEach((id) => window.clearTimeout(id));
    timerIdsRef.current = [];
    if (intervalIdRef.current !== null) window.clearInterval(intervalIdRef.current);
    intervalIdRef.current = null;
  }, []);

  const setRuntimeStage = useCallback((next: ImitationStage) => {
    stageRef.current = next;
    setStage(next);
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

  const prepareSession = useCallback(() => {
    updateSession((current) => current.lifecycle === "ready" && !current.answer && !current.checkEvidence
      ? current
      : restartActivityAttempt(current, current.revision));
  }, [updateSession]);

  const resetRuntimeState = useCallback(() => {
    clearTimers();
    stopPlayback();
    setTargets([]);
    targetsRef.current = [];
    setTaps([]);
    tapsRef.current = [];
    setNowMs(0);
    practiceStartTimeMsRef.current = null;
    reportedAttemptRef.current = null;
  }, [clearTimers, stopPlayback]);

  const invalidateAttempt = useCallback((message = "") => {
    runtimeTokenRef.current += 1;
    resetRuntimeState();
    setRuntimeStage("idle");
    restartSession();
    setNotice(message);
  }, [resetRuntimeState, restartSession, setRuntimeStage]);

  useEffect(() => {
    const unsubscribe = subscribeBrowserAudioStopAll(() => {
      if (["reference", "ready", "count-in", "practice"].includes(stageRef.current)) {
        invalidateAttempt("本轮已因页面切换、后台或全局停止而作废，请重新听题。");
      }
    });
    return () => unsubscribe();
  }, [invalidateAttempt]);

  useEffect(() => () => {
    runtimeTokenRef.current += 1;
    clearTimers();
  }, [clearTimers]);

  const finishPractice = useCallback(() => {
    if (stageRef.current !== "count-in" && stageRef.current !== "practice") return;
    const finishedAt = performance.now();
    clearTimers();
    stopPlayback();
    setNowMs(finishedAt);
    setRuntimeStage("stopped");
    if (sessionRef.current.lifecycle === "checked") return;
    const finalFeedback = getRhythmTapFeedback({
      targets: targetsRef.current,
      taps: tapsRef.current,
      phase: "stopped",
      nowMs: finishedAt,
    });
    const evidence = adaptRhythmImitationFeedbackToEvidence(finalFeedback);
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
  }, [clearTimers, onLocalAnswerResult, question, sessionSeed, setRuntimeStage, stopPlayback, updateSession]);

  const playReference = async () => {
    runtimeTokenRef.current += 1;
    const token = runtimeTokenRef.current;
    resetRuntimeState();
    setRuntimeStage("idle");
    setNotice("");
    prepareSession();
    const playbackError = await play((context, channel) => {
      if (token !== runtimeTokenRef.current) return 1;
      const beatDurationMs = 60_000 / question.bpm;
      const startDelayMs = 80;
      const audioStart = context.currentTime + startDelayMs / 1000;
      question.pattern.onsetBeats.forEach((onsetBeat) => {
        scheduleClick(context, channel, audioStart + onsetBeat * beatDurationMs / 1000, onsetBeat === 0 ? 880 : 660);
      });
      setRuntimeStage("reference");
      timerIdsRef.current.push(window.setTimeout(() => {
        if (token !== runtimeTokenRef.current || stageRef.current !== "reference") return;
        stopPlayback();
        setRuntimeStage("ready");
      }, startDelayMs + getLocalRhythmImitationDurationMs(question)));
      return startDelayMs + getLocalRhythmImitationDurationMs(question) + 100;
    });
    if (playbackError && token === runtimeTokenRef.current) invalidateAttempt(playbackError);
  };

  const startImitation = async () => {
    if (stageRef.current !== "ready") return;
    runtimeTokenRef.current += 1;
    const token = runtimeTokenRef.current;
    clearTimers();
    stopPlayback();
    setRuntimeStage("idle");
    setNotice("");
    setTaps([]);
    tapsRef.current = [];
    const playbackError = await play((context, channel) => {
      if (token !== runtimeTokenRef.current) return 1;
      const beatDurationMs = 60_000 / question.bpm;
      const countInDurationMs = LOCAL_RHYTHM_IMITATION_COUNT_IN_BEATS * beatDurationMs;
      const startDelayMs = 80;
      const audioStart = context.currentTime + startDelayMs / 1000;
      const practiceStartTimeMs = performance.now() + startDelayMs + countInDurationMs;
      practiceStartTimeMsRef.current = practiceStartTimeMs;
      Array.from({ length: LOCAL_RHYTHM_IMITATION_COUNT_IN_BEATS }, (_, index) => {
        scheduleClick(context, channel, audioStart + index * beatDurationMs / 1000, index === 0 ? 880 : 660);
      });
      Array.from({ length: question.beatsPerMeasure }, (_, index) => {
        scheduleClick(context, channel, audioStart + (LOCAL_RHYTHM_IMITATION_COUNT_IN_BEATS + index) * beatDurationMs / 1000, index === 0 ? 760 : 560);
      });
      const nextTargets = createLocalRhythmImitationTargets({ question, practiceStartTimeMs });
      targetsRef.current = nextTargets;
      setTargets(nextTargets);
      setRuntimeStage("count-in");
      setNowMs(performance.now());
      intervalIdRef.current = window.setInterval(() => setNowMs(performance.now()), 50);
      timerIdsRef.current.push(window.setTimeout(() => {
        if (token === runtimeTokenRef.current) setRuntimeStage("practice");
      }, startDelayMs + countInDurationMs));
      const practiceDurationMs = getLocalRhythmImitationDurationMs(question);
      timerIdsRef.current.push(window.setTimeout(() => {
        if (token === runtimeTokenRef.current) finishPractice();
      }, startDelayMs + countInDurationMs + practiceDurationMs + rhythmMatchWindowMs));
      return startDelayMs + countInDurationMs + practiceDurationMs + rhythmMatchWindowMs + 200;
    });
    if (playbackError && token === runtimeTokenRef.current) invalidateAttempt(playbackError);
  };

  const handleTap = () => {
    if (stageRef.current !== "practice" || practiceStartTimeMsRef.current === null || targetsRef.current.length === 0) return;
    const timestampMs = performance.now();
    const id = tapIdRef.current + 1;
    tapIdRef.current = id;
    const next = [...tapsRef.current, { id, timestampMs, phase: "practice" as const }];
    tapsRef.current = next;
    setTaps(next);
    updateSession((current) => submitActivityAnswer(definition, current, {
      mode: "tap",
      onsetMs: next.map((tap) => Math.max(0, Math.round(tap.timestampMs - practiceStartTimeMsRef.current!))),
    }, current.revision));
    setNowMs(timestampMs);
  };

  const statusLabel = stage === "reference" ? "正在听题"
    : stage === "ready" ? "听题完成，可以开始回模"
      : stage === "count-in" ? "预备拍"
        : stage === "practice" ? "回模中"
          : stage === "stopped" ? "本轮已停止" : "尚未听题";

  return (
    <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5" aria-label="节奏回模练习">
      <p className="text-sm font-semibold tracking-wide text-amber-700">P116b · 本地节奏回模</p>
      <h3 className="mt-1 text-xl font-bold text-amber-950">先完整听，再从记忆点击</h3>
      <p className="mt-2 text-sm leading-6 text-amber-900">目标在听题与点击阶段保持隐藏，结束后才揭示逐拍关系。反馈不是分数、等级、通过／失败、演奏能力或教师结论。</p>

      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-amber-200" data-testid="rhythm-imitation-hidden-target">
        <p className="font-bold text-amber-950">隐藏目标 · 4/4 · {question.bpm} BPM</p>
        <p className="mt-1 text-sm leading-6 text-amber-800">请先点击“听一遍隐藏节奏”。完整播放结束前不能开始回模；重播会清除旧输入与反馈。</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={isPlaying || stage === "reference" || stage === "count-in" || stage === "practice"} onClick={() => void playReference()} className="rounded-xl bg-amber-800 px-4 py-3 font-semibold text-white disabled:bg-amber-300">{stage === "ready" || stage === "stopped" ? "重听隐藏节奏" : "听一遍隐藏节奏"}</button>
        <button type="button" disabled={stage !== "ready"} onClick={() => void startImitation()} className="rounded-xl bg-orange-700 px-4 py-3 font-semibold text-white disabled:bg-orange-300">开始节奏回模</button>
        <button type="button" disabled={!(["reference", "count-in", "practice"] as ImitationStage[]).includes(stage)} onClick={() => invalidateAttempt("本轮已手动停止并作废，请重新听题。") } className="rounded-xl border border-amber-300 bg-white px-4 py-3 font-semibold text-amber-900 disabled:opacity-50">停止并作废本轮</button>
        <button type="button" onClick={() => invalidateAttempt()} className="rounded-xl border border-amber-300 bg-white px-4 py-3 font-semibold text-amber-900">清除并重来</button>
      </div>
      <button type="button" disabled={stage !== "practice"} onClick={handleTap} className="mt-3 min-h-16 w-full rounded-2xl bg-orange-700 px-5 text-lg font-bold text-white disabled:bg-slate-300">按记忆点击</button>
      <p className="mt-3 text-sm font-semibold text-amber-950" aria-live="polite">状态：{statusLabel}</p>
      {notice ? <p className="mt-2 rounded-xl bg-white p-3 text-sm text-amber-900 ring-1 ring-amber-200">{notice}</p> : null}

      <ActivityProtocolState session={session} />
      {stage === "stopped" ? (
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-amber-200" data-testid="rhythm-imitation-revealed-target">
          <p className="font-bold text-amber-950">目标揭示：{question.pattern.label}</p>
          <p className="mt-1 text-xs leading-5 text-amber-800">起点：{question.pattern.onsetBeats.map(getLocalRhythmSightReadingOnsetLabel).join(" · ")}</p>
          <p className="mt-3 font-bold text-amber-950">逐拍非评分反馈</p>
          {feedback.feedback.length === 0 ? <p className="mt-2 text-sm text-amber-800">证据不足：本轮没有可比较的点击。</p> : (
            <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">{feedback.feedback.map((item, index) => <li key={`${item.targetIndex}-${item.tapId}-${index}`} className="rounded-xl bg-amber-50 p-3 text-amber-900">{item.targetIndex === null ? "额外点击" : `目标 ${item.targetIndex + 1}`}：{item.message}</li>)}</ul>
          )}
          <p className="mt-3 text-xs leading-5 text-slate-500">不生成百分比、总分、等级、通过或失败。触控时间戳只在当前页面内存中使用，不上传、不保存原始点击序列。</p>
        </div>
      ) : null}
    </section>
  );
}
