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
import type { LocalPracticeDifficulty, LocalPracticeKind } from "../lib/practice/localPracticeCatalog";
import { createLocalQuestionSchedule, getScheduledQuestionIndex } from "../lib/practice/localQuestionScheduler";

const mode = "expanded-local-v2" as const;
const difficulties: LocalPracticeDifficulty[] = ["基础", "进阶", "挑战"];
const expectedCounts: Record<LocalPracticeKind, Record<LocalPracticeDifficulty, number>> = {
  "single-pitch": { 基础: 20, 进阶: 24, 挑战: 24 },
  interval: { 基础: 21, 进阶: 24, 挑战: 24 },
  rhythm: { 基础: 20, 进阶: 24, 挑战: 20 },
  "melody-dictation": { 基础: 20, 进阶: 20, 挑战: 20 },
};

const getCount = (kind: LocalPracticeKind, difficulty: LocalPracticeDifficulty): number => {
  if (kind === "single-pitch") return getLocalEarTrainingSinglePitchVariantCount(difficulty, mode);
  if (kind === "interval") return getLocalEarTrainingQuestionVariantCount(difficulty, mode);
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
  const question = createLocalEarTrainingMelodyQuestion({ difficulty, sequence: questionIndex, questionIndex, catalogMode: mode });
  assert.equal(question.melody.noteIds.length, 3);
  assert(question.melody.noteIds.every((noteId) => noteId in earTrainingMelodyNotes));
  return question.variantId;
};

for (const kind of ["single-pitch", "interval", "rhythm", "melody-dictation"] as const) {
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
        : kind === "rhythm"
          ? createLocalEarTrainingRhythmQuestion({ difficulty, sequence: 0, questionIndex: 0, variantId: replayed }).variantId
          : createLocalEarTrainingMelodyQuestion({ difficulty, sequence: 0, questionIndex: 0, variantId: replayed }).variantId;
    assert.equal(direct, replayed, `${kind}/${difficulty} stable replay ignored variantId`);
  }
}

assert.equal(createLocalEarTrainingSinglePitchQuestion({ difficulty: "基础", sequence: 0 }).variantId, "pitch:c4");
assert.equal(createLocalEarTrainingQuestion({ difficulty: "基础", direction: "上行", sequence: 0 }).variantId, "interval:c4:major-third");
assert.equal(createLocalEarTrainingRhythmQuestion({ difficulty: "基础", sequence: 0 }).variantId, "rhythm:even-quarters");
assert.equal(createLocalEarTrainingMelodyQuestion({ difficulty: "基础", sequence: 0 }).variantId, "melody:up-step");

console.log("Expanded local practice catalog tests passed.");
