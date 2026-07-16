const naturalPitchClasses: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export const noteNameToMidi = (noteName: string): number | null => {
  const match = /^([A-Ga-g])([#b♯♭]?)(-?\d+)$/.exec(noteName.trim());
  if (!match) return null;
  const [, letterValue, accidental, octaveValue] = match;
  const letter = letterValue.toUpperCase();
  const accidentalOffset = accidental === "#" || accidental === "♯" ? 1 : accidental === "b" || accidental === "♭" ? -1 : 0;
  const midi = (Number(octaveValue) + 1) * 12 + naturalPitchClasses[letter] + accidentalOffset;
  return Number.isInteger(midi) && midi >= 0 && midi <= 127 ? midi : null;
};

export const midiToFrequencyHz = (midi: number) =>
  440 * 2 ** ((midi - 69) / 12);

export const noteNameToFrequencyHz = (noteName: string): number | null => {
  const midi = noteNameToMidi(noteName);
  return midi === null ? null : midiToFrequencyHz(midi);
};
