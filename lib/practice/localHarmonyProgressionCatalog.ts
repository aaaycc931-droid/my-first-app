import type { LocalPracticeDifficulty } from "./localPracticeCatalog";

const keyIds: Record<LocalPracticeDifficulty, readonly string[]> = {
  基础: ["c3", "d3", "eb3", "f3"],
  进阶: ["c3", "d3", "eb3", "f3", "g3", "a3"],
  挑战: ["c3", "d3", "eb3", "f3", "g3", "a3"],
};

const patternIds: Record<LocalPracticeDifficulty, readonly string[]> = {
  基础: ["authentic-three", "plagal-three"],
  进阶: ["cadence-four", "pop-axis", "turnaround", "two-five-one"],
  挑战: ["cadence-four", "pop-axis", "turnaround", "two-five-one", "deceptive", "minor-authentic", "minor-six-four-five"],
};

export const isLocalHarmonyProgressionVariantId = (
  difficulty: LocalPracticeDifficulty,
  variantId: string,
) => {
  const [prefix, keyId, patternId, extra] = variantId.split(":");
  return extra === undefined
    && prefix === "progression"
    && keyIds[difficulty].includes(keyId)
    && patternIds[difficulty].includes(patternId);
};
