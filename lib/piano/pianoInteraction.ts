import { midiToFrequencyHz, noteNameToMidi } from "../audio/noteFrequency";
import type { LocalPianoKey } from "./localPianoKeyboard";

export const PIANO_KEY_WIDTHS = [38, 46, 54, 64] as const;
export type PianoKeyWidth = (typeof PIANO_KEY_WIDTHS)[number];
export type PianoViewMode = "compact" | "full";
export type PianoRowMode = "single" | "double";
export type PianoLabelMode = "scientific" | "fixed-solfege" | "hidden";

const pitchNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const fixedSolfege = ["do", "do♯", "re", "re♯", "mi", "fa", "fa♯", "sol", "sol♯", "la", "la♯", "si"] as const;

export const midiToScientificNoteName = (midi: number): string =>
  `${pitchNames[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

export const getPianoKeyVisibleLabel = (
  key: LocalPianoKey,
  mode: PianoLabelMode,
): string => {
  if (mode === "hidden") return "";
  if (mode === "fixed-solfege") return fixedSolfege[((key.midi % 12) + 12) % 12];
  return key.soundingNoteName ?? key.noteName;
};

export const transposePianoKeys = (
  keys: readonly LocalPianoKey[],
  semitones: number,
): LocalPianoKey[] => {
  const safeSemitones = Math.max(-12, Math.min(12, Math.round(semitones)));
  if (safeSemitones === 0) return keys.map((key) => ({ ...key }));
  return keys.map((key) => {
    const midi = key.midi + safeSemitones;
    const soundingNoteName = midiToScientificNoteName(midi);
    return {
      ...key,
      midi,
      frequencyHz: midiToFrequencyHz(midi),
      soundingNoteName,
      accessibleLabel: `${key.accessibleLabel}，移调后发出 ${soundingNoteName}`,
    };
  });
};

export const splitFullPianoRows = (
  keys: readonly LocalPianoKey[],
  rowMode: PianoRowMode,
): readonly LocalPianoKey[][] => rowMode === "single"
  ? [[...keys]]
  : [
      keys.filter((key) => (noteNameToMidi(key.noteName) ?? key.midi) < 60),
      keys.filter((key) => (noteNameToMidi(key.noteName) ?? key.midi) >= 60),
    ];

export const getPianoStressTestKeyIds = (keys: readonly LocalPianoKey[]): string[] => {
  const center = keys.filter((key) => key.midi >= 36 && key.midi <= 84);
  return center.slice(0, 32).map((key) => key.id);
};
