"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { subscribeBrowserAudioStopAll } from "../../lib/audio/browserAudioEngine";
import { createRhythmErrorFindingActivityDefinition } from "../../lib/activity/rhythmErrorFindingActivityAdapter";
import type { LocalEarTrainingRhythmQuestion } from "../../lib/practice/localEarTrainingRhythm";
import { createLocalRhythmErrorFindingChallenge } from "../../lib/practice/localRhythmErrorFinding";
import { getLocalRhythmSightReadingOnsetLabel } from "../../lib/practice/localRhythmSightReading";
import type { LocalPracticeAnswerResult } from "../../lib/practice/localPracticeReviewQueue";
import { ActivityChoiceAnswerPanel } from "./ActivityChoiceAnswerPanel";
import { ActivityProtocolState } from "./ActivityProtocolState";
import { useChoiceActivitySession } from "./useChoiceActivitySession";
import { useLocalAudioPlayback } from "./useLocalAudioPlayback";
import { useLockedPracticeAnswer } from "./useLockedPracticeAnswer";

export function LocalRhythmErrorFindingPanel({
  question,
  sessionSeed,
  onLocalAnswerResult,
}: {
  question: LocalEarTrainingRhythmQuestion;
  sessionSeed: number | null;
  onLocalAnswerResult?: (result: LocalPracticeAnswerResult) => void;
}) {
  const challenge = useMemo(() => createLocalRhythmErrorFindingChallenge(question), [question]);
  const definition = useMemo(
    () => createRhythmErrorFindingActivityDefinition(question, challenge),
    [challenge, question],
  );
  const activity = useChoiceActivitySession(definition, `rhythm-error-finding:${challenge.challengeId}`);
  const answerLock = useLockedPracticeAnswer<string | null>(null, (selection) => selection !== null);
  const [hasHeardComplete, setHasHeardComplete] = useState(false);
  const [notice, setNotice] = useState("");
  const completionTimerRef = useRef<number | null>(null);
  const playbackTokenRef = useRef(0);
  const playbackActiveRef = useRef(false);
  const reportedAttemptRef = useRef<string | null>(null);
  const { isPlaying, playbackState, play, stop: stopPlayback } = useLocalAudioPlayback();

  const clearCompletionTimer = useCallback(() => {
    if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
    completionTimerRef.current = null;
  }, []);

  const invalidatePlayback = useCallback((message: string, restartAttempt = true) => {
    playbackTokenRef.current += 1;
    playbackActiveRef.current = false;
    clearCompletionTimer();
    stopPlayback();
    setHasHeardComplete(false);
    answerLock.reset();
    if (restartAttempt) activity.restartIfDirty();
    reportedAttemptRef.current = null;
    setNotice(message);
  }, [activity, answerLock, clearCompletionTimer, stopPlayback]);

  useEffect(() => {
    const unsubscribe = subscribeBrowserAudioStopAll(() => {
      if (playbackActiveRef.current) {
        invalidatePlayback("播放已因页面切换、后台或全局停止而作废，请重新播放。", true);
      }
    });
    return () => unsubscribe();
  }, [invalidatePlayback]);

  useEffect(() => () => {
    playbackTokenRef.current += 1;
    clearCompletionTimer();
  }, [clearCompletionTimer]);

  const playChangedVersion = async () => {
    playbackTokenRef.current += 1;
    const token = playbackTokenRef.current;
    playbackActiveRef.current = false;
    clearCompletionTimer();
    stopPlayback();
    setHasHeardComplete(false);
    answerLock.reset();
    activity.restartIfDirty();
    reportedAttemptRef.current = null;
    setNotice("");
    const playbackError = await play((context, channel) => {
      if (token !== playbackTokenRef.current) return 1;
      const beatDurationSeconds = 60 / question.bpm;
      const startDelayMs = 80;
      const audioStart = context.currentTime + startDelayMs / 1000;
      challenge.correctCandidate.performedOnsetBeats.forEach((onsetBeat) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = audioStart + onsetBeat * beatDurationSeconds;
        oscillator.type = "sine";
        oscillator.frequency.value = onsetBeat === 0 ? 880 : 660;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.14, start + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.07);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.08);
        channel.trackSource(oscillator, [gain]);
      });
      playbackActiveRef.current = true;
      const durationMs = startDelayMs + Math.ceil(question.beatsPerMeasure * 60_000 / question.bpm);
      completionTimerRef.current = window.setTimeout(() => {
        if (token !== playbackTokenRef.current || !playbackActiveRef.current) return;
        playbackActiveRef.current = false;
        stopPlayback();
        setHasHeardComplete(true);
      }, durationMs);
      return durationMs + 100;
    });
    if (playbackError && token === playbackTokenRef.current) {
      invalidatePlayback(playbackError, true);
    }
  };

  const revealAnswer = () => {
    const selected = answerLock.reveal();
    if (!selected) return;
    activity.checkChoice([selected]);
    const isCorrect = selected === challenge.correctCandidate.id;
    if (
      sessionSeed !== null
      && onLocalAnswerResult
      && reportedAttemptRef.current !== activity.session.attemptId
    ) {
      reportedAttemptRef.current = activity.session.attemptId;
      onLocalAnswerResult({
        target: {
          kind: "rhythm",
          difficulty: question.difficulty,
          seed: sessionSeed,
          sequence: question.sequence,
          variantId: question.variantId,
        },
        isCorrect,
      });
    }
  };

  return (
    <section className="mt-6 rounded-3xl border border-lime-200 bg-lime-50 p-5" aria-label="节奏找错练习">
      <p className="text-sm font-semibold tracking-wide text-lime-700">P116c · 本地节奏找错</p>
      <h3 className="mt-1 text-xl font-bold text-lime-950">对照可见目标，定位唯一变化</h3>
      <p className="mt-2 text-sm leading-6 text-lime-900">播放版本只含一处可验证的漏掉、拆分、合并或位移。答案只说明本题事件差异，不推断演奏能力，也不生成分数、等级或通过／失败。</p>

      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-lime-200" data-testid="rhythm-error-finding-target">
        <p className="font-bold text-lime-950">对照目标：{question.pattern.label} · 4/4 · {question.bpm} BPM</p>
        <div className="relative mt-4 h-16 overflow-hidden rounded-xl border border-lime-300 bg-lime-50" aria-label="节奏找错对照目标">
          {[0, 1, 2, 3].map((beat) => <span key={beat} className="absolute inset-y-0 border-l border-lime-200" style={{ left: `${beat * 25}%` }} />)}
          {question.pattern.onsetBeats.map((onset, index) => <span key={`${onset}-${index}`} className="absolute top-3 h-10 w-2 -translate-x-1/2 rounded-full bg-lime-700" style={{ left: `${Math.min(99, onset * 25)}%` }} title={getLocalRhythmSightReadingOnsetLabel(onset)} />)}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={isPlaying} onClick={() => void playChangedVersion()} className="rounded-xl bg-lime-800 px-4 py-3 font-semibold text-white disabled:bg-lime-300">{playbackState === "准备中" ? "正在准备声音…" : isPlaying ? "正在播放变化版本…" : hasHeardComplete ? "重新播放变化版本" : "播放含一处变化的版本"}</button>
        <button type="button" disabled={!isPlaying} onClick={() => invalidatePlayback("本轮播放已手动停止并作废，请重新播放。", true)} className="rounded-xl border border-lime-300 bg-white px-4 py-3 font-semibold text-lime-900 disabled:opacity-50">停止并作废播放</button>
        <button type="button" onClick={() => invalidatePlayback("", true)} className="rounded-xl border border-lime-300 bg-white px-4 py-3 font-semibold text-lime-900">清除并重来</button>
      </div>
      <p className="mt-3 text-sm font-semibold text-lime-950" aria-live="polite">状态：{isPlaying ? "正在播放" : hasHeardComplete ? "播放完成，可以标记" : "等待完整播放"}</p>
      {notice ? <p className="mt-2 rounded-xl bg-white p-3 text-sm text-lime-900 ring-1 ring-lime-200">{notice}</p> : null}

      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-lime-200">
        <p className="font-bold text-lime-950">标记变化类型与位置</p>
        <ActivityChoiceAnswerPanel options={challenge.options} selectedOptionId={answerLock.selection} disabled={!hasHeardComplete || answerLock.isAnswerVisible} accent="emerald" columns={2} onChoose={(id) => {
          if (answerLock.choose(id)) activity.submitChoice([id]);
        }} />
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={!hasHeardComplete || answerLock.selection === null} onClick={revealAnswer} className="rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:bg-slate-300">查看事件答案</button>
        </div>
        {!hasHeardComplete ? <p className="mt-3 text-sm text-slate-500">必须完整播放后才能标记；停止、后台或重播会清除旧选择。</p> : null}
        <ActivityProtocolState session={activity.session} />
        {answerLock.isAnswerVisible ? <div className="mt-4 rounded-xl bg-lime-50 p-4 text-sm leading-6 text-lime-950"><p className="font-bold">本题答案：{challenge.correctCandidate.label}</p><p>{challenge.correctCandidate.explanation}</p><p className="mt-2 text-slate-500">这是版本化题目事件对照，不是对用户演奏能力的评价。</p></div> : null}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">声音由本机 Web Audio 合成；不使用麦克风，不上传或保存声音。复练只沿用现有最小题目标识，不保存具体选择。</p>
    </section>
  );
}
