"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { decodePianoMidiMessage, type PianoMidiInputEvent } from "../../lib/piano/pianoMidi";

type MidiInputPort = {
  id: string;
  name?: string | null;
  manufacturer?: string | null;
  state?: "connected" | "disconnected";
  type?: string;
  onmidimessage: ((event: { data: Uint8Array }) => void) | null;
};

type MidiAccess = {
  inputs: { values(): IterableIterator<MidiInputPort> };
  onstatechange: ((event: { port?: MidiInputPort }) => void) | null;
};

type MidiNavigator = Navigator & {
  requestMIDIAccess?: (options?: { sysex?: boolean; software?: boolean }) => Promise<MidiAccess>;
};

export type LocalPianoMidiDevice = {
  id: string;
  name: string;
  manufacturer: string | null;
};

export function useLocalPianoMidi({
  onEvent,
  onDisconnect,
}: {
  onEvent: (event: PianoMidiInputEvent, deviceId: string) => void;
  onDisconnect: () => void;
}) {
  const [devices, setDevices] = useState<LocalPianoMidiDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "requesting" | "connected" | "unsupported" | "error">("idle");
  const [notice, setNotice] = useState("点击连接后，系统可能询问 MIDI 设备权限。");
  const accessRef = useRef<MidiAccess | null>(null);
  const selectedDeviceIdRef = useRef<string | null>(null);
  const onEventRef = useRef(onEvent);
  const onDisconnectRef = useRef(onDisconnect);

  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);
  useEffect(() => { onDisconnectRef.current = onDisconnect; }, [onDisconnect]);
  useEffect(() => { selectedDeviceIdRef.current = selectedDeviceId; }, [selectedDeviceId]);

  const clearHandlers = useCallback(() => {
    const access = accessRef.current;
    if (!access) return;
    Array.from(access.inputs.values()).forEach((input) => { input.onmidimessage = null; });
  }, []);

  const bindSelectedInput = useCallback((deviceId: string | null) => {
    const access = accessRef.current;
    if (!access) return false;
    clearHandlers();
    const input = Array.from(access.inputs.values()).find((candidate) =>
      candidate.id === deviceId && candidate.state !== "disconnected",
    );
    if (!input) return false;
    input.onmidimessage = (event) => {
      const decoded = decodePianoMidiMessage(event.data);
      if (decoded) onEventRef.current(decoded, input.id);
    };
    return true;
  }, [clearHandlers]);

  const refreshDevices = useCallback((preferredId?: string | null) => {
    const access = accessRef.current;
    if (!access) return;
    const next = Array.from(access.inputs.values())
      .filter((input) => input.state !== "disconnected" && input.type !== "output")
      .map((input) => ({
        id: input.id,
        name: input.name?.trim() || "未命名 MIDI 输入",
        manufacturer: input.manufacturer?.trim() || null,
      }));
    setDevices(next);
    const nextId = next.some((device) => device.id === preferredId)
      ? preferredId ?? null
      : next[0]?.id ?? null;
    setSelectedDeviceId(nextId);
    if (nextId && bindSelectedInput(nextId)) {
      setStatus("connected");
      setNotice("MIDI 输入已连接；力度和延音踏板会映射到本地钢琴。");
    } else {
      clearHandlers();
      setStatus("connected");
      setNotice("已获得 MIDI 权限，但当前没有可用输入设备。可插入设备后重试。");
      onDisconnectRef.current();
    }
  }, [bindSelectedInput, clearHandlers]);

  const connect = useCallback(async () => {
    const requestMIDIAccess = (navigator as MidiNavigator).requestMIDIAccess;
    if (!requestMIDIAccess) {
      setStatus("unsupported");
      setNotice("当前 Android System WebView 不支持 Web MIDI；屏幕钢琴仍可正常使用。");
      return;
    }
    setStatus("requesting");
    setNotice("正在等待系统 MIDI 权限与设备列表…");
    try {
      const access = await requestMIDIAccess.call(navigator, { sysex: false, software: false });
      accessRef.current = access;
      access.onstatechange = () => {
        onDisconnectRef.current();
        refreshDevices(selectedDeviceIdRef.current);
      };
      refreshDevices(selectedDeviceId);
    } catch {
      setStatus("error");
      setNotice("MIDI 权限被拒绝或设备不可用；可检查 USB 连接与系统权限后重试。");
    }
  }, [refreshDevices, selectedDeviceId]);

  const selectDevice = useCallback((deviceId: string) => {
    if (bindSelectedInput(deviceId)) {
      setSelectedDeviceId(deviceId);
      setNotice("已切换 MIDI 输入设备；旧设备的按键状态已清除。");
      onDisconnectRef.current();
    }
  }, [bindSelectedInput]);

  const disconnect = useCallback(() => {
    clearHandlers();
    if (accessRef.current) accessRef.current.onstatechange = null;
    accessRef.current = null;
    setDevices([]);
    setSelectedDeviceId(null);
    setStatus("idle");
    setNotice("MIDI 输入已断开；屏幕钢琴仍可正常使用。");
    onDisconnectRef.current();
  }, [clearHandlers]);

  useEffect(() => () => {
    clearHandlers();
    if (accessRef.current) accessRef.current.onstatechange = null;
    onDisconnectRef.current();
  }, [clearHandlers]);

  return {
    devices,
    selectedDeviceId,
    status,
    notice,
    connect,
    selectDevice,
    disconnect,
  };
}
