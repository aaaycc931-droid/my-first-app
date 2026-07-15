export type SinglePitchAttemptRpcArgs = {
  p_exercise_id: string;
  p_target_version: number;
  p_difficulty: "基础" | "进阶";
  p_sequence: number;
  p_selected_pitch_id: string;
  p_target_pitch_id: string;
  p_matches_answer: boolean;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isCourseExerciseId = (value: string | null): value is string =>
  typeof value === "string" && uuidPattern.test(value);

export const createSinglePitchAttemptRpcArgs = ({
  exerciseId,
  difficulty,
  sequence,
  selectedPitchId,
  targetPitchId,
  matchesAnswer,
}: {
  exerciseId: string;
  difficulty: "基础" | "进阶";
  sequence: number;
  selectedPitchId: string;
  targetPitchId: string;
  matchesAnswer: boolean;
}): SinglePitchAttemptRpcArgs => {
  if (!isCourseExerciseId(exerciseId)) throw new Error("Invalid course exercise id.");
  if (!selectedPitchId || !targetPitchId) throw new Error("Pitch ids are required.");

  return {
    p_exercise_id: exerciseId,
    p_target_version: 1,
    p_difficulty: difficulty,
    p_sequence: Math.max(0, Math.floor(sequence)),
    p_selected_pitch_id: selectedPitchId,
    p_target_pitch_id: targetPitchId,
    p_matches_answer: matchesAnswer,
  };
};

export const hasFormalAssessmentFields = (value: object): boolean =>
  ["score", "grade", "pass", "fail", "accuracyPercentage", "isFormal"].some(
    (field) => field in value,
  );
