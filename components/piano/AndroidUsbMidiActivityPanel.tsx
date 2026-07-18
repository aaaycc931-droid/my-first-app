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
  appendVerifiedAndroidUsbNoteId,
  createAndroidUsbMidiActivityDefinition,
} from "../../lib/activity/androidUsbMidiActivityAdapter";
import type { NoteEventV1 } from "../../lib/music/noteEvent";
import { P110_ORIGINAL_PIANO_EXERCISE } from "../../lib/piano/pianoLearningScore";
import { ActivityProtocolState } from "../practice/ActivityProtocolState";
import { useAndroidUsbMidi } from "./useAndroidUsbMidi";

const DEFINITION = createAndroidUsbMidiActivityDefinition(P110_ORIGINAL_PIANO_EXERCISE);
const SESSION_ID = `android-usb-midi:${P110_ORIGINAL_PIANO_EXERCISE.id}`;
const EXPECTED_NOTE_IDS = DEFINITION.target.expectedAnswer.mode === "usb-midi"
  ? DEFINITION.target.expectedAnswer.noteIds
  : [];

export function AndroidUsbMidiActivityPanel({
  onSoundEvent,
  onStopAll,
}: {
  onSoundEvent: (event: NoteEventV1) => void;
  onStopAll: () => void;
}) {
  const [session, setSession] = useState(() => createActivitySession(DEFINITION, SESSION_ID));
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
      const hasAnswer = current.answer?.mode === "usb-midi" && current.answer.noteIds.length > 0;
      return hasAnswer || current.lifecycle === "checked"
        ? restartActivityAttempt(current, current.revision)
        : current;
    });
  }, []);

  const handleNoteEvent = useCallback((event: NoteEventV1) => {
    onSoundEventRef.current(event);
    if (!acceptingRef.current || event.type !== "note-on") return;
    const nextNoteIds = appendVerifiedAndroidUsbNoteId(
      noteIdsRef.current,
      event,
      attemptDeviceSessionIdRef.current ?? undefined,
    )
      .slice(0, EXPECTED_NOTE_IDS.length);
    if (nextNoteIds.length === noteIdsRef.current.length) return;
    noteIdsRef.current = nextNoteIds;
    setSession((current) => {
      if (current.lifecycle === "checked") return current;
      return submitActivityAnswer(
        DEFINITION,
        current,
        { mode: "usb-midi", noteIds: nextNoteIds },
        current.revision,
      );
    });
    if (nextNoteIds.length >= EXPECTED_NOTE_IDS.length) {
      acceptingRef.current = false;
      setAccepting(false);
      attemptDeviceSessionIdRef.current = null;
      unbindAttemptRef.current();
    }
  }, []);

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
  const actualNoteIds = session.answer?.mode === "usb-midi" ? session.answer.noteIds : [];

  const startAttempt = () => {
    const deviceSessionId = midi.state.activeSession?.deviceSessionId;
    if (!deviceSessionId || session.lifecycle === "checked") return;
    noteIdsRef.current = [...actualNoteIds];
    attemptDeviceSessionIdRef.current = deviceSessionId;
    acceptingRef.current = true;
    setAccepting(true);
    midi.bindAttempt(
      session.attemptId,
      `${SESSION_ID}:attempt-${session.attemptNumber}`,
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
        expectedNoteIds: EXPECTED_NOTE_IDS,
        actualNoteIds: current.answer?.mode === "usb-midi" ? current.answer.noteIds : [],
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

  return (
    <section className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4" aria-labelledby="android-usb-midi-heading">
      <h3 id="android-usb-midi-heading" className="text-lg font-bold text-cyan-950">Android 原生 USB MIDI 跟弹</h3>
      <p className="mt-1 text-xs leading-5 text-cyan-900">仅已安装 Android APK 可用。只有 Android 原生 API 确认为 USB 的设备才会进入本活动；Web MIDI、设备名称、蓝牙或虚拟端口不能冒充 USB。不会自动打开、重连、上传或生成成绩。</p>

      <div className="mt-3 grid gap-3 rounded-xl bg-white p-3 sm:grid-cols-2">
        <button type="button" disabled={["unavailable", "discovering", "starting", "active", "stopping"].includes(midi.state.status)} onClick={() => void midi.discover()} className="min-h-11 rounded-xl bg-cyan-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{midi.state.status === "discovering" ? "正在查找…" : "手动查找 USB MIDI"}</button>
        <button type="button" disabled={!midi.state.activeSession && midi.state.status !== "starting"} onClick={() => void midi.disconnect()} className="min-h-11 rounded-xl border border-cyan-300 px-3 py-2 text-sm font-bold text-cyan-900 disabled:opacity-50">断开原生 USB MIDI</button>

        {midi.state.devices.length > 0 ? <label className="text-sm font-semibold text-cyan-950">Android 已验证的 USB MIDI 设备
          <select aria-label="Android USB MIDI 设备" disabled={["starting", "active", "stopping"].includes(midi.state.status)} value={midi.state.selectedDeviceId ?? ""} onChange={(event) => midi.selectDevice(event.target.value)} className="mt-1 w-full rounded-xl border border-cyan-300 bg-white px-3 py-2">
            <option value="">请选择设备</option>
            {midi.state.devices.map((device) => <option key={device.nativeDeviceId} value={device.nativeDeviceId}>{device.manufacturer ? `${device.manufacturer} · ` : ""}{device.name}</option>)}
          </select>
        </label> : null}

        {selectedDevice ? <label className="text-sm font-semibold text-cyan-950">设备输出端口（应用接收）
          <select aria-label="Android USB MIDI 设备输出端口" disabled={["starting", "active", "stopping"].includes(midi.state.status)} value={midi.state.selectedOutputPort ?? ""} onChange={(event) => midi.selectOutputPort(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-cyan-300 bg-white px-3 py-2">
            <option value="">请选择端口</option>
            {selectedDevice.outputPorts.map((port) => <option key={port} value={port}>输出端口 {port}</option>)}
          </select>
        </label> : null}

        <button type="button" disabled={midi.state.status !== "selected"} onClick={() => void midi.connect()} className="min-h-11 rounded-xl bg-cyan-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{midi.state.status === "starting" ? "正在连接…" : "连接所选设备与端口"}</button>
        <p className="rounded-xl bg-cyan-50 p-3 text-sm leading-6 text-cyan-950" role="status">{midi.notice}</p>
      </div>

      <div className="mt-3 rounded-xl bg-white p-3">
        <p className="text-sm font-bold text-cyan-950">目标顺序：{EXPECTED_NOTE_IDS.join(" · ")}</p>
        <p className="mt-1 text-sm text-cyan-900" aria-live="polite">本轮 USB 输入：{actualNoteIds.length > 0 ? actualNoteIds.join(" · ") : "尚未输入"}（{actualNoteIds.length}/{EXPECTED_NOTE_IDS.length}）</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={!midi.state.activeSession || accepting || session.lifecycle === "checked" || actualNoteIds.length >= EXPECTED_NOTE_IDS.length} onClick={startAttempt} className="min-h-11 rounded-xl bg-cyan-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{session.lifecycle === "answering" ? "继续 USB MIDI 跟弹" : "开始 USB MIDI 跟弹"}</button>
          <button type="button" disabled={actualNoteIds.length === 0 || session.lifecycle === "checked"} onClick={checkAttempt} className="min-h-11 rounded-xl border border-cyan-300 px-4 py-2 text-sm font-bold text-cyan-950 disabled:opacity-50">检查本轮</button>
          <button type="button" disabled={!accepting && session.attemptNumber === 1 && session.lifecycle === "ready"} onClick={restartAttempt} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 disabled:opacity-50">重新尝试</button>
        </div>
        {accepting ? <p className="mt-2 text-sm font-bold text-cyan-950" role="status">正在接收当前已验证 USB 设备的 note-on；达到目标音数后自动暂停采集。</p> : null}
        <div className="mt-3"><ActivityProtocolState session={session} /></div>
        {session.lifecycle === "checked" && session.checkEvidence ? <p className="mt-3 rounded-xl bg-cyan-50 p-3 text-sm leading-6 text-cyan-950">{session.checkEvidence.explanation}</p> : null}
      </div>
    </section>
  );
}
