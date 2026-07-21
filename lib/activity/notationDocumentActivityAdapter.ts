import type { ActivityAnswer } from "./activityAnswer";
import type { ActivityDefinitionV1 } from "./activityDefinition";
import type { ActivityCheckEvidence } from "./activitySession";
import type { NotationScoreDocumentV1 } from "../music/scoreDocument";

export type NotationDocumentAnswerMode =
  | "staff-notation"
  | "numbered-notation";

export const createNotationDocumentActivityDefinition = ({
  document,
  mode,
}: {
  document: NotationScoreDocumentV1;
  mode: NotationDocumentAnswerMode;
}): ActivityDefinitionV1 => {
  if (document.reviewState !== "confirmed") {
    throw new Error("只有已确认的谱面修订才能创建乐谱答案活动。");
  }

  const answer: ActivityAnswer = {
    mode,
    documentId: document.documentId,
    revision: document.revision,
  };
  const modeLabel = mode === "staff-notation" ? "五线谱" : "简谱";

  return {
    schemaVersion: "activity-definition-v1",
    activityId: `local.notation-document.${document.source.draftFingerprint}.${mode}`,
    activityVersion: "1",
    contentVersion: `score-document.${document.documentId}.revision-${document.revision}`,
    family: "rhythm-sight-reading",
    title: `${modeLabel}谱面答案确认`,
    instructions: `检查当前已确认谱面修订的${modeLabel}预览，再主动提交该文档作为本轮答案。`,
    skillTags: [modeLabel, "乐谱", "文档修订", document.meter],
    difficulty: "foundation",
    assessmentMode: "non-scoring",
    source: { kind: "user-authored", reviewState: "confirmed" },
    allowedInputModes: [mode],
    target: {
      targetId: `notation-document:${document.documentId}:revision-${document.revision}:${mode}`,
      label: `${modeLabel} · ${document.meter} · 修订 ${document.revision}`,
      expectedAnswer: answer,
    },
    explanation:
      "检查仅确认提交的文档标识、修订号和表示方式与当前已确认谱面一致，不评价记谱质量，也不产生分数。",
    music: { meter: document.meter, clef: "treble" },
  };
};

export const checkNotationDocumentAnswer = ({
  document,
  mode,
  answer,
}: {
  document: NotationScoreDocumentV1;
  mode: NotationDocumentAnswerMode;
  answer: ActivityAnswer | undefined;
}): ActivityCheckEvidence => {
  if (
    !answer ||
    (answer.mode !== "staff-notation" && answer.mode !== "numbered-notation")
  ) {
    return {
      state: "insufficient",
      assessmentMode: "non-scoring",
      explanation: "尚未提交可检查的谱面文档答案。",
    };
  }

  const consistent =
    answer.mode === mode &&
    answer.documentId === document.documentId &&
    answer.revision === document.revision;
  return {
    state: consistent ? "consistent" : "different",
    assessmentMode: "non-scoring",
    explanation: consistent
      ? "提交内容引用当前已确认的谱面文档与修订；这是非评分一致性证据。"
      : "提交内容与当前谱面文档、修订或表示方式不同，请重置后重新检查。",
  };
};
