import assert from "node:assert/strict";

import {
  createLocalEarTrainingQuestion,
  getIntervalTargetFrequencyHz,
  getLocalEarTrainingQuestionVariantCount,
} from "../lib/practice/localEarTrainingIntervals";
import {
  createLocalEarTrainingMelodyQuestion,
  earTrainingMelodyNotes,
  getLocalEarTrainingMelodyVariantCount,
} from "../lib/practice/localEarTrainingMelodyDictation";
import {
  createLocalEarTrainingRhythmQuestion,
  getLocalEarTrainingRhythmVariantCount,
} from "../lib/practice/localEarTrainingRhythm";
import {
  createLocalEarTrainingSinglePitchQuestion,
  getLocalEarTrainingSinglePitchVariantCount,
} from "../lib/practice/localEarTrainingSinglePitch";
import {
  createLocalEarTrainingChordQuestion,
  getLocalEarTrainingChordVariantCount,
} from "../lib/practice/localEarTrainingChords";
import {
  createLocalHarmonyProgressionQuestion,
  getLocalHarmonyProgressionVariantCount,
} from "../lib/practice/localEarTrainingHarmonyProgressions";
import {
  createLocalScaleModeQuestion,
  getLocalScaleModeVariantCount,
} from "../lib/practice/localEarTrainingScaleModes";
import { createLocalSeventhChordQuestion, getLocalSeventhChordVariantCount } from "../lib/practice/localEarTrainingSeventhChords";
import {
  createLocalSeventhChordSpacingQuestion,
  getLocalSeventhChordSpacingVariantCount,
} from "../lib/practice/localEarTrainingSeventhChordSpacing";
import {
  createLocalModulationQuestion,
  getLocalModulationVariantCount,
} from "../lib/practice/localEarTrainingModulations";
import type { LocalPracticeDifficulty, LocalPracticeKind } from "../lib/practice/localPracticeCatalog";
import { createLocalQuestionSchedule, getScheduledQuestionIndex } from "../lib/practice/localQuestionScheduler";

const mode = "expanded-local-v2" as const;
const difficulties: LocalPracticeDifficulty[] = ["基础", "进阶", "挑战"];
const expectedCounts: Record<LocalPracticeKind, Record<LocalPracticeDifficulty, number>> = {
  "single-pitch": { 基础: 20, 进阶: 24, 挑战: 24 },
  interval: { 基础: 21, 进阶: 24, 挑战: 24 },
  "chord-inversion": { 基础: 8, 进阶: 48, 挑战: 72 },
  "harmony-progression": { 基础: 8, 进阶: 24, 挑战: 42 },
  "scale-mode": { 基础: 48, 进阶: 96, 挑战: 144 },
  "seventh-chord": { 基础: 48, 进阶: 96, 挑战: 192 },
  "seventh-chord-spacing": { 基础: 48, 进阶: 96, 挑战: 384 },
  modulation: { 基础: 48, 进阶: 72, 挑战: 96 },
  rhythm: { 基础: 20, 进阶: 24, 挑战: 20 },
  "melody-dictation": { 基础: 20, 进阶: 20, 挑战: 20 },
};

const getCount = (kind: LocalPracticeKind, difficulty: LocalPracticeDifficulty): number => {
  if (kind === "single-pitch") return getLocalEarTrainingSinglePitchVariantCount(difficulty, mode);
  if (kind === "interval") return getLocalEarTrainingQuestionVariantCount(difficulty, mode);
  if (kind === "chord-inversion") return getLocalEarTrainingChordVariantCount(difficulty);
  if (kind === "harmony-progression") return getLocalHarmonyProgressionVariantCount(difficulty);
  if (kind === "scale-mode") return getLocalScaleModeVariantCount(difficulty);
  if (kind === "seventh-chord") return getLocalSeventhChordVariantCount(difficulty);
  if (kind === "seventh-chord-spacing") return getLocalSeventhChordSpacingVariantCount(difficulty);
  if (kind === "modulation") return getLocalModulationVariantCount(difficulty);
  if (kind === "rhythm") return getLocalEarTrainingRhythmVariantCount(difficulty, mode);
  return getLocalEarTrainingMelodyVariantCount(difficulty, mode);
};

