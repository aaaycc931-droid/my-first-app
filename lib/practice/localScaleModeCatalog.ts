import type { LocalPracticeDifficulty } from "./localPracticeCatalog";

const tonicIds = ["c4", "db4", "d4", "eb4", "e4", "f4", "gb4", "g4", "ab4", "a4", "bb4", "b4"] as const;

const modeIds: Record<LocalPracticeDifficulty, readonly string[]> = {
  基础: ["major", "natural-minor", "major-pentatonic", "minor-pentatonic"],
  进阶: [
    "major", "natural-minor", "major-pentatonic", "minor-pentatonic",
    "harmonic-minor", "melodic-minor-ascending", "dorian", "mixolydian",
  ],
  挑战: [
    "major", "natural-minor", "major-pentatonic", "minor-pentatonic",
    "harmonic-minor", "melodic-minor-ascending", "dorian", "mixolydian",
    "phrygian", "lydian", "locrian", "whole-tone",
  ],
};

export const isLocalScaleModeVariantId = (
  difficulty: LocalPracticeDifficulty,
  variantId: string,
) => {
  const [prefix, tonicId, modeId, extra] = variantId.split(":");
  return extra === undefined
    && prefix === "scale"
    && tonicIds.includes(tonicId as (typeof tonicIds)[number])
    && modeIds[difficulty].includes(modeId);
};
