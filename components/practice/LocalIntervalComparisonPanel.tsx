"use client";

import { useMemo, useState } from "react";

import { adaptIntervalComparisonQuestionToActivity } from "../../lib/activity/legacyLocalActivityAdapter";
import {
  createLocalIntervalComparisonQuestion,
  getLocalIntervalComparisonAnswer,
  getLocalIntervalComparisonFrequencies,
  getLocalIntervalComparisonVariantCount,
  intervalDirectionOptions,
  intervalSizeOptions,
  type IntervalDirectionRelation,
  type IntervalSizeRelation,
} from "../../lib/practice/localIntervalComparisons";
import type { LocalPracticeDifficulty } from "../../lib/practice/localPracticeCatalog";
import type { LocalPracticeAnswerResult, LocalPracticeReviewTarget } from "../../lib/practice/localPracticeReviewQueue";
import { ActivityProtocolState } from "./ActivityProtocolState";
import { LocalIntervalImitationPanel } from "./LocalIntervalImitationPanel";
import { useChoiceActivitySession } from "./useChoiceActivitySession";
import { useLocalAudioPlayback } from "./useLocalAudioPlayback";
import { useLocalQuestionSchedule } from "./useLocalQuestionSchedule";

export function LocalIntervalComparisonPanel({
  initialReviewTarget,
  onLocalAnswerResult,
  onLeaveReviewTarget,
}: {
  initialReviewTarget?: Extract<LocalPracticeReviewTarget, { kind: "interval-comparison" }>;
  onLocalAnswerResult?: (result: LocalPracticeAnswerResult) => void;
  onLeaveReviewTarget?: () => void;
}) {
  const [difficulty, setDifficulty] = useState<LocalPracticeDifficulty>(initialReviewTarget?.difficulty ?? "基础");
  const [sequence, setSequence] = useState(initialReviewTarget?.sequence ?? 0);
  const [size, setSize] = useState<IntervalSizeRelation | null>(null);
  const [direction, setDirection] = useState<IntervalDirectionRelation | null>(null);
  const [checked, setChecked] = useState(false);
  const variantCount = getLocalIntervalComparisonVariantCount(difficulty);
  const { questionIndex, sessionSeed, isReady } = useLocalQuestionSchedule({
    itemCount: variantCount,
    sequence,
    isCourseExercise: false,
    replaySeed: initialReviewTarget?.seed,
  });
  const question = useMemo(() => createLocalIntervalComparisonQuestion({
    difficulty,
    sequence,
    questionIndex,
    variantId: initialReviewTarget?.variantId,
  }), [difficulty, initialReviewTarget?.variantId, questionIndex, sequence]);
  const definition = useMemo(() => adaptIntervalComparisonQuestionToActivity(question), [question]);
  const activity = useChoiceActivitySession(definition, `interval-comparison:${question.id}`);
  const audio = useLocalAudioPlayback();
  const answer = getLocalIntervalComparisonAnswer(question);

  const updateAnswer = (nextSize: IntervalSizeRelation | null, nextDirection: IntervalDirectionRelation | null) => {
    setSize(nextSize);
    setDirection(nextDirection);
    if (nextSize && nextDirection) activity.submitChoice([nextSize, nextDirection]);
  };
  const playQuestion = async () => {
    const groups = getLocalIntervalComparisonFrequencies(question);
    await audio.play((context, channel) => {
      const base = context.currentTime + 0.04;
      groups.forEach((frequencies, groupIndex) => frequencies.forEach((frequency, noteIndex) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = base + groupIndex * 1.8 + noteIndex * 0.7;
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.16, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.52);
        oscillator.connect(gain);
        gain.connect(context.destination);
        channel.trackSource(oscillator, [gain]);
        oscillator.start(start);
        oscillator.stop(start + 0.54);
      }));
      return 3_200;
    });
  };
  const reset = () => {
    audio.stop();
    setSize(null);
    setDirection(null);
    setChecked(false);
    activity.restart();
  };
  const check = () => {
    if (!size || !direction || checked) return;
    activity.checkChoice([size, direction]);
    setChecked(true);
    if (onLocalAnswerResult && sessionSeed !== null) onLocalAnswerResult({
      target: {
        kind: "interval-comparison",
        difficulty,
        seed: sessionSeed,
        sequence,
        variantId: question.variantId,
      },
      isCorrect: size === question.sizeRelation && direction === question.directionRelation,
    });
  };
  const next = () => {
    reset();
    if (initialReviewTarget && onLeaveReviewTarget) onLeaveReviewTarget();
    else setSequence((current) => current + 1);
  };

  return <section className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
    <p className="text-sm font-semibold tracking-wide text-emerald-700">P115h 本地音程练习</p>
    <h2 className="mt-1 text-2xl font-black text-slate-950">音程大小与方向比较</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">依次听两组本地合成的旋律音程，判断音程大小和两组方向。答案核对仍是非评分练习事实，不代表等级、通过或失败。</p>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl bg-emerald-50 p-4">
        <label htmlFor="interval-comparison-difficulty" className="text-sm font-bold">练习难度</label>
        <select id="interval-comparison-difficulty" value={difficulty} disabled={Boolean(initialReviewTarget)} onChange={(event) => { audio.stop(); setDifficulty(event.target.value as LocalPracticeDifficulty); setSequence(0); setSize(null); setDirection(null); setChecked(false); activity.restart(); }} className="mt-2 w-full rounded-xl border border-emerald-200 bg-white p-2 disabled:bg-slate-100"><option value="基础">基础</option><option value="进阶">进阶</option><option value="挑战">挑战</option></select>
        <p className="mt-3 text-sm text-emerald-950">本难度共 {variantCount} 个稳定组合，完整一轮前不重复。</p>
        <button type="button" onClick={() => void playQuestion()} disabled={!isReady || audio.isPlaying} className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-50">{audio.isPlaying ? "正在播放两组音程…" : "播放两组音程"}</button>
        <button type="button" onClick={audio.stop} disabled={!audio.isPlaying} className="mt-2 w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 font-bold text-emerald-900 disabled:opacity-50">停止播放</button>
      </div>
      <div className="rounded-2xl border border-slate-200 p-4">
        <fieldset disabled={!isReady || checked}><legend className="font-bold text-slate-950">哪一组音程更大？</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">{intervalSizeOptions.map((option) => <button type="button" key={option.id} aria-pressed={size === option.id} onClick={() => updateAnswer(option.id, direction)} className={`rounded-xl border p-2 text-sm font-bold ${size === option.id ? "border-emerald-700 bg-emerald-50" : "border-slate-200"}`}>{option.label}</button>)}</div></fieldset>
        <fieldset disabled={!isReady || checked} className="mt-4"><legend className="font-bold text-slate-950">两组分别是什么方向？</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{intervalDirectionOptions.map((option) => <button type="button" key={option.id} aria-pressed={direction === option.id} onClick={() => updateAnswer(size, option.id)} className={`rounded-xl border p-2 text-sm font-bold ${direction === option.id ? "border-emerald-700 bg-emerald-50" : "border-slate-200"}`}>{option.label}</button>)}</div></fieldset>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={check} disabled={!size || !direction || checked} className="rounded-xl bg-slate-900 px-4 py-2.5 font-bold text-white disabled:bg-slate-300">查看比较答案</button><button type="button" onClick={reset} className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold">重置本题</button><button type="button" onClick={next} disabled={!isReady} className="rounded-xl border border-emerald-300 px-4 py-2.5 font-bold text-emerald-900">{initialReviewTarget ? "返回随机练习" : "下一题"}</button></div>
        <ActivityProtocolState session={activity.session} />
        {checked ? <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><p className="font-bold text-slate-950">本题答案：{intervalSizeOptions.find((option) => option.id === question.sizeRelation)?.label}；{intervalDirectionOptions.find((option) => option.id === question.directionRelation)?.label}</p><p>{answer.explanation}</p><p className="text-slate-500">这是非评分答案说明，不是准确率、等级、通过或失败。</p></div> : null}
      </div>
    </div>
    {checked ? <LocalIntervalImitationPanel key={question.variantId} question={question} /> : null}
    <p className="mt-5 text-sm leading-6 text-slate-500">复练与学习画像只保存比较题的题型、难度、稳定题目标识和核对事实；不保存选择、录音、模唱证据、账号或正式成绩。</p>
  </section>;
}
