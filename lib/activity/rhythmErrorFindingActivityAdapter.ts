import type { ActivityDefinitionV1 } from "./activityDefinition";
import type { LocalEarTrainingRhythmQuestion } from "../practice/localEarTrainingRhythm";
import type { LocalRhythmErrorFindingChallenge } from "../practice/localRhythmErrorFinding";

const difficulty = { 基础: "foundation", 进阶: "intermediate", 挑战: "challenge" } as const;

export const createRhythmErrorFindingActivityDefinition = (
  question: LocalEarTrainingRhythmQuestion,
  challenge: LocalRhythmErrorFindingChallenge,
): ActivityDefinitionV1 => ({
  schemaVersion: "activity-definition-v1",
  activityId: `local.rhythm-error-finding.${challenge.challengeId}`,
  activityVersion: "1",
  contentVersion: "local-rhythm-error-finding-v1",
  family: "rhythm-error-finding",
  title: "节奏找错",
  instructions: "对照可见目标听一个只含一处变化的版本，标记变化类型与位置。",
  skillTags: ["节奏找错", "事件对照", "4/4", question.difficulty],
  difficulty: difficulty[question.difficulty],
  assessmentMode: "non-scoring",
  source: { kind: "built-in", reviewState: "confirmed" },
  allowedInputModes: ["choice"],
  target: {
    targetId: challenge.challengeId,
    label: `${question.pattern.label} · 一处事件变化`,
    expectedAnswer: { mode: "choice", optionIds: [challenge.correctCandidate.id] },
    answerPolicy: { choiceOrder: "unordered" },
  },
  explanation: challenge.correctCandidate.explanation,
  music: { meter: "4/4", tempoBpm: question.bpm, referenceTimbre: "web-audio-click-compatibility" },
});
