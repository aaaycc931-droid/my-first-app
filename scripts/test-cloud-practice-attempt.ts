import assert from "node:assert/strict";

import {
  createIntervalAttemptRpcArgs,
  createRhythmAttemptRpcArgs,
  createSinglePitchAttemptRpcArgs,
  hasFormalAssessmentFields,
  isCourseExerciseId,
} from "../lib/practice/cloudPracticeAttempt";

const exerciseId = "00000000-0000-4000-8000-000000000201";
assert.equal(isCourseExerciseId(exerciseId), true);
assert.equal(isCourseExerciseId("not-an-id"), false);
assert.equal(isCourseExerciseId(null), false);

const args = createSinglePitchAttemptRpcArgs({
  exerciseId,
  difficulty: "基础",
  sequence: 2.9,
  selectedPitchId: "d4",
  targetPitchId: "e4",
  matchesAnswer: false,
});

assert.deepEqual(args, {
  p_exercise_id: exerciseId,
  p_target_version: 1,
  p_difficulty: "基础",
  p_sequence: 2,
  p_selected_pitch_id: "d4",
  p_target_pitch_id: "e4",
  p_matches_answer: false,
});
assert.equal(hasFormalAssessmentFields(args), false);

const intervalArgs = createIntervalAttemptRpcArgs({
  exerciseId: "00000000-0000-4000-8000-000000000202",
  difficulty: "基础",
  direction: "下行",
  sequence: 3.8,
  selectedIntervalId: "perfect-fourth",
  targetIntervalId: "perfect-fifth",
  matchesAnswer: false,
});

assert.deepEqual(intervalArgs, {
  p_exercise_id: "00000000-0000-4000-8000-000000000202",
  p_target_version: 1,
  p_difficulty: "基础",
  p_direction: "下行",
  p_sequence: 3,
  p_selected_interval_id: "perfect-fourth",
  p_target_interval_id: "perfect-fifth",
  p_matches_answer: false,
});
assert.equal(hasFormalAssessmentFields(intervalArgs), false);

const rhythmArgs = createRhythmAttemptRpcArgs({
  exerciseId: "00000000-0000-4000-8000-000000000203",
  difficulty: "基础",
  sequence: 4.9,
  selectedPatternId: "front-dense",
  targetPatternId: "back-dense",
  matchesAnswer: false,
});

assert.deepEqual(rhythmArgs, {
  p_exercise_id: "00000000-0000-4000-8000-000000000203",
  p_target_version: 1,
  p_difficulty: "基础",
  p_sequence: 4,
  p_selected_pattern_id: "front-dense",
  p_target_pattern_id: "back-dense",
  p_matches_answer: false,
});
assert.equal(hasFormalAssessmentFields(rhythmArgs), false);
assert.throws(() =>
  createSinglePitchAttemptRpcArgs({
    exerciseId: "bad",
    difficulty: "基础",
    sequence: 0,
    selectedPitchId: "c4",
    targetPitchId: "c4",
    matchesAnswer: true,
  }),
);

console.log("cloud practice attempt contract tests passed");
