"use client";

import { useMemo, useState } from "react";

import { LocalPianoPanel } from "../piano/LocalPianoPanel";
import {
  createLocalEarTrainingRhythmQuestion,
  earTrainingRhythmPatterns,
  getLocalEarTrainingRhythmAnswer,
  getLocalEarTrainingRhythmDurationMs,
  type EarTrainingRhythmDifficulty,
} from "../../lib/practice/localEarTrainingRhythm";
import { createRhythmAttemptRpcArgs } from "../../lib/practice/cloudPracticeAttempt";
import type {
  LocalPracticeAnswerResult,
  LocalPracticeReviewTarget,
} from "../../lib/practice/localPracticeReviewQueue";
import {
  CourseAttemptSaveNotice,
  useCourseAttemptPersistence,
} from "./CourseAttemptPersistence";
import { useLocalAudioPlayback } from "./useLocalAudioPlayback";
import { useLockedPracticeAnswer } from "./useLockedPracticeAnswer";
import { useLocalQuestionSchedule } from "./useLocalQuestionSchedule";

export function LocalEarTrainingRhythmPanel({
  courseExerciseId,
  initialReviewTarget,
  onLocalAnswerResult,
  onLeaveReviewTarget,
  showLocalPiano = false,
}: {
  courseExerciseId?: string;
  initialReviewTarget?: Extract<LocalPracticeReviewTarget, { kind: "rhythm" }>;
  onLocalAnswerResult?: (result: LocalPracticeAnswerResult) => void;
  onLeaveReviewTarget?: () => void;
  showLocalPiano?: boolean;
}) {
  const [isLocalPianoOpen, setIsLocalPianoOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<EarTrainingRhythmDifficulty>(initialReviewTarget?.difficulty ?? "基础");
  const [sequence, setSequence] = useState(initialReviewTarget?.sequence ?? 0);
  const { questionIndex, sessionSeed, isReady: isQuestionReady } = useLocalQuestionSchedule({
    itemCount: earTrainingRhythmPatterns[difficulty].length,
    sequence,
    isCourseExercise: Boolean(courseExerciseId),
    replaySeed: initialReviewTarget?.seed,
  });
  const answerLock = useLockedPracticeAnswer<string | null>(
    null,
    (selection) => selection !== null,
  );
  const selectedPatternId = answerLock.selection;
  const isAnswerVisible = answerLock.isAnswerVisible;
  const [audioError, setAudioError] = useState("");
  const { resetSaveStatus, saveCourseAttempt, saveStatus } =
    useCourseAttemptPersistence();
  const { isPlaying, playbackState, play, stop: stopPlayback } =
    useLocalAudioPlayback();

  const question = useMemo(
    () => createLocalEarTrainingRhythmQuestion({ difficulty, sequence, questionIndex }),
    [difficulty, questionIndex, sequence],
  );
  const answer = useMemo(
    () => getLocalEarTrainingRhythmAnswer({ question, selectedPatternId }),
    [question, selectedPatternId],
  );

  const resetCurrentQuestion = () => {
    stopPlayback();
    answerLock.reset();
    setAudioError("");
    resetSaveStatus();
  };

  const revealAnswer = async () => {
    const submittedPatternId = answerLock.reveal();
    if (!submittedPatternId) return;
    const matchesAnswer = submittedPatternId === question.pattern.id;
    if (!courseExerciseId && onLocalAnswerResult && sessionSeed !== null) {
      onLocalAnswerResult({
        target: {
          kind: "rhythm",
          difficulty,
          seed: sessionSeed,
          sequence,
        },
        isCorrect: matchesAnswer,
      });
    }
    if (!courseExerciseId) return;

    await saveCourseAttempt(
      "record_rhythm_attempt",
      createRhythmAttemptRpcArgs({
        exerciseId: courseExerciseId,
        difficulty,
        sequence,
        selectedPatternId: submittedPatternId,
        targetPatternId: question.pattern.id,
        matchesAnswer,
      }),
    );
  };

  const playQuestion = async () => {
    setAudioError("");
    const playbackError = await play((audioContext, channel) => {
      const startTime = audioContext.currentTime + 0.05;
      const secondsPerBeat = 60 / question.bpm;
      const oscillators = question.pattern.onsetBeats.map((onsetBeat) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const clickStartTime = startTime + onsetBeat * secondsPerBeat;
        oscillator.type = "sine";
        oscillator.frequency.value = onsetBeat === 0 ? 880 : 660;
        gain.gain.setValueAtTime(0.0001, clickStartTime);
        gain.gain.exponentialRampToValueAtTime(0.14, clickStartTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, clickStartTime + 0.07);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(clickStartTime);
        oscillator.stop(clickStartTime + 0.08);
        return channel.trackSource(oscillator, [gain]);
      });
      return getLocalEarTrainingRhythmDurationMs(question);
    });
    if (playbackError) setAudioError(playbackError);
  };

  const nextQuestion = () => {
    resetCurrentQuestion();
    if (initialReviewTarget && onLeaveReviewTarget) onLeaveReviewTarget();
    else setSequence((current) => current + 1);
  };

  const retryCurrentQuestion = () => {
    resetCurrentQuestion();
    void playQuestion();
  };

  return (
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold tracking-wide text-violet-600">本地练习</p>
      <h2 className="mt-1 text-2xl font-bold text-slate-950">内置节奏听辨练习</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        先听一个四拍的本地合成击拍题，再选择你听到的节奏形状。本模块不上传音频，也不生成正式成绩。{courseExerciseId ? "当前题目来自系统课程；登录后查看答案时会保存一条仅本人可见的练习记录。" : onLocalAnswerResult ? "当前作答和声音不保存；答错时仅保存复现本题所需的最小信息。" : "当前入口不会保存练习记录。"}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
          <label className="block text-sm font-semibold text-slate-800" htmlFor="ear-training-rhythm-difficulty">练习难度</label>
          <select
            id="ear-training-rhythm-difficulty"
            disabled={Boolean(courseExerciseId || initialReviewTarget)}
            className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
            value={difficulty}
            onChange={(event) => {
              stopPlayback();
              setDifficulty(event.target.value as EarTrainingRhythmDifficulty);
              setSequence(0);
              answerLock.reset();
              setAudioError("");
              resetSaveStatus();
            }}
          >
            <option value="基础">基础：三种四拍节奏形状</option>
            <option value="进阶">进阶：增加中间留空的节奏形状</option>
          </select>
          {courseExerciseId ? <p className="mt-2 text-xs leading-5 text-slate-500">系统课程已固定为基础难度，以保持题目版本一致。</p> : null}
          <p className="mt-4 text-sm leading-6 text-violet-900">当前为内置题目 {sequence + 1}，四四拍，速度约为 {question.bpm} BPM。{courseExerciseId ? "系统课程按固定顺序出题。" : "本轮题库会随机排序，全部出现一次后循环；当前作答不保存。"}第一拍使用较高提示音，其余击拍使用较低提示音；题目由浏览器本地 Web Audio 合成，不读取文件、不调用接口。</p>
          {!isQuestionReady ? <p className="mt-2 text-sm text-violet-800">正在准备本轮题目…</p> : null}
          <button type="button" onClick={() => void playQuestion()} disabled={!isQuestionReady || isPlaying} className="mt-4 w-full rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-violet-300">
            {playbackState === "准备中" ? "正在准备声音…" : isPlaying ? "正在播放节奏…" : "播放节奏题目"}
          </button>
          <button type="button" onClick={stopPlayback} disabled={!isPlaying} className="mt-2 w-full rounded-xl border border-violet-300 bg-white px-4 py-3 font-semibold text-violet-800 disabled:cursor-not-allowed disabled:opacity-50">
            停止播放
          </button>
          {audioError ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-800">{audioError}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-500">回答本题</p>
          <p className="mt-1 text-lg font-bold text-slate-950">听完后选择最符合的节奏形状</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {earTrainingRhythmPatterns[difficulty].map((pattern) => (
              <button
                key={pattern.id}
                type="button"
                onClick={() => {
                  if (answerLock.choose(pattern.id)) resetSaveStatus();
                }}
                disabled={!isQuestionReady || isAnswerVisible}
                className={`rounded-xl border px-3 py-3 text-left font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${selectedPatternId === pattern.id ? "border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-200" : "border-slate-200 bg-white text-slate-800 hover:border-violet-300"}`}
              >
                {pattern.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={!answer.hasSelection || saveStatus === "saving"} onClick={() => void revealAnswer()} className="rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              {saveStatus === "saving" ? "正在保存练习记录…" : "查看本题答案"}
            </button>
            {isAnswerVisible && !answer.matchesAnswer ? <button type="button" onClick={retryCurrentQuestion} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 font-semibold text-amber-900">重新播放并复练本题</button> : null}
            <button type="button" onClick={resetCurrentQuestion} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800">重置本题</button>
            <button type="button" disabled={!isQuestionReady} onClick={nextQuestion} className="rounded-xl border border-violet-300 bg-white px-4 py-2.5 font-semibold text-violet-800 disabled:cursor-not-allowed disabled:opacity-50">{initialReviewTarget ? "返回随机练习" : "下一题"}</button>
          </div>
          {!answer.hasSelection ? <p className="mt-3 text-sm leading-6 text-slate-500">请先选择一个节奏形状，再查看本题答案。</p> : null}
          {isAnswerVisible ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="font-bold text-slate-950">本题答案：{answer.answerLabel}</p>
              <p className="mt-1">{answer.explanation}</p>
              <p className="mt-2">你的选择：{earTrainingRhythmPatterns[difficulty].find((pattern) => pattern.id === selectedPatternId)?.label ?? "未选择"}。{answer.matchesAnswer ? "这次选择与本题答案一致。" : "这次选择与本题答案不同；可以再次播放并重置本题复练。"}</p>
              <p className="mt-2 text-slate-500">答案说明显示后，本题选择已锁定；请使用复练或下一题开始新的尝试。这不是正式分数、准确率、等级、通过或失败判断。</p>
            </div>
          ) : null}
          {courseExerciseId ? <CourseAttemptSaveNotice status={saveStatus} /> : null}
        </div>
      </div>

      {showLocalPiano ? (
        <section className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4" aria-label="节奏听辨参考钢琴">
          <button type="button" aria-expanded={isLocalPianoOpen} aria-controls="rhythm-reference-piano" onClick={() => setIsLocalPianoOpen((current) => !current)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-left font-bold text-rose-950 ring-1 ring-rose-200">
            <span>参考钢琴</span><span className="text-sm">{isLocalPianoOpen ? "收起" : "展开"}</span>
          </button>
          <p className="mt-2 text-sm leading-6 text-rose-900">仅用于本地找音。弹奏不保存、不上传，也不生成分数或正式评分。</p>
          {isLocalPianoOpen ? <div id="rhythm-reference-piano" className="mt-4"><LocalPianoPanel /></div> : null}
        </section>
      ) : null}
      <p className="mt-5 text-sm leading-6 text-slate-500">{courseExerciseId ? "课程边界：题目播放与答案仍在浏览器完成，不上传音频。登录用户查看答案时只保存当前题目、选择和答案一致性摘要；未登录用户不保存。" : onLocalAnswerResult ? "本机复练只保存复现这道题所需的题型、难度和随机题序，不保存你的选择、声音或正式成绩。" : "会话边界：题目序号、选择与答案说明只存在于当前页面内存；刷新后消失，不写入 localStorage、IndexedDB、账号或数据库。"}</p>
    </section>
  );
}
