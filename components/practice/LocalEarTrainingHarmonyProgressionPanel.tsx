"use client";

import { useMemo, useState } from "react";

import { LocalPianoPanel } from "../piano/LocalPianoPanel";
import { adaptHarmonyProgressionQuestionToActivity } from "../../lib/activity/legacyLocalActivityAdapter";
import {
  createLocalHarmonyProgressionQuestion,
  getLocalHarmonyProgressionAnswer,
  getLocalHarmonyProgressionAnswerOptions,
  getLocalHarmonyProgressionVariantCount,
} from "../../lib/practice/localEarTrainingHarmonyProgressions";
import type { LocalPracticeDifficulty } from "../../lib/practice/localPracticeCatalog";
import type { LocalPracticeAnswerResult, LocalPracticeReviewTarget } from "../../lib/practice/localPracticeReviewQueue";
import type { ResolvedLocalPracticeCustomization } from "../../lib/practice/localPracticeCustomizer";
import { ActivityChoiceAnswerPanel } from "./ActivityChoiceAnswerPanel";
import { ActivityProtocolState } from "./ActivityProtocolState";
import { useChoiceActivitySession } from "./useChoiceActivitySession";
import { useLocalAudioPlayback } from "./useLocalAudioPlayback";
import { useLocalQuestionSchedule } from "./useLocalQuestionSchedule";
import { useLockedPracticeAnswer } from "./useLockedPracticeAnswer";

