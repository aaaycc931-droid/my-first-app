import {
  createLocalEarTrainingChordQuestion,
  getLocalEarTrainingChordVariantCount,
  type ChordPlaybackMode,
} from "./localEarTrainingChords";
import {
  createLocalHarmonyProgressionQuestion,
  getLocalHarmonyProgressionVariantCount,
} from "./localEarTrainingHarmonyProgressions";
import {
  createLocalEarTrainingQuestion,
  getLocalEarTrainingQuestionVariantCount,
  type EarTrainingDirection,
} from "./localEarTrainingIntervals";
import {
  createLocalEarTrainingMelodyQuestion,
  getLocalEarTrainingMelodyVariantCount,
} from "./localEarTrainingMelodyDictation";
import {
  createLocalModulationQuestion,
  getLocalModulationVariantCount,
} from "./localEarTrainingModulations";
import {
  createLocalEarTrainingRhythmQuestion,
  getLocalEarTrainingRhythmVariantCount,
} from "./localEarTrainingRhythm";
import {
  createLocalScaleModeQuestion,
  getLocalScaleModeVariantCount,
} from "./localEarTrainingScaleModes";
import {
  createLocalSeventhChordSpacingQuestion,
  getLocalSeventhChordSpacingVariantCount,
} from "./localEarTrainingSeventhChordSpacing";
import {
  createLocalSeventhChordQuestion,
  getLocalSeventhChordVariantCount,
} from "./localEarTrainingSeventhChords";
import {
  createLocalEarTrainingSinglePitchQuestion,
  getLocalEarTrainingSinglePitchVariantCount,
} from "./localEarTrainingSinglePitch";
import type { LocalPracticeDifficulty, LocalPracticeKind } from "./localPracticeCatalog";

export const LOCAL_PRACTICE_CUSTOMIZER_SCHEMA_VERSION = 1 as const;

const catalogMode = "expanded-local-v2" as const;
const difficulties: readonly LocalPracticeDifficulty[] = ["基础", "进阶", "挑战"];
const kinds: readonly LocalPracticeKind[] = [
  "single-pitch",
  "interval",
  "chord-inversion",
  "harmony-progression",
  "scale-mode",
  "seventh-chord",
  "seventh-chord-spacing",
  "modulation",
  "rhythm",
  "melody-dictation",
];

type CommonCustomization = {
  schemaVersion: typeof LOCAL_PRACTICE_CUSTOMIZER_SCHEMA_VERSION;
  difficulty: LocalPracticeDifficulty;
  answerOptionIds: string[];
};

export type LocalPracticeCustomization =
  | (CommonCustomization & {
      kind: "interval";
      intervalDirection: EarTrainingDirection;
    })
  | (CommonCustomization & {
      kind: "chord-inversion";
      chordPlaybackMode: ChordPlaybackMode;
    })
  | (CommonCustomization & {
      kind: Exclude<LocalPracticeKind, "interval" | "chord-inversion">;
    });

export type LocalPracticeCustomizerSubsetOption = {
  id: string;
  label: string;
  variantCount: number;
};

export type LocalPracticeCustomizerVariant = {
  variantId: string;
  answerOptionId: string;
  answerLabel: string;
};

export type ResolvedLocalPracticeCustomization = {
  customization: LocalPracticeCustomization;
  variantIds: string[];
  answerOptionIds: string[];
  subsetOptions: LocalPracticeCustomizerSubsetOption[];
  variantCount: number;
};

