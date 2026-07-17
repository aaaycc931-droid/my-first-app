"use client";

import { useMemo, useState, type CSSProperties, type PointerEvent } from "react";

import {
  DEFAULT_LOCAL_PIANO_RANGE_ID,
  getLocalPianoKeys,
  LOCAL_PIANO_RANGE_IDS,
  type LocalPianoKey,
  type LocalPianoRangeId,
} from "../../lib/piano/localPianoKeyboard";
import {
  useLocalPianoAudio,
  type LocalPianoAudioChannelFactory,
} from "./useLocalPianoAudio";
import type { PianoVoiceProvider } from "../../lib/piano/pianoAudioProvider";

const rangeLabels: Record<LocalPianoRangeId, string> = {
  "C3-C4": "低音区：C3 到 C4",
  "C4-C5": "中央音区：C4 到 C5",
  "C5-C6": "高音区：C5 到 C6",
};

const keyboardToken = (keyId: string) => `key-${keyId}`;

export function LocalPianoPanel({
  createAudioChannel,
  voiceProvider,
}: {
  createAudioChannel?: LocalPianoAudioChannelFactory;
  voiceProvider?: PianoVoiceProvider;
}) {
  const [rangeId, setRangeId] = useState<LocalPianoRangeId>(
    DEFAULT_LOCAL_PIANO_RANGE_ID,
  );
  const keys = useMemo(() => getLocalPianoKeys(rangeId), [rangeId]);
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

  const changeRange = (nextRangeId: LocalPianoRangeId) => {
    stopAll();
    setRangeId(nextRangeId);
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
      // The window-level pointer handlers remain as a release fallback.
    }
    const contactArea = event.width * event.height;
    const velocity = event.pressure > 0
      ? event.pressure
      : contactArea >= 16
        ? Math.min(1, Math.max(0.25, contactArea / 900))
        : 0.65;
    pressKey(event.pointerId, key.id, velocity);
  };

  const renderKey = (key: LocalPianoKey) => {
    const isActive = activeKeyIds.has(key.id);
    const isBlack = key.keyType === "black";
    const style = ({
      "--local-piano-key-left": `${((key.whiteKeyIndex + (isBlack ? 1 : 0)) / 8) * 100}%`,
    } as CSSProperties);
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
        <span aria-hidden="true">{key.noteName}</span>
      </button>
    );
  };

  return (
    <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="local-piano-heading">
      <p className="text-sm font-semibold tracking-wide text-fuchsia-700">离线练习辅助</p>
      <h2 id="local-piano-heading" className="mt-1 text-2xl font-bold text-slate-950">本地参考钢琴</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">按住琴键即可播放安装包内的本地参考音，松开后停止。不录音、不联网，也不生成正式成绩。</p>
      <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900" data-piano-timbre={timbre.id}>
        当前音色：{timbre.displayName}。{timbre.kind === "compatibility-synth" ? "这只是兼容降级音色，不是真实钢琴采样。" : `采样版本：${timbre.version}。`}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold text-slate-800">
          音域
          <select
            aria-label="钢琴音域"
            value={rangeId}
            onChange={(event) => changeRange(event.target.value as LocalPianoRangeId)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900"
          >
            {LOCAL_PIANO_RANGE_IDS.map((id) => <option key={id} value={id}>{rangeLabels[id]}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-800">
          音量：{Math.round(keyboardState.volume * 100)}%
          <input
            aria-label="钢琴音量"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={keyboardState.volume}
            onChange={(event) => changeVolume(Number(event.target.value))}
            className="mt-3 w-full accent-fuchsia-700"
          />
        </label>
        <div className="grid content-end grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={keyboardState.sustainEnabled}
            onClick={() => setSustainEnabled(!keyboardState.sustainEnabled)}
            className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold ${keyboardState.sustainEnabled ? "bg-fuchsia-700 text-white" : "border border-fuchsia-300 bg-white text-fuchsia-900"}`}
          >
            延音：{keyboardState.sustainEnabled ? "开" : "关"}
          </button>
          <button type="button" onClick={stopAll} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800">停止全部</button>
        </div>
      </div>

      {notice ? (
        <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-800" role="alert">
          <p>{notice}</p>
          {canRetryAudio ? <button type="button" onClick={() => void retryAudio()} className="mt-2 min-h-10 rounded-lg border border-rose-300 bg-white px-3 py-1.5 font-bold text-rose-900">重新启用声音</button> : null}
        </div>
      ) : null}
      <p className="mt-4 text-sm text-slate-600" role="status">当前发声：{keyboardState.activeKeyIds.length > 0 ? keyboardState.activeKeyIds.map((keyId) => keys.find((key) => key.id === keyId)?.noteName).filter(Boolean).join("、") : "无"}</p>

      <div className="local-piano-scroll mt-4" role="group" aria-label={`${rangeLabels[rangeId]}钢琴键盘`}>
        <div className="local-piano-keyboard">
          <div className="local-piano-keys">{keys.map(renderKey)}</div>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">音频引擎支持最多 32 个并发音符；当前单排音域可同时按下全部 13 键。切换音域、离开页面、应用进入后台或关闭延音时，会停止相应声音，避免残留播放。</p>
    </section>
  );
}
