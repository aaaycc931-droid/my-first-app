"use client";

import { useMemo, useState } from "react";

import { LocalPianoPanel } from "../piano/LocalPianoPanel";
import {
  createLocalEarTrainingMelodyQuestion,
  earTrainingMelodyNotes,
  getEarTrainingMelodyNoteIds,
  getLocalEarTrainingMelodyAnswer,
  getLocalEarTrainingMelodyVariantCount,
  type EarTrainingMelodyDictationDifficulty,
} from "../../lib/practice/localEarTrainingMelodyDictation";
import type {
  LocalPracticeAnswerResult,
  LocalPracticeReviewTarget,
} from "../../lib/practice/localPracticeReviewQueue";
import { useLocalAudioPlayback } from "./useLocalAudioPlayback";
import { useLockedPracticeAnswer } from "./useLockedPracticeAnswer";
import { useLocalQuestionSchedule } from "./useLocalQuestionSchedule";
import { ActivityOrderedChoiceAnswerPanel } from "./ActivityChoiceAnswerPanel";
import { ActivityProtocolState } from "./ActivityProtocolState";
import { useChoiceActivitySession } from "./useChoiceActivitySession";
import { adaptMelodyDictationQuestionToActivity } from "../../lib/activity/legacyLocalActivityAdapter";
import {
  adaptFixedSolfegeAnswerToActivityEvidence,
  createFixedSolfegeAnswer,
  enableMelodyFixedSolfegeInput,
  FIXED_SOLFEGE_TOKEN_BY_NOTE_ID,
} from "../../lib/activity/melodySolfegeActivityAdapter";

type MelodyAnswerMode = "choice" | "solfege";

const getFixedSolfegeLabel = (noteId: string) => {
  const token = FIXED_SOLFEGE_TOKEN_BY_NOTE_ID[
    noteId as keyof typeof FIXED_SOLFEGE_TOKEN_BY_NOTE_ID
  ];
  const pitchLabel = earTrainingMelodyNotes[
    noteId as keyof typeof earTrainingMelodyNotes
  ].label;
  const syllable = noteId === "c5"
    ? "高音 do"
    : noteId === "f-sharp-4"
      ? "升 fa"
      : token.startsWith("ti")
        ? "si"
        : token.replace(/[0-9]/g, "");
  return `${syllable}（${pitchLabel}）`;
};

