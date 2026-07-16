import assert from "node:assert/strict";

import {
  createLocalEarTrainingQuestion,
  getLocalEarTrainingQuestionVariantCount,
} from "../lib/practice/localEarTrainingIntervals";
import {
  createLocalEarTrainingMelodyQuestion,
  earTrainingMelodies,
} from "../lib/practice/localEarTrainingMelodyDictation";
import {
  createLocalEarTrainingRhythmQuestion,
  earTrainingRhythmPatterns,
} from "../lib/practice/localEarTrainingRhythm";
import {
  createLocalEarTrainingSinglePitchQuestion,
  earTrainingSinglePitches,
} from "../lib/practice/localEarTrainingSinglePitch";
import {
  getLegacyLocalPracticeVariantId,
  type LocalPracticeDifficulty,
  type LocalPracticeKind,
} from "../lib/practice/localPracticeCatalog";
import {
  createLocalQuestionSchedule,
  getScheduledQuestionIndex,
} from "../lib/practice/localQuestionScheduler";

const difficulties: LocalPracticeDifficulty[] = ["基础", "进阶"];
const seeds = [0, 1, 123, 0xffffffff];

const getItemCount = (kind: LocalPracticeKind, difficulty: LocalPracticeDifficulty): number => {
  if (kind === "single-pitch") return earTrainingSinglePitches[difficulty].length;
  if (kind === "interval") return getLocalEarTrainingQuestionVariantCount(difficulty);
  if (kind === "rhythm") return earTrainingRhythmPatterns[difficulty].length;
  return earTrainingMelodies[difficulty].length;
};

const getCurrentVariantId = (
  kind: LocalPracticeKind,
  difficulty: LocalPracticeDifficulty,
  sequence: number,
  questionIndex: number,
): string => {
  if (kind === "single-pitch") {
    return createLocalEarTrainingSinglePitchQuestion({ difficulty, sequence, questionIndex }).variantId;
  }
  if (kind === "interval") {
    return createLocalEarTrainingQuestion({
      difficulty,
      direction: "上行",
      sequence,
      questionIndex,
    }).variantId;
  }
  if (kind === "rhythm") {
    return createLocalEarTrainingRhythmQuestion({ difficulty, sequence, questionIndex }).variantId;
  }
  return createLocalEarTrainingMelodyQuestion({ difficulty, sequence, questionIndex }).variantId;
};

for (const kind of ["single-pitch", "interval", "rhythm", "melody-dictation"] as const) {
  for (const difficulty of difficulties) {
    const itemCount = getItemCount(kind, difficulty);
    for (const seed of seeds) {
      const schedule = createLocalQuestionSchedule(itemCount, seed);
      for (let sequence = 0; sequence < itemCount * 2; sequence += 1) {
        const questionIndex = getScheduledQuestionIndex(schedule, sequence);
        assert.notEqual(questionIndex, null);
        assert.equal(
          getLegacyLocalPracticeVariantId({ kind, difficulty, seed, sequence }),
          getCurrentVariantId(kind, difficulty, sequence, questionIndex ?? 0),
          `catalog v1 identity drifted for ${kind}/${difficulty}/seed ${seed}/sequence ${sequence}`,
        );
      }
    }
  }
}

console.log("Local practice catalog-v1 compatibility tests passed.");
