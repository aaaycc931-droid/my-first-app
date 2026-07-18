import type { ActivityDefinitionV1, ActivityDifficulty } from "./activityDefinition";
import type { LocalEarTrainingSinglePitchQuestion, EarTrainingSinglePitchDifficulty } from "../practice/localEarTrainingSinglePitch";

const DIFFICULTY: Record<EarTrainingSinglePitchDifficulty, ActivityDifficulty> = {
  基础: "foundation", 进阶: "intermediate", 挑战: "challenge",
};

export const adaptSinglePitchQuestionToActivity = (
  question: LocalEarTrainingSinglePitchQuestion,
): ActivityDefinitionV1 => ({
  schemaVersion: "activity-definition-v1",
  activityId: `local.single-pitch.${question.variantId}`,
  activityVersion: "1",
  contentVersion: "local-ear-training-v2",
  family: "pitch-relation",
  title: "单音听辨",
  instructions: "听参考单音后选择音名。",
  skillTags: ["单音", "音名", "听辨"],
  difficulty: DIFFICULTY[question.difficulty],
  assessmentMode: "non-scoring",
  source: { kind: "built-in", reviewState: "confirmed" },
  allowedInputModes: ["choice"],
  target: {
    targetId: `pitch:${question.pitch.id}`,
    label: question.pitch.label,
    expectedAnswer: { mode: "choice", optionIds: [question.pitch.id] },
  },
  explanation: `本题参考音是 ${question.pitch.label}。`,
  music: { range: { lowestNoteId: question.pitch.id, highestNoteId: question.pitch.id }, referenceTimbre: "web-audio-sine-compatibility" },
});
