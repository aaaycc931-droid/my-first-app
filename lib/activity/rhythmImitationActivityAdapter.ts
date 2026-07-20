import type { ActivityDefinitionV1 } from "./activityDefinition";
import type { ActivityCheckEvidence } from "./activitySession";
import type { LocalEarTrainingRhythmQuestion } from "../practice/localEarTrainingRhythm";
import type { RhythmTapFeedbackSummary } from "../rhythm/rhythmTapFeedback";

const difficulty = {
  基础: "foundation",
  进阶: "intermediate",
  挑战: "challenge",
} as const;

export const createRhythmImitationActivityDefinition = (
  question: LocalEarTrainingRhythmQuestion,
): ActivityDefinitionV1 => ({
  schemaVersion: "activity-definition-v1",
  activityId: `local.rhythm-imitation.${question.variantId}`,
  activityVersion: "1",
  contentVersion: "local-rhythm-imitation-v1",
  family: "rhythm-imitation",
  title: "节奏回模",
  instructions: "先完整听本地节奏，播放结束后跟随预备拍从记忆点击。",
  skillTags: ["节奏回模", "听觉记忆", "拍击", "4/4", question.difficulty],
  difficulty: difficulty[question.difficulty],
  assessmentMode: "non-scoring",
  source: { kind: "built-in", reviewState: "confirmed" },
  allowedInputModes: ["tap"],
  target: {
    targetId: `rhythm-imitation:${question.variantId}`,
    label: `${question.pattern.label} · ${question.bpm} BPM`,
    expectedAnswer: {
      mode: "tap",
      onsetMs: question.pattern.onsetBeats.map((beat) => Math.round(beat * 60_000 / question.bpm)),
    },
  },
  explanation: "反馈只比较本轮触控时间与版本化目标，不推断演奏能力。",
  music: { meter: "4/4", tempoBpm: question.bpm, referenceTimbre: "web-audio-click-compatibility" },
});

export const adaptRhythmImitationFeedbackToEvidence = (
  summary: RhythmTapFeedbackSummary,
): ActivityCheckEvidence => {
  if (
    summary.targetCount === 0
    || summary.tapCount === 0
    || summary.status === "not-started"
    || summary.status === "waiting-for-taps"
  ) {
    return {
      state: "insufficient",
      assessmentMode: "non-scoring",
      explanation: "本轮没有足够的触控点击，保持证据不足。",
    };
  }
  const allClose = summary.matchedTapCount === summary.targetCount
    && summary.tapCount === summary.targetCount
    && summary.feedback.length === summary.targetCount
    && summary.feedback.every((item) => item.category === "close");
  return {
    state: allClose ? "consistent" : "different",
    assessmentMode: "non-scoring",
    explanation: allClose
      ? "本轮点击均在当前目标的接近范围内；这只是非评分回模反馈。"
      : "本轮出现偏早、偏晚、漏掉或额外点击；可重听后再试。",
  };
};
