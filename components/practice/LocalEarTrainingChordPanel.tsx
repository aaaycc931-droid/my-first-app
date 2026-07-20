"use client";

import { useMemo, useState } from "react";

import { LocalPianoPanel } from "../piano/LocalPianoPanel";
import { adaptChordQuestionToActivity } from "../../lib/activity/legacyLocalActivityAdapter";
import {
  createLocalEarTrainingChordQuestion,
  getLocalChordAnswerOptions,
  getLocalEarTrainingChordAnswer,
  getLocalEarTrainingChordVariantCount,
  type ChordPlaybackMode,
} from "../../lib/practice/localEarTrainingChords";
import type { LocalPracticeDifficulty } from "../../lib/practice/localPracticeCatalog";
import type {
  LocalPracticeAnswerResult,
  LocalPracticeReviewTarget,
} from "../../lib/practice/localPracticeReviewQueue";
import type { ResolvedLocalPracticeCustomization } from "../../lib/practice/localPracticeCustomizer";
import { ActivityChoiceAnswerPanel } from "./ActivityChoiceAnswerPanel";
import { ActivityProtocolState } from "./ActivityProtocolState";
import { useChoiceActivitySession } from "./useChoiceActivitySession";
import { useLocalAudioPlayback } from "./useLocalAudioPlayback";
import { useLocalQuestionSchedule } from "./useLocalQuestionSchedule";
import { useLockedPracticeAnswer } from "./useLockedPracticeAnswer";

