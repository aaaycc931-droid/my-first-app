"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { subscribeBrowserAudioStopAll } from "../../lib/audio/browserAudioEngine";
import {
  checkRhythmDictationScoreDocument,
  createRhythmDictationActivityDefinition,
} from "../../lib/activity/rhythmDictationActivityAdapter";
import {
  completeActivityCheck,
  createActivitySession,
  restartActivityAttempt,
  submitActivityAnswer,
  type ActivitySessionV1,
} from "../../lib/activity/activitySession";
import {
  createScoreDocumentFromRhythmDictationDraft,
  type RhythmDictationScoreDocumentV1,
} from "../../lib/music/scoreDocument";
import type { LocalEarTrainingRhythmQuestion } from "../../lib/practice/localEarTrainingRhythm";
import {
  canConfirmRhythmDictationDraft,
  checkRhythmDictationDraft,
  clearRhythmDictationDraft,
  compareRhythmDictationOnsets,
  confirmRhythmDictationDraft,
  createRhythmDictationDraft,
  toggleRhythmDictationDraftOnset,
  validateRhythmDictationDraft,
  type RhythmDictationDraftReviewState,
  type RhythmDictationDraftV1,
} from "../../lib/practice/localRhythmDictation";
import { getLocalRhythmSightReadingOnsetLabel } from "../../lib/practice/localRhythmSightReading";
import type { LocalPracticeAnswerResult } from "../../lib/practice/localPracticeReviewQueue";
import { ActivityProtocolState } from "./ActivityProtocolState";
import { useLocalAudioPlayback } from "./useLocalAudioPlayback";

const reviewStateLabels: Record<RhythmDictationDraftReviewState, string> = {
  draft: "待检查草稿",
  checked: "已检查，等待确认",
  confirmed: "已确认修订",
  cleared: "草稿已清空",
};

const hasOnset = (values: readonly number[], onset: number) =>
  values.some((value) => Math.abs(value - onset) < 0.001);

