package com.aaaycc931.solfeggio.midi;

public final class NormalizedMidiMessage {
  public enum Type {
    NOTE_ON,
    NOTE_OFF,
    SUSTAIN
  }

  public final Type type;
  public final int channel;
  public final int note;
  public final double velocity;
  public final boolean down;
  public final double value;

  private NormalizedMidiMessage(
      Type type,
      int channel,
      int note,
      double velocity,
      boolean down,
      double value) {
    this.type = type;
    this.channel = channel;
    this.note = note;
    this.velocity = velocity;
    this.down = down;
    this.value = value;
  }

  public static NormalizedMidiMessage noteOn(int channel, int note, int velocity) {
    if (velocity == 0) return noteOff(channel, note);
    return new NormalizedMidiMessage(
        Type.NOTE_ON,
        clamp(channel, 0, 15),
        clamp(note, 0, 127),
        clamp(velocity, 0, 127) / 127.0,
        false,
        0);
  }

  public static NormalizedMidiMessage noteOff(int channel, int note) {
    return new NormalizedMidiMessage(
        Type.NOTE_OFF,
        clamp(channel, 0, 15),
        clamp(note, 0, 127),
        0,
        false,
        0);
  }

  public static NormalizedMidiMessage sustain(int channel, int rawValue) {
    int value = clamp(rawValue, 0, 127);
    return new NormalizedMidiMessage(
        Type.SUSTAIN,
        clamp(channel, 0, 15),
        0,
        0,
        value >= 64,
        value / 127.0);
  }

  private static int clamp(int value, int minimum, int maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }
}
