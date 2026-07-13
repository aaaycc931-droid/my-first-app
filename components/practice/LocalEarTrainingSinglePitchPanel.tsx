"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  createLocalEarTrainingSinglePitchQuestion,
  earTrainingSinglePitches,
  getLocalEarTrainingSinglePitchAnswer,
  type EarTrainingSinglePitchDifficulty,
} from "../../lib/practice/localEarTrainingSinglePitch";

const stopOscillator = (oscillator: OscillatorNode) => {
  try { oscillator.stop(); } catch { /* The oscillator may already have stopped. */ }
  oscillator.disconnect();
};

export function LocalEarTrainingSinglePitchPanel() {
  const [difficulty, setDifficulty] = useState<EarTrainingSinglePitchDifficulty>("基础");
  const [sequence, setSequence] = useState(0);
  const [selectedPitchId, setSelectedPitchId] = useState<string | null>(null);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const question = useMemo(() => createLocalEarTrainingSinglePitchQuestion({ difficulty, sequence }), [difficulty, sequence]);
  const answer = useMemo(() => getLocalEarTrainingSinglePitchAnswer({ question, selectedPitchId }), [question, selectedPitchId]);

  const stopPlayback = () => {
    if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    finishTimerRef.current = null;
    if (oscillatorRef.current) stopOscillator(oscillatorRef.current);
    oscillatorRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setIsPlaying(false);
  };

  useEffect(() => () => stopPlayback(), []);

  const resetCurrentQuestion = () => {
    stopPlayback();
    setSelectedPitchId(null);
    setIsAnswerVisible(false);
    setAudioError("");
  };

  const playQuestion = () => {
    stopPlayback();
    setAudioError("");
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const startTime = audioContext.currentTime + 0.04;
      oscillator.type = "sine";
      oscillator.frequency.value = question.pitch.frequencyHz;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.78);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.8);
      audioContextRef.current = audioContext;
      oscillatorRef.current = oscillator;
      setIsPlaying(true);
      finishTimerRef.current = window.setTimeout(() => stopPlayback(), 950);
    } catch {
      setAudioError("当前浏览器无法播放本地单音题目。请检查音频权限或稍后重试。");
    }
  };

  const retryCurrentQuestion = () => {
    resetCurrentQuestion();
    playQuestion();
  };

  return (
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">P58 Runtime Alpha</p>
      <h2 className="mt-1 text-2xl font-bold text-slate-950">内置单音听辨练习</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">先听一个浏览器本地合成单音，再选择它的音名。本模块只用于当前会话的内置练习，不上传、不保存，也不生成正式成绩。</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
          <label className="block text-sm font-semibold text-slate-800" htmlFor="ear-training-single-pitch-difficulty">练习难度</label>
          <select id="ear-training-single-pitch-difficulty" className="mt-2 w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-slate-900" value={difficulty} onChange={(event) => { stopPlayback(); setDifficulty(event.target.value as EarTrainingSinglePitchDifficulty); setSequence(0); setSelectedPitchId(null); setIsAnswerVisible(false); setAudioError(""); }}>
            <option value="基础">基础：C4、D4、E4、G4</option>
            <option value="进阶">进阶：增加 A4、B4</option>
          </select>
          <p className="mt-4 text-sm leading-6 text-sky-900">当前为内置题目 {sequence + 1}。题目音高由浏览器本地 Web Audio 合成，不读取文件、不调用接口。</p>
          <button type="button" onClick={playQuestion} disabled={isPlaying} className="mt-4 w-full rounded-xl bg-sky-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-sky-300">{isPlaying ? "正在播放单音…" : "播放单音题目"}</button>
          <button type="button" onClick={stopPlayback} disabled={!isPlaying} className="mt-2 w-full rounded-xl border border-sky-300 bg-white px-4 py-3 font-semibold text-sky-800 disabled:cursor-not-allowed disabled:opacity-50">停止播放</button>
          {audioError ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-800">{audioError}</p> : null}
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-500">回答本题</p>
          <p className="mt-1 text-lg font-bold text-slate-950">听完后选择你听到的音名</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">{earTrainingSinglePitches[difficulty].map((pitch) => <button key={pitch.id} type="button" onClick={() => setSelectedPitchId(pitch.id)} className={`rounded-xl border px-3 py-3 text-left font-semibold transition ${selectedPitchId === pitch.id ? "border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-200" : "border-slate-200 bg-white text-slate-800 hover:border-sky-300"}`}>{pitch.label}</button>)}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={!answer.hasSelection} onClick={() => setIsAnswerVisible(true)} className="rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">查看本题答案</button>
            {isAnswerVisible && !answer.matchesAnswer ? <button type="button" onClick={retryCurrentQuestion} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 font-semibold text-amber-900">重新播放并复练本题</button> : null}
            <button type="button" onClick={resetCurrentQuestion} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800">重置本题</button>
            <button type="button" onClick={() => { resetCurrentQuestion(); setSequence((current) => current + 1); }} className="rounded-xl border border-sky-300 bg-white px-4 py-2.5 font-semibold text-sky-800">下一题</button>
          </div>
          {!answer.hasSelection ? <p className="mt-3 text-sm leading-6 text-slate-500">请先选择一个音名，再查看本题答案。</p> : null}
          {isAnswerVisible ? <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><p className="font-bold text-slate-950">本题答案：{answer.answerLabel}</p><p className="mt-1">{answer.explanation}</p><p className="mt-2">你的选择：{earTrainingSinglePitches[difficulty].find((pitch) => pitch.id === selectedPitchId)?.label ?? "未选择"}。{answer.matchesAnswer ? "这次选择与本题答案一致。" : "这次选择与本题答案不同；可以再次播放并重置本题复练。"}</p><p className="mt-2 text-slate-500">这是题目答案说明，不是正式分数、准确率、等级、通过或失败判断。</p></div> : null}
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-500">会话边界：题目序号、选择与答案说明只存在于当前页面内存；刷新后消失，不写入 localStorage、IndexedDB、账号或数据库。</p>
    </section>
  );
}
