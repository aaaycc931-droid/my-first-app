package com.aaaycc931.solfeggio.midi;

public final class UsbMidiMessageParser {
  public interface Listener {
    void onMessage(NormalizedMidiMessage message);
  }

  private final Listener listener;
  private int runningStatus = 0;
  private int expectedDataBytes = 0;
  private int collectedDataBytes = 0;
  private final int[] data = new int[2];
  private boolean insideSystemExclusive = false;

  public UsbMidiMessageParser(Listener listener) {
    this.listener = listener;
  }

  public void reset() {
    runningStatus = 0;
    expectedDataBytes = 0;
    collectedDataBytes = 0;
    insideSystemExclusive = false;
  }

  public void accept(byte[] bytes, int offset, int count) {
    if (bytes == null || offset < 0 || count < 0 || offset + count > bytes.length) return;
    for (int index = offset; index < offset + count; index += 1) acceptByte(bytes[index] & 0xff);
  }

  private void acceptByte(int value) {
    if (value >= 0xf8) return; // Realtime messages may be interleaved without changing running status.
    if (value == 0xf0) {
      insideSystemExclusive = true;
      runningStatus = 0;
      expectedDataBytes = 0;
      collectedDataBytes = 0;
      return;
    }
    if (insideSystemExclusive) {
      if (value == 0xf7) insideSystemExclusive = false;
      return;
    }
    if ((value & 0x80) != 0) {
      if (value >= 0xf0) {
        runningStatus = 0;
        expectedDataBytes = 0;
        collectedDataBytes = 0;
        return;
      }
      runningStatus = value;
      int command = value & 0xf0;
      expectedDataBytes = command == 0xc0 || command == 0xd0 ? 1 : 2;
      collectedDataBytes = 0;
      return;
    }
    if (runningStatus == 0 || expectedDataBytes == 0) return;
    data[collectedDataBytes] = value & 0x7f;
    collectedDataBytes += 1;
    if (collectedDataBytes < expectedDataBytes) return;
    dispatchRunningMessage();
    collectedDataBytes = 0;
  }

  private void dispatchRunningMessage() {
    int command = runningStatus & 0xf0;
    int channel = runningStatus & 0x0f;
    if (command == 0x90) {
      listener.onMessage(NormalizedMidiMessage.noteOn(channel, data[0], data[1]));
    } else if (command == 0x80) {
      listener.onMessage(NormalizedMidiMessage.noteOff(channel, data[0]));
    } else if (command == 0xb0 && data[0] == 64) {
      listener.onMessage(NormalizedMidiMessage.sustain(channel, data[1]));
    }
  }
}
