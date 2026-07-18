import type { ActivityAnswer, ActivityInputMode } from "./activityAnswer";

export const ACTIVITY_FAMILIES = [
  "pitch-relation", "interval", "chord", "harmony-progression", "scale-mode",
  "rhythm-sight-reading", "rhythm-imitation", "rhythm-error-finding", "rhythm-dictation",
  "melody-dictation", "melody-imitation", "melody-sight-singing", "vocal-training", "custom-practice",
] as const;

export type ActivityFamily = (typeof ACTIVITY_FAMILIES)[number];
export type ActivityDifficulty = "foundation" | "intermediate" | "challenge";

export type ActivityDefinitionV1 = {
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
  target: { targetId: string; label: string; expectedAnswer: ActivityAnswer };
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

export const validateActivityDefinition = (definition: ActivityDefinitionV1) => {
  if (definition.schemaVersion !== "activity-definition-v1") throw new Error("不支持的活动协议版本。 ");
  if (!ACTIVITY_FAMILIES.includes(definition.family)) throw new Error("未知活动族。 ");
  if (!definition.activityId || !definition.target.targetId || definition.allowedInputModes.length === 0) {
    throw new Error("活动定义缺少稳定标识或输入方式。 ");
  }
  if (!definition.allowedInputModes.includes(definition.target.expectedAnswer.mode)) {
    throw new Error("标准答案的输入方式不在活动允许范围内。 ");
  }
  if (definition.source.kind !== "built-in" && definition.source.reviewState === "confirmed") {
    // Imported/generated content may become confirmed only after the product's explicit review flow.
    return definition;
  }
  return definition;
};

export const canEnterActivityPractice = (definition: ActivityDefinitionV1) =>
  definition.source.kind === "built-in" || definition.source.reviewState === "confirmed";