export function LocalEarTrainingHarmonyProgressionPanel({
  initialReviewTarget,
  onLocalAnswerResult,
  onLeaveReviewTarget,
  customPractice,
  showLocalPiano = false,
}: {
  initialReviewTarget?: Extract<LocalPracticeReviewTarget, { kind: "harmony-progression" }>;
  onLocalAnswerResult?: (result: LocalPracticeAnswerResult) => void;
  onLeaveReviewTarget?: () => void;
  customPractice?: ResolvedLocalPracticeCustomization;
  showLocalPiano?: boolean;
}) {
  const activeCustomPractice = customPractice?.customization.kind === "harmony-progression"
    ? customPractice
    : undefined;
  const [difficulty, setDifficulty] = useState<LocalPracticeDifficulty>(initialReviewTarget?.difficulty ?? activeCustomPractice?.customization.difficulty ?? "基础");
  const [sequence, setSequence] = useState(initialReviewTarget?.sequence ?? 0);
  const [isLocalPianoOpen, setIsLocalPianoOpen] = useState(false);
  const [audioError, setAudioError] = useState("");
  const answerLock = useLockedPracticeAnswer<string | null>(null, (selection) => selection !== null);
  const { isPlaying, playbackState, play, stop: stopPlayback } = useLocalAudioPlayback();
  const variantCount = activeCustomPractice?.variantIds.length
    ?? getLocalHarmonyProgressionVariantCount(difficulty);
  const { questionIndex, sessionSeed, isReady } = useLocalQuestionSchedule({
    itemCount: variantCount,
    sequence,
    isCourseExercise: false,
    replaySeed: initialReviewTarget?.seed,
  });
  const question = useMemo(() => createLocalHarmonyProgressionQuestion({
    difficulty,
    sequence,
    questionIndex,
    variantId: initialReviewTarget?.variantId ?? activeCustomPractice?.variantIds[questionIndex],
  }), [activeCustomPractice, difficulty, initialReviewTarget?.variantId, questionIndex, sequence]);
  const options = useMemo(
    () => getLocalHarmonyProgressionAnswerOptions(difficulty)
      .filter((option) => !activeCustomPractice || activeCustomPractice.answerOptionIds.includes(option.id)),
    [activeCustomPractice, difficulty],
  );
  const answer = useMemo(() => getLocalHarmonyProgressionAnswer({
    question,
    selectedOptionId: answerLock.selection,
  }), [answerLock.selection, question]);
  const activityDefinition = useMemo(() => adaptHarmonyProgressionQuestionToActivity(question), [question]);
  const activity = useChoiceActivitySession(activityDefinition, `progression:${question.id}`);

  const playQuestion = async () => {
    setAudioError("");
    const playbackError = await play((audioContext, channel) => {
      const startTime = audioContext.currentTime + 0.05;
      question.chordFrequenciesHz.forEach((chord, chordIndex) => {
        chord.forEach((frequencyHz) => {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          const noteStart = startTime + chordIndex * 0.78;
          const noteEnd = noteStart + 0.66;
          oscillator.type = "sine";
          oscillator.frequency.value = frequencyHz;
          gain.gain.setValueAtTime(0.0001, noteStart);
          gain.gain.exponentialRampToValueAtTime(0.075, noteStart + 0.018);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          oscillator.start(noteStart);
          oscillator.stop(noteEnd + 0.02);
          channel.trackSource(oscillator, [gain]);
        });
      });
      return question.chordFrequenciesHz.length * 780 + 100;
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
          kind: "harmony-progression",
          difficulty,
          seed: sessionSeed,
          sequence,
          variantId: question.variantId,
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
      <p className="text-sm font-semibold tracking-wide text-cyan-700">P115 本地和声练耳</p>
      <h2 className="mt-1 text-2xl font-bold text-slate-950">和声进行与终止式听辨</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">听一组依次播放的三和弦，辨认级数进行和收束方式。只提供答案核对与解释，不生成正式分数。</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="rounded-2xl bg-cyan-50 p-4 ring-1 ring-cyan-100">
          <label className="block text-sm font-semibold text-slate-800" htmlFor="progression-training-difficulty">练习难度</label>
          <select id="progression-training-difficulty" value={difficulty} disabled={Boolean(initialReviewTarget || activeCustomPractice)} onChange={(event) => {
            stopPlayback();
            setDifficulty(event.target.value as LocalPracticeDifficulty);
            setSequence(0);
            answerLock.reset();
            setAudioError("");
          }} className="mt-2 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-slate-900 disabled:bg-slate-100">
            <option value="基础">基础：正格与变格收束</option>
            <option value="进阶">进阶：常见大调进行</option>
            <option value="挑战">挑战：阻碍进行与小调收束</option>
          </select>
          <p className="mt-4 text-sm leading-6 text-cyan-950">本难度共 {variantCount} 个版本化组合；当前为第 {sequence + 1} 题。完整一轮出现前不重复。</p>
          {!isReady ? <p className="mt-2 text-sm text-cyan-800">正在准备本轮题目…</p> : null}
          <button type="button" disabled={!isReady || isPlaying} onClick={() => void playQuestion()} className="mt-4 w-full rounded-xl bg-cyan-700 px-4 py-3 font-bold text-white disabled:bg-cyan-300">{playbackState === "准备中" ? "正在准备声音…" : isPlaying ? "正在播放进行…" : "播放和声进行"}</button>
          <button type="button" disabled={!isPlaying} onClick={stopPlayback} className="mt-2 w-full rounded-xl border border-cyan-300 bg-white px-4 py-3 font-bold text-cyan-900 disabled:opacity-50">停止播放</button>
          {audioError ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-800">{audioError}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-500">回答本题</p>
          <p className="mt-1 text-lg font-bold text-slate-950">选择听到的和声进行</p>
          <ActivityChoiceAnswerPanel options={options} selectedOptionId={answerLock.selection} disabled={!isReady || answerLock.isAnswerVisible} accent="sky" columns={2} onChoose={(optionId) => {
            if (!answerLock.choose(optionId)) return;
            activity.submitChoice([optionId]);
          }} />
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={!answer.hasSelection} onClick={revealAnswer} className="rounded-xl bg-slate-900 px-4 py-2.5 font-bold text-white disabled:bg-slate-300">查看本题答案</button>
            {answerLock.isAnswerVisible && !answer.matchesAnswer ? <button type="button" onClick={() => { resetCurrentQuestion(); void playQuestion(); }} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 font-bold text-amber-900">重新播放并复练本题</button> : null}
            <button type="button" onClick={resetCurrentQuestion} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-800">重置本题</button>
            <button type="button" disabled={!isReady} onClick={nextQuestion} className="rounded-xl border border-cyan-300 bg-white px-4 py-2.5 font-bold text-cyan-900 disabled:opacity-50">{initialReviewTarget ? "返回随机练习" : "下一题"}</button>
          </div>
          <ActivityProtocolState session={activity.session} />
          {answerLock.isAnswerVisible ? <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <p className="font-bold text-slate-950">本题答案：{answer.answerLabel}</p>
            <p className="mt-1">{answer.explanation}</p>
            <p className="mt-2">{answer.matchesAnswer ? "这次选择与答案一致。" : "这次选择与答案不同，可重新播放并复练。"}</p>
            <p className="mt-2 text-slate-500">这是非评分答案说明，不代表准确率、等级、通过或失败。</p>
          </div> : null}
        </div>
      </div>

      {showLocalPiano ? <section className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4" aria-label="和声进行参考钢琴">
        <button type="button" aria-expanded={isLocalPianoOpen} aria-controls="progression-reference-piano" onClick={() => setIsLocalPianoOpen((current) => !current)} className="flex min-h-11 w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left font-bold text-cyan-950 ring-1 ring-cyan-200"><span>参考钢琴</span><span className="text-sm">{isLocalPianoOpen ? "收起" : "展开"}</span></button>
        <p className="mt-2 text-sm leading-6 text-cyan-900">仅用于本地找音；弹奏不参与答案判定。</p>
        {isLocalPianoOpen ? <div id="progression-reference-piano" className="mt-4"><LocalPianoPanel /></div> : null}
      </section> : null}
      <p className="mt-5 text-sm leading-6 text-slate-500">本机复练只保存题型、难度和稳定题目标识；不保存声音、你的具体选择或正式成绩。</p>
    </section>
  );
}
