"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  createLocalEarTrainingRhythmQuestion,
  earTrainingRhythmPatterns,
  getLocalEarTrainingRhythmAnswer,
  getLocalEarTrainingRhythmDurationMs,
  type EarTrainingRhythmDifficulty,
} from "../../lib/practice/localEarTrainingRhythm";

const stopOscillator = (oscillator: OscillatorNode) => {
  try {
    oscillator.stop();
  } catch {
    // The scheduled oscillator may already have stopped.
  }
  oscillator.disconnect();
};

export function LocalEarTrainingRhythmPanel() {
  const [difficulty, setDifficulty] = useState<EarTrainingRhythmDifficulty>("基础");
  const [sequence, setSequence] = useState(0);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const finishTimerRef = useRef<number | null>(null);

  const question = useMemo(
    () => createLocalEarTrainingRhythmQuestion({ difficulty, sequence }),
    [difficulty, sequence],
  );
  const answer = useMemo(
    () => getLocalEarTrainingRhythmAnswer({ question, selectedPatternId }),
    [question, selectedPatternId],
  );

  const stopPlayback = () => {
    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    oscillatorsRef.current.forEach(stopOscillator);
    oscillatorsRef.current = [];
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setIsPlaying(false);
  };

  useEffect(() => () => stopPlayback(), []);

  const resetCurrentQuestion = () => {
    stopPlayback();
    setSelectedPatternId(null);
    setIsAnswerVisible(false);
    setAudioError("");
  };

  const playQuestion = () => {
    stopPlayback();
    setAudioError("");
    try {
      const audioContext = new AudioContext();
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
        return oscillator;
      });
      audioContextRef.current = audioContext;
      oscillatorsRef.current = oscillators;
      setIsPlaying(true);
      finishTimerRef.current = window.setTimeout(
        () => stopPlayback(),
        getLocalEarTrainingRhythmDurationMs(question),
      );
    } catch {
      setAudioError("当前浏览器无法播放本地节奏题目。请检查音频权限或稍后重试。");
    }
  };

  const nextQuestion = () => {
    resetCurrentQuestion();
    setSequence((current) => current + 1);
  };

  const retryCurrentQuestion = () => {
    resetCurrentQuestion();
    playQuestion();
  };

  return (
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">P57 Runtime Alpha</p>
      <h2 className="mt-1 text-2xl font-bold text-slate-950">内置节奏听辨练习</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        先听一个四拍的本地合成击拍题，再选择你听到的节奏形状。本模块只用于当前会话的内置练习，不上传、不保存，也不生成正式成绩。
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-100">
          <label className="block text-sm font-semibold text-slate-800" htmlFor="ear-training-rhythm-difficulty">练习难度</label>
          <select
            id="ear-training-rhythm-difficulty"
            className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-slate-900"
            value={difficulty}
            onChange={(event) => {
              stopPlayback();
              setDifficulty(event.target.value as EarTrainingRhythmDifficulty);
              setSequence(0);
              setSelectedPatternId(null);
              setIsAnswerVisible(false);
              setAudioError("");
            }}
          >
            <option value="基础">基础：三种四拍节奏形状</option>
            <option value="进阶">进阶：增加中间留空的节奏形状</option>
          </select>
          <p className="mt-4 text-sm leading-6 text-violet-900">当前为内置题目 {sequence + 1}，四四拍，速度约为 {question.bpm} BPM。第一拍使用较高提示音，其余击拍使用较低提示音；题目由浏览器本地 Web Audio 合成，不读取文件、不调用接口。</p>
          <button type="button" onClick={playQuestion} disabled={isPlaying} className="mt-4 w-full rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-violet-300">
            {isPlaying ? "正在播放节奏…" : "播放节奏题目"}
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
                onClick={() => setSelectedPatternId(pattern.id)}
                className={`rounded-xl border px-3 py-3 text-left font-semibold transition ${selectedPatternId === pattern.id ? "border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-200" : "border-slate-200 bg-white text-slate-800 hover:border-violet-300"}`}
              >
                {pattern.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={!answer.hasSelection} onClick={() => setIsAnswerVisible(true)} className="rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              查看本题答案
            </button>
            {isAnswerVisible && !answer.matchesAnswer ? <button type="button" onClick={retryCurrentQuestion} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 font-semibold text-amber-900">重新播放并复练本题</button> : null}
            <button type="button" onClick={resetCurrentQuestion} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-800">重置本题</button>
            <button type="button" onClick={nextQuestion} className="rounded-xl border border-violet-300 bg-white px-4 py-2.5 font-semibold text-violet-800">下一题</button>
          </div>
          {!answer.hasSelection ? <p className="mt-3 text-sm leading-6 text-slate-500">请先选择一个节奏形状，再查看本题答案。</p> : null}
          {isAnswerVisible ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="font-bold text-slate-950">本题答案：{answer.answerLabel}</p>
              <p className="mt-1">{answer.explanation}</p>
              <p className="mt-2">你的选择：{earTrainingRhythmPatterns[difficulty].find((pattern) => pattern.id === selectedPatternId)?.label ?? "未选择"}。{answer.matchesAnswer ? "这次选择与本题答案一致。" : "这次选择与本题答案不同；可以再次播放并重置本题复练。"}</p>
              <p className="mt-2 text-slate-500">这是题目答案说明，不是正式分数、准确率、等级、通过或失败判断。</p>
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-500">会话边界：题目序号、选择与答案说明只存在于当前页面内存；刷新后消失，不写入 localStorage、IndexedDB、账号或数据库。</p>
    </section>
  );
}
