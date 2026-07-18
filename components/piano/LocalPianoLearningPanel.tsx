"use client";

import { useMemo, useRef, useState } from "react";

import { getFullPianoKeys } from "../../lib/piano/localPianoKeyboard";
import {
  confirmPianoLearningDraft,
  createPianoLearningDraftFromMusicXML,
  createPianoWaterfallNotes,
  MAX_PIANO_MUSICXML_BYTES,
  P110_ORIGINAL_PIANO_EXERCISE,
  removePianoLearningDraftNote,
  type PianoLearningScore,
} from "../../lib/piano/pianoLearningScore";
import { midiPointerToken, type PianoMidiInputEvent } from "../../lib/piano/pianoMidi";
import { useLocalPianoMidi } from "./useLocalPianoMidi";

const durationLabels: Record<number, string> = {
  0.5: "八分音符",
  1: "四分音符",
  2: "二分音符",
  4: "全音符",
};

export function LocalPianoLearningPanel({
  onPressKey,
  onReleasePointer,
  onPedal,
  onStopAll,
  onPlayScore,
  onStopPlayback,
  isPlaying,
  playbackBlocked,
}: {
  onPressKey: (pointerId: string, keyId: string, velocity: number) => void;
  onReleasePointer: (pointerId: string) => void;
  onPedal: (enabled: boolean) => void;
  onStopAll: () => void;
  onPlayScore: (score: PianoLearningScore, bpm: number) => void;
  onStopPlayback: () => void;
  isPlaying: boolean;
  playbackBlocked: boolean;
}) {
  const [importedDraft, setImportedDraft] = useState<PianoLearningScore | null>(null);
  const [selectedSource, setSelectedSource] = useState<"original" | "imported">("original");
  const [view, setView] = useState<"score" | "waterfall">("score");
  const [bpm, setBpm] = useState(72);
  const [importState, setImportState] = useState<"idle" | "reading" | "ready" | "error">("idle");
  const [scoreNotice, setScoreNotice] = useState("可直接练习项目原创片段，或在本机导入简单单声部 MusicXML 草稿。");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const keyByMidi = useMemo(() => new Map(getFullPianoKeys().map((key) => [key.midi, key])), []);
  const selectedScore = selectedSource === "imported" && importedDraft
    ? importedDraft
    : P110_ORIGINAL_PIANO_EXERCISE;
  const waterfall = useMemo(() => createPianoWaterfallNotes(selectedScore), [selectedScore]);

  const handleMidiEvent = (event: PianoMidiInputEvent, deviceId: string) => {
    if (event.type === "pedal") {
      onPedal(event.down);
      return;
    }
    const pointerId = midiPointerToken(deviceId, event.channel, event.note);
    if (event.type === "note-off") {
      onReleasePointer(pointerId);
      return;
    }
    const key = keyByMidi.get(event.note);
    if (!key) return;
    onPressKey(pointerId, key.id, event.velocity);
  };

  const midi = useLocalPianoMidi({ onEvent: handleMidiEvent, onDisconnect: onStopAll });

  const importMusicXML = async (file: File | null) => {
    onStopPlayback();
    setImportedDraft(null);
    setSelectedSource("original");
    if (!file) {
      setImportState("idle");
      setScoreNotice("未选择文件；原创练习仍可使用。");
      return;
    }
    if (!/\.(?:musicxml|xml)$/i.test(file.name)) {
      setImportState("error");
      setScoreNotice("请选择 .musicxml 或 .xml 文件；当前入口不解析图片、PDF 或压缩 MXL。");
      return;
    }
    if (file.size > MAX_PIANO_MUSICXML_BYTES) {
      setImportState("error");
      setScoreNotice("MusicXML 文件超过 2 MB 本机处理上限。");
      return;
    }
    setImportState("reading");
    setScoreNotice("正在本机读取并生成待检查草稿…");
    try {
      const draft = createPianoLearningDraftFromMusicXML({ xml: await file.text(), fileName: file.name });
      setImportedDraft(draft);
      setSelectedSource("imported");
      setImportState("ready");
      setScoreNotice(`已生成 ${draft.notes.length} 个音符的待检查草稿；确认前不能播放。`);
    } catch (error) {
      setImportState("error");
      setScoreNotice(error instanceof Error ? error.message : "MusicXML 草稿生成失败，请更换文件。");
    }
  };

  const clearImport = () => {
    onStopPlayback();
    setImportedDraft(null);
    setSelectedSource("original");
    setImportState("idle");
    setScoreNotice("本机 MusicXML 草稿已清除；没有保存或上传文件内容。");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeNote = (noteId: string) => {
    if (!importedDraft) return;
    onStopPlayback();
    const next = removePianoLearningDraftNote(importedDraft, noteId);
    setImportedDraft(next);
    setScoreNotice("已从草稿移除一个音符；确认状态已失效，请重新检查。 ");
  };

  const confirmDraft = () => {
    if (!importedDraft) return;
    try {
      const next = confirmPianoLearningDraft(importedDraft);
      setImportedDraft(next);
      setScoreNotice("草稿已由你确认，可用于当前会话的非评分钢琴学习播放。");
    } catch (error) {
      setScoreNotice(error instanceof Error ? error.message : "草稿不能确认。");
    }
  };

  return (
    <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" aria-labelledby="piano-learning-heading">
      <h3 id="piano-learning-heading" className="text-lg font-bold text-emerald-950">MIDI 与谱面学习</h3>
      <p className="mt-1 text-xs leading-5 text-emerald-900">MIDI 是可选硬件输入；不支持或拒绝权限时仍可使用屏幕钢琴。MusicXML 只在本机当前会话生成草稿，必须检查并确认后才能播放。</p>

      <div className="mt-3 grid gap-3 rounded-xl bg-white p-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <p className="text-sm font-bold text-slate-900">USB / Web MIDI 输入</p>
          <p className="mt-1 text-xs leading-5 text-slate-600" role="status">{midi.notice}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button type="button" disabled={midi.status === "requesting"} onClick={() => void midi.connect()} className="min-h-11 rounded-xl bg-emerald-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{midi.status === "requesting" ? "等待 MIDI 权限…" : "连接 MIDI"}</button>
          <button type="button" disabled={midi.status === "idle" || midi.status === "unsupported"} onClick={midi.disconnect} className="min-h-11 rounded-xl border border-emerald-300 px-3 py-2 text-sm font-bold text-emerald-900 disabled:opacity-50">断开 MIDI</button>
        </div>
        {midi.devices.length > 0 ? <label className="text-sm font-semibold text-slate-800 sm:col-span-3">MIDI 输入设备
          <select aria-label="MIDI 输入设备" value={midi.selectedDeviceId ?? ""} onChange={(event) => midi.selectDevice(event.target.value)} className="mt-1 w-full rounded-xl border border-emerald-300 bg-white px-3 py-2">
            {midi.devices.map((device) => <option key={device.id} value={device.id}>{device.manufacturer ? `${device.manufacturer} · ` : ""}{device.name}</option>)}
          </select>
        </label> : null}
      </div>

      <div className="mt-3 grid gap-3 rounded-xl bg-white p-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-800">本机 MusicXML 草稿（最大 2 MB）
          <input ref={fileInputRef} aria-label="选择本机 MusicXML" type="file" accept=".musicxml,.xml,application/vnd.recordare.musicxml+xml,text/xml,application/xml" disabled={importState === "reading"} onChange={(event) => void importMusicXML(event.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <button type="button" onClick={() => { onStopPlayback(); setSelectedSource("original"); }} aria-pressed={selectedSource === "original"} className="min-h-11 rounded-xl border border-emerald-300 px-3 py-2 text-sm font-bold text-emerald-900">使用原创练习</button>
          <button type="button" disabled={!importedDraft} onClick={() => { onStopPlayback(); setSelectedSource("imported"); }} aria-pressed={selectedSource === "imported"} className="min-h-11 rounded-xl border border-emerald-300 px-3 py-2 text-sm font-bold text-emerald-900 disabled:opacity-50">查看导入草稿</button>
          <button type="button" disabled={!importedDraft && importState === "idle"} onClick={clearImport} className="min-h-11 rounded-xl border border-rose-300 px-3 py-2 text-sm font-bold text-rose-800 disabled:opacity-50">清除本机草稿</button>
        </div>
      </div>

      <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-emerald-950" role="status">{scoreNotice}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={view === "score"} onClick={() => setView("score")} className="min-h-10 rounded-lg border border-emerald-300 bg-white px-3 text-sm font-bold text-emerald-900">谱面预览</button>
        <button type="button" aria-pressed={view === "waterfall"} onClick={() => setView("waterfall")} className="min-h-10 rounded-lg border border-emerald-300 bg-white px-3 text-sm font-bold text-emerald-900">瀑布视图</button>
        <span className="text-sm font-bold text-emerald-950">{selectedScore.name} · {selectedScore.notes.length} 音 · {selectedScore.reviewState === "confirmed" ? "已确认" : "待检查"}</span>
      </div>

      {view === "score" ? <div className="piano-learning-score mt-3" role="img" aria-label={`${selectedScore.name} 谱面草稿预览`}>
        {selectedScore.notes.slice(0, 32).map((note, index) => <span key={note.id} className="piano-learning-note" style={{ left: `${4 + (index / Math.max(1, Math.min(31, selectedScore.notes.length - 1))) * 92}%`, bottom: `${16 + ((note.midi - 48) % 24) * 2.4}px` }} title={`${note.pitch}，第 ${note.measure} 小节`}>●</span>)}
      </div> : <div className="piano-learning-waterfall mt-3" role="img" aria-label={`${selectedScore.name} 瀑布学习视图`}>
        {waterfall.slice(0, 64).map((note) => <span key={note.id} className="piano-waterfall-note" style={{ left: `${note.leftPercent}%`, top: `${note.topPercent}%`, height: `${note.heightPercent}%` }} title={note.pitch}>{note.pitch}</span>)}
      </div>}

      {selectedSource === "imported" && importedDraft ? <div className="mt-3 rounded-xl bg-white p-3">
        <p className="text-sm font-bold text-slate-900">草稿检查与修改</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">逐音检查下列解析结果。移除任何音符都会让已确认状态失效；当前 MVP 不声称支持完整 MusicXML 记谱。</p>
        <ol className="mt-2 grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
          {importedDraft.notes.slice(0, 48).map((note) => <li key={note.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><span>{note.pitch} · 第 {note.measure} 小节 · {durationLabels[note.durationBeats] ?? `${note.durationBeats} 拍`}</span><button type="button" onClick={() => removeNote(note.id)} className="min-h-9 rounded-lg border border-rose-200 px-2 font-bold text-rose-800">移除</button></li>)}
        </ol>
        <button type="button" disabled={importedDraft.notes.length === 0 || importedDraft.reviewState === "confirmed"} onClick={confirmDraft} className="mt-3 min-h-11 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">我已检查，确认此草稿用于练习</button>
      </div> : null}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm font-semibold text-emerald-950">谱面播放速度：{bpm} BPM
          <input aria-label="谱面播放速度" type="range" min="30" max="180" step="1" value={bpm} onChange={(event) => setBpm(Number(event.target.value))} className="mt-1 block accent-emerald-700" />
        </label>
        <button type="button" disabled={playbackBlocked || selectedScore.reviewState !== "confirmed" || selectedScore.notes.length === 0} onClick={() => onPlayScore(selectedScore, bpm)} className="min-h-11 rounded-xl bg-emerald-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isPlaying ? "重新播放确认谱面" : "播放确认谱面"}</button>
        <button type="button" disabled={!isPlaying} onClick={onStopPlayback} className="min-h-11 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-900 disabled:opacity-50">停止谱面播放</button>
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-emerald-900">{selectedScore.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
    </section>
  );
}
