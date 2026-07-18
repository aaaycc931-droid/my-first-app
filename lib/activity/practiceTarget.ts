import {
  ACTIVITY_INPUT_MODES,
  type ActivityInputMode,
} from "./activityAnswer";

export const PRACTICE_TARGET_SCHEMA_VERSION = "practice-target-v1" as const;

export type PracticeTargetSourceV1 = {
  kind: "built-in" | "generated" | "imported" | "user-authored";
  sourceId: string;
  sourceVersion: string;
};

export type OrderedNoteSequencePracticeTargetContentV1 = {
  kind: "ordered-note-sequence";
  noteIds: string[];
};

export type OrderedNoteSequenceComparisonPolicyV1 = {
  kind: "exact-note-identity";
  order: "ordered";
  preserveRepeatedNotes: true;
  compareTiming: false;
  compareVelocity: false;
};

export type NoteSequenceInputRequirementV1 = {
  kind: "note-sequence";
  allowedInputModes: ActivityInputMode[];
  expectedNoteCount: number;
  requireCompleteSequence: true;
  stopAtExpectedLength: true;
};

export type PracticeTargetV1 = {
  schemaVersion: typeof PRACTICE_TARGET_SCHEMA_VERSION;
  targetId: string;
  targetVersion: string;
  label: string;
  source: PracticeTargetSourceV1;
  reviewState: "draft" | "checked" | "confirmed";
  assessmentMode: "non-scoring";
  content: OrderedNoteSequencePracticeTargetContentV1;
  comparisonPolicy: OrderedNoteSequenceComparisonPolicyV1;
  inputRequirement: NoteSequenceInputRequirementV1;
};

export const validatePracticeTargetV1 = (target: PracticeTargetV1): PracticeTargetV1 => {
  if (target.schemaVersion !== PRACTICE_TARGET_SCHEMA_VERSION) {
    throw new Error("不支持的练习目标协议版本。");
  }
  if (
    !target.targetId.trim()
    || !target.targetVersion.trim()
    || !target.label.trim()
    || !target.source.sourceId.trim()
    || !target.source.sourceVersion.trim()
  ) {
    throw new Error("练习目标缺少稳定身份、版本或来源。");
  }
  if (
    !["built-in", "generated", "imported", "user-authored"].includes(target.source.kind)
    || !["draft", "checked", "confirmed"].includes(target.reviewState)
  ) {
    throw new Error("练习目标的来源或检查状态无效。");
  }
  if (
    target.content.kind !== "ordered-note-sequence"
    || target.content.noteIds.length === 0
    || target.content.noteIds.some((noteId) => !noteId.trim() || noteId !== noteId.trim())
  ) {
    throw new Error("有序音符练习目标必须包含非空音符序列。");
  }
  if (
    target.comparisonPolicy.kind !== "exact-note-identity"
    || target.comparisonPolicy.order !== "ordered"
    || target.comparisonPolicy.preserveRepeatedNotes !== true
    || target.comparisonPolicy.compareTiming !== false
    || target.comparisonPolicy.compareVelocity !== false
  ) {
    throw new Error("有序音符练习目标的比较策略无效。");
  }
  if (
    target.inputRequirement.kind !== "note-sequence"
    || target.inputRequirement.allowedInputModes.length === 0
    || new Set(target.inputRequirement.allowedInputModes).size !== target.inputRequirement.allowedInputModes.length
    || target.inputRequirement.allowedInputModes.some((mode) => !ACTIVITY_INPUT_MODES.includes(mode))
    || !Number.isInteger(target.inputRequirement.expectedNoteCount)
    || target.inputRequirement.expectedNoteCount <= 0
    || target.inputRequirement.expectedNoteCount !== target.content.noteIds.length
    || target.inputRequirement.requireCompleteSequence !== true
    || target.inputRequirement.stopAtExpectedLength !== true
  ) {
    throw new Error("有序音符练习目标的输入要求无效。");
  }
  if (target.assessmentMode !== "non-scoring") {
    throw new Error("当前练习目标只允许非评分模式。");
  }
  return target;
};
