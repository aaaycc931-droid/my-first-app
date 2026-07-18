package com.aaaycc931.solfeggio.midi;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public class NativeUsbMidiNoteEventTest {
  @Test
  public void createsTraceableNoteEventShape() {
    NativeUsbMidiNoteEvent event = NativeUsbMidiNoteEvent.fromMessage(
        "android-usb-midi-session-1",
        "android-usb-midi-session-1:elapsed-realtime",
        4,
        125.5,
        NormalizedMidiMessage.noteOn(15, 69, 127));

    assertEquals("android-usb-midi-session-1:4", event.eventId);
    assertEquals(4, event.sequence);
    assertEquals("note-on", event.type);
    assertEquals(Integer.valueOf(69), event.note);
    assertEquals(Double.valueOf(1), event.velocity);
    assertEquals(Integer.valueOf(15), event.channel);
    assertEquals("note-event-v1", NativeUsbMidiNoteEvent.NOTE_EVENT_SCHEMA_VERSION);
  }

  @Test
  public void createsSourceWideAllNotesOffWithoutFakeChannel() {
    NativeUsbMidiNoteEvent event = NativeUsbMidiNoteEvent.allNotesOff(
        "android-usb-midi-session-1",
        "android-usb-midi-session-1:elapsed-realtime",
        5,
        200);
    assertEquals("all-notes-off", event.type);
    assertNull(event.channel);
    assertNull(event.note);
  }
}