const getVariantId = (
  kind: LocalPracticeKind,
  difficulty: LocalPracticeDifficulty,
  questionIndex: number,
): string => {
  if (kind === "single-pitch") {
    const question = createLocalEarTrainingSinglePitchQuestion({ difficulty, sequence: questionIndex, questionIndex, catalogMode: mode });
    assert(Number.isFinite(question.pitch.frequencyHz) && question.pitch.frequencyHz > 0);
    assert(question.durationMs >= 650 && question.durationMs <= 1100);
    return question.variantId;
  }
  if (kind === "interval") {
    const question = createLocalEarTrainingQuestion({ difficulty, direction: "上行", sequence: questionIndex, questionIndex, catalogMode: mode });
    assert(question.interval.semitones >= 1 && question.interval.semitones <= 12);
    assert(Number.isFinite(getIntervalTargetFrequencyHz(question)));
    return question.variantId;
  }
  if (kind === "rhythm") {
    const question = createLocalEarTrainingRhythmQuestion({ difficulty, sequence: questionIndex, questionIndex, catalogMode: mode });
    assert(question.bpm >= 72 && question.bpm <= 120);
    assert(question.pattern.onsetBeats.every((beat) => beat >= 0 && beat < 4));
    assert.deepEqual([...question.pattern.onsetBeats].sort((a, b) => a - b), question.pattern.onsetBeats);
    assert.equal(new Set(question.pattern.onsetBeats).size, question.pattern.onsetBeats.length);
    return question.variantId;
  }
  if (kind === "chord-inversion") {
    const question = createLocalEarTrainingChordQuestion({ difficulty, sequence: questionIndex, questionIndex });
    assert.equal(question.frequenciesHz.length, 3);
    assert(question.frequenciesHz.every((frequencyHz) => Number.isFinite(frequencyHz) && frequencyHz > 0));
    return question.variantId;
  }
  if (kind === "harmony-progression") {
    const question = createLocalHarmonyProgressionQuestion({ difficulty, sequence: questionIndex, questionIndex });
    assert(question.chordFrequenciesHz.every((chord) => chord.length === 3));
    return question.variantId;
  }
  if (kind === "scale-mode") {
    const question = createLocalScaleModeQuestion({ difficulty, sequence: questionIndex, questionIndex });
    assert(question.frequenciesHz.length >= 6 && question.frequenciesHz.length <= 8);
    assert(question.frequenciesHz.every((frequencyHz) => Number.isFinite(frequencyHz) && frequencyHz > 0));
    return question.variantId;
  }
  if (kind === "seventh-chord") {
    const question = createLocalSeventhChordQuestion({ difficulty, sequence: questionIndex, questionIndex });
    assert.equal(question.frequenciesHz.length, 4);
    return question.variantId;
  }
  if (kind === "seventh-chord-spacing") {
    const question = createLocalSeventhChordSpacingQuestion({ difficulty, sequence: questionIndex, questionIndex });
    assert.equal(question.frequenciesHz.length, 4);
    assert(question.frequenciesHz.every((frequencyHz, index, frequencies) =>
      Number.isFinite(frequencyHz) && frequencyHz > 0 && (index === 0 || frequencyHz > frequencies[index - 1])));
    return question.variantId;
  }
  if (kind === "modulation") {
    const question = createLocalModulationQuestion({ difficulty, sequence: questionIndex, questionIndex });
    assert.equal(question.chordFrequenciesHz.length, 8);
    assert(question.chordFrequenciesHz.every((chord) => chord.length === 3));
    return question.variantId;
  }
  const question = createLocalEarTrainingMelodyQuestion({ difficulty, sequence: questionIndex, questionIndex, catalogMode: mode });
  assert.equal(question.melody.noteIds.length, 3);
  assert(question.melody.noteIds.every((noteId) => noteId in earTrainingMelodyNotes));
  return question.variantId;
};

