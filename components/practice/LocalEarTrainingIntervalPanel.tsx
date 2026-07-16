"use client";

import { useMemo, useState } from "react";

import {
  createLocalEarTrainingQuestion,
  earTrainingIntervals,
  getIntervalTargetFrequencyHz,
  getLocalEarTrainingDirectionDescription,
  getLocalEarTrainingAnswer,
  type EarTrainingDifficulty,
  type EarTrainingDirection,
} from "../../lib/practice/localEarTrainingIntervals";
import { createIntervalAttemptRpcArgs } from "../../lib/practice/cloudPracticeAttempt";
import {
  CourseAttemptSaveNotice,
  useCourseAttemptPersistence,
} from "./CourseAttemptPersistence";
import { useLocalAudioPlayback } from "./useLocalAudioPlayback";
import { useLockedPracticeAnswer } from "./useLockedPracticeAnswer";

export function LocalEarTrainingIntervalPanel({
  courseExerciseId,
}: {
  courseExerciseId?: string;
}) {
  const [difficulty, setDifficulty] = useState<EarTrainingDifficulty>("基础");
  const [direction, setDirection] = useState<EarTrainingDirection>("上行");
  const [sequence, setSequence] = useState(0);
  const answerLock = useLockedPracticeAnswer<string | null>(
    null,
    (selection) => selection !== null,
  );
  const selectedIntervalId = answerLock.selection;
  const isAnswerVisible = answerLock.isAnswerVisible;
  const [audioError, setAudioError] = useState("");
  const { resetSaveStatus, saveCourseAttempt, saveStatus } =
    useCourseAttemptPersistence();
  const { isPlaying, playbackState, play, stop: stopPlayback } =
    useLocalAudioPlayback();

  const question = useMemo(
    () => createLocalEarTrainingQuestion({ difficulty, direction, sequence }),
    [difficulty, direction, sequence],
  );
  const answer = useMemo(
    () => getLocalEarTrainingAnswer({ question, selectedIntervalId }),
    [question, selectedIntervalId],
  );

  const playQuestion = async () => {
    setAudioError("");
    const playbackError = await play((audioContext, channel) => {
      const startTime = audioContext.currentTime + 0.04;
      const secondStartTime = startTime + 0.78;
      const targetFrequencyHz = getIntervalTargetFrequencyHz(question);
      const oscillators = [question.rootFrequencyHz, targetFrequencyHz].map(
        (frequencyHz, index) => {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          const noteStartTime = index === 0 ? startTime : secondStartTime;
          oscillator.type = "sine";
          oscillator.frequency.value = frequencyHz;
          gain.gain.setValueAtTime(0.0001, noteStartTime);
          gain.gain.exponentialRampToValueAtTime(0.16, noteStartTime + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, noteStartTime + 0.58);
          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          oscillator.start(noteStartTime);
          oscillator.stop(noteStartTime + 0.6);
          return channel.trackSource(oscillator, [gain]);
        });
      return 1500;
    });
    if (playbackError) setAudioError(playbackError);
  };

  const resetCurrentQuestion = () => {
    stopPlayback();
    answerLock.reset();
    setAudioError("");
    resetSaveStatus();
  };

  const revealAnswer = async () => {
    const submittedIntervalId = answerLock.reveal();
    if (!submittedIntervalId) return;
    if (!courseExerciseId) return;

    await saveCourseAttempt(
      "record_interval_attempt",
      createIntervalAttemptRpcArgs({
        exerciseId: courseExerciseId,
        difficulty,
        direction,
        sequence,
        selectedIntervalId: submittedIntervalId,
        targetIntervalId: question.interval.id,
        matchesAnswer: answer.matchesAnswer,
      }),
    );
  };

  const nextQuestion = () => {
    resetCurrentQuestion();
    setSequence((current) => current + 1);
  };

  const retryCurrentQuestion = () => {
    resetCurrentQuestion();
    void playQuestion();
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold tracking-wide text-emerald-600">本地练习</p>
      <h2 className="mt-1 text-2xl font-bold text-slate-950">内置音程听辨练习</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        先听两个依次播放的本地合成音，再选择你听到的音程。本模块不上传音频，也不生成正式成绩。{courseExerciseId ? "当前题目来自系统课程；登录后查看答案时会保存一条仅本人可见的练习记录。" : "当前入口不会保存练习记录。"}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
          <label className="block text-sm font-semibold text-slate-800" htmlFor="ear-training-difficulty">练习难度</label>
          <select
            id="ear-training-difficulty"
            disabled={Boolean(courseExerciseId)}
            className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
            value={difficulty}
            onChange={(event) => {
              stopPlayback();
              setDifficulty(event.target.value as EarTrainingDifficulty);
              setSequence(0);
              answerLock.reset();
              setAudioError("");
              resetSaveStatus();
            }}
          >
            <option value="基础">基础：大三度、纯四度、纯五度</option>
            <option value="进阶">进阶：二度、三度、纯四度、纯五度</option>
          </select>
          {courseExerciseId ? <p className="mt-2 text-xs leading-5 text-slate-500">系统课程已固定为基础难度，以保持题目版本一致；你仍可练习上行或下行。</p> : null}
          <fieldset className="mt-4">
            <legend className="text-sm font-semibold text-slate-800">音程方向</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["上行", "下行"] as EarTrainingDirection[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    stopPlayback();
                    setDirection(option);
                    setSequence(0);
                    answerLock.reset();
                    setAudioError("");
                    resetSaveStatus();
                  }}
                  aria-pressed={direction === option}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${direction === option ? "border-emerald-600 bg-emerald-100 text-emerald-950" : "border-emerald-200 bg-white text-emerald-800"}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="mt-4 text-sm leading-6 text-emerald-900">当前为内置题目 {sequence + 1}（{direction}）。{getLocalEarTrainingDirectionDescription(direction)} 题目音高由浏览器本地 Web Audio 合成，不读取文件、不调用接口。</p>
          <button type="button" onClick={() => void playQuestion()} disabled={isPlaying} className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300">
            {playbackState === "准备中" ? "正在准备声音…" : isPlaying ? "正在播放两个音…" : "播放题目"}
          </button>
          <button type="button" onClick={stopPlayback} disabled={!isPlaying} className="mt-2 w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
            停止播放
          </button>
          {audioError ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-800">{audioError}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-500">回答本题</p>
          <p className="mt-1 text-lg font-bold text-slate-950">听完后选择两个音之间的{direction}音程</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {earTrainingIntervals[difficulty].map((interval) => (
              <button
                key={interval.id}
                type="button"
                disabled={isAnswerVisible}
                onClick={() => { if (answerLock.choose(interval.id)) resetSaveStatus(); }}
                className={`rounded-xl border px-3 py-3 text-left font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${selectedIntervalId === interval.id ? "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200" : "border-slate-200 bg-white text-slate-800 hover:border-emerald-300"}`}
              >
                {interval.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={!answer.hasSelection || saveStatus === "saving"} onClick={() => void revealAnswer()} className="rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              {saveStatus === "saving" ? "正在保存练习记录…" : "查看本题答案"}
            </button>
            {isAnswerVisible && !answer.matchesAnswer ? <button type="button" onClick={retryCurrentQuestion} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 font-semibold text-amber-900">重新播放并复练本题</button> : null}
            <button type="button" onClick={resetCurrentQuestion} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800">重置本题</button>
            <button type="button" onClick={nextQuestion} className="rounded-xl border border-emerald-300 bg-white px-4 py-2.5 font-semibold text-emerald-800">下一题</button>
          </div>
          {!answer.hasSelection ? <p className="mt-3 text-sm leading-6 text-slate-500">请先选择一个音程，再查看本题答案。</p> : null}
          {isAnswerVisible ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="font-bold text-slate-950">本题答案：{answer.answerLabel}</p>
              <p className="mt-1">{answer.explanation}</p>
              <p className="mt-2">你的选择：{earTrainingIntervals[difficulty].find((interval) => interval.id === selectedIntervalId)?.label ?? "未选择"}。{answer.matchesAnswer ? "这次选择与本题答案一致。" : "这次选择与本题答案不同；可以再次播放并重置本题复练。"}</p>
              <p className="mt-2 text-slate-500">答案说明显示后，本题选择已锁定；请使用复练或下一题开始新的尝试。这不是正式分数、准确率、等级、通过或失败判断。</p>
            </div>
          ) : null}
          {courseExerciseId ? <CourseAttemptSaveNotice status={saveStatus} /> : null}
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-500">{courseExerciseId ? "课程边界：题目播放与答案仍在浏览器完成，不上传音频。登录用户查看答案时只保存当前题目、方向、选择和答案一致性摘要；未登录用户不保存。" : "会话边界：题目序号、选择与答案说明只存在于当前页面内存；刷新后消失，不写入 localStorage、IndexedDB、账号或数据库。"}</p>
    </section>
  );
}
