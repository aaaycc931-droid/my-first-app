import type { ActivityDefinitionV1 } from "./activityDefinition";
import type { ActivityCheckEvidence } from "./activitySession";
import type { LocalEarTrainingRhythmQuestion } from "../practice/localEarTrainingRhythm";
import type { RhythmTapFeedbackSummary } from "../rhythm/rhythmTapFeedback";

const difficulty = {
  基础: "foundation",
  进阶: "intermediate",
  挑战: "challenge",
} as const;

export const createRhythmSightReadingActivityDefinition = (
  question: LocalEarTrainingRhythmQuestion,
): ActivityDefinitionV1 => {
  const beatDurationMs = 60_000 / question.bpm;
  return {
    schemaVersion: "activity-definition-v1",
    activityId: `local.rhythm-sight-reading.${question.variantId}`,
    activityVersion: "1",
    contentVersion: "local-rhythm-sight-reading-v1",
    family: "rhythm-sight-reading",
    title: "节奏视读",
    instructions: "先看四四拍节奏目标，听完预备拍后按可见起点点击。",
    skillTags: ["节奏视读", "拍击", "4/4", question.difficulty],
    difficulty: difficulty[question.difficulty],
    assessmentMode: "non-scoring",
    source: { kind: "built-in", reviewState: "confirmed" },
    allowedInputModes: ["tap"],
    target: {
      targetId: `rhythm-sight-reading:${question.variantId}`,
      label: `${question.pattern.label} · ${question.bpm} BPM`,
      expectedAnswer: {
        mode: "tap",
        onsetMs: question.pattern.onsetBeats.map((beat) => Math.round(beat * beatDurationMs)),
      },
    },
    explanation: "反馈只说明本轮点击与可见目标的相对时序关系，不是正式节奏评分。",
    music: { meter: "4/4", tempoBpm: question.bpm, referenceTimbre: "web-audio-click-compatibility" },
  };
};

export const adaptRhythmSightReadingFeedbackToEvidence = (
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
      explanation: "本轮没有足够的触控点击，保持证据不足，不推断节奏表现。",
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
      ? "本轮点击均在当前目标的接近范围内；这只是非评分练习反馈。"
      : "本轮出现偏早、偏晚、漏掉或额外点击；请按逐拍明细复练。",
  };
};
