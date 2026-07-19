"use client";

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  applyAndroidMidiBridgePayload,
  createAndroidMidiBridgeState,
  reduceAndroidMidiBridge,
  type AndroidMidiBridgePayload,
  type AndroidMidiBridgeState,
} from "../../lib/piano/androidMidiBridge";
import type { NoteEventV1 } from "../../lib/music/noteEvent";

type UsbMidiNativePlugin = {
  listUsbDevices(options: { generation: number }): Promise<unknown>;
  listBleDevices(options: { generation: number }): Promise<unknown>;
  connect(options: {
    deviceId: number;
    outputPort: number;
    generation: number;
    commandId: string;
    transport: "usb" | "ble";
  }): Promise<unknown>;
  disconnect(): Promise<void>;
  addListener(
    eventName: "bridgeEvent",
    listener: (payload: unknown) => void,
  ): Promise<PluginListenerHandle>;
};

const UsbMidi = registerPlugin<UsbMidiNativePlugin>("UsbMidi");

export function useAndroidUsbMidi({
  onEvent,
  onSessionInvalidated,
}: {
  onEvent: (event: NoteEventV1) => void;
  onSessionInvalidated: (reason: string) => void;
}) {
  const [state, setState] = useState<AndroidMidiBridgeState>(() => createAndroidMidiBridgeState());
  const [notice, setNotice] = useState(
    Capacitor.getPlatform() === "android"
      ? "请先选择 USB 或 BLE，再手动查找 Android MIDI 设备；不会自动打开或重连。"
      : "Android 原生 USB / BLE MIDI 仅在已安装 APK 中可用；屏幕钢琴和 Web MIDI 仍可使用。",
  );
  const stateRef = useRef(state);
  const commandSequenceRef = useRef(0);
  const onEventRef = useRef(onEvent);
  const onSessionInvalidatedRef = useRef(onSessionInvalidated);

  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);
  useEffect(() => { onSessionInvalidatedRef.current = onSessionInvalidated; }, [onSessionInvalidated]);

  const commit = useCallback((next: AndroidMidiBridgeState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const applyPayload = useCallback((payload: unknown) => {
    const parsedType = typeof payload === "object" && payload !== null && "type" in payload
      ? String((payload as { type?: unknown }).type)
      : "";
    const result = applyAndroidMidiBridgePayload(stateRef.current, payload);
    if (result.rejection) {
      if (parsedType !== "all-notes-off") setNotice(`Android MIDI 事件已拒绝：${result.rejection}`);
      return;
    }
    commit(result.state);
    if (result.event) onEventRef.current(result.event);
    if (parsedType === "session-stopped" || parsedType === "device-disconnected") {
      onSessionInvalidatedRef.current(parsedType);
      setNotice(parsedType === "device-disconnected"
        ? "Android MIDI 设备已移除；旧输入已清除，请重新查找并连接。"
        : "Android MIDI 已断开；不会自动重连，屏幕钢琴仍可使用。");
    }
  }, [commit]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") {
      commit(reduceAndroidMidiBridge(stateRef.current, { type: "mark-unavailable" }));
      return undefined;
    }
    let handle: PluginListenerHandle | null = null;
    let disposed = false;
    void UsbMidi.addListener("bridgeEvent", applyPayload).then((nextHandle) => {
      if (disposed) void nextHandle.remove();
      else handle = nextHandle;
    }).catch(() => setNotice("无法监听 Android 原生 MIDI 事件；屏幕钢琴仍可使用。"));
    const lifecycle = (event: Event) => {
      const lifecycleState = (event as CustomEvent<{ state?: string }>).detail?.state;
      if (lifecycleState === "pause") {
        commit(reduceAndroidMidiBridge(stateRef.current, { type: "suspend" }));
        onSessionInvalidatedRef.current("pause");
      }
    };
    window.addEventListener("solfeggio:native-lifecycle", lifecycle);
    return () => {
      disposed = true;
      window.removeEventListener("solfeggio:native-lifecycle", lifecycle);
      void handle?.remove();
      if (stateRef.current.activeSession || stateRef.current.status === "starting") {
        void UsbMidi.disconnect().catch(() => undefined);
      }
    };
  }, [applyPayload, commit]);

  const discover = useCallback(async (transport: "usb" | "ble") => {
    if (Capacitor.getPlatform() !== "android") return;
    const generation = stateRef.current.generation + 1;
    const next = reduceAndroidMidiBridge(stateRef.current, { type: "request-devices", generation });
    if (next === stateRef.current) return;
    commit(next);
    const label = transport === "ble" ? "BLE" : "USB";
    setNotice(`正在读取 Android 已识别的 ${label} MIDI 设备；不会扫描、配对或自动连接。`);
    try {
      const payload = transport === "ble"
        ? await UsbMidi.listBleDevices({ generation })
        : await UsbMidi.listUsbDevices({ generation });
      applyPayload(payload);
      setNotice("请选择设备和设备输出端口（应用接收），再手动连接。");
    } catch (error) {
      commit({ ...stateRef.current, status: "error", error: "list-failed" });
      setNotice(error instanceof Error ? error.message : "无法读取 Android MIDI 设备；屏幕钢琴仍可使用。");
    }
  }, [applyPayload, commit]);

  const selectDevice = useCallback((nativeDeviceId: string) => {
    commit(reduceAndroidMidiBridge(stateRef.current, { type: "select-device", nativeDeviceId }));
  }, [commit]);

  const selectOutputPort = useCallback((outputPort: number) => {
    commit(reduceAndroidMidiBridge(stateRef.current, { type: "select-output-port", outputPort }));
  }, [commit]);

  const connect = useCallback(async () => {
    const current = stateRef.current;
    if (!current.selectedDeviceId || current.selectedOutputPort === null) return;
    const selectedDevice = current.devices.find((device) => device.nativeDeviceId === current.selectedDeviceId);
    if (!selectedDevice || (selectedDevice.transport !== "usb" && selectedDevice.transport !== "ble")) return;
    const transport = selectedDevice.transport;
    const label = transport === "ble" ? "BLE" : "USB";
    const commandId = `${transport}-midi-connect-${++commandSequenceRef.current}`;
    const next = reduceAndroidMidiBridge(current, { type: "request-start", commandId });
    if (next === current) return;
    commit(next);
    setNotice(`正在打开所选 ${label} MIDI 设备输出端口…`);
    try {
      await UsbMidi.connect({
        deviceId: Number(current.selectedDeviceId),
        outputPort: current.selectedOutputPort,
        generation: next.generation,
        commandId,
        transport,
      }).then(applyPayload);
      setNotice(`Android 已验证 ${label} MIDI 连接；连接不会自动开始练习。`);
    } catch (error) {
      commit({ ...createAndroidMidiBridgeState(), status: "error", generation: next.generation, error: "open-failed" });
      setNotice(error instanceof Error ? error.message : "Android MIDI 设备打开失败；屏幕钢琴仍可使用。");
    }
  }, [applyPayload, commit]);

  const disconnect = useCallback(async () => {
    if (stateRef.current.status === "starting") {
      commit(reduceAndroidMidiBridge(stateRef.current, { type: "suspend" }));
      onSessionInvalidatedRef.current("cancel-start");
      try {
        await UsbMidi.disconnect();
        setNotice("Android MIDI 连接已取消；不会自动重连，屏幕钢琴仍可使用。");
      } catch {
        setNotice("Android MIDI 连接取消确认失败；请重新进入页面后再连接。");
      }
      return;
    }
    const commandId = `usb-midi-stop-${++commandSequenceRef.current}`;
    const next = reduceAndroidMidiBridge(stateRef.current, { type: "request-stop", commandId });
    if (next === stateRef.current) return;
    commit(next);
    onSessionInvalidatedRef.current("user-disconnect");
    try {
      await UsbMidi.disconnect();
    } catch {
      commit({
        ...stateRef.current,
        status: "error",
        pendingCommandId: null,
        closingDeviceSessionId: null,
        switchTargetDeviceId: null,
        error: "close-failed",
      });
      setNotice("Android MIDI 关闭确认失败；原生生命周期仍会释放端口，请重新进入页面后再连接。");
    }
  }, [commit]);

  const bindAttempt = useCallback((attemptId: string, eventOriginId: string) => {
    commit(reduceAndroidMidiBridge(stateRef.current, { type: "bind-attempt", attemptId, eventOriginId }));
  }, [commit]);

  const unbindAttempt = useCallback(() => {
    commit(reduceAndroidMidiBridge(stateRef.current, { type: "unbind-attempt" }));
  }, [commit]);

  return {
    state,
    notice,
    discover,
    selectDevice,
    selectOutputPort,
    connect,
    disconnect,
    bindAttempt,
    unbindAttempt,
  };
}
