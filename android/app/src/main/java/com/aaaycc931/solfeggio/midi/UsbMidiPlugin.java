package com.aaaycc931.solfeggio.midi;

import android.content.Context;
import android.media.midi.MidiDevice;
import android.media.midi.MidiDeviceInfo;
import android.media.midi.MidiManager;
import android.media.midi.MidiOutputPort;
import android.media.midi.MidiReceiver;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.SystemClock;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.UUID;

@CapacitorPlugin(name = "UsbMidi")
public final class UsbMidiPlugin extends Plugin {
  private static final String BRIDGE_PROTOCOL_VERSION = "android-midi-bridge-v1";
  private static final String BRIDGE_EVENT = "bridgeEvent";
  private MidiManager midiManager;
  private HandlerThread midiThread;
  private Handler midiHandler;
  private MidiDevice activeDevice;
  private MidiOutputPort activeOutputPort;
  private int activeDeviceId = -1;
  private int bridgeGeneration = 0;
  private long connectionEpoch = 0;
  private PluginCall pendingConnectCall;
  private String deviceSessionId;
  private String originId;
  private long sessionStartedNs;
  private long sequence = 0;
  private UsbMidiMessageParser parser;

  private final MidiManager.DeviceCallback deviceCallback = new MidiManager.DeviceCallback() {
    @Override
    public void onDeviceAdded(MidiDeviceInfo info) {
      if (info.getType() == MidiDeviceInfo.TYPE_USB) notifyDeviceListChanged();
    }

    @Override
    public void onDeviceRemoved(MidiDeviceInfo info) {
      if (info.getId() == activeDeviceId) closeActiveConnection("device-removed", true);
      if (info.getType() == MidiDeviceInfo.TYPE_USB) notifyDeviceListChanged();
    }

    @Override
    public void onDeviceStatusChanged(android.media.midi.MidiDeviceStatus status) {
      MidiDeviceInfo info = status.getDeviceInfo();
      if (info.getType() == MidiDeviceInfo.TYPE_USB) notifyDeviceListChanged();
    }
  };

  @Override
  public void load() {
    midiManager = (MidiManager) getContext().getSystemService(Context.MIDI_SERVICE);
    midiThread = new HandlerThread("solfeggio-usb-midi");
    midiThread.start();
    midiHandler = new Handler(midiThread.getLooper());
    if (midiManager != null) midiManager.registerDeviceCallback(deviceCallback, midiHandler);
  }

  @PluginMethod
  public void listUsbDevices(PluginCall call) {
    Integer requestedGeneration = call.getInt("generation");
    if (requestedGeneration == null || requestedGeneration < 0
        || activeDevice != null || pendingConnectCall != null) {
      call.reject("USB MIDI 设备刷新请求已过期或当前仍有活动连接。");
      return;
    }
    bridgeGeneration = requestedGeneration;
    call.resolve(deviceListPayload(bridgeGeneration));
  }