const hasExactKeys = (value: Record<string, unknown>, expected: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isDifficulty = (value: unknown): value is LocalPracticeDifficulty =>
  difficulties.includes(value as LocalPracticeDifficulty);

const isKind = (value: unknown): value is LocalPracticeKind =>
  kinds.includes(value as LocalPracticeKind);

const buildVariants = (
  kind: LocalPracticeKind,
  difficulty: LocalPracticeDifficulty,
): LocalPracticeCustomizerVariant[] => {
  if (kind === "single-pitch") {
    return Array.from(
      { length: getLocalEarTrainingSinglePitchVariantCount(difficulty, catalogMode) },
      (_, questionIndex) => {
        const question = createLocalEarTrainingSinglePitchQuestion({
          difficulty,
          sequence: questionIndex,
          questionIndex,
          catalogMode,
        });
        return {
          variantId: question.variantId,
          answerOptionId: question.pitch.id,
          answerLabel: question.pitch.label,
        };
      },
    );
  }
  if (kind === "interval") {
    return Array.from(
      { length: getLocalEarTrainingQuestionVariantCount(difficulty, catalogMode) },
      (_, questionIndex) => {
        const question = createLocalEarTrainingQuestion({
          difficulty,
          direction: "上行",
          sequence: questionIndex,
          questionIndex,
          catalogMode,
        });
        return {
          variantId: question.variantId,
          answerOptionId: question.interval.id,
          answerLabel: question.interval.label,
        };
      },
    );
  }
  if (kind === "chord-inversion") {
    return Array.from({ length: getLocalEarTrainingChordVariantCount(difficulty) }, (_, questionIndex) => {
      const question = createLocalEarTrainingChordQuestion({ difficulty, sequence: questionIndex, questionIndex });
      return {
        variantId: question.variantId,
        answerOptionId: question.answerOptionId,
        answerLabel: `${question.quality.label} · ${question.inversionLabel}`,
      };
    });
  }
  if (kind === "harmony-progression") {
    return Array.from({ length: getLocalHarmonyProgressionVariantCount(difficulty) }, (_, questionIndex) => {
      const question = createLocalHarmonyProgressionQuestion({ difficulty, sequence: questionIndex, questionIndex });
      return {
        variantId: question.variantId,
        answerOptionId: question.answerOptionId,
        answerLabel: question.pattern.label,
      };
    });
  }
  if (kind === "scale-mode") {
    return Array.from({ length: getLocalScaleModeVariantCount(difficulty) }, (_, questionIndex) => {
      const question = createLocalScaleModeQuestion({ difficulty, sequence: questionIndex, questionIndex });
      return {
        variantId: question.variantId,
        answerOptionId: question.answerOptionId,
        answerLabel: question.scaleMode.label,
      };
    });
  }
  if (kind === "seventh-chord") {
    return Array.from({ length: getLocalSeventhChordVariantCount(difficulty) }, (_, questionIndex) => {
      const question = createLocalSeventhChordQuestion({ difficulty, sequence: questionIndex, questionIndex });
      return {
        variantId: question.variantId,
        answerOptionId: question.answerOptionId,
        answerLabel: `${question.quality.label} · ${question.inversionLabel}`,
      };
    });
  }
  if (kind === "seventh-chord-spacing") {
    return Array.from({ length: getLocalSeventhChordSpacingVariantCount(difficulty) }, (_, questionIndex) => {
      const question = createLocalSeventhChordSpacingQuestion({ difficulty, sequence: questionIndex, questionIndex });
      return {
        variantId: question.variantId,
        answerOptionId: question.answerOptionId,
        answerLabel: question.spacingLabel,
      };
    });
  }
  if (kind === "modulation") {
    return Array.from({ length: getLocalModulationVariantCount(difficulty) }, (_, questionIndex) => {
      const question = createLocalModulationQuestion({ difficulty, sequence: questionIndex, questionIndex });
      return {
        variantId: question.variantId,
        answerOptionId: question.answerOptionId,
        answerLabel: question.destination.label,
      };
    });
  }
  if (kind === "rhythm") {
    return Array.from(
      { length: getLocalEarTrainingRhythmVariantCount(difficulty, catalogMode) },
      (_, questionIndex) => {
        const question = createLocalEarTrainingRhythmQuestion({
          difficulty,
          sequence: questionIndex,
          questionIndex,
          catalogMode,
        });
        return {
          variantId: question.variantId,
          answerOptionId: question.pattern.id,
          answerLabel: question.pattern.label,
        };
      },
    );
  }
  return Array.from(
    { length: getLocalEarTrainingMelodyVariantCount(difficulty, catalogMode) },
    (_, questionIndex) => {
      const question = createLocalEarTrainingMelodyQuestion({
        difficulty,
        sequence: questionIndex,
        questionIndex,
        catalogMode,
      });
      return {
        variantId: question.variantId,
        answerOptionId: question.melody.id,
        answerLabel: question.melody.label,
      };
    },
  );
};

const variantCache = new Map<string, readonly LocalPracticeCustomizerVariant[]>();

const enumerateVariants = (
  kind: LocalPracticeKind,
  difficulty: LocalPracticeDifficulty,
): readonly LocalPracticeCustomizerVariant[] => {
  const cacheKey = `${kind}:${difficulty}`;
  const cached = variantCache.get(cacheKey);
  if (cached) return cached;
  const variants = buildVariants(kind, difficulty);
  variantCache.set(cacheKey, variants);
  return variants;
};

export const getLocalPracticeCustomizerSubsetOptions = (
  kind: LocalPracticeKind,
  difficulty: LocalPracticeDifficulty,
): LocalPracticeCustomizerSubsetOption[] => {
  const grouped = new Map<string, LocalPracticeCustomizerSubsetOption>();
  for (const variant of enumerateVariants(kind, difficulty)) {
    const existing = grouped.get(variant.answerOptionId);
    if (existing) {
      existing.variantCount += 1;
    } else {
      grouped.set(variant.answerOptionId, {
        id: variant.answerOptionId,
        label: variant.answerLabel,
        variantCount: 1,
      });
    }
  }
  return Array.from(grouped.values());
};

export const parseLocalPracticeCustomization = (value: unknown): LocalPracticeCustomization | null => {
  if (!isRecord(value) || value.schemaVersion !== LOCAL_PRACTICE_CUSTOMIZER_SCHEMA_VERSION
    || !isKind(value.kind) || !isDifficulty(value.difficulty)) return null;

  const expectedKeys = value.kind === "interval"
    ? ["schemaVersion", "kind", "difficulty", "answerOptionIds", "intervalDirection"]
    : value.kind === "chord-inversion"
      ? ["schemaVersion", "kind", "difficulty", "answerOptionIds", "chordPlaybackMode"]
      : ["schemaVersion", "kind", "difficulty", "answerOptionIds"];
  if (!hasExactKeys(value, expectedKeys)) return null;
  if (!Array.isArray(value.answerOptionIds)
    || value.answerOptionIds.length < 2
    || !value.answerOptionIds.every((id): id is string => typeof id === "string" && id.length > 0)
    || new Set(value.answerOptionIds).size !== value.answerOptionIds.length) return null;

  const availableIds = new Set(
    getLocalPracticeCustomizerSubsetOptions(value.kind, value.difficulty).map((option) => option.id),
  );
  if (!value.answerOptionIds.every((id) => availableIds.has(id))) return null;

  const base = {
    schemaVersion: LOCAL_PRACTICE_CUSTOMIZER_SCHEMA_VERSION,
    difficulty: value.difficulty,
    answerOptionIds: [...value.answerOptionIds],
  };
  if (value.kind === "interval") {
    if (value.intervalDirection !== "上行" && value.intervalDirection !== "下行") return null;
    return { ...base, kind: value.kind, intervalDirection: value.intervalDirection };
  }
  if (value.kind === "chord-inversion") {
    if (value.chordPlaybackMode !== "和声" && value.chordPlaybackMode !== "分解") return null;
    return { ...base, kind: value.kind, chordPlaybackMode: value.chordPlaybackMode };
  }
  return { ...base, kind: value.kind };
};

export const resolveLocalPracticeCustomization = (
  value: unknown,
): ResolvedLocalPracticeCustomization | null => {
  const parsed = parseLocalPracticeCustomization(value);
  if (!parsed) return null;
  const selectedIds = new Set(parsed.answerOptionIds);
  const allSubsetOptions = getLocalPracticeCustomizerSubsetOptions(parsed.kind, parsed.difficulty);
  const subsetOptions = allSubsetOptions.filter((option) => selectedIds.has(option.id));
  const answerOptionIds = subsetOptions.map((option) => option.id);
  const variantIds = enumerateVariants(parsed.kind, parsed.difficulty)
    .filter((variant) => selectedIds.has(variant.answerOptionId))
    .map((variant) => variant.variantId);
  if (answerOptionIds.length < 2 || variantIds.length === 0) return null;
  return {
    customization: { ...parsed, answerOptionIds },
    variantIds,
    answerOptionIds,
    subsetOptions,
    variantCount: variantIds.length,
  };
};

export const resolveLocalPracticeCustomizerVariant = (
  kind: LocalPracticeKind,
  difficulty: LocalPracticeDifficulty,
  variantId: string,
): LocalPracticeCustomizerVariant | null =>
  enumerateVariants(kind, difficulty).find((variant) => variant.variantId === variantId) ?? null;
