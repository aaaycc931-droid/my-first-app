"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

import {
  DEFAULT_LOCAL_PIANO_RANGE_ID,
  getFullPianoKeys,
  getLocalPianoKeys,
  LOCAL_PIANO_RANGE_IDS,
  type LocalPianoKey,
  type LocalPianoRangeId,
} from "../../lib/piano/localPianoKeyboard";
import {
  getPianoKeyVisibleLabel,
  getPianoStressTestKeyIds,
  PIANO_KEY_WIDTHS,
  splitFullPianoRows,
  transposePianoKeys,
  type PianoKeyWidth,
  type PianoLabelMode,
  type PianoRowMode,
  type PianoViewMode,
} from "../../lib/piano/pianoInteraction";
import type { PianoVoiceProvider } from "../../lib/piano/pianoAudioProvider";
import { LOCAL_PIANO_TIMBRE_PROVIDERS } from "../../lib/piano/splendidGrandPiano";
import {
  appendPianoPerformanceEvent,
  createPianoPerformanceRecorder,
  createPianoPlaybackSchedule,
  finalizePianoPerformance,
  parsePianoPerformanceLibrary,
  serializePianoPerformanceLibrary,
  type PianoPerformance,
  type PianoPerformanceEventInput,
  type PianoPerformanceRecorder,
  type PianoPlaybackRate,
  type PianoPlaybackVoiceFilter,
} from "../../lib/piano/pianoPerformance";
import { BrowserMetronomeScheduler } from "../../lib/metronome/metronomeScheduler";
import {
  createPianoLearningSchedule,
  P110_ORIGINAL_PIANO_EXERCISE,
  type PianoLearningScore,
} from "../../lib/piano/pianoLearningScore";
import {
  completeActivityCheck,
  createActivitySession,
  restartActivityAttempt,
  submitActivityAnswer,
} from "../../lib/activity/activitySession";
import {
  adaptPianoNoteSequenceToActivityEvidence,
  createPianoLearningActivityDefinition,
} from "../../lib/activity/pianoLearningActivityAdapter";
import {
  useLocalPianoAudio,
  type LocalPianoAudioChannelFactory,
} from "./useLocalPianoAudio";
import { LocalPianoLearningPanel } from "./LocalPianoLearningPanel";
import { PianoActivityProtocolPanel } from "./PianoActivityProtocolPanel";

const rangeLabels: Record<LocalPianoRangeId, string> = {
  "C3-C4": "低音区：C3 到 C4",
  "C4-C5": "中央音区：C4 到 C5",
  "C5-C6": "高音区：C5 到 C6",
};

const labelModeNames: Record<PianoLabelMode, string> = {
  scientific: "科学音高",
  "fixed-solfege": "固定唱名",
  hidden: "隐藏标签",
};

const locatorNotes = ["a0", "c2", "c3", "c4", "c5", "c6", "c7", "c8"] as const;
const keyboardToken = (keyId: string) => `key-${keyId}`;
const PIANO_PERFORMANCE_STORAGE_KEY = "solfeggio.piano.performances.v1";
const PIANO_ACTIVITY_DEFINITION = createPianoLearningActivityDefinition(P110_ORIGINAL_PIANO_EXERCISE);
const PIANO_ACTIVITY_SESSION_ID = `piano-learning:${P110_ORIGINAL_PIANO_EXERCISE.id}`;

const loadInitialPianoPerformances = (): {
  items: PianoPerformance[];
  notice: string | null;
} => {
  if (typeof window === "undefined") return { items: [], notice: null };
  try {
    const raw = window.localStorage.getItem(PIANO_PERFORMANCE_STORAGE_KEY);
    const items = parsePianoPerformanceLibrary(raw);
    return {
      items,
      notice: raw && raw !== "[]" && items.length === 0
        ? "本机演奏记录格式无效，已隔离；钢琴仍可正常使用。"
        : null,
    };
  } catch {
    return {
      items: [],
      notice: "当前设备无法读取本机演奏记录；本次仍可弹奏和临时录制。",
    };
  }
};