for (const kind of ["single-pitch", "interval", "chord-inversion", "harmony-progression", "scale-mode", "seventh-chord", "seventh-chord-spacing", "modulation", "rhythm", "melody-dictation"] as const) {
  for (const difficulty of difficulties) {
    const count = getCount(kind, difficulty);
    assert.equal(count, expectedCounts[kind][difficulty], `${kind}/${difficulty} count drifted`);
    const variantIds = Array.from({ length: count }, (_, index) => getVariantId(kind, difficulty, index));
    assert.equal(new Set(variantIds).size, count, `${kind}/${difficulty} contains duplicate variants`);

    const schedule = createLocalQuestionSchedule(count, 0x9600 + count);
    const scheduled = Array.from({ length: count }, (_, sequence) => {
      const questionIndex = getScheduledQuestionIndex(schedule, sequence);
      assert.notEqual(questionIndex, null);
      return getVariantId(kind, difficulty, questionIndex ?? 0);
    });
    assert.equal(new Set(scheduled).size, count, `${kind}/${difficulty} schedule repeated before exhaustion`);

    const replayed = getVariantId(kind, difficulty, count - 1);
    const direct = kind === "single-pitch"
      ? createLocalEarTrainingSinglePitchQuestion({ difficulty, sequence: 0, questionIndex: 0, variantId: replayed }).variantId
      : kind === "interval"
        ? createLocalEarTrainingQuestion({ difficulty, direction: "下行", sequence: 0, questionIndex: 0, variantId: replayed }).variantId
        : kind === "chord-inversion"
          ? createLocalEarTrainingChordQuestion({ difficulty, sequence: 0, questionIndex: 0, variantId: replayed }).variantId
        : kind === "harmony-progression"
          ? createLocalHarmonyProgressionQuestion({ difficulty, sequence: 0, questionIndex: 0, variantId: replayed }).variantId
        : kind === "scale-mode"
          ? createLocalScaleModeQuestion({ difficulty, sequence: 0, questionIndex: 0, variantId: replayed }).variantId
        : kind === "seventh-chord"
          ? createLocalSeventhChordQuestion({ difficulty, sequence: 0, questionIndex: 0, variantId: replayed }).variantId
        : kind === "seventh-chord-spacing"
          ? createLocalSeventhChordSpacingQuestion({ difficulty, sequence: 0, questionIndex: 0, variantId: replayed }).variantId
        : kind === "modulation"
          ? createLocalModulationQuestion({ difficulty, sequence: 0, questionIndex: 0, variantId: replayed }).variantId
        : kind === "rhythm"
          ? createLocalEarTrainingRhythmQuestion({ difficulty, sequence: 0, questionIndex: 0, variantId: replayed }).variantId
          : createLocalEarTrainingMelodyQuestion({ difficulty, sequence: 0, questionIndex: 0, variantId: replayed }).variantId;
    assert.equal(direct, replayed, `${kind}/${difficulty} stable replay ignored variantId`);
  }
}

assert.equal(createLocalEarTrainingSinglePitchQuestion({ difficulty: "基础", sequence: 0 }).variantId, "pitch:c4");
assert.equal(createLocalEarTrainingQuestion({ difficulty: "基础", direction: "上行", sequence: 0 }).variantId, "interval:c4:major-third");
assert.equal(createLocalEarTrainingChordQuestion({ difficulty: "基础", sequence: 0 }).variantId, "chord:c4:major:root");
assert.equal(createLocalHarmonyProgressionQuestion({ difficulty: "基础", sequence: 0 }).variantId, "progression:c3:authentic-three");
assert.equal(createLocalScaleModeQuestion({ difficulty: "基础", sequence: 0 }).variantId, "scale:c4:major");
assert.equal(createLocalSeventhChordQuestion({ difficulty: "基础", sequence: 0 }).variantId, "seventh-chord:c3:major-seventh:root");
assert.equal(createLocalSeventhChordSpacingQuestion({ difficulty: "基础", sequence: 0 }).variantId, "seventh-chord-spacing:c3:major-seventh:root:close");
assert.equal(createLocalModulationQuestion({ difficulty: "基础", sequence: 0 }).variantId, "modulation:c3:stay-tonic:diatonic-predominant");
assert.equal(createLocalEarTrainingRhythmQuestion({ difficulty: "基础", sequence: 0 }).variantId, "rhythm:even-quarters");
assert.equal(createLocalEarTrainingMelodyQuestion({ difficulty: "基础", sequence: 0 }).variantId, "melody:up-step");

console.log("Expanded local practice catalog tests passed.");
