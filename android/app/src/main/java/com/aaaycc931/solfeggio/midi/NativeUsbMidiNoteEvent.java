package com.aaaycc931.solfeggio.midi;

public final class NativeUsbMidiNoteEvent {
  public static final String NOTE_EVENT_SCHEMA_VERSION = "note-event-v1";
  public static final String MUSICAL_TIME_SCHEMA_VERSION = "musical-time-v1";

  public final String eventId;
  public final long sequence;
  public final double positionMs;
  public final String originId;
  public final String deviceSessionId;
  public final String type;
  public final Integer note;
  public final Double velocity;
  public final Integer channel;
  public final Boolean down;
  public final Double value;

  private NativeUsbMidiNoteEvent(
      String eventId,
      long sequence,
      double positionMs,
      String originId,
      String deviceSessionId,
      String type,
      Integer note,
      Double velocity,
      Integer channel,
      Boolean down,
      Double value) {
    this.eventId = eventId;
    this.sequence = sequence;
    this.positionMs = Math.max(0, positionMs);
    this.originId = originId;
    this.deviceSessionId = deviceSessionId;
    this.type = type;
    this.note = note;
    this.velocity = velocity;
    this.channel = channel;
    this.down = down;
    this.value = value;
  }

  public static NativeUsbMidiNoteEvent fromMessage(
      String deviceSessionId,
      String originId,
      long sequence,
      double positionMs,
      NormalizedMidiMessage message) {
    String eventId = deviceSessionId + ":" + sequence;
    if (message.type == NormalizedMidiMessage.Type.NOTE_ON) {
      return new NativeUsbMidiNoteEvent(eventId, sequence, positionMs, originId, deviceSessionId,
          "note-on", message.note, message.velocity, message.channel, null, null);
    }
    if (message.type == NormalizedMidiMessage.Type.NOTE_OFF) {
      return new NativeUsbMidiNoteEvent(eventId, sequence, positionMs, originId, deviceSessionId,
          "note-off", message.note, null, message.channel, null, null);
    }
    return new NativeUsbMidiNoteEvent(eventId, sequence, positionMs, originId, deviceSessionId,
        "sustain", null, null, message.channel, message.down, message.value);
  }

  public static NativeUsbMidiNoteEvent allNotesOff(
      String deviceSessionId,
      String originId,
      long sequence,
      double positionMs) {
    return new NativeUsbMidiNoteEvent(deviceSessionId + ":" + sequence, sequence, positionMs,
        originId, deviceSessionId, "all-notes-off", null, null, null, null, null);
  }
}