export function LocalPianoPanel({
  createAudioChannel,
  voiceProvider,
}: {
  createAudioChannel?: LocalPianoAudioChannelFactory;
  voiceProvider?: PianoVoiceProvider;
}) {
  const [rangeId, setRangeId] = useState<LocalPianoRangeId>(DEFAULT_LOCAL_PIANO_RANGE_ID);
  const [viewMode, setViewMode] = useState<PianoViewMode>("compact");
  const [rowMode, setRowMode] = useState<PianoRowMode>("single");
  const [keyWidth, setKeyWidth] = useState<PianoKeyWidth>(46);
  const [labelMode, setLabelMode] = useState<PianoLabelMode>("scientific");
  const [transpose, setTranspose] = useState(0);
  const availableTimbreProviders = useMemo(
    () => voiceProvider ? [voiceProvider] : LOCAL_PIANO_TIMBRE_PROVIDERS,
    [voiceProvider],
  );
  const [selectedTimbreId, setSelectedTimbreId] = useState(
    () => availableTimbreProviders[0]?.descriptor.id ?? "",
  );
  const selectedVoiceProvider = availableTimbreProviders.find(
    (provider) => provider.descriptor.id === selectedTimbreId,
  ) ?? availableTimbreProviders[0];
  const [stressRunning, setStressRunning] = useState(false);
  const stressTimerRef = useRef<number | null>(null);
  const [initialPerformanceLibrary] = useState(loadInitialPianoPerformances);
  const [performances, setPerformances] = useState<PianoPerformance[]>(initialPerformanceLibrary.items);
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<string | null>(initialPerformanceLibrary.items[0]?.id ?? null);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<PianoPerformanceRecorder | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackTimersRef = useRef<number[]>([]);
  const [playbackRate, setPlaybackRate] = useState<PianoPlaybackRate>(1);
  const [voiceFilter, setVoiceFilter] = useState<PianoPlaybackVoiceFilter>("all");
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopFromSeconds, setLoopFromSeconds] = useState(0);
  const [loopToSeconds, setLoopToSeconds] = useState(0);
  const [performanceNotice, setPerformanceNotice] = useState<string | null>(initialPerformanceLibrary.notice);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [metronomeBpm, setMetronomeBpm] = useState(72);
  const [metronomeRunning, setMetronomeRunning] = useState(false);
  const [metronomeBeat, setMetronomeBeat] = useState(0);
  const metronomeRef = useRef<BrowserMetronomeScheduler | null>(null);
  const [pianoActivitySession, setPianoActivitySession] = useState(() =>
    createActivitySession(PIANO_ACTIVITY_DEFINITION, PIANO_ACTIVITY_SESSION_ID));
  const [pianoActivityActive, setPianoActivityActive] = useState(false);

  const handleExternalAudioStop = useCallback(() => {
    playbackTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    playbackTimersRef.current = [];
    setIsPlaying(false);
    metronomeRef.current?.stop();
    metronomeRef.current = null;
    setMetronomeRunning(false);
    setMetronomeBeat(0);
    if (recorderRef.current) {
      recorderRef.current = null;
      setIsRecording(false);
      setPerformanceNotice("应用进入后台或切换页面，本次未保存的演奏录制已取消。");
    }
  }, []);

  const recordPerformanceEvent = useCallback((event: PianoPerformanceEventInput) => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = appendPianoPerformanceEvent(recorder, event, performance.now());
  }, []);

  const baseKeys = useMemo(
    () => viewMode === "full" ? getFullPianoKeys() : getLocalPianoKeys(rangeId),
    [rangeId, viewMode],
  );
  const keys = useMemo(() => transposePianoKeys(baseKeys, transpose), [baseKeys, transpose]);
  const audioKeys = useMemo(
    () => transposePianoKeys(getFullPianoKeys(), transpose),
    [transpose],
  );
  const expectedPianoActivityNoteIds = PIANO_ACTIVITY_DEFINITION.target.expectedAnswer.mode === "piano"
    ? PIANO_ACTIVITY_DEFINITION.target.expectedAnswer.noteIds
    : [];
  const pianoActivityAnswerCount = pianoActivitySession.answer?.mode === "piano"
    ? pianoActivitySession.answer.noteIds.length
    : 0;
  const pianoActivityAccepting = pianoActivityActive
    && pianoActivityAnswerCount < expectedPianoActivityNoteIds.length;
  const rows = useMemo(
    () => viewMode === "full" ? splitFullPianoRows(keys, rowMode) : [keys],
    [keys, rowMode, viewMode],
  );
  const {
    keyboardState,
    timbre,
    notice,
    pressKey,
    releasePointer,
    setSustainEnabled,
    changeVolume,
    stopAll,
    retryAudio,
  } = useLocalPianoAudio({
    keys: audioKeys,
    createChannel: createAudioChannel,
    voiceProvider: selectedVoiceProvider,
    onPerformanceEvent: recordPerformanceEvent,
    onExternalAudioStop: handleExternalAudioStop,
  });
  const activeKeyIds = new Set(keyboardState.activeKeyIds);
  const canRetryAudio = notice?.includes("无法播放") || notice?.includes("准备超时");
  const selectedPerformance = performances.find((item) => item.id === selectedPerformanceId) ?? null;
  const pressKeyRef = useRef(pressKey);
  const releasePointerRef = useRef(releasePointer);
  const sustainRef = useRef(setSustainEnabled);
  const stopAllRef = useRef(stopAll);
  useEffect(() => {
    pressKeyRef.current = pressKey;
    releasePointerRef.current = releasePointer;
    sustainRef.current = setSustainEnabled;
    stopAllRef.current = stopAll;
  }, [pressKey, releasePointer, setSustainEnabled, stopAll]);

  useEffect(() => {
    metronomeRef.current?.updateConfig({ bpm: metronomeBpm, meter: "4/4" });
  }, [metronomeBpm]);

  const persistPerformances = (next: PianoPerformance[]) => {
    setPerformances(next);
    try {
      window.localStorage.setItem(
        PIANO_PERFORMANCE_STORAGE_KEY,
        serializePianoPerformanceLibrary(next),
      );
      return true;
    } catch {
      setPerformanceNotice("本机空间不足或存储不可用；记录仅保留到本页关闭前。");
      return false;
    }
  };

  const stopPlayback = useCallback(() => {
    playbackTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    playbackTimersRef.current = [];
    setIsPlaying(false);
    stopAllRef.current();
  }, []);

  const startPlayback = (performanceItem: PianoPerformance) => {
    stopPlayback();
    if (transpose !== performanceItem.transpose) setTranspose(performanceItem.transpose);
    const fromMs = loopEnabled ? loopFromSeconds * 1_000 : 0;
    const toMs = loopEnabled ? loopToSeconds * 1_000 : performanceItem.durationMs;
    if (loopEnabled && (
      !Number.isFinite(fromMs)
      || !Number.isFinite(toMs)
      || fromMs < 0
      || toMs > performanceItem.durationMs
      || toMs - fromMs < 100
    )) {
      setPerformanceNotice("A–B 循环必须位于记录时长内，且区间至少为 0.1 秒。");
      return;
    }
    const schedule = createPianoPlaybackSchedule({
      performance: performanceItem,
      fromMs,
      toMs,
      rate: playbackRate,
      voiceFilter,
    });
    const baseDelay = transpose === performanceItem.transpose ? 0 : 60;
    setIsPlaying(true);
    let cycleIndex = 0;
    const runCycle = () => {
      const cycleBaseDelay = cycleIndex === 0 ? baseDelay : 0;
      cycleIndex += 1;
      playbackTimersRef.current = [];
      schedule.forEach((event, index) => {
        const timer = window.setTimeout(() => {
          if (event.type === "note-on") {
            pressKeyRef.current(`playback-${event.keyId}`, event.keyId, event.velocity ?? 0.65);
          } else if (event.type === "note-off") {
            releasePointerRef.current(`playback-${event.keyId}`);
          } else if (event.type === "pedal") {
            sustainRef.current(event.down);
          } else {
            stopAllRef.current();
          }
        }, cycleBaseDelay + event.delayMs);
        playbackTimersRef.current[index] = timer;
      });
      const duration = cycleBaseDelay + (schedule.at(-1)?.delayMs ?? 0) + 30;
      const finishTimer = window.setTimeout(() => {
        stopAllRef.current();
        if (loopEnabled) runCycle();
        else {
          playbackTimersRef.current = [];
          setIsPlaying(false);
        }
      }, duration);
      playbackTimersRef.current.push(finishTimer);
    };
    runCycle();
  };

  const startLearningPlayback = (score: PianoLearningScore, bpm: number) => {
    stopPlayback();
    const schedule = createPianoLearningSchedule(score, bpm);
    if (schedule.length === 0) {
      setPerformanceNotice("请先检查并确认谱面草稿，再开始播放。");
      return;
    }
    const baseDelay = transpose === 0 ? 0 : 60;
    if (transpose !== 0) setTranspose(0);
    setIsPlaying(true);
    playbackTimersRef.current = schedule.map((event) => window.setTimeout(() => {
      if (event.type === "note-on" && event.keyId && event.pointerId) {
        pressKeyRef.current(event.pointerId, event.keyId, 0.68);
      } else if (event.type === "note-off" && event.pointerId) {
        releasePointerRef.current(event.pointerId);
      } else if (event.type === "all-notes-off") {
        stopAllRef.current();
      }
    }, baseDelay + event.delayMs));
    const finishTimer = window.setTimeout(() => {
      stopAllRef.current();
      playbackTimersRef.current = [];
      setIsPlaying(false);
    }, baseDelay + (schedule.at(-1)?.delayMs ?? 0) + 30);
    playbackTimersRef.current.push(finishTimer);
  };

  const startRecording = () => {
    stopPlayback();
    recorderRef.current = createPianoPerformanceRecorder(performance.now());
    setIsRecording(true);
    setPerformanceNotice("正在录制本机演奏事件；不录制麦克风或音频文件。");
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    stopAll();
    recorderRef.current = null;
    setIsRecording(false);
    const now = new Date();
    const performanceItem = finalizePianoPerformance({
      recorder,
      id: `take-${now.getTime()}`,
      name: `演奏 ${now.toLocaleString("zh-CN")}`,
      createdAt: now.toISOString(),
      nowMs: performance.now(),
      transpose,
    });
    if (!performanceItem) {
      setPerformanceNotice("本次没有录到音符，未创建记录。");
      return;
    }
    const next = [performanceItem, ...performances].slice(0, 12);
    const persisted = persistPerformances(next);
    setSelectedPerformanceId(performanceItem.id);
    setLoopFromSeconds(0);
    setLoopToSeconds(performanceItem.durationMs / 1_000);
    if (persisted) {
      setPerformanceNotice("演奏事件已保存在本机；不会上传或生成成绩。");
    }
  };

  const deleteSelectedPerformance = () => {
    if (!selectedPerformance) return;
    stopPlayback();
    const next = performances.filter((item) => item.id !== selectedPerformance.id);
    persistPerformances(next);
    setSelectedPerformanceId(next[0]?.id ?? null);
    setDeleteConfirm(false);
    setPerformanceNotice("所选演奏记录已从本机删除。");
  };

  const exportSelectedPerformance = () => {
    if (!selectedPerformance) return;
    try {
      const blob = new Blob([JSON.stringify(selectedPerformance, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${selectedPerformance.id}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setPerformanceNotice("演奏事件 JSON 已导出；文件不包含录音音频。");
    } catch {
      setPerformanceNotice("当前设备无法导出演奏事件；本机记录未被删除。");
    }
  };

  const toggleMetronome = async () => {
    if (metronomeRef.current) {
      metronomeRef.current.stop();
      metronomeRef.current = null;
      setMetronomeRunning(false);
      setMetronomeBeat(0);
      return;
    }
    const scheduler = new BrowserMetronomeScheduler({
      config: { bpm: metronomeBpm, meter: "4/4" },
      onBeat: (beat) => setMetronomeBeat(beat.beatNumber),
    });
    metronomeRef.current = scheduler;
    try {
      await scheduler.start();
      setMetronomeRunning(true);
    } catch {
      scheduler.stop();
      metronomeRef.current = null;
      setPerformanceNotice("当前手机无法启动节拍器，请确认媒体音量后重试。");
    }
  };

  const stopStress = () => {
    if (stressTimerRef.current !== null) window.clearTimeout(stressTimerRef.current);
    stressTimerRef.current = null;
    setStressRunning(false);
    stopPlayback();
  };

  useEffect(() => () => {
    if (stressTimerRef.current !== null) window.clearTimeout(stressTimerRef.current);
    playbackTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    metronomeRef.current?.stop();
  }, []);

  const changeKeyboard = (change: () => void) => {
    stopStress();
    change();
  };

  const runStressTest = () => {
    stopStress();
    const stressKeys = getPianoStressTestKeyIds(audioKeys);
    if (stressKeys.length !== 32) return;
    stressKeys.forEach((keyId, index) => pressKey(`stress-${index}`, keyId, 0.72));
    setStressRunning(true);
    stressTimerRef.current = window.setTimeout(() => {
      stressTimerRef.current = null;
      setStressRunning(false);
      stopAll();
    }, 2_000);
  };

  const startPianoActivity = () => {
    if (transpose !== 0 || pianoActivitySession.lifecycle === "checked") return;
    stopPlayback();
    setPianoActivityActive(true);
  };

  const capturePianoActivityKey = (key: LocalPianoKey) => {
    if (!pianoActivityAccepting || transpose !== 0) return;
    const currentCount = pianoActivityAnswerCount;
    if (currentCount >= expectedPianoActivityNoteIds.length) return;
    const noteId = key.soundingNoteName ?? key.noteName;
    setPianoActivitySession((currentSession) => {
      const existing = currentSession.answer?.mode === "piano"
        ? currentSession.answer.noteIds
        : [];
      if (currentSession.lifecycle === "checked" || existing.length >= expectedPianoActivityNoteIds.length) {
        return currentSession;
      }
      return submitActivityAnswer(
        PIANO_ACTIVITY_DEFINITION,
        currentSession,
        { mode: "piano", noteIds: [...existing, noteId] },
        currentSession.revision,
      );
    });
    if (currentCount + 1 >= expectedPianoActivityNoteIds.length) setPianoActivityActive(false);
  };

  const checkPianoActivity = () => {
    setPianoActivityActive(false);
    setPianoActivitySession((currentSession) => {
      const actualNoteIds = currentSession.answer?.mode === "piano"
        ? currentSession.answer.noteIds
        : [];
      return completeActivityCheck(
        currentSession,
        adaptPianoNoteSequenceToActivityEvidence({
          expectedNoteIds: expectedPianoActivityNoteIds,
          actualNoteIds,
        }),
        currentSession.revision,
      );
    });
  };

  const restartPianoActivity = () => {
    stopPlayback();
    setPianoActivitySession((currentSession) =>
      restartActivityAttempt(currentSession, currentSession.revision));
    setPianoActivityActive(transpose === 0);
  };

  const handlePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    key: LocalPianoKey,
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Window-level pointer handlers remain as a release fallback.
    }
    const contactArea = event.width * event.height;
    const velocity = event.pressure > 0
      ? event.pressure
      : contactArea >= 16
        ? Math.min(1, Math.max(0.25, contactArea / 900))
        : 0.65;
    capturePianoActivityKey(key);
    pressKey(event.pointerId, key.id, velocity);
  };

  const renderRow = (rowKeys: readonly LocalPianoKey[], rowIndex: number) => {
    const whiteKeys = rowKeys.filter((key) => key.keyType === "white");
    const firstWhiteIndex = whiteKeys[0]?.whiteKeyIndex ?? 0;
    const whiteCount = whiteKeys.length;
    const rowStyle = {
      "--local-piano-white-width": `${keyWidth}px`,
      "--local-piano-black-width": `${Math.round(keyWidth * 0.64)}px`,
      width: `${whiteCount * keyWidth}px`,
    } as CSSProperties;

    return (
      <div
        key={`row-${rowIndex}`}
        className="local-piano-scroll"
        role="group"
        aria-label={viewMode === "full" ? `88 键钢琴第 ${rowIndex + 1} 排` : `${rangeLabels[rangeId]}钢琴键盘`}
        data-piano-row={rowIndex + 1}
      >
        <div className="local-piano-keyboard" style={rowStyle}>
          <div className="local-piano-keys">
            {rowKeys.map((key) => {
              const isActive = activeKeyIds.has(key.id);
              const isBlack = key.keyType === "black";
              const relativeWhiteIndex = key.whiteKeyIndex - firstWhiteIndex;
              const style = {
                "--local-piano-key-left": `${(relativeWhiteIndex + (isBlack ? 1 : 0)) * keyWidth}px`,
              } as CSSProperties;
              const visibleLabel = getPianoKeyVisibleLabel(key, labelMode);
              return (
                <button
                  key={key.id}
                  type="button"
                  aria-label={key.accessibleLabel}
                  aria-pressed={isActive}
                  data-piano-key={key.id}
                  data-key-type={key.keyType}
                  style={style}
                  onPointerDown={(event) => handlePointerDown(event, key)}
                  onPointerUp={(event) => releasePointer(event.pointerId)}
                  onPointerCancel={(event) => releasePointer(event.pointerId)}
                  onLostPointerCapture={(event) => releasePointer(event.pointerId)}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
                      event.preventDefault();
                      capturePianoActivityKey(key);
                      pressKey(keyboardToken(key.id), key.id);
                    }
                  }}
                  onKeyUp={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      releasePointer(keyboardToken(key.id));
                    }
                  }}
                  onBlur={() => releasePointer(keyboardToken(key.id))}
                  className={isBlack ? "local-piano-key local-piano-key-black" : "local-piano-key local-piano-key-white"}
                >
                  {visibleLabel ? <span aria-hidden="true">{visibleLabel}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const scrollToKey = (keyId: string) => {
    document.querySelector<HTMLElement>(`[data-piano-key="${keyId}"]`)
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="local-piano-heading">
      <p className="text-sm font-semibold tracking-wide text-fuchsia-700">离线练习辅助</p>
      <h2 id="local-piano-heading" className="mt-1 text-2xl font-bold text-slate-950">本地参考钢琴</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">按住琴键即可播放安装包内的本地参考音，松开后停止。不录音、不联网，也不生成正式成绩。</p>
      <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900" data-piano-timbre={timbre.id}>
        当前音色：{timbre.displayName}。{timbre.kind === "compatibility-synth" ? "这只是兼容降级音色，不是真实钢琴采样。" : `采样版本：${timbre.version}。`}
      </p>

      <label className="mt-3 block text-sm font-semibold text-slate-800">离线音色预设
        <select aria-label="钢琴离线音色" value={selectedVoiceProvider?.descriptor.id ?? ""} disabled={availableTimbreProviders.length < 2 || isRecording || isPlaying} onChange={(event) => {
          stopStress();
          setSelectedTimbreId(event.target.value);
        }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 disabled:opacity-60">
          {availableTimbreProviders.map((provider) => <option key={provider.descriptor.id} value={provider.descriptor.id}>{provider.descriptor.displayName}</option>)}
        </select>
        <span className="mt-1 block text-xs font-normal leading-5 text-slate-600">六种预设共用同一套 Public Domain 三层采样，通过本机滤波与包络形成差异，并非六套独立乐器采样库。</span>
      </label>

      <fieldset className="mt-5 grid gap-3 rounded-2xl border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="px-2 text-sm font-bold text-slate-900">键盘显示</legend>
        <label className="text-sm font-semibold text-slate-800">视图
          <select aria-label="钢琴视图" value={viewMode} onChange={(event) => changeKeyboard(() => setViewMode(event.target.value as PianoViewMode))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900">
            <option value="compact">紧凑音域</option><option value="full">完整 88 键</option>
          </select>
        </label>
        {viewMode === "compact" ? <label className="text-sm font-semibold text-slate-800">音域
          <select aria-label="钢琴音域" value={rangeId} onChange={(event) => changeKeyboard(() => setRangeId(event.target.value as LocalPianoRangeId))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900">
            {LOCAL_PIANO_RANGE_IDS.map((id) => <option key={id} value={id}>{rangeLabels[id]}</option>)}
          </select>
        </label> : <label className="text-sm font-semibold text-slate-800">排布
          <select aria-label="钢琴排布" value={rowMode} onChange={(event) => changeKeyboard(() => setRowMode(event.target.value as PianoRowMode))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900">
            <option value="single">单排滚动</option><option value="double">双排滚动</option>
          </select>
        </label>}
        <label className="text-sm font-semibold text-slate-800">键宽
          <select aria-label="钢琴键宽" value={keyWidth} onChange={(event) => changeKeyboard(() => setKeyWidth(Number(event.target.value) as PianoKeyWidth))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900">
            {PIANO_KEY_WIDTHS.map((width) => <option key={width} value={width}>{width} px</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-800">标签
          <select aria-label="钢琴标签" value={labelMode} onChange={(event) => setLabelMode(event.target.value as PianoLabelMode)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900">
            {Object.entries(labelModeNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
      </fieldset>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold text-slate-800">移调：{transpose > 0 ? `+${transpose}` : transpose} 半音
          <input aria-label="钢琴移调" type="range" min="-12" max="12" step="1" value={transpose} onChange={(event) => changeKeyboard(() => { setPianoActivityActive(false); setTranspose(Number(event.target.value)); })} className="mt-3 w-full accent-fuchsia-700" />
        </label>
        <label className="text-sm font-semibold text-slate-800">音量：{Math.round(keyboardState.volume * 100)}%
          <input aria-label="钢琴音量" type="range" min="0" max="1" step="0.05" value={keyboardState.volume} onChange={(event) => changeVolume(Number(event.target.value))} className="mt-3 w-full accent-fuchsia-700" />
        </label>
        <div className="grid content-end grid-cols-2 gap-2">
          <button type="button" aria-pressed={keyboardState.sustainEnabled} onClick={() => setSustainEnabled(!keyboardState.sustainEnabled)} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold ${keyboardState.sustainEnabled ? "bg-fuchsia-700 text-white" : "border border-fuchsia-300 bg-white text-fuchsia-900"}`}>延音：{keyboardState.sustainEnabled ? "开" : "关"}</button>
          <button type="button" onClick={stopStress} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800">停止全部</button>
        </div>
      </div>

      {notice ? <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-800" role="alert"><p>{notice}</p>{canRetryAudio ? <button type="button" onClick={() => void retryAudio()} className="mt-2 min-h-10 rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-bold text-rose-900">重新启用声音</button> : null}</div> : null}
      <p className="mt-4 text-sm text-slate-600" role="status">当前发声：{keyboardState.activeKeyIds.length > 0 ? keyboardState.activeKeyIds.map((keyId) => audioKeys.find((key) => key.id === keyId)?.soundingNoteName ?? audioKeys.find((key) => key.id === keyId)?.noteName).filter(Boolean).join("、") : "无"}</p>

      {viewMode === "full" ? <div className="mt-3 flex flex-wrap gap-2" aria-label="快速定位音区">{locatorNotes.map((note) => <button key={note} type="button" onClick={() => scrollToKey(note)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-700">定位 {note.toUpperCase()}</button>)}</div> : null}
      <div className={`mt-4 grid gap-3 ${rowMode === "double" && viewMode === "full" ? "local-piano-double-rows" : ""}`}>{rows.map(renderRow)}</div>

      <section className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-4" aria-labelledby="piano-performance-heading">
        <h3 id="piano-performance-heading" className="text-lg font-bold text-indigo-950">节拍器与演奏记录</h3>
        <p className="mt-1 text-xs leading-5 text-indigo-900">只保存按键、力度、踏板和时间事件到本机；不录制麦克风、不上传，也不生成成绩。</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold text-indigo-950">节拍器：{metronomeBpm} BPM
            <input aria-label="钢琴节拍器速度" type="range" min="30" max="240" step="1" value={metronomeBpm} onChange={(event) => setMetronomeBpm(Number(event.target.value))} className="mt-2 w-full accent-indigo-700" />
          </label>
          <button type="button" aria-pressed={metronomeRunning} onClick={() => void toggleMetronome()} className="min-h-11 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm font-bold text-indigo-900">{metronomeRunning ? `停止节拍器（第 ${metronomeBeat || 1} 拍）` : "启动 4/4 节拍器"}</button>
          <button type="button" disabled={isPlaying || stressRunning} onClick={isRecording ? stopRecording : startRecording} className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold text-white disabled:opacity-50 ${isRecording ? "bg-rose-700" : "bg-indigo-700"}`}>{isRecording ? "停止并保存事件" : "开始录制演奏事件"}</button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-semibold text-indigo-950">本机记录
            <select aria-label="钢琴演奏记录" value={selectedPerformanceId ?? ""} onChange={(event) => {
              stopPlayback();
              setDeleteConfirm(false);
              const next = performances.find((item) => item.id === event.target.value) ?? null;
              setSelectedPerformanceId(next?.id ?? null);
              setLoopFromSeconds(0);
              setLoopToSeconds(next ? next.durationMs / 1_000 : 0);
            }} className="mt-1 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-slate-900">
              <option value="">暂无记录</option>
              {performances.map((item) => <option key={item.id} value={item.id}>{item.name}（{(item.durationMs / 1_000).toFixed(1)} 秒）</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-indigo-950">回放速度
            <select aria-label="钢琴回放速度" value={playbackRate} onChange={(event) => setPlaybackRate(Number(event.target.value) as PianoPlaybackRate)} className="mt-1 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-slate-900">
              {[0.5, 0.75, 1, 1.25, 1.5].map((rate) => <option key={rate} value={rate}>{Math.round(rate * 100)}%</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-indigo-950">声部过滤
            <select aria-label="钢琴回放声部" value={voiceFilter} onChange={(event) => setVoiceFilter(event.target.value as PianoPlaybackVoiceFilter)} className="mt-1 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-slate-900">
              <option value="all">全部</option><option value="lower">低声部（C4 以下）</option><option value="upper">高声部（C4 及以上）</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 self-end text-sm font-semibold text-indigo-950"><input type="checkbox" checked={loopEnabled} onChange={(event) => setLoopEnabled(event.target.checked)} className="h-5 w-5 accent-indigo-700" />A–B 循环</label>
        </div>

        {loopEnabled && selectedPerformance ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-indigo-950">A 点（秒）<input aria-label="钢琴循环 A 点" type="number" min="0" max={selectedPerformance.durationMs / 1_000} step="0.1" value={loopFromSeconds} onChange={(event) => { const value = Number(event.target.value); setLoopFromSeconds(Number.isFinite(value) ? Math.max(0, Math.min(selectedPerformance.durationMs / 1_000, value)) : 0); }} className="mt-1 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2" /></label><label className="text-sm font-semibold text-indigo-950">B 点（秒）<input aria-label="钢琴循环 B 点" type="number" min="0" max={selectedPerformance.durationMs / 1_000} step="0.1" value={loopToSeconds} onChange={(event) => { const value = Number(event.target.value); setLoopToSeconds(Number.isFinite(value) ? Math.max(0, Math.min(selectedPerformance.durationMs / 1_000, value)) : 0); }} className="mt-1 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2" /></label></div> : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={!selectedPerformance || isRecording} onClick={() => selectedPerformance && startPlayback(selectedPerformance)} className="min-h-11 rounded-xl bg-indigo-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isPlaying ? "重新开始回放" : "回放所选记录"}</button>
          <button type="button" disabled={!isPlaying} onClick={stopPlayback} className="min-h-11 rounded-xl border border-indigo-300 bg-white px-4 py-2 text-sm font-bold text-indigo-900 disabled:opacity-50">停止回放</button>
          <button type="button" disabled={!selectedPerformance || isRecording || isPlaying} onClick={exportSelectedPerformance} className="min-h-11 rounded-xl border border-indigo-300 bg-white px-4 py-2 text-sm font-bold text-indigo-900 disabled:opacity-50">导出事件 JSON</button>
          <button type="button" disabled={!selectedPerformance || isRecording || isPlaying} onClick={() => deleteConfirm ? deleteSelectedPerformance() : setDeleteConfirm(true)} className="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 disabled:opacity-50">{deleteConfirm ? "确认删除所选记录" : "删除所选记录"}</button>
          {deleteConfirm ? <button type="button" onClick={() => setDeleteConfirm(false)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">取消删除</button> : null}
        </div>
        {performanceNotice ? <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-indigo-950" role="status">{performanceNotice}</p> : null}
      </section>

      <LocalPianoLearningPanel
        onPressKey={(pointerId, keyId, velocity) => { pressKey(pointerId, keyId, velocity); }}
        onReleasePointer={releasePointer}
        onPedal={setSustainEnabled}
        onStopAll={stopPlayback}
        onPlayScore={startLearningPlayback}
        onStopPlayback={stopPlayback}
        isPlaying={isPlaying}
        playbackBlocked={isRecording || stressRunning}
      />

      <PianoActivityProtocolPanel
        session={pianoActivitySession}
        expectedNoteIds={expectedPianoActivityNoteIds}
        active={pianoActivityAccepting}
        transpose={transpose}
        onStart={startPianoActivity}
        onCheck={checkPianoActivity}
        onRestart={restartPianoActivity}
      />

      {viewMode === "full" ? <div className="mt-4 rounded-xl bg-slate-50 p-3"><button type="button" disabled={stressRunning || isRecording || isPlaying} onClick={runStressTest} className="min-h-11 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{stressRunning ? "32 音压力测试进行中…" : "运行 32 音压力测试（2 秒）"}</button><p className="mt-2 text-xs leading-5 text-slate-600">会同时播放 32 个中音区音符并自动全停；请用于检查爆音、性能下降和残音，测试前降低媒体音量。</p></div> : null}
      <p className="mt-4 text-xs leading-5 text-slate-500">支持完整 88 键逻辑音域、最多 32 个并发音符和至少 10 指状态。切换视图、排布、键宽、移调、离开页面或应用进入后台时会停止声音。</p>
    </section>
  );
}