export function LocalRhythmDictationPanel({
  question,
  sessionSeed,
  onLocalAnswerResult,
}: {
  question: LocalEarTrainingRhythmQuestion;
  sessionSeed: number | null;
  onLocalAnswerResult?: (result: LocalPracticeAnswerResult) => void;
}) {
  const definition = useMemo(
    () => createRhythmDictationActivityDefinition(question),
    [question],
  );
  const [session, setSession] = useState<ActivitySessionV1>(() =>
    createActivitySession(definition, `rhythm-dictation:${question.id}`),
  );
  const sessionRef = useRef(session);
  const [draft, setDraft] = useState<RhythmDictationDraftV1>(() =>
    createRhythmDictationDraft(question, session.attemptId),
  );
  const [confirmedDocument, setConfirmedDocument] =
    useState<RhythmDictationScoreDocumentV1 | null>(null);
  const [hasHeardComplete, setHasHeardComplete] = useState(false);
  const hasPlaybackQualificationRef = useRef(false);
  const [notice, setNotice] = useState("");
  const completionTimerRef = useRef<number | null>(null);
  const audioStateCleanupRef = useRef<(() => void) | null>(null);
  const playbackTokenRef = useRef(0);
  const playbackActiveRef = useRef(false);
  const reportedAttemptRef = useRef<string | null>(null);
  const { isPlaying, playbackState, play, stop: stopPlayback } = useLocalAudioPlayback();

  const comparison = useMemo(() => confirmedDocument
    ? compareRhythmDictationOnsets({
      targetOnsetBeats: question.pattern.onsetBeats,
      draftOnsetBeats: confirmedDocument.parts[0].staves[0].voices[0].measures[0].events
        .map((event) => event.onsetBeat),
    })
    : null, [confirmedDocument, question.pattern.onsetBeats]);

  const clearCompletionTimer = useCallback(() => {
    if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
    completionTimerRef.current = null;
  }, []);

  const clearAudioStateWatch = useCallback(() => {
    audioStateCleanupRef.current?.();
    audioStateCleanupRef.current = null;
  }, []);

  const updateSession = useCallback((next: ActivitySessionV1) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const restartSession = useCallback(() => {
    const next = restartActivityAttempt(sessionRef.current, sessionRef.current.revision);
    updateSession(next);
    return next;
  }, [updateSession]);

  const resetDraft = useCallback(() => {
    const nextSession = restartSession();
    setDraft(createRhythmDictationDraft(question, nextSession.attemptId));
    setConfirmedDocument(null);
    reportedAttemptRef.current = null;
  }, [question, restartSession]);

  const invalidateAttempt = useCallback((message = "") => {
    playbackTokenRef.current += 1;
    playbackActiveRef.current = false;
    hasPlaybackQualificationRef.current = false;
    clearCompletionTimer();
    clearAudioStateWatch();
    stopPlayback();
    setHasHeardComplete(false);
    resetDraft();
    setNotice(message);
  }, [clearAudioStateWatch, clearCompletionTimer, resetDraft, stopPlayback]);

  useEffect(() => {
    const unsubscribe = subscribeBrowserAudioStopAll(() => {
      if (playbackActiveRef.current || hasPlaybackQualificationRef.current) {
        invalidateAttempt("听写已因页面切换、后台或全局停止而作废；旧草稿与确认已清除，请重新播放。");
      }
    });
    return () => unsubscribe();
  }, [invalidateAttempt]);

  useEffect(() => () => {
    playbackTokenRef.current += 1;
    clearCompletionTimer();
    clearAudioStateWatch();
  }, [clearAudioStateWatch, clearCompletionTimer]);

  const playQuestion = async () => {
    playbackTokenRef.current += 1;
    const token = playbackTokenRef.current;
    playbackActiveRef.current = false;
    hasPlaybackQualificationRef.current = false;
    clearCompletionTimer();
    clearAudioStateWatch();
    stopPlayback();
    setHasHeardComplete(false);
    resetDraft();
    setNotice("");
    const playbackError = await play((context, channel) => {
      if (token !== playbackTokenRef.current) return 1;
      const startDelayMs = 80;
      const beatDurationSeconds = 60 / question.bpm;
      const audioStart = context.currentTime + startDelayMs / 1000;
      question.pattern.onsetBeats.forEach((onsetBeat) => {
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
      const handleAudioStateChange = () => {
        if (
          token === playbackTokenRef.current
          && playbackActiveRef.current
          && context.state !== "running"
        ) {
          invalidateAttempt("本轮音频时间线被中断，听题资格未授予；请重新播放。");
        }
      };
      context.addEventListener("statechange", handleAudioStateChange);
      audioStateCleanupRef.current = () =>
        context.removeEventListener("statechange", handleAudioStateChange);
      const durationMs = startDelayMs
        + Math.ceil(question.beatsPerMeasure * 60_000 / question.bpm);
      completionTimerRef.current = window.setTimeout(() => {
        if (token !== playbackTokenRef.current || !playbackActiveRef.current) return;
        const expectedAudioEnd = audioStart
          + question.beatsPerMeasure * beatDurationSeconds;
        if (context.state !== "running" || context.currentTime + 0.02 < expectedAudioEnd) {
          invalidateAttempt("本轮音频时间线被中断，听题资格未授予；请重新播放。");
          return;
        }
        playbackActiveRef.current = false;
        hasPlaybackQualificationRef.current = true;
        clearAudioStateWatch();
        stopPlayback();
        setHasHeardComplete(true);
      }, durationMs);
      return durationMs + 100;
    });
    if (playbackError && token === playbackTokenRef.current) {
      invalidateAttempt(playbackError);
    }
  };

  const toggleOnset = (onsetBeat: number) => {
    if (!hasPlaybackQualificationRef.current || confirmedDocument) return;
    const invalidatesCheck = draft.reviewState === "checked";
    setDraft((current) => toggleRhythmDictationDraftOnset(current, onsetBeat));
    setConfirmedDocument(null);
    if (invalidatesCheck) setNotice("草稿已修改，旧检查已失效；请重新预览并检查。");
  };

  const clearDraft = () => {
    if (!hasPlaybackQualificationRef.current) return;
    const nextSession = restartSession();
    setDraft(clearRhythmDictationDraft(
      createRhythmDictationDraft(question, nextSession.attemptId),
    ));
    setConfirmedDocument(null);
    reportedAttemptRef.current = null;
    setNotice("草稿事件、检查结果与旧确认已清除；听题资格仍保留。");
  };

  const inspectDraft = () => {
    const validation = validateRhythmDictationDraft(draft);
    if (validation.status !== "valid") {
      setNotice(validation.messages[0] ?? "当前草稿不能进入检查。");
      return;
    }
    setDraft(checkRhythmDictationDraft(draft));
    setNotice(`草稿结构检查通过：4/4 一小节，共 ${validation.eventCount} 个击拍事件。请确认预览后再冻结修订。`);
  };

  const confirmAndCheck = () => {
    const confirmedDraft = confirmRhythmDictationDraft(draft);
    if (confirmedDraft.reviewState !== "confirmed") {
      setNotice("旧检查已失效，请重新检查当前草稿后再确认。");
      return;
    }
    const document = createScoreDocumentFromRhythmDictationDraft({ question, draft: confirmedDraft });
    const submitted = submitActivityAnswer(
      definition,
      sessionRef.current,
      {
        mode: "staff-notation",
        documentId: document.documentId,
        revision: document.revision,
      },
      sessionRef.current.revision,
    );
    const evidence = checkRhythmDictationScoreDocument({
      question,
      document,
      answer: submitted.answer,
    });
    const checked = completeActivityCheck(submitted, evidence, submitted.revision);
    updateSession(checked);
    setDraft(confirmedDraft);
    setConfirmedDocument(document);
    setNotice("已冻结并检查当前谱面文档修订；目标现在可以用于事件对照。");

    if (
      sessionSeed !== null
      && onLocalAnswerResult
      && reportedAttemptRef.current !== checked.attemptId
    ) {
      reportedAttemptRef.current = checked.attemptId;
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
  };

  const statusLabel = isPlaying
    ? "正在播放"
    : hasHeardComplete
      ? reviewStateLabels[draft.reviewState]
      : "等待完整播放";

  return (
    <section className="mt-6 rounded-3xl border border-fuchsia-200 bg-fuchsia-50 p-5" aria-label="节奏听写练习">
      <p className="text-sm font-semibold tracking-wide text-fuchsia-700">P116d · 本地节奏听写</p>
      <h3 className="mt-1 text-xl font-bold text-fuchsia-950">听一小节，写成可检查的节奏草稿</h3>
      <p className="mt-2 text-sm leading-6 text-fuchsia-900">完整听题后，在四拍网格中编辑击拍事件；必须依次预览、检查并确认谱面文档修订，才会显示题目事件对照。结果只解释漏记与多记位置，不生成分数、准确率、等级或通过／失败。</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={isPlaying} onClick={() => void playQuestion()} className="rounded-xl bg-fuchsia-800 px-4 py-3 font-semibold text-white disabled:bg-fuchsia-300">{playbackState === "准备中" ? "正在准备声音…" : isPlaying ? "正在播放听写题…" : hasHeardComplete ? "重新播放节奏听写题" : "播放节奏听写题"}</button>
        <button type="button" disabled={!isPlaying} onClick={() => invalidateAttempt("本轮播放已手动停止并作废；旧草稿与确认已清除，请重新播放。")} className="rounded-xl border border-fuchsia-300 bg-white px-4 py-3 font-semibold text-fuchsia-900 disabled:opacity-50">停止并作废播放</button>
        <button type="button" onClick={() => invalidateAttempt()} className="rounded-xl border border-fuchsia-300 bg-white px-4 py-3 font-semibold text-fuchsia-900">清除并重来</button>
      </div>
      <p className="mt-3 text-sm font-semibold text-fuchsia-950" aria-live="polite">状态：{statusLabel}</p>
      {notice ? <p className="mt-2 rounded-xl bg-white p-3 text-sm text-fuchsia-900 ring-1 ring-fuchsia-200">{notice}</p> : null}

      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200">
        <p className="font-bold text-fuchsia-950">编辑四拍谱面草稿</p>
        <p className="mt-1 text-sm leading-6 text-fuchsia-800">每个按钮代表一个可写入的拍内位置。挑战难度同时提供十六分与三连音位置；当前草稿只在本页面内存中。</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {draft.allowedOnsetBeats.map((onsetBeat) => {
            const selected = hasOnset(draft.onsetBeats, onsetBeat);
            const label = getLocalRhythmSightReadingOnsetLabel(onsetBeat);
            return (
              <button
                key={onsetBeat}
                type="button"
                aria-pressed={selected}
                disabled={!hasHeardComplete || Boolean(confirmedDocument)}
                onClick={() => toggleOnset(onsetBeat)}
                className={`min-h-12 rounded-xl border px-2 py-2 text-sm font-semibold disabled:opacity-50 ${selected ? "border-fuchsia-700 bg-fuchsia-700 text-white" : "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950"}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-4" data-testid="rhythm-dictation-draft-preview">
          <p className="font-bold text-fuchsia-950">草稿预览 · 4/4 · 修订 {draft.revision}</p>
          <div className="relative mt-3 h-16 overflow-hidden rounded-xl border border-fuchsia-300 bg-fuchsia-50" aria-label="节奏听写草稿预览">
            {[0, 1, 2, 3].map((beat) => <span key={beat} className="absolute inset-y-0 border-l border-fuchsia-200" style={{ left: `${beat * 25}%` }} />)}
            {draft.onsetBeats.map((onset, index) => <span key={`${onset}-${index}`} className="absolute top-3 h-10 w-2 -translate-x-1/2 rounded-full bg-fuchsia-700" style={{ left: `${Math.min(99, onset * 25)}%` }} title={getLocalRhythmSightReadingOnsetLabel(onset)} />)}
          </div>
          <p className="mt-2 text-sm text-fuchsia-900">{draft.onsetBeats.length === 0 ? "当前草稿为空。" : `已标记：${draft.onsetBeats.map(getLocalRhythmSightReadingOnsetLabel).join(" · ")}`}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={!hasHeardComplete || draft.onsetBeats.length === 0 || draft.reviewState === "confirmed"} onClick={inspectDraft} className="rounded-xl bg-fuchsia-700 px-4 py-2.5 font-semibold text-white disabled:bg-slate-300">检查草稿</button>
          <button type="button" disabled={!hasHeardComplete || !canConfirmRhythmDictationDraft(draft) || Boolean(confirmedDocument)} onClick={confirmAndCheck} className="rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:bg-slate-300">确认并检查听写</button>
          <button type="button" disabled={!hasHeardComplete || draft.onsetBeats.length === 0 || Boolean(confirmedDocument)} onClick={clearDraft} className="rounded-xl border border-fuchsia-300 bg-white px-4 py-2.5 font-semibold text-fuchsia-900 disabled:opacity-50">清空草稿</button>
        </div>
        {!hasHeardComplete ? <p className="mt-3 text-sm text-slate-500">必须完整播放后才能编辑；重播、停止、后台或全局停止会清除旧草稿与确认。</p> : null}
      </div>

      <ActivityProtocolState session={session} />
      {confirmedDocument && comparison && session.checkEvidence ? (
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-fuchsia-200" data-testid="rhythm-dictation-result">
          <p className="font-bold text-fuchsia-950">题目事件对照：{question.pattern.label}</p>
          <p className="mt-2 text-sm leading-6 text-fuchsia-900">目标：{question.pattern.onsetBeats.map(getLocalRhythmSightReadingOnsetLabel).join(" · ")}</p>
          <p className="mt-2 text-sm leading-6 text-fuchsia-900">{session.checkEvidence.explanation}</p>
          <p className="mt-3 text-xs leading-5 text-slate-500">已提交的是当前会话内确认的节奏谱面修订。它不会上传或持久化，也不是正式转写、考试成绩或能力评级。</p>
        </div>
      ) : null}
    </section>
  );
}
