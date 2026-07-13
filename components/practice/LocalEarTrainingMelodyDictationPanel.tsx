"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  createLocalEarTrainingMelodyQuestion,
  earTrainingMelodyNotes,
  getEarTrainingMelodyNoteIds,
  getLocalEarTrainingMelodyAnswer,
  type EarTrainingMelodyDictationDifficulty,
} from "../../lib/practice/localEarTrainingMelodyDictation";

const stopOscillator = (oscillator: OscillatorNode) => {
  try { oscillator.stop(); } catch { /* The scheduled oscillator may already have stopped. */ }
  oscillator.disconnect();
};

export function LocalEarTrainingMelodyDictationPanel() {
  const [difficulty, setDifficulty] = useState<EarTrainingMelodyDictationDifficulty>("基础");
  const [sequence, setSequence] = useState(0);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Array<string | null>>([null, null, null]);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const finishTimerRef = useRef<number | null>(null);
  const question = useMemo(() => createLocalEarTrainingMelodyQuestion({ difficulty, sequence }), [difficulty, sequence]);
  const answer = useMemo(() => getLocalEarTrainingMelodyAnswer({ question, selectedNoteIds }), [question, selectedNoteIds]);

  const stopPlayback = () => {
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    finishTimerRef.current = null;
    oscillatorsRef.current.forEach(stopOscillator);
    oscillatorsRef.current = [];
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setIsPlaying(false);
  };
  useEffect(() => () => stopPlayback(), []);
  const resetCurrentQuestion = () => { stopPlayback(); setSelectedNoteIds([null, null, null]); setIsAnswerVisible(false); setAudioError(""); };
  const playQuestion = () => {
    stopPlayback(); setAudioError("");
    try {
      const audioContext = new AudioContext();
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
        return oscillator;
      });
      audioContextRef.current = audioContext; oscillatorsRef.current = oscillators; setIsPlaying(true);
      finishTimerRef.current = window.setTimeout(() => stopPlayback(), 2250);
    } catch { setAudioError("当前浏览器无法播放本地旋律听写题目。请检查音频权限或稍后重试。"); }
  };
  const retryCurrentQuestion = () => { resetCurrentQuestion(); playQuestion(); };
  const chooseNote = (index: number, noteId: string) => setSelectedNoteIds((current) => current.map((value, valueIndex) => valueIndex === index ? noteId : value));

  return <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">P61 Runtime Alpha</p>
    <h2 className="mt-1 text-2xl font-bold text-slate-950">内置旋律听写练习</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">先听三音短旋律，再按听到的顺序选择音名。本模块只用于当前会话的内置练习，不上传、不保存，也不生成正式成绩。</p>
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
        <label className="block text-sm font-semibold text-slate-800" htmlFor="ear-training-melody-difficulty">练习难度</label>
        <select id="ear-training-melody-difficulty" className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-slate-900" value={difficulty} onChange={(event) => { stopPlayback(); setDifficulty(event.target.value as EarTrainingMelodyDictationDifficulty); setSequence(0); setSelectedNoteIds([null, null, null]); setIsAnswerVisible(false); setAudioError(""); }}>
          <option value="基础">基础：C4、D4、E4、G4</option><option value="进阶">进阶：增加 A4 与跳进</option>
        </select>
        <p className="mt-4 text-sm leading-6 text-violet-900">当前为内置题目 {sequence + 1}。三个音由浏览器本地 Web Audio 依次合成，不读取文件、不调用接口。</p>
        <button type="button" onClick={playQuestion} disabled={isPlaying} className="mt-4 w-full rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-violet-300">{isPlaying ? "正在播放短旋律…" : "播放旋律题目"}</button>
        <button type="button" onClick={stopPlayback} disabled={!isPlaying} className="mt-2 w-full rounded-xl border border-violet-300 bg-white px-4 py-3 font-semibold text-violet-800 disabled:cursor-not-allowed disabled:opacity-50">停止播放</button>
        {audioError ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-800">{audioError}</p> : null}
      </div>
      <div className="rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-500">回答本题</p><p className="mt-1 text-lg font-bold text-slate-950">按播放顺序填写三个音名</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((index) => <fieldset key={index}><legend className="text-sm font-semibold text-slate-700">第 {index + 1} 个音</legend><div className="mt-2 grid gap-2">{getEarTrainingMelodyNoteIds(difficulty).map((noteId) => <button key={noteId} type="button" onClick={() => chooseNote(index, noteId)} className={`rounded-xl border px-3 py-2 text-left font-semibold ${selectedNoteIds[index] === noteId ? "border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-200" : "border-slate-200 bg-white text-slate-800 hover:border-violet-300"}`}>{earTrainingMelodyNotes[noteId].label}</button>)}</div></fieldset>)}</div>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!answer.hasSelection} onClick={() => setIsAnswerVisible(true)} className="rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">查看本题答案</button>{isAnswerVisible && !answer.matchesAnswer ? <button type="button" onClick={retryCurrentQuestion} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 font-semibold text-amber-900">重新播放并复练本题</button> : null}<button type="button" onClick={resetCurrentQuestion} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800">重置本题</button><button type="button" onClick={() => { resetCurrentQuestion(); setSequence((current) => current + 1); }} className="rounded-xl border border-violet-300 bg-white px-4 py-2.5 font-semibold text-violet-800">下一题</button></div>
        {!answer.hasSelection ? <p className="mt-3 text-sm leading-6 text-slate-500">请为三个位置都选择音名，再查看本题答案。</p> : null}
        {isAnswerVisible ? <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><p className="font-bold text-slate-950">本题答案：{answer.answerLabel}</p><p className="mt-1">{answer.explanation}</p><p className="mt-2">你的填写：{answer.selectedNoteIds.map((noteId) => noteId ? earTrainingMelodyNotes[noteId as keyof typeof earTrainingMelodyNotes].label : "未选择").join(" → ")}。{answer.matchesAnswer ? "这次填写与本题答案一致。" : "这次填写与本题答案不同；可以再次播放并重置本题复练。"}</p><p className="mt-2 text-slate-500">这是题目答案说明，不是正式分数、准确率、等级、通过或失败判断。</p></div> : null}
      </div>
    </div>
    <p className="mt-5 text-sm leading-6 text-slate-500">会话边界：题目序号、填写与答案说明只存在于当前页面内存；刷新后消失，不写入 localStorage、IndexedDB、账号或数据库。</p>
  </section>;
}
