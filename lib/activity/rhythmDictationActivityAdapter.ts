import type { ActivityDefinitionV1 } from "./activityDefinition";
import type { ActivityAnswer } from "./activityAnswer";
import type { ActivityCheckEvidence } from "./activitySession";
import type { RhythmDictationScoreDocumentV1 } from "../music/scoreDocument";
import type { LocalEarTrainingRhythmQuestion } from "../practice/localEarTrainingRhythm";
import {
  compareRhythmDictationOnsets,
  getRhythmDictationDocumentId,
  getRhythmDictationInputGrid,
} from "../practice/localRhythmDictation";
import { getLocalRhythmSightReadingOnsetLabel } from "../practice/localRhythmSightReading";

const difficulty = {
  基础: "foundation",
  进阶: "intermediate",
  挑战: "challenge",
} as const;

export const createRhythmDictationActivityDefinition = (
  question: LocalEarTrainingRhythmQuestion,
): ActivityDefinitionV1 => ({
  schemaVersion: "activity-definition-v1",
  activityId: `local.rhythm-dictation.${question.variantId}`,
  activityVersion: "1",
  contentVersion: "local-rhythm-dictation-v1",
  family: "rhythm-dictation",
  title: "节奏听写",
  instructions: "完整听题后编辑四拍谱面草稿；预览、检查并确认文档修订后，才能对照题目事件。",
  skillTags: ["节奏听写", "谱面草稿", "4/4", question.difficulty],
  difficulty: difficulty[question.difficulty],
  assessmentMode: "non-scoring",
  source: { kind: "built-in", reviewState: "confirmed" },
  allowedInputModes: ["staff-notation"],
  target: {
    targetId: `rhythm-dictation:${question.variantId}`,
    label: `隐藏四拍节奏 · ${question.bpm} BPM`,
    expectedAnswer: {
      mode: "staff-notation",
      documentId: getRhythmDictationDocumentId({
        question,
        onsetBeats: question.pattern.onsetBeats,
      }),
      revision: 1,
    },
  },
  explanation: "只对照已确认草稿与版本化题目的击拍事件；不产生总分、准确率、等级或通过／失败。",
  music: {
    meter: "4/4",
    tempoBpm: question.bpm,
    referenceTimbre: "web-audio-click-compatibility",
  },
});

const formatLocations = (values: readonly number[]) =>
  values.map(getLocalRhythmSightReadingOnsetLabel).join("、");

export const checkRhythmDictationScoreDocument = ({
  question,
  document,
  answer,
}: {
  question: LocalEarTrainingRhythmQuestion;
  document: RhythmDictationScoreDocumentV1 | null;
  answer: ActivityAnswer | undefined;
}): ActivityCheckEvidence => {
  if (!document || document.reviewState !== "confirmed") {
    return {
      state: "insufficient",
      assessmentMode: "non-scoring",
      explanation: "尚未提交经过预览、检查和确认的节奏谱面文档。",
    };
  }
  const draftOnsetBeats = document.parts[0].staves[0].voices[0].measures[0].events
    .map((event) => event.onsetBeat);
  const allowedOnsets = getRhythmDictationInputGrid(question.difficulty);
  const documentIdentityIsValid = document.source.questionId === question.id
    && document.source.questionVariantId === question.variantId
    && document.documentId === getRhythmDictationDocumentId({
      question,
      onsetBeats: draftOnsetBeats,
    })
    && draftOnsetBeats.length > 0
    && new Set(draftOnsetBeats).size === draftOnsetBeats.length
    && draftOnsetBeats.every((onset) =>
      allowedOnsets.some((allowed) => Math.abs(onset - allowed) < 0.001)
    );
  if (!documentIdentityIsValid) {
    return {
      state: "insufficient",
      assessmentMode: "non-scoring",
      explanation: "当前谱面文档与本题身份、修订内容或输入网格不一致，已拒绝检查。",
    };
  }
  if (
    !answer
    || answer.mode !== "staff-notation"
    || answer.documentId !== document.documentId
    || answer.revision !== document.revision
  ) {
    return {
      state: "insufficient",
      assessmentMode: "non-scoring",
      explanation: "提交的活动答案没有引用当前已确认的节奏谱面文档与修订。",
    };
  }
  const comparison = compareRhythmDictationOnsets({
    targetOnsetBeats: question.pattern.onsetBeats,
    draftOnsetBeats,
  });
  if (comparison.state === "consistent") {
    return {
      state: "consistent",
      assessmentMode: "non-scoring",
      explanation: "已确认草稿的击拍事件与本题版本化目标一致；这是事件对照，不是正式评分。",
    };
  }
  const details = [
    comparison.missedOnsetBeats.length > 0
      ? `目标中有而草稿未标记：${formatLocations(comparison.missedOnsetBeats)}`
      : null,
    comparison.extraOnsetBeats.length > 0
      ? `草稿额外标记：${formatLocations(comparison.extraOnsetBeats)}`
      : null,
  ].filter((item): item is string => Boolean(item));
  return {
    state: "different",
    assessmentMode: "non-scoring",
    explanation: `${details.join("；")}。这里只解释题目事件差异，不推断演奏或听辨能力。`,
  };
};