  @PluginMethod
  public synchronized void connect(PluginCall call) {
    if (midiManager == null) {
      call.reject("当前 Android 设备不支持系统 MIDI 服务。");
      return;
    }
    Integer requestedDeviceId = call.getInt("deviceId");
    Integer requestedOutputPort = call.getInt("outputPort");
    Integer requestedGeneration = call.getInt("generation");
    String commandId = call.getString("commandId");
    if (requestedDeviceId == null || requestedOutputPort == null || requestedGeneration == null
        || commandId == null || commandId.trim().isEmpty()) {
      call.reject("必须明确选择 USB MIDI 设备和输出端口。");
      return;
    }
    if (activeDevice != null || pendingConnectCall != null
        || requestedGeneration != bridgeGeneration + 1) {
      call.reject("USB MIDI 连接 generation 已过期，请重新刷新设备。");
      return;
    }
    MidiDeviceInfo selected = findUsbDevice(requestedDeviceId);
    if (selected == null || !hasOutputPort(selected, requestedOutputPort)) {
      call.reject("选择的 USB MIDI 设备或输出端口已不可用。");
      return;
    }

    bridgeGeneration = requestedGeneration;
    int generation = requestedGeneration;
    long epoch = ++connectionEpoch;
    pendingConnectCall = call;
    try {
      midiManager.openDevice(selected, device -> {
        synchronized (UsbMidiPlugin.this) {
        if (epoch != connectionEpoch || pendingConnectCall != call) {
          closeQuietly(device);
          return;
        }
        if (device == null) {
          pendingConnectCall = null;
          call.reject("无法打开所选 USB MIDI 设备；系统 MIDI 服务未授予可用端口。");
          return;
        }
        MidiOutputPort outputPort = device.openOutputPort(requestedOutputPort);
        if (outputPort == null) {
          closeQuietly(device);
          pendingConnectCall = null;
          call.reject("无法打开所选 USB MIDI 输出端口。");
          return;
        }
        activeDevice = device;
        activeOutputPort = outputPort;
        activeDeviceId = selected.getId();
        deviceSessionId = "android-usb-midi-" + UUID.randomUUID();
        originId = deviceSessionId + ":elapsed-realtime";
        sessionStartedNs = SystemClock.elapsedRealtimeNanos();
        sequence = 0;
        parser = new UsbMidiMessageParser(UsbMidiPlugin.this::emitMessage);
        try {
          outputPort.connect(receiver);
        } catch (RuntimeException error) {
          pendingConnectCall = null;
          closeActiveConnection("open-failed", false);
          call.reject("无法接收所选 USB MIDI 输出端口的数据。");
          return;
        }
        JSObject result = bridgeBase("session-started", generation);
        result.put("commandId", commandId.trim());
        result.put("nativeDeviceId", String.valueOf(activeDeviceId));
        result.put("outputPort", requestedOutputPort);
        result.put("deviceSessionId", deviceSessionId);
        result.put("transport", "usb");
        result.put("verification", "android-device-type");
        pendingConnectCall = null;
        call.resolve(result);
        }
      }, midiHandler);
    } catch (RuntimeException error) {
      if (pendingConnectCall == call) pendingConnectCall = null;
      call.reject("系统拒绝打开所选 USB MIDI 设备。");
    }
  }

  @PluginMethod
  public synchronized void disconnect(PluginCall call) {
    closeActiveConnection("user-disconnect", true);
    call.resolve();
  }

  private final MidiReceiver receiver = new MidiReceiver() {
    @Override
    public void onSend(byte[] data, int offset, int count, long timestamp) {
      UsbMidiMessageParser activeParser;
      synchronized (UsbMidiPlugin.this) {
        activeParser = parser;
      }
      if (activeParser != null) activeParser.accept(data, offset, count);
    }
  };

  private synchronized void emitMessage(NormalizedMidiMessage message) {
    if (deviceSessionId == null || originId == null) return;
    NativeUsbMidiNoteEvent event = NativeUsbMidiNoteEvent.fromMessage(
        deviceSessionId, originId, sequence++, elapsedSessionMs(), message);
    notifyListeners(BRIDGE_EVENT, toBridgePayload(event, bridgeGeneration));
  }

  private synchronized void closeActiveConnection(String reason, boolean emitAllNotesOff) {
    int closingGeneration = bridgeGeneration;
    boolean hadPendingConnection = pendingConnectCall != null;
    boolean hadConnection = activeDevice != null || activeOutputPort != null || deviceSessionId != null;
    if (!hadPendingConnection && !hadConnection) return;
    connectionEpoch += 1;
    if (pendingConnectCall != null) {
      pendingConnectCall.reject("USB MIDI 连接已取消：" + reason);
      pendingConnectCall = null;
    }
    if (emitAllNotesOff && deviceSessionId != null && originId != null) {
      NativeUsbMidiNoteEvent event = NativeUsbMidiNoteEvent.allNotesOff(
          deviceSessionId, originId, sequence++, elapsedSessionMs());
      JSObject payload = toBridgePayload(event, closingGeneration);
      payload.put("reason", reason);
      notifyListeners(BRIDGE_EVENT, payload);
    }
    if (activeOutputPort != null) {
      activeOutputPort.disconnect(receiver);
      closeQuietly(activeOutputPort);
    }
    closeQuietly(activeDevice);
    activeOutputPort = null;
    activeDevice = null;
    activeDeviceId = -1;
    String closedSessionId = deviceSessionId;
    deviceSessionId = null;
    originId = null;
    parser = null;
    if (hadConnection && closedSessionId != null) {
      JSObject stopped = bridgeBase("device-removed".equals(reason) ? "device-disconnected" : "session-stopped", closingGeneration);
      stopped.put("deviceSessionId", closedSessionId);
      stopped.put("reason", reason);
      notifyListeners(BRIDGE_EVENT, stopped);
    }
  }

