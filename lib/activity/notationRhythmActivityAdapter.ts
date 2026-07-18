import type { ActivityDefinitionV1 } from "./activityDefinition";
import type { ActivityCheckEvidence } from "./activitySession";
import type { MetronomeConfig } from "../metronome/metronomeConfig";
import type { NotationTemporaryPracticeTarget } from "../practice/localNotationDraftPracticeTarget";
import { createNotationTemporaryRhythmTapTargets } from "../practice/notationTemporaryRhythmTap";
import type { RhythmTapFeedbackSummary } from "../rhythm/rhythmTapFeedback";

const normalizeBpm = (bpm: number) => Math.min(240, Math.max(30, Math.round(bpm)));

export const createNotationRhythmActivityDefinition = ({
  target,
  bpm,
}: {
  target: NotationTemporaryPracticeTarget;
  bpm: number;
}): ActivityDefinitionV1 => {
  if (target.status !== "active" || target.mode !== "rhythm") {
    throw new Error("只有已确认且仍有效的临时节奏目标才能创建活动。");
  }

  const safeBpm = normalizeBpm(bpm);
  const config: MetronomeConfig = {
    bpm: safeBpm,
    meter: target.timeSignature,
    countIn: { enabled: false, bars: 0 },
    subdivision: "quarter",
  };
  const relativeTargets = createNotationTemporaryRhythmTapTargets({
    draft: target,
    config,
    practiceStartTimeMs: 0,
  });
  if (relativeTargets.length === 0) {
    throw new Error("临时节奏目标没有可供拍击的音符事件。");
  }

  const identity = `${target.draftFingerprint}.${target.timeSignature}.bpm-${safeBpm}`;
  return {
    schemaVersion: "activity-definition-v1",
    activityId: `local.notation-rhythm.${identity}`,
    activityVersion: "1",
    contentVersion: `notation-draft.${target.draftFingerprint}`,
    family: "rhythm-sight-reading",
    title: "临时乐谱节奏拍击",
    instructions: "查看已确认的临时乐谱目标，按非休止音符的起点点击或按空格键。",
    skillTags: ["节奏视读", "乐谱", "拍击", target.timeSignature],
    difficulty: "foundation",
    assessmentMode: "non-scoring",
    source: { kind: "user-authored", reviewState: "confirmed" },
    allowedInputModes: ["tap"],
    target: {
      targetId: `notation-rhythm:${identity}`,
      label: `${target.timeSignature} · ${safeBpm} BPM · ${relativeTargets.length} 个拍击点`,
      expectedAnswer: {
        mode: "tap",
        onsetMs: relativeTargets.map((item) => item.targetTimeMs),
      },
    },
    explanation: "反馈仅说明点击与当前临时目标的相对时序关系，不是正式节奏评分。",
    music: {
      meter: target.timeSignature,
      tempoBpm: safeBpm,
      referenceTimbre: "web-audio-click-compatibility",
    },
  };
};

export const getRelativeNotationRhythmTapOnsetMs = ({
  timestampMs,
  practiceStartTimeMs,
}: {
  timestampMs: number;
  practiceStartTimeMs: number;
}) => Math.max(0, timestampMs - practiceStartTimeMs);

export const adaptRhythmTapFeedbackToActivityEvidence = (
  summary: RhythmTapFeedbackSummary,
): ActivityCheckEvidence => {
  const hasReliableAttempt = summary.targetCount > 0 && summary.tapCount > 0;
  if (!hasReliableAttempt || summary.status === "not-started" || summary.status === "waiting-for-taps") {
    return {
      state: "insufficient",
      assessmentMode: "non-scoring",
      explanation: "本轮没有足够的练习点击，无法可靠比较当前临时节奏目标。",
    };
  }

  const allTargetsClose =
    summary.matchedTapCount === summary.targetCount &&
    summary.tapCount === summary.targetCount &&
    summary.feedback.length === summary.targetCount &&
    summary.feedback.every((item) => item.category === "close");

  return {
    state: allTargetsClose ? "consistent" : "different",
    assessmentMode: "non-scoring",
    explanation: allTargetsClose
      ? "本轮点击均落在当前临时目标的接近范围内；这只是非评分练习证据。"
      : "本轮存在偏早、偏晚、漏掉或额外点击；请根据明细分段复练。",
  };
};
