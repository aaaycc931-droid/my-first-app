import {
  createLocalQuestionSchedule,
  getScheduledQuestionIndex,
} from "./localQuestionScheduler";

export const LOCAL_PRACTICE_CATALOG_VERSION = 2 as const;

export type LocalPracticeKind =
  | "single-pitch"
  | "interval"
  | "rhythm"
  | "melody-dictation";

export type LocalPracticeDifficulty = "基础" | "进阶";

type LegacyCatalogTarget = {
  kind: LocalPracticeKind;
  difficulty: LocalPracticeDifficulty;
  seed: number;
  sequence: number;
};

const legacySinglePitchVariantIds = {
  基础: ["pitch:c4", "pitch:d4", "pitch:e4", "pitch:g4"],
  进阶: ["pitch:c4", "pitch:d4", "pitch:e4", "pitch:g4", "pitch:a4", "pitch:b4"],
} as const;

const legacyIntervalIds = {
  基础: ["major-third", "perfect-fourth", "perfect-fifth"],
  进阶: [
    "minor-second",
    "major-second",
    "minor-third",
    "major-third",
    "perfect-fourth",
    "perfect-fifth",
  ],
} as const;

const legacyIntervalVariantIds = (difficulty: LocalPracticeDifficulty): string[] =>
  ["c4", "d4", "e4", "g4"].flatMap((rootId) =>
    legacyIntervalIds[difficulty].map(
      (intervalId) => `interval:${rootId}:${intervalId}`,
    ),
  );

const legacyRhythmVariantIds = {
  基础: ["rhythm:even-quarters", "rhythm:front-dense", "rhythm:back-dense"],
  进阶: [
    "rhythm:even-quarters",
    "rhythm:front-dense",
    "rhythm:back-dense",
    "rhythm:middle-gap",
  ],
} as const;

const legacyMelodyVariantIds = {
  基础: ["melody:up-step", "melody:return-home", "melody:skip-and-return"],
  进阶: [
    "melody:up-step",
    "melody:return-home",
    "melody:skip-and-return",
    "melody:open-fifth",
  ],
} as const;

/**
 * Resolves the exact catalog-v1 shuffled target identity. These manifests are
 * intentionally frozen instead of reading the current catalog, so later
 * catalog expansion cannot change an existing on-device review target.
 */
export const getLegacyLocalPracticeVariantId = (
  target: LegacyCatalogTarget,
): string | null => {
  const variantIds = target.kind === "single-pitch"
    ? [...legacySinglePitchVariantIds[target.difficulty]]
    : target.kind === "interval"
      ? legacyIntervalVariantIds(target.difficulty)
      : target.kind === "rhythm"
        ? [...legacyRhythmVariantIds[target.difficulty]]
        : [...legacyMelodyVariantIds[target.difficulty]];
  const questionIndex = getScheduledQuestionIndex(
    createLocalQuestionSchedule(variantIds.length, target.seed),
    target.sequence,
  );
  return questionIndex === null ? null : variantIds[questionIndex] ?? null;
};