  @Override
  protected void handleOnPause() {
    closeActiveConnection("pause", true);
    super.handleOnPause();
  }

  @Override
  protected void handleOnDestroy() {
    closeActiveConnection("destroy", true);
    if (midiManager != null) midiManager.unregisterDeviceCallback(deviceCallback);
    if (midiThread != null) midiThread.quitSafely();
    midiThread = null;
    midiHandler = null;
    super.handleOnDestroy();
  }

  private MidiDeviceInfo findUsbDevice(int deviceId) {
    for (MidiDeviceInfo info : midiManager.getDevices()) {
      if (info.getId() == deviceId && info.getType() == MidiDeviceInfo.TYPE_USB) return info;
    }
    return null;
  }

  private static boolean hasOutputPort(MidiDeviceInfo info, int portNumber) {
    for (MidiDeviceInfo.PortInfo port : info.getPorts()) {
      if (port.getType() == MidiDeviceInfo.PortInfo.TYPE_OUTPUT && port.getPortNumber() == portNumber) return true;
    }
    return false;
  }

  private JSArray usbDeviceArray() {
    JSArray devices = new JSArray();
    if (midiManager == null) return devices;
    for (MidiDeviceInfo info : midiManager.getDevices()) {
      if (info.getType() != MidiDeviceInfo.TYPE_USB) continue;
      JSObject device = new JSObject();
      device.put("nativeDeviceId", String.valueOf(info.getId()));
      device.put("transport", "usb");
      device.put("verification", "android-device-type");
      device.put("name", info.getProperties().getString(MidiDeviceInfo.PROPERTY_NAME, "USB MIDI 设备 " + info.getId()));
      device.put("manufacturer", info.getProperties().getString(MidiDeviceInfo.PROPERTY_MANUFACTURER, ""));
      JSArray outputPorts = new JSArray();
      for (MidiDeviceInfo.PortInfo port : info.getPorts()) {
        if (port.getType() == MidiDeviceInfo.PortInfo.TYPE_OUTPUT) outputPorts.put(port.getPortNumber());
      }
      if (outputPorts.length() == 0) continue;
      device.put("outputPorts", outputPorts);
      devices.put(device);
    }
    return devices;
  }

  private double elapsedSessionMs() {
    return Math.max(0, (SystemClock.elapsedRealtimeNanos() - sessionStartedNs) / 1_000_000.0);
  }

  private JSObject toBridgePayload(NativeUsbMidiNoteEvent event, int generation) {
    JSObject payload = bridgeBase(event.type, generation);
    payload.put("deviceSessionId", event.deviceSessionId);
    payload.put("sequence", event.sequence);
    payload.put("sessionPositionMs", event.positionMs);
    if (event.note != null) payload.put("note", event.note);
    if (event.velocity != null) payload.put("velocity", event.velocity);
    if (event.channel != null) payload.put("channel", event.channel);
    else if ("all-notes-off".equals(event.type)) payload.put("channel", JSObject.NULL);
    if (event.down != null) payload.put("down", event.down);
    if (event.value != null) payload.put("value", event.value);
    return payload;
  }

  private JSObject deviceListPayload(int generation) {
    JSObject payload = bridgeBase("devices", generation);
    payload.put("devices", usbDeviceArray());
    return payload;
  }

  private static JSObject bridgeBase(String type, int generation) {
    JSObject payload = new JSObject();
    payload.put("protocolVersion", BRIDGE_PROTOCOL_VERSION);
    payload.put("generation", generation);
    payload.put("type", type);
    return payload;
  }

  private void notifyDeviceListChanged() {
    notifyListeners("deviceListChanged", deviceListPayload(bridgeGeneration));
  }

  private static void closeQuietly(AutoCloseable closeable) {
    if (closeable == null) return;
    try {
      closeable.close();
    } catch (Exception ignored) {
      // The device or port may already be gone after a physical unplug.
    }
  }
}