export function LocalEarTrainingChordPanel({
  initialReviewTarget,
  onLocalAnswerResult,
  onLeaveReviewTarget,
  customPractice,
  showLocalPiano = false,
}: {
  initialReviewTarget?: Extract<LocalPracticeReviewTarget, { kind: "chord-inversion" }>;
  onLocalAnswerResult?: (result: LocalPracticeAnswerResult) => void;
  onLeaveReviewTarget?: () => void;
  customPractice?: ResolvedLocalPracticeCustomization;
  showLocalPiano?: boolean;
}) {
  const customConfig = customPractice?.customization.kind === "chord-inversion"
    ? customPractice.customization
    : undefined;
  const activeCustomPractice = customConfig ? customPractice : undefined;
  const [difficulty, setDifficulty] = useState<LocalPracticeDifficulty>(
    initialReviewTarget?.difficulty ?? customConfig?.difficulty ?? "基础",
  );
  const [playbackMode, setPlaybackMode] = useState<ChordPlaybackMode>(
    initialReviewTarget?.playbackMode ?? customConfig?.chordPlaybackMode ?? "和声",
  );
  const [sequence, setSequence] = useState(initialReviewTarget?.sequence ?? 0);
  const [isLocalPianoOpen, setIsLocalPianoOpen] = useState(false);
  const [audioError, setAudioError] = useState("");
  const answerLock = useLockedPracticeAnswer<string | null>(null, (selection) => selection !== null);
  const { isPlaying, playbackState, play, stop: stopPlayback } = useLocalAudioPlayback();
  const variantCount = activeCustomPractice?.variantIds.length
    ?? getLocalEarTrainingChordVariantCount(difficulty);
  const { questionIndex, sessionSeed, isReady } = useLocalQuestionSchedule({
    itemCount: variantCount,
    sequence,
    isCourseExercise: false,
    replaySeed: initialReviewTarget?.seed,
  });
  const question = useMemo(() => createLocalEarTrainingChordQuestion({
    difficulty,
    sequence,
    questionIndex,
    variantId: initialReviewTarget?.variantId ?? activeCustomPractice?.variantIds[questionIndex],
  }), [activeCustomPractice, difficulty, initialReviewTarget?.variantId, questionIndex, sequence]);
  const options = useMemo(
    () => getLocalChordAnswerOptions(difficulty)
      .filter((option) => !activeCustomPractice || activeCustomPractice.answerOptionIds.includes(option.id)),
    [activeCustomPractice, difficulty],
  );
  const answer = useMemo(() => getLocalEarTrainingChordAnswer({
    question,
    selectedOptionId: answerLock.selection,
  }), [answerLock.selection, question]);
  const activityDefinition = useMemo(() => adaptChordQuestionToActivity(question), [question]);
  const activity = useChoiceActivitySession(activityDefinition, `chord:${question.id}`);

  const playQuestion = async () => {
    setAudioError("");
    const playbackError = await play((audioContext, channel) => {
      const startTime = audioContext.currentTime + 0.05;
      const sources = question.frequenciesHz.map((frequencyHz, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const noteStart = playbackMode === "和声" ? startTime : startTime + index * 0.32;
        const noteEnd = playbackMode === "和声" ? startTime + 0.95 : noteStart + 0.62;
        oscillator.type = "sine";
        oscillator.frequency.value = frequencyHz;
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.11, noteStart + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(noteStart);
        oscillator.stop(noteEnd + 0.02);
        return channel.trackSource(oscillator, [gain]);
      });
      void sources;
      return playbackMode === "和声" ? 1050 : 1450;
    });
    if (playbackError) setAudioError(playbackError);
  };

  const resetCurrentQuestion = () => {
    stopPlayback();
    answerLock.reset();
    activity.restart();
    setAudioError("");
  };

  const revealAnswer = () => {
    const submitted = answerLock.reveal();
    if (!submitted) return;
    activity.checkChoice([submitted]);
    if (onLocalAnswerResult && sessionSeed !== null) {
      onLocalAnswerResult({
        target: {
          kind: "chord-inversion",
          difficulty,
          seed: sessionSeed,
          sequence,
          variantId: question.variantId,
          playbackMode,
        },
        isCorrect: submitted === question.answerOptionId,
      });
    }
  };

  const nextQuestion = () => {
    resetCurrentQuestion();
    if (initialReviewTarget && onLeaveReviewTarget) onLeaveReviewTarget();
    else setSequence((current) => current + 1);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold tracking-wide text-fuchsia-700">P115 本地和声练耳</p>
      <h2 className="mt-1 text-2xl font-bold text-slate-950">和弦性质与转位听辨</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">听三个本地合成音，辨认三和弦性质以及最低音所表示的转位。只提供答案核对和解释，不生成正式分数，也不上传声音。</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="rounded-2xl bg-fuchsia-50 p-4 ring-1 ring-fuchsia-100">
          <label className="block text-sm font-semibold text-slate-800" htmlFor="chord-training-difficulty">练习难度</label>
          <select id="chord-training-difficulty" value={difficulty} disabled={Boolean(initialReviewTarget || activeCustomPractice)} onChange={(event) => {
            stopPlayback();
            setDifficulty(event.target.value as LocalPracticeDifficulty);
            setSequence(0);
            answerLock.reset();
            setAudioError("");
          }} className="mt-2 w-full rounded-xl border border-fuchsia-200 bg-white px-3 py-2 text-slate-900 disabled:bg-slate-100">
            <option value="基础">基础：大小三和弦原位</option>
            <option value="进阶">进阶：四种三和弦，原位与第一转位</option>
            <option value="挑战">挑战：四种三和弦与全部三种位置</option>
          </select>

          <fieldset className="mt-4">
            <legend className="text-sm font-semibold text-slate-800">播放方式</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["和声", "分解"] as ChordPlaybackMode[]).map((mode) => (
                <button key={mode} type="button" disabled={Boolean(initialReviewTarget || activeCustomPractice)} aria-pressed={playbackMode === mode} onClick={() => {
                  stopPlayback();
                  setPlaybackMode(mode);
                  answerLock.reset();
                  activity.restart();
                  setAudioError("");
                }} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold ${playbackMode === mode ? "border-fuchsia-700 bg-fuchsia-100 text-fuchsia-950" : "border-fuchsia-200 bg-white text-fuchsia-800"}`}>{mode === "和声" ? "同时发声" : "从低到高"}</button>
              ))}
            </div>
          </fieldset>

          <p className="mt-4 text-sm leading-6 text-fuchsia-950">本难度共 {variantCount} 个版本化组合；当前为第 {sequence + 1} 题。题目在本机生成并随机排序，全部出现后循环。</p>
          {!isReady ? <p className="mt-2 text-sm text-fuchsia-800">正在准备本轮题目…</p> : null}
          <button type="button" disabled={!isReady || isPlaying} onClick={() => void playQuestion()} className="mt-4 w-full rounded-xl bg-fuchsia-700 px-4 py-3 font-bold text-white disabled:bg-fuchsia-300">{playbackState === "准备中" ? "正在准备声音…" : isPlaying ? "正在播放和弦…" : "播放题目"}</button>
          <button type="button" disabled={!isPlaying} onClick={stopPlayback} className="mt-2 w-full rounded-xl border border-fuchsia-300 bg-white px-4 py-3 font-bold text-fuchsia-900 disabled:opacity-50">停止播放</button>
          {audioError ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-800">{audioError}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-500">回答本题</p>
          <p className="mt-1 text-lg font-bold text-slate-950">选择和弦性质与转位</p>
          <ActivityChoiceAnswerPanel options={options} selectedOptionId={answerLock.selection} disabled={!isReady || answerLock.isAnswerVisible} accent="fuchsia" onChoose={(optionId) => {
            if (!answerLock.choose(optionId)) return;
            activity.submitChoice([optionId]);
          }} />
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={!answer.hasSelection} onClick={revealAnswer} className="rounded-xl bg-slate-900 px-4 py-2.5 font-bold text-white disabled:bg-slate-300">查看本题答案</button>
            {answerLock.isAnswerVisible && !answer.matchesAnswer ? <button type="button" onClick={() => { resetCurrentQuestion(); void playQuestion(); }} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 font-bold text-amber-900">重新播放并复练本题</button> : null}
            <button type="button" onClick={resetCurrentQuestion} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-800">重置本题</button>
            <button type="button" disabled={!isReady} onClick={nextQuestion} className="rounded-xl border border-fuchsia-300 bg-white px-4 py-2.5 font-bold text-fuchsia-900 disabled:opacity-50">{initialReviewTarget ? "返回随机练习" : "下一题"}</button>
          </div>
          {!answer.hasSelection ? <p className="mt-3 text-sm leading-6 text-slate-500">请先选择一个组合，再查看答案。</p> : null}
          <ActivityProtocolState session={activity.session} />
          {answerLock.isAnswerVisible ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="font-bold text-slate-950">本题答案：{answer.answerLabel}</p>
              <p className="mt-1">{answer.explanation}</p>
              <p className="mt-2">你的选择：{options.find((option) => option.id === answer.selectedOptionId)?.label ?? "未选择"}。{answer.matchesAnswer ? "这次选择与答案一致。" : "这次选择与答案不同，可重新播放并复练。"}</p>
              <p className="mt-2 text-slate-500">这是非评分答案说明，不代表准确率、等级、通过或失败。</p>
            </div>
          ) : null}
        </div>
      </div>

      {showLocalPiano ? (
        <section className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4" aria-label="和弦听辨参考钢琴">
          <button type="button" aria-expanded={isLocalPianoOpen} aria-controls="chord-reference-piano" onClick={() => setIsLocalPianoOpen((current) => !current)} className="flex min-h-11 w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left font-bold text-rose-950 ring-1 ring-rose-200"><span>参考钢琴</span><span className="text-sm">{isLocalPianoOpen ? "收起" : "展开"}</span></button>
          <p className="mt-2 text-sm leading-6 text-rose-900">仅用于本地找音；弹奏不保存、不上传，也不参与答案判定。</p>
          {isLocalPianoOpen ? <div id="chord-reference-piano" className="mt-4"><LocalPianoPanel /></div> : null}
        </section>
      ) : null}
      <p className="mt-5 text-sm leading-6 text-slate-500">本机复练只保存题型、难度、播放方式和版本化题目标识；不保存你的选择、声音或正式成绩。</p>
    </section>
  );
}
