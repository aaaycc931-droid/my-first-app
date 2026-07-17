"use client";

import {
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
import {
  useLocalPianoAudio,
  type LocalPianoAudioChannelFactory,
} from "./useLocalPianoAudio";

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
  const [stressRunning, setStressRunning] = useState(false);
  const stressTimerRef = useRef<number | null>(null);

  const baseKeys = useMemo(
    () => viewMode === "full" ? getFullPianoKeys() : getLocalPianoKeys(rangeId),
    [rangeId, viewMode],
  );
  const keys = useMemo(() => transposePianoKeys(baseKeys, transpose), [baseKeys, transpose]);
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
  } = useLocalPianoAudio({ keys, createChannel: createAudioChannel, voiceProvider });
  const activeKeyIds = new Set(keyboardState.activeKeyIds);
  const canRetryAudio = notice?.includes("无法播放") || notice?.includes("准备超时");

  const stopStress = () => {
    if (stressTimerRef.current !== null) window.clearTimeout(stressTimerRef.current);
    stressTimerRef.current = null;
    setStressRunning(false);
    stopAll();
  };

  useEffect(() => () => {
    if (stressTimerRef.current !== null) window.clearTimeout(stressTimerRef.current);
  }, []);

  const changeKeyboard = (change: () => void) => {
    stopStress();
    change();
  };

  const runStressTest = () => {
    stopStress();
    const stressKeys = getPianoStressTestKeyIds(keys);
    if (stressKeys.length !== 32) return;
    stressKeys.forEach((keyId, index) => pressKey(`stress-${index}`, keyId, 0.72));
    setStressRunning(true);
    stressTimerRef.current = window.setTimeout(() => {
      stressTimerRef.current = null;
      setStressRunning(false);
      stopAll();
    }, 2_000);
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
          <input aria-label="钢琴移调" type="range" min="-12" max="12" step="1" value={transpose} onChange={(event) => changeKeyboard(() => setTranspose(Number(event.target.value)))} className="mt-3 w-full accent-fuchsia-700" />
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
      <p className="mt-4 text-sm text-slate-600" role="status">当前发声：{keyboardState.activeKeyIds.length > 0 ? keyboardState.activeKeyIds.map((keyId) => keys.find((key) => key.id === keyId)?.soundingNoteName ?? keys.find((key) => key.id === keyId)?.noteName).filter(Boolean).join("、") : "无"}</p>

      {viewMode === "full" ? <div className="mt-3 flex flex-wrap gap-2" aria-label="快速定位音区">{locatorNotes.map((note) => <button key={note} type="button" onClick={() => scrollToKey(note)} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold text-slate-700">定位 {note.toUpperCase()}</button>)}</div> : null}
      <div className={`mt-4 grid gap-3 ${rowMode === "double" && viewMode === "full" ? "local-piano-double-rows" : ""}`}>{rows.map(renderRow)}</div>

      {viewMode === "full" ? <div className="mt-4 rounded-xl bg-slate-50 p-3"><button type="button" disabled={stressRunning} onClick={runStressTest} className="min-h-11 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{stressRunning ? "32 音压力测试进行中…" : "运行 32 音压力测试（2 秒）"}</button><p className="mt-2 text-xs leading-5 text-slate-600">会同时播放 32 个中音区音符并自动全停；请用于检查爆音、性能下降和残音，测试前降低媒体音量。</p></div> : null}
      <p className="mt-4 text-xs leading-5 text-slate-500">支持完整 88 键逻辑音域、最多 32 个并发音符和至少 10 指状态。切换视图、排布、键宽、移调、离开页面或应用进入后台时会停止声音。</p>
    </section>
  );
}
