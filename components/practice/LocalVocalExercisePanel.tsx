"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createBrowserAudioChannel,
  stopAllBrowserAudio,
  type BrowserAudioChannel,
} from "../../lib/audio/browserAudioEngine";
import {
  DEFAULT_LOCAL_VOCAL_EXERCISE_CONFIG,
  generateLocalVocalExercise,
  localVocalExerciseManifest,
  type LocalVocalExerciseConfig,
  type GeneratedLocalVocalExercise,
} from "../../lib/practice/localVocalExercise";
import { midiToScientificNote } from "../../lib/practice/realtimePitchCurve";

type VocalAudioChannel = Pick<BrowserAudioChannel, "prepareForUserGesture" | "stop" | "trackSource">;

const rootOptions = Array.from({ length: 25 }, (_, index) => 48 + index);

export function LocalVocalExercisePanel({
  createChannel = createBrowserAudioChannel,
  onTargetChange,
}: {
  createChannel?: () => VocalAudioChannel;
  onTargetChange?: (exercise: GeneratedLocalVocalExercise | null) => void;
}) {
  const [config, setConfig] = useState<LocalVocalExerciseConfig>(DEFAULT_LOCAL_VOCAL_EXERCISE_CONFIG);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const [error, setError] = useState("");
  const channelRef = useRef<VocalAudioChannel | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const requestRef = useRef(0);
  const mountedRef = useRef(true);
  const generated = useMemo(() => {
    try {
      return { exercise: generateLocalVocalExercise(config), configError: "" };
    } catch (caught) {
      return { exercise: null, configError: caught instanceof Error ? caught.message : "当前组合无法生成" };
    }
  }, [config]);
  const selectedPattern = localVocalExerciseManifest.find((pattern) => pattern.id === config.patternId)!;

  const stop = useCallback(() => {
    requestRef.current += 1;
    if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
    completionTimerRef.current = null;
    channelRef.current?.stop();
    channelRef.current = null;
    if (mountedRef.current) setIsPlaying(false);
  }, []);

  const play = useCallback(async (selectedOnly = false) => {
    if (!generated.exercise) {
      setError(`无法播放：${generated.configError}。请调整根音、方向或八度。`);
      return;
    }
    stop();
    stopAllBrowserAudio();
    const request = requestRef.current + 1;
    requestRef.current = request;
    const channel = createChannel();
    channelRef.current = channel;
    setError("");
    try {
      const context = await channel.prepareForUserGesture();
      if (!mountedRef.current || request !== requestRef.current || channelRef.current !== channel) {
        channel.stop();
        return;
      }
      const startAt = context.currentTime + 0.04;
      const selected = generated.exercise.events.find((event) => event.index === selectedEventIndex) ?? generated.exercise.events[0];
      const playbackEvents = selectedOnly && selected
        ? Array.from({ length: 3 }, (_, index) => ({ ...selected, index, startSeconds: index * (selected.durationSeconds + 0.25) }))
        : generated.exercise.playbackEvents;
      playbackEvents.forEach((event) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const noteStart = startAt + event.startSeconds;
        const noteEnd = noteStart + event.durationSeconds;
        oscillator.type = "triangle";
        oscillator.frequency.value = event.frequencyHz;
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.09, noteStart + 0.015);
        gain.gain.setValueAtTime(0.09, Math.max(noteStart + 0.016, noteEnd - 0.04));
        gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
        oscillator.connect(gain);
        gain.connect(context.destination);
        channel.trackSource(oscillator, [gain]);
        oscillator.start(noteStart);
        oscillator.stop(noteEnd + 0.01);
      });
      const playbackEnd = playbackEvents.reduce((maximum, event) => Math.max(maximum, event.startSeconds + event.durationSeconds), 0);
      setIsPlaying(true);
      completionTimerRef.current = window.setTimeout(() => {
        if (request === requestRef.current) stop();
      }, Math.ceil(playbackEnd * 1_000) + 150);
    } catch {
      channel.stop();
      if (channelRef.current === channel) channelRef.current = null;
      if (mountedRef.current && request === requestRef.current) {
        setIsPlaying(false);
        setError("当前手机无法播放练声参考音。请检查媒体音量后重试，实时曲线仍可单独使用。");
      }
    }
  }, [createChannel, generated, selectedEventIndex, stop]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
      channelRef.current?.stop();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    onTargetChange?.(generated.exercise);
  }, [generated.exercise, onTargetChange]);

  const update = <K extends keyof LocalVocalExerciseConfig>(key: K, value: LocalVocalExerciseConfig[K]) => {
    stop();
    setSelectedEventIndex(0);
    setConfig((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="vocal-exercise-title">
      <p className="text-sm font-semibold tracking-wide text-emerald-700">版本化本地音型 v1</p>
      <h2 id="vocal-exercise-title" className="mt-1 text-2xl font-black text-slate-950">练声目标生成器</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">先配置并播放参考，再停止扬声器、开启上方实时曲线进行模唱。参考音只在本机合成，不联网；当前难度和音域由你选择，不代表声部或正式等级。</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-900">练声音型<select value={config.patternId} onChange={(event) => update("patternId", event.target.value as LocalVocalExerciseConfig["patternId"])} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal">{localVocalExerciseManifest.map((pattern) => <option key={pattern.id} value={pattern.id}>{pattern.title}</option>)}</select></label>
        <label className="text-sm font-bold text-slate-900">根音<select value={config.rootMidi} onChange={(event) => update("rootMidi", Number(event.target.value))} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal">{rootOptions.map((midi) => <option key={midi} value={midi}>{midiToScientificNote(midi)}</option>)}</select></label>
        <label className="text-sm font-bold text-slate-900">模进方向<select value={config.direction} onChange={(event) => update("direction", event.target.value as LocalVocalExerciseConfig["direction"])} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"><option value="ascending">上行</option><option value="descending">下行</option></select></label>
        <label className="text-sm font-bold text-slate-900">八度位置<select value={config.octaveShift} onChange={(event) => update("octaveShift", Number(event.target.value) as -1 | 0 | 1)} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"><option value={-1}>低八度</option><option value={0}>原位</option><option value={1}>高八度</option></select></label>
        <label className="text-sm font-bold text-slate-900">速度：{config.bpm} BPM<input type="range" min="30" max="180" step="5" value={config.bpm} onChange={(event) => update("bpm", Number(event.target.value))} className="mt-2 block min-h-11 w-full" /></label>
        <label className="text-sm font-bold text-slate-900">循环组数<select value={config.loops} onChange={(event) => update("loops", Number(event.target.value))} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal">{Array.from({ length: 8 }, (_, index) => index + 1).map((loops) => <option key={loops} value={loops}>{loops} 组</option>)}</select></label>
        {config.patternId === "interval" ? <label className="text-sm font-bold text-slate-900">目标音程<select value={config.intervalSemitones} onChange={(event) => update("intervalSemitones", Number(event.target.value))} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal">{Array.from({ length: 12 }, (_, index) => index + 1).map((semitones) => <option key={semitones} value={semitones}>{semitones} 半音</option>)}</select></label> : null}
        <label className="text-sm font-bold text-slate-900">参考播放<select value={config.referenceMode} onChange={(event) => update("referenceMode", event.target.value as LocalVocalExerciseConfig["referenceMode"])} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"><option value="full">播放完整音型</option><option value="root-only">只播放一次根音</option></select></label>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">{selectedPattern.description}</p>

      <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
        {generated.exercise ? <><p className="font-bold">目标预览（{generated.exercise.events.length} 音 / {generated.exercise.config.loops} 组）</p><p className="mt-2 break-words font-mono leading-7">{generated.exercise.events.slice(0, Math.min(generated.exercise.events.length, 24)).map((event) => midiToScientificNote(event.midi)).join(" · ")}{generated.exercise.events.length > 24 ? " …" : ""}</p></> : <p className="font-bold text-amber-900">当前配置不可用：{generated.configError}。请调整根音、方向或八度。</p>}
      </div>

      {generated.exercise ? <div className="mt-4 rounded-2xl border border-emerald-200 p-4"><p className="text-sm font-bold text-slate-900">选择片段复练（当前音型第一组）</p><div className="mt-2 flex flex-wrap gap-2">{generated.exercise.events.filter((event) => event.loop === 0).map((event) => <button key={event.index} type="button" aria-pressed={selectedEventIndex === event.index} onClick={() => { stop(); setSelectedEventIndex(event.index); }} className={`min-h-11 min-w-12 rounded-xl px-3 font-bold ${selectedEventIndex === event.index ? "bg-emerald-700 text-white" : "border border-emerald-300 bg-white text-emerald-950"}`}>{midiToScientificNote(event.midi)}</button>)}</div><button type="button" onClick={() => void play(true)} disabled={isPlaying} className="mt-3 min-h-11 rounded-xl border border-emerald-400 bg-emerald-50 px-4 text-sm font-bold text-emerald-950 disabled:opacity-50">重复所选片段 3 次</button></div> : null}

      {error ? <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="alert">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void play()} disabled={isPlaying || !generated.exercise} className="min-h-12 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white disabled:bg-emerald-300">{isPlaying ? "正在播放参考音型" : "播放参考音型"}</button>
        <button type="button" onClick={stop} disabled={!isPlaying} className="min-h-12 rounded-xl border border-emerald-300 bg-white px-5 py-3 font-bold text-emerald-950 disabled:opacity-50">停止参考播放</button>
      </div>
    </section>
  );
}
