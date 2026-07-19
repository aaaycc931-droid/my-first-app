"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  completeActivityCheck,
  createActivitySession,
  restartActivityAttempt,
  submitActivityAnswer,
} from "../../lib/activity/activitySession";
import {
  adaptAndroidUsbMidiSequenceToEvidence,
  appendVerifiedAndroidMidiNoteId,
  createAndroidMidiActivityDefinition,
  type AndroidVerifiedMidiMode,
} from "../../lib/activity/androidUsbMidiActivityAdapter";
import type { NoteEventV1 } from "../../lib/music/noteEvent";
import { P110_ORIGINAL_PIANO_EXERCISE } from "../../lib/piano/pianoLearningScore";
import { ActivityProtocolState } from "../practice/ActivityProtocolState";
import { useAndroidUsbMidi } from "./useAndroidUsbMidi";

const definitionForMode = (mode: AndroidVerifiedMidiMode) =>
  createAndroidMidiActivityDefinition(P110_ORIGINAL_PIANO_EXERCISE, mode);
const sessionIdForMode = (mode: AndroidVerifiedMidiMode) =>
  `android-${mode}:${P110_ORIGINAL_PIANO_EXERCISE.id}`;

export function AndroidUsbMidiActivityPanel({
  onSoundEvent,
  onStopAll,
}: {
  onSoundEvent: (event: NoteEventV1) => void;
  onStopAll: () => void;
}) {
  const [mode, setMode] = useState<AndroidVerifiedMidiMode>("usb-midi");
  const definition = definitionForMode(mode);
  const sessionId = sessionIdForMode(mode);
  const expectedNoteIds = definition.target.expectedAnswer.mode === mode
    ? definition.target.expectedAnswer.noteIds
    : [];
  const transport = mode === "ble-midi" ? "ble" : "usb";
  const transportLabel = transport === "ble" ? "BLE" : "USB";
  const [session, setSession] = useState(() => createActivitySession(definitionForMode("usb-midi"), sessionIdForMode("usb-midi")));
  const [accepting, setAccepting] = useState(false);
  const acceptingRef = useRef(false);
  const noteIdsRef = useRef<string[]>([]);
  const attemptDeviceSessionIdRef = useRef<string | null>(null);
  const unbindAttemptRef = useRef<() => void>(() => undefined);
  const onSoundEventRef = useRef(onSoundEvent);
  const onStopAllRef = useRef(onStopAll);

  useEffect(() => { onSoundEventRef.current = onSoundEvent; }, [onSoundEvent]);
  useEffect(() => { onStopAllRef.current = onStopAll; }, [onStopAll]);

  const invalidateAttempt = useCallback(() => {
    acceptingRef.current = false;
    setAccepting(false);
    noteIdsRef.current = [];
    attemptDeviceSessionIdRef.current = null;
    onStopAllRef.current();
    setSession((current) => {
      const hasAnswer = current.answer?.mode === mode && current.answer.noteIds.length > 0;
      return hasAnswer || current.lifecycle === "checked"
        ? restartActivityAttempt(current, current.revision)
        : current;
    });
  }, [mode]);

  const handleNoteEvent = useCallback((event: NoteEventV1) => {
    onSoundEventRef.current(event);
    if (!acceptingRef.current || event.type !== "note-on") return;
    const nextNoteIds = appendVerifiedAndroidMidiNoteId(
      noteIdsRef.current,
      event,
      mode,
      attemptDeviceSessionIdRef.current ?? undefined,
    )
      .slice(0, expectedNoteIds.length);
    if (nextNoteIds.length === noteIdsRef.current.length) return;
    noteIdsRef.current = nextNoteIds;
    setSession((current) => {
      if (current.lifecycle === "checked") return current;
      return submitActivityAnswer(
        definition,
        current,
        { mode, noteIds: nextNoteIds },
        current.revision,
      );
    });
    if (nextNoteIds.length >= expectedNoteIds.length) {
      acceptingRef.current = false;
      setAccepting(false);
      attemptDeviceSessionIdRef.current = null;
      unbindAttemptRef.current();
    }
  }, [definition, expectedNoteIds.length, mode]);

  const midi = useAndroidUsbMidi({
    onEvent: handleNoteEvent,
    onSessionInvalidated: invalidateAttempt,
  });
  useEffect(() => {
    unbindAttemptRef.current = midi.unbindAttempt;
  }, [midi.unbindAttempt]);

  const selectedDevice = midi.state.devices.find(
    (device) => device.nativeDeviceId === midi.state.selectedDeviceId,
  ) ?? null;
  const actualNoteIds = session.answer?.mode === mode ? session.answer.noteIds : [];

  const startAttempt = () => {
    const deviceSessionId = midi.state.activeSession?.deviceSessionId;
    if (!deviceSessionId || session.lifecycle === "checked") return;
    noteIdsRef.current = [...actualNoteIds];
    attemptDeviceSessionIdRef.current = deviceSessionId;
    acceptingRef.current = true;
    setAccepting(true);
    midi.bindAttempt(
      session.attemptId,
      `${sessionId}:attempt-${session.attemptNumber}`,
    );
  };

  const checkAttempt = () => {
    acceptingRef.current = false;
    setAccepting(false);
    attemptDeviceSessionIdRef.current = null;
    midi.unbindAttempt();
    setSession((current) => completeActivityCheck(
      current,
      adaptAndroidUsbMidiSequenceToEvidence({
        expectedNoteIds,
        actualNoteIds: current.answer?.mode === mode ? current.answer.noteIds : [],
      }),
      current.revision,
    ));
  };

  const restartAttempt = () => {
    noteIdsRef.current = [];
    acceptingRef.current = false;
    setAccepting(false);
    attemptDeviceSessionIdRef.current = null;
    midi.unbindAttempt();
    setSession((current) => restartActivityAttempt(current, current.revision));
  };

  const switchMode = (nextMode: AndroidVerifiedMidiMode) => {
    if (nextMode === mode || midi.state.activeSession || midi.state.status === "starting" || midi.state.status === "stopping") return;
    invalidateAttempt();
    midi.unbindAttempt();
    setMode(nextMode);
    setSession(createActivitySession(definitionForMode(nextMode), sessionIdForMode(nextMode)));
  };

  return (
    <section className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4" aria-labelledby="android-usb-midi-heading">
      <h3 id="android-usb-midi-heading" className="text-lg font-bold text-cyan-950">Android 原生 USB / BLE MIDI 跟弹</h3>
      <p className="mt-1 text-xs leading-5 text-cyan-900">仅已安装 Android APK 可用。USB 与 BLE 必须由 Android 原生设备类型验证；这里只列出已由系统 MIDI 服务暴露的 BLE 端点，普通蓝牙配对不保证可见，本应用不会扫描或配对。Web MIDI、设备名称和虚拟端口不能冒充物理传输。不会自动打开、重连、上传或生成成绩。</p>

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Android MIDI 传输方式">
        <button type="button" aria-pressed={mode === "usb-midi"} disabled={Boolean(midi.state.activeSession) || midi.state.status === "starting" || midi.state.status === "stopping"} onClick={() => switchMode("usb-midi")} className="min-h-11 rounded-xl border border-cyan-300 px-4 py-2 text-sm font-bold text-cyan-950 disabled:opacity-50">USB MIDI</button>
        <button type="button" aria-pressed={mode === "ble-midi"} disabled={Boolean(midi.state.activeSession) || midi.state.status === "starting" || midi.state.status === "stopping"} onClick={() => switchMode("ble-midi")} className="min-h-11 rounded-xl border border-cyan-300 px-4 py-2 text-sm font-bold text-cyan-950 disabled:opacity-50">BLE MIDI</button>
      </div>

      <div className="mt-3 grid gap-3 rounded-xl bg-white p-3 sm:grid-cols-2">
        <button type="button" disabled={["unavailable", "discovering", "starting", "active", "stopping"].includes(midi.state.status)} onClick={() => void midi.discover(transport)} className="min-h-11 rounded-xl bg-cyan-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{midi.state.status === "discovering" ? "正在查找…" : `手动查找 ${transportLabel} MIDI`}</button>
        <button type="button" disabled={!midi.state.activeSession && midi.state.status !== "starting"} onClick={() => void midi.disconnect()} className="min-h-11 rounded-xl border border-cyan-300 px-3 py-2 text-sm font-bold text-cyan-900 disabled:opacity-50">断开原生 {transportLabel} MIDI</button>

        {midi.state.devices.length > 0 ? <label className="text-sm font-semibold text-cyan-950">Android 已验证的 {transportLabel} MIDI 设备
          <select aria-label={`Android ${transportLabel} MIDI 设备`} disabled={["starting", "active", "stopping"].includes(midi.state.status)} value={midi.state.selectedDeviceId ?? ""} onChange={(event) => midi.selectDevice(event.target.value)} className="mt-1 w-full rounded-xl border border-cyan-300 bg-white px-3 py-2">
            <option value="">请选择设备</option>
            {midi.state.devices.map((device) => <option key={device.nativeDeviceId} value={device.nativeDeviceId}>{device.manufacturer ? `${device.manufacturer} · ` : ""}{device.name}</option>)}
          </select>
        </label> : null}

        {selectedDevice ? <label className="text-sm font-semibold text-cyan-950">设备输出端口（应用接收）
          <select aria-label={`Android ${transportLabel} MIDI 设备输出端口`} disabled={["starting", "active", "stopping"].includes(midi.state.status)} value={midi.state.selectedOutputPort ?? ""} onChange={(event) => midi.selectOutputPort(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-cyan-300 bg-white px-3 py-2">
            <option value="">请选择端口</option>
            {selectedDevice.outputPorts.map((port) => <option key={port} value={port}>输出端口 {port}</option>)}
          </select>
        </label> : null}

        <button type="button" disabled={midi.state.status !== "selected"} onClick={() => void midi.connect()} className="min-h-11 rounded-xl bg-cyan-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{midi.state.status === "starting" ? "正在连接…" : "连接所选设备与端口"}</button>
        <p className="rounded-xl bg-cyan-50 p-3 text-sm leading-6 text-cyan-950" role="status">{midi.notice}</p>
      </div>

      <div className="mt-3 rounded-xl bg-white p-3">
        <p className="text-sm font-bold text-cyan-950">目标顺序：{expectedNoteIds.join(" · ")}</p>
        <p className="mt-1 text-sm text-cyan-900" aria-live="polite">本轮 {transportLabel} 输入：{actualNoteIds.length > 0 ? actualNoteIds.join(" · ") : "尚未输入"}（{actualNoteIds.length}/{expectedNoteIds.length}）</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={!midi.state.activeSession || accepting || session.lifecycle === "checked" || actualNoteIds.length >= expectedNoteIds.length} onClick={startAttempt} className="min-h-11 rounded-xl bg-cyan-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{session.lifecycle === "answering" ? `继续 ${transportLabel} MIDI 跟弹` : `开始 ${transportLabel} MIDI 跟弹`}</button>
          <button type="button" disabled={actualNoteIds.length === 0 || session.lifecycle === "checked"} onClick={checkAttempt} className="min-h-11 rounded-xl border border-cyan-300 px-4 py-2 text-sm font-bold text-cyan-950 disabled:opacity-50">检查本轮</button>
          <button type="button" disabled={!accepting && session.attemptNumber === 1 && session.lifecycle === "ready"} onClick={restartAttempt} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 disabled:opacity-50">重新尝试</button>
        </div>
        {accepting ? <p className="mt-2 text-sm font-bold text-cyan-950" role="status">正在接收当前已验证 {transportLabel} 设备的 note-on；达到目标音数后自动暂停采集。</p> : null}
        <div className="mt-3"><ActivityProtocolState session={session} /></div>
        {session.lifecycle === "checked" && session.checkEvidence ? <p className="mt-3 rounded-xl bg-cyan-50 p-3 text-sm leading-6 text-cyan-950">{session.checkEvidence.explanation}</p> : null}
      </div>
    </section>
  );
}
