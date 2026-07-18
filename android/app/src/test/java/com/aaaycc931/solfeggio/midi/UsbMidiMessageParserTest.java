package com.aaaycc931.solfeggio.midi;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

public class UsbMidiMessageParserTest {
  @Test
  public void parsesNotesRunningStatusZeroVelocityAndSustain() {
    List<NormalizedMidiMessage> messages = new ArrayList<>();
    UsbMidiMessageParser parser = new UsbMidiMessageParser(messages::add);

    parser.accept(new byte[] {(byte) 0x92, 60}, 0, 2);
    parser.accept(new byte[] {127, 62, 64, 64, 0}, 0, 5);
    parser.accept(new byte[] {(byte) 0xb2, 64, 63, 64, 64}, 0, 5);

    assertEquals(5, messages.size());
    assertEquals(NormalizedMidiMessage.Type.NOTE_ON, messages.get(0).type);
    assertEquals(2, messages.get(0).channel);
    assertEquals(60, messages.get(0).note);
    assertEquals(1.0, messages.get(0).velocity, 0.0001);
    assertEquals(62, messages.get(1).note);
    assertEquals(64 / 127.0, messages.get(1).velocity, 0.0001);
    assertEquals(NormalizedMidiMessage.Type.NOTE_OFF, messages.get(2).type);
    assertFalse(messages.get(3).down);
    assertTrue(messages.get(4).down);
  }

  @Test
  public void respectsOffsetCountChannelBoundsAndRealtimeInterleaving() {
    List<NormalizedMidiMessage> messages = new ArrayList<>();
    UsbMidiMessageParser parser = new UsbMidiMessageParser(messages::add);
    byte[] packet = new byte[] {
        99,
        (byte) 0x90, 0, 1,
        (byte) 0xf8,
        (byte) 0x9f, 127, 127,
        (byte) 0x9f, 64, 0,
        88
    };
    parser.accept(packet, 1, packet.length - 2);
    parser.accept(packet, -1, 2);
    parser.accept(packet, 0, packet.length + 1);

    assertEquals(3, messages.size());
    assertEquals(0, messages.get(0).channel);
    assertEquals(0, messages.get(0).note);
    assertEquals(15, messages.get(1).channel);
    assertEquals(127, messages.get(1).note);
    assertEquals(NormalizedMidiMessage.Type.NOTE_OFF, messages.get(2).type);
    assertEquals(64, messages.get(2).note);

    NormalizedMidiMessage clamped = NormalizedMidiMessage.noteOn(20, 200, 200);
    assertEquals(15, clamped.channel);
    assertEquals(127, clamped.note);
    assertEquals(1, clamped.velocity, 0.0001);
  }

  @Test
  public void ignoresUnsupportedSystemAndSysexWithoutInventingNotes() {
    List<NormalizedMidiMessage> messages = new ArrayList<>();
    UsbMidiMessageParser parser = new UsbMidiMessageParser(messages::add);
    parser.accept(new byte[] {
        (byte) 0xf0, 0x01, 0x02, (byte) 0xf7,
        (byte) 0xf8,
        (byte) 0xe0, 0x00, 0x40,
        (byte) 0x90, 69, 100,
        (byte) 0xfe,
        69, 0
    }, 0, 14);

    assertEquals(2, messages.size());
    assertEquals(NormalizedMidiMessage.Type.NOTE_ON, messages.get(0).type);
    assertEquals(NormalizedMidiMessage.Type.NOTE_OFF, messages.get(1).type);
  }
}
