import type { ActivityAnswer, ActivityInputMode } from "./activityAnswer";

export const ACTIVITY_FAMILIES = [
  "pitch-relation", "interval", "chord", "harmony-progression", "scale-mode",
  "rhythm-sight-reading", "rhythm-imitation", "rhythm-error-finding", "rhythm-dictation",
  "melody-dictation", "melody-imitation", "melody-sight-singing", "vocal-training", "custom-practice",
] as const;

export type ActivityFamily = (typeof ACTIVITY_FAMILIES)[number];
export type ActivityDifficulty = "foundation" | "intermediate" | "challenge";

type ActivityTargetBaseV1 = {
  targetId: string;
  label: string;
};

export type ActivityAnswerKeyTargetV1 = ActivityTargetBaseV1 & {
  checkPolicy?: { kind: "answer-key" };
  expectedAnswer: ActivityAnswer;
  answerPolicy?: { choiceOrder: "ordered" | "unordered" };
};

export type ActivityAnalysisEvidenceTargetV1 = ActivityTargetBaseV1 & {
  checkPolicy: {
    kind: "analysis-evidence";
    evidenceSchemaVersion: "analysis-evidence-v1";
    requiredTargetIds: string[];
  };
  expectedAnswer?: never;
  answerPolicy?: never;
};

export type ActivityTargetV1 = ActivityAnswerKeyTargetV1 | ActivityAnalysisEvidenceTargetV1;

export type ActivityDefinitionV1<
  TTarget extends ActivityTargetV1 = ActivityAnswerKeyTargetV1,
> = {
  schemaVersion: "activity-definition-v1";
  activityId: string;
  activityVersion: string;
  contentVersion: string;
  family: ActivityFamily;
  title: string;
  instructions: string;
  skillTags: string[];
  difficulty: ActivityDifficulty;
  assessmentMode: "non-scoring";
  source: { kind: "built-in" | "generated" | "imported" | "user-authored"; reviewState: "draft" | "checked" | "confirmed" };
  allowedInputModes: ActivityInputMode[];
  target: TTarget;
  explanation: string;
  music?: {
    key?: string;
    meter?: string;
    clef?: string;
    range?: { lowestNoteId: string; highestNoteId: string };
    tempoBpm?: number;
    referenceTimbre?: string;
  };
};

export type AnyActivityDefinitionV1 = ActivityDefinitionV1<ActivityTargetV1>;

export const isAnalysisEvidenceActivityTarget = (
  target: ActivityTargetV1,
): target is ActivityAnalysisEvidenceTargetV1 => target.checkPolicy?.kind === "analysis-evidence";

export const validateActivityDefinition = (definition: AnyActivityDefinitionV1) => {
  if (definition.schemaVersion !== "activity-definition-v1") throw new Error("不支持的活动协议版本。 ");
  if (!ACTIVITY_FAMILIES.includes(definition.family)) throw new Error("未知活动族。 ");
  if (!definition.activityId || !definition.target.targetId || definition.allowedInputModes.length === 0) {
    throw new Error("活动定义缺少稳定标识或输入方式。 ");
  }
  if (isAnalysisEvidenceActivityTarget(definition.target)) {
    const requiredTargetIds = definition.target.checkPolicy.requiredTargetIds;
    if (
      definition.target.checkPolicy.evidenceSchemaVersion !== "analysis-evidence-v1"
      || requiredTargetIds.length === 0
      || requiredTargetIds.some((targetId) => targetId.length === 0)
      || new Set(requiredTargetIds).size !== requiredTargetIds.length
    ) {
      throw new Error("证据检查目标缺少有效且唯一的证据目标标识。 ");
    }
    if (!definition.allowedInputModes.includes("microphone")) {
      throw new Error("证据检查活动必须允许麦克风输入。 ");
    }
  } else if (!definition.allowedInputModes.includes(definition.target.expectedAnswer.mode)) {
    throw new Error("标准答案的输入方式不在活动允许范围内。 ");
  }
  if (definition.source.kind !== "built-in" && definition.source.reviewState === "confirmed") {
    // Imported/generated content may become confirmed only after the product's explicit review flow.
    return definition;
  }
  return definition;
};

export const canEnterActivityPractice = (definition: AnyActivityDefinitionV1) =>
  definition.source.kind === "built-in" || definition.source.reviewState === "confirmed";
