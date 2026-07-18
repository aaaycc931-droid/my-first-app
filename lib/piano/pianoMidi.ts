export const PIANO_MIDI_INPUT_VERSION = "piano-midi-input-v1" as const;

export type PianoMidiInputEvent =
  | { type: "note-on"; note: number; velocity: number; channel: number }
  | { type: "note-off"; note: number; channel: number }
  | { type: "pedal"; down: boolean; channel: number };

export const decodePianoMidiMessage = (
  data: ArrayLike<number>,
): PianoMidiInputEvent | null => {
  if (data.length < 3) return null;
  const status = Number(data[0]);
  const value1 = Number(data[1]);
  const value2 = Number(data[2]);
  if (![status, value1, value2].every(Number.isFinite)) return null;
  const command = status & 0xf0;
  const channel = (status & 0x0f) + 1;
  const note = Math.max(0, Math.min(127, Math.round(value1)));
  const value = Math.max(0, Math.min(127, Math.round(value2)));
  if (command === 0x90 && value > 0) {
    return { type: "note-on", note, velocity: value / 127, channel };
  }
  if (command === 0x80 || (command === 0x90 && value === 0)) {
    return { type: "note-off", note, channel };
  }
  if (command === 0xb0 && note === 64) {
    return { type: "pedal", down: value >= 64, channel };
  }
  return null;
};

export const midiPointerToken = (deviceId: string, channel: number, note: number) =>
  `midi-${deviceId}-${channel}-${note}`;