export function LocalEarTrainingMelodyDictationPanel({
  initialReviewTarget,
  onLocalAnswerResult,
  onLeaveReviewTarget,
  showLocalPiano = false,
  expandedLocalCatalog = false,
}: {
  initialReviewTarget?: Extract<LocalPracticeReviewTarget, { kind: "melody-dictation" }>;
  onLocalAnswerResult?: (result: LocalPracticeAnswerResult) => void;
  onLeaveReviewTarget?: () => void;
  showLocalPiano?: boolean;
  expandedLocalCatalog?: boolean;
}) {
  const [isLocalPianoOpen, setIsLocalPianoOpen] = useState(false);
  const [answerMode, setAnswerMode] = useState<MelodyAnswerMode>("choice");
  const [difficulty, setDifficulty] = useState<EarTrainingMelodyDictationDifficulty>(initialReviewTarget?.difficulty ?? "基础");
  const [sequence, setSequence] = useState(initialReviewTarget?.sequence ?? 0);
  const catalogMode = expandedLocalCatalog ? "expanded-local-v2" : "legacy-v1";
  const variantCount = getLocalEarTrainingMelodyVariantCount(difficulty, catalogMode);
  const { questionIndex, sessionSeed, isReady: isQuestionReady } = useLocalQuestionSchedule({
    itemCount: variantCount,
    sequence,
    isCourseExercise: false,
    replaySeed: initialReviewTarget?.seed,
  });
  const answerLock = useLockedPracticeAnswer<Array<string | null>>(
    [null, null, null],
    (selection) => selection.every((noteId) => noteId !== null),
  );
  const selectedNoteIds = answerLock.selection;
  const isAnswerVisible = answerLock.isAnswerVisible;
  const [audioError, setAudioError] = useState("");
  const { isPlaying, playbackState, play, stop: stopPlayback } = useLocalAudioPlayback();
  const question = useMemo(() => createLocalEarTrainingMelodyQuestion({
    difficulty,
    sequence,
    questionIndex,
    variantId: initialReviewTarget?.variantId,
    catalogMode,
  }), [catalogMode, difficulty, initialReviewTarget?.variantId, questionIndex, sequence]);
  const answer = useMemo(() => getLocalEarTrainingMelodyAnswer({ question, selectedNoteIds }), [question, selectedNoteIds]);
  const activityDefinition = useMemo(
    () => enableMelodyFixedSolfegeInput(
      adaptMelodyDictationQuestionToActivity(question),
    ),
    [question],
  );
  const activity = useChoiceActivitySession(activityDefinition, `melody-dictation:${question.id}`);

  const resetCurrentQuestion = () => { stopPlayback(); answerLock.reset(); activity.restart(); setAudioError(""); };
  const playQuestion = async () => {
    setAudioError("");
    const playbackError = await play((audioContext, channel) => {
      const startTime = audioContext.currentTime + 0.04;
      const oscillators = question.melody.noteIds.map((noteId, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const noteStartTime = startTime + index * 0.68;
        oscillator.type = "sine";
        oscillator.frequency.value = earTrainingMelodyNotes[noteId as keyof typeof earTrainingMelodyNotes].frequencyHz;
        gain.gain.setValueAtTime(0.0001, noteStartTime);
        gain.gain.exponentialRampToValueAtTime(0.16, noteStartTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStartTime + 0.5);
        oscillator.connect(gain); gain.connect(audioContext.destination);
        oscillator.start(noteStartTime); oscillator.stop(noteStartTime + 0.52);
        return channel.trackSource(oscillator, [gain]);
      });
      return 2250;
    });
    if (playbackError) setAudioError(playbackError);
  };
  const retryCurrentQuestion = () => { resetCurrentQuestion(); void playQuestion(); };
  const chooseNote = (index: number, noteId: string) => {
    const nextSelection = selectedNoteIds.map(
      (value, valueIndex) => valueIndex === index ? noteId : value,
    );
    if (!answerLock.choose(nextSelection)) return;
    const completedNoteIds = nextSelection.filter(
      (value): value is string => value !== null,
    );
    if (answerMode === "choice") {
      activity.submitChoice(completedNoteIds);
      return;
    }
    const solfegeAnswer = createFixedSolfegeAnswer(completedNoteIds);
    if (solfegeAnswer) activity.submitAnswer(solfegeAnswer);
  };
  const revealAnswer = () => {
    const submittedNoteIds = answerLock.reveal();
    if (!submittedNoteIds) return;
    const completedNoteIds = submittedNoteIds.filter(
      (value): value is string => value !== null,
    );
    if (answerMode === "choice") {
      activity.checkChoice(completedNoteIds);
    } else {
      const solfegeAnswer = createFixedSolfegeAnswer(completedNoteIds);
      if (solfegeAnswer) {
        activity.checkAnswer(
          solfegeAnswer,
          adaptFixedSolfegeAnswerToActivityEvidence({
            definition: activityDefinition,
            answer: solfegeAnswer,
          }),
        );
      }
    }
    if (sessionSeed === null || !onLocalAnswerResult) return;
    onLocalAnswerResult({
      target: {
        kind: "melody-dictation",
        difficulty,
        seed: sessionSeed,
        sequence,
        variantId: question.variantId,
      },
      isCorrect: submittedNoteIds.every(
        (noteId, index) => noteId === question.melody.noteIds[index],
      ),
    });
  };
  const nextQuestion = () => {
    resetCurrentQuestion();
    if (initialReviewTarget && onLeaveReviewTarget) onLeaveReviewTarget();
    else setSequence((current) => current + 1);
  };

  const changeAnswerMode = (nextMode: MelodyAnswerMode) => {
    if (nextMode === answerMode) return;
    const hasStartedAnswer = selectedNoteIds.some((noteId) => noteId !== null)
      || isAnswerVisible;
    stopPlayback();
    answerLock.reset();
    if (hasStartedAnswer) activity.restart();
    else activity.restartIfDirty();
    setAudioError("");
    setAnswerMode(nextMode);
  };

  const answerOptions = getEarTrainingMelodyNoteIds(difficulty, catalogMode).map(
    (noteId) => answerMode === "choice"
      ? earTrainingMelodyNotes[noteId]
      : { id: noteId, label: getFixedSolfegeLabel(noteId) },
  );

  const selectedAnswerLabel = answer.selectedNoteIds.map((noteId) => {
    if (!noteId) return "未选择";
    return answerMode === "choice"
      ? earTrainingMelodyNotes[noteId as keyof typeof earTrainingMelodyNotes].label
      : getFixedSolfegeLabel(noteId);
  }).join(" → ");

  const expectedAnswerLabel = answer.answerNoteIds.map((noteId) =>
    answerMode === "choice"
      ? earTrainingMelodyNotes[noteId as keyof typeof earTrainingMelodyNotes].label
      : getFixedSolfegeLabel(noteId),
  ).join(" → ");

  return <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <p className="text-sm font-semibold tracking-wide text-violet-600">本地练习</p>
    <h2 className="mt-1 text-2xl font-bold text-slate-950">内置旋律听写练习</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">先听三音短旋律，再按听到的顺序使用音名或固定唱名作答。本模块不上传音频，也不生成正式成绩。{onLocalAnswerResult ? "当前填写和声音不保存；答错时仅保存复现本题所需的最小信息。" : "当前入口不会保存练习记录。"}</p>
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
        <label className="block text-sm font-semibold text-slate-800" htmlFor="ear-training-melody-difficulty">练习难度</label>
        <select id="ear-training-melody-difficulty" disabled={Boolean(initialReviewTarget)} className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100" value={difficulty} onChange={(event) => { stopPlayback(); setDifficulty(event.target.value as EarTrainingMelodyDictationDifficulty); setSequence(0); answerLock.reset(); setAudioError(""); }}>
          <option value="基础">基础：自然音级进与小跳</option><option value="进阶">进阶：增加 A4 与较大跳进</option>{expandedLocalCatalog ? <option value="挑战">挑战：扩展音域、半音与复合跳进</option> : null}
        </select>
        <p className="mt-4 text-sm leading-6 text-violet-900">当前为内置题目 {sequence + 1}，本难度共 {variantCount} 个版本化组合。本轮题库会随机排序，全部出现一次后循环；当前填写不保存。三个音由浏览器本地 Web Audio 依次合成，不读取文件、不调用接口。</p>
        {!isQuestionReady ? <p className="mt-2 text-sm text-violet-800">正在准备本轮题目…</p> : null}
        <button type="button" onClick={() => void playQuestion()} disabled={!isQuestionReady || isPlaying} className="mt-4 w-full rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-violet-300">{playbackState === "准备中" ? "正在准备声音…" : isPlaying ? "正在播放短旋律…" : "播放旋律题目"}</button>
        <button type="button" onClick={stopPlayback} disabled={!isPlaying} className="mt-2 w-full rounded-xl border border-violet-300 bg-white px-4 py-3 font-semibold text-violet-800 disabled:cursor-not-allowed disabled:opacity-50">停止播放</button>
        {audioError ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-800">{audioError}</p> : null}
      </div>
      <div className="rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-500">回答本题</p><p className="mt-1 text-lg font-bold text-slate-950">按播放顺序填写三个音</p>
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-slate-700">答案方式</legend>
          <div className="mt-2 grid grid-cols-2 gap-2" data-testid="melody-answer-mode">
            <button type="button" role="radio" aria-checked={answerMode === "choice"} onClick={() => changeAnswerMode("choice")} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${answerMode === "choice" ? "border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-200" : "border-slate-200 text-slate-700"}`}>音名</button>
            <button type="button" role="radio" aria-checked={answerMode === "solfege"} onClick={() => changeAnswerMode("solfege")} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${answerMode === "solfege" ? "border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-200" : "border-slate-200 text-slate-700"}`}>固定唱名</button>
          </div>
        </fieldset>
        <p className="mt-3 text-sm leading-6 text-slate-600">{answerMode === "choice" ? "使用科学音高名填写，例如 C4、F♯4。" : "使用固定唱名填写；低音区 do 与高音 do 会明确区分，升 fa 表示 F♯。"}</p>
        <ActivityOrderedChoiceAnswerPanel
          positionLabels={["第 1 个音", "第 2 个音", "第 3 个音"]}
          options={answerOptions}
          selectedOptionIds={selectedNoteIds}
          disabled={!isQuestionReady || isAnswerVisible}
          onChoose={chooseNote}
        />
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!isQuestionReady || !answer.hasSelection || isAnswerVisible} onClick={revealAnswer} className="rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">查看本题答案</button>{isAnswerVisible && !answer.matchesAnswer ? <button type="button" onClick={retryCurrentQuestion} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 font-semibold text-amber-900">重新播放并复练本题</button> : null}<button type="button" onClick={resetCurrentQuestion} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800">重置本题</button><button type="button" disabled={!isQuestionReady} onClick={nextQuestion} className="rounded-xl border border-violet-300 bg-white px-4 py-2.5 font-semibold text-violet-800 disabled:cursor-not-allowed disabled:opacity-50">{initialReviewTarget ? "返回随机练习" : "下一题"}</button></div>
        {!answer.hasSelection ? <p className="mt-3 text-sm leading-6 text-slate-500">请为三个位置都选择{answerMode === "choice" ? "音名" : "固定唱名"}，再查看本题答案。</p> : null}
        <ActivityProtocolState session={activity.session} />
        {isAnswerVisible ? <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><p className="font-bold text-slate-950">本题答案：{expectedAnswerLabel}</p><p className="mt-1">{answer.explanation}</p><p className="mt-2">你的填写：{selectedAnswerLabel}。{answer.matchesAnswer ? "这次填写与本题答案一致。" : "这次填写与本题答案不同；可以再次播放并重置本题复练。"}</p><p className="mt-2 text-slate-500">答案说明显示后，本题填写已锁定；请使用复练或下一题开始新的尝试。这不是正式分数、准确率、等级、通过或失败判断。</p></div> : null}
      </div>
    </div>
    {showLocalPiano ? (
      <section className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4" aria-label="旋律听写参考钢琴">
        <button type="button" aria-expanded={isLocalPianoOpen} aria-controls="melody-reference-piano" onClick={() => setIsLocalPianoOpen((current) => !current)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-left font-bold text-rose-950 ring-1 ring-rose-200">
          <span>参考钢琴</span><span className="text-sm">{isLocalPianoOpen ? "收起" : "展开"}</span>
        </button>
        <p className="mt-2 text-sm leading-6 text-rose-900">仅用于本地找音。弹奏不保存、不上传，也不生成分数或正式评分。</p>
        {isLocalPianoOpen ? <div id="melody-reference-piano" className="mt-4"><LocalPianoPanel /></div> : null}
      </section>
    ) : null}
    <p className="mt-5 text-sm leading-6 text-slate-500">{onLocalAnswerResult ? "本机复练只保存复现这道题所需的题型、难度和随机题序，不保存你的填写、声音或正式成绩。" : "会话边界：题目序号、填写与答案说明只存在于当前页面内存；刷新后消失，不写入 localStorage、IndexedDB、账号或数据库。"}</p>
  </section>;
}
