import assert from "node:assert/strict";

import {
  adaptPianoNoteSequenceToActivityEvidence,
  createPianoLearningActivityDefinition,
} from "../lib/activity/pianoLearningActivityAdapter";
import { createConfirmedOriginalPianoPracticeTarget } from "../lib/activity/pianoLearningPracticeTargetAdapter";
import { validatePracticeTargetV1 } from "../lib/activity/practiceTarget";
import { P110_ORIGINAL_PIANO_EXERCISE } from "../lib/piano/pianoLearningScore";

const practiceTarget = createConfirmedOriginalPianoPracticeTarget(P110_ORIGINAL_PIANO_EXERCISE);
assert.equal(practiceTarget.schemaVersion, "practice-target-v1");
assert.equal(practiceTarget.targetId, "piano-learning:p110-original-step-and-leap");
assert.equal(
  practiceTarget.targetVersion,
  "piano-learning-score-v1.p110-original-step-and-leap.C4-D4-E4-G4-E4-D4-C4-C4",
);
assert.deepEqual(practiceTarget.source, {
  kind: "built-in",
  sourceId: "p110-original-step-and-leap",
  sourceVersion: "piano-learning-score-v1",
});
assert.equal(practiceTarget.reviewState, "confirmed");
assert.equal(practiceTarget.assessmentMode, "non-scoring");
assert.deepEqual(practiceTarget.content, {
  kind: "ordered-note-sequence",
  noteIds: ["C4", "D4", "E4", "G4", "E4", "D4", "C4", "C4"],
});
assert.deepEqual(practiceTarget.comparisonPolicy, {
  kind: "exact-note-identity",
  order: "ordered",
  preserveRepeatedNotes: true,
  compareTiming: false,
  compareVelocity: false,
});
assert.deepEqual(practiceTarget.inputRequirement, {
  kind: "note-sequence",
  allowedInputModes: ["piano"],
  expectedNoteCount: 8,
  requireCompleteSequence: true,
  stopAtExpectedLength: true,
});
assert.deepEqual(
  createConfirmedOriginalPianoPracticeTarget(P110_ORIGINAL_PIANO_EXERCISE),
  practiceTarget,
  "同一确认谱面必须生成稳定 PracticeTarget",
);

const definition = createPianoLearningActivityDefinition(P110_ORIGINAL_PIANO_EXERCISE);
assert.equal(definition.activityId, "local.piano-learning.p110-original-step-and-leap");
assert.equal(definition.family, "melody-imitation");
assert.deepEqual(definition.allowedInputModes, ["piano"]);
assert.equal(definition.contentVersion, practiceTarget.targetVersion);
assert.equal(definition.target.targetId, practiceTarget.targetId);
assert.equal(definition.target.label, practiceTarget.label);
assert.equal(definition.target.expectedAnswer.mode, "piano");
if (definition.target.expectedAnswer.mode !== "piano") throw new Error("钢琴活动答案模式异常");
assert.deepEqual(
  definition.target.expectedAnswer.noteIds,
  ["C4", "D4", "E4", "G4", "E4", "D4", "C4", "C4"],
  "必须使用稳定科学音高名并保留重复音顺序",
);
assert.equal(
  createPianoLearningActivityDefinition(P110_ORIGINAL_PIANO_EXERCISE).activityId,
  definition.activityId,
  "活动身份不得依赖当前时间",
);

assert.throws(
  () => createPianoLearningActivityDefinition({
    ...P110_ORIGINAL_PIANO_EXERCISE,
    id: "local-import",
    source: "local-musicxml",
  }),
  /只接受项目原创/,
  "首切片不得把导入 MusicXML 草稿纳入活动",
);
assert.throws(
  () => createPianoLearningActivityDefinition({
    ...P110_ORIGINAL_PIANO_EXERCISE,
    reviewState: "needs-review",
  }),
  /只接受项目原创/,
);
assert.throws(
  () => validatePracticeTargetV1({
    ...practiceTarget,
    inputRequirement: {
      ...practiceTarget.inputRequirement,
      expectedNoteCount: practiceTarget.inputRequirement.expectedNoteCount - 1,
    },
  }),
  /输入要求无效/,
  "输入数量必须和目标音符数量一致",
);
assert.throws(
  () => validatePracticeTargetV1({
    ...practiceTarget,
    assessmentMode: "scoring" as never,
  }),
  /只允许非评分/,
);
assert.throws(
  () => validatePracticeTargetV1({ ...practiceTarget, reviewState: "published" } as never),
  /来源或检查状态无效/,
);
assert.throws(
  () => validatePracticeTargetV1({
    ...practiceTarget,
    inputRequirement: {
      ...practiceTarget.inputRequirement,
      allowedInputModes: ["brain-wave"],
    },
  } as never),
  /输入要求无效/,
);

assert.equal(adaptPianoNoteSequenceToActivityEvidence({
  expectedNoteIds: definition.target.expectedAnswer.noteIds,
  actualNoteIds: [],
}).state, "insufficient");
assert.equal(adaptPianoNoteSequenceToActivityEvidence({
  expectedNoteIds: definition.target.expectedAnswer.noteIds,
  actualNoteIds: ["C4", "D4", "E4", "G4", "E4", "D4", "C4", "C4"],
}).state, "consistent");
assert.equal(adaptPianoNoteSequenceToActivityEvidence({
  expectedNoteIds: definition.target.expectedAnswer.noteIds,
  actualNoteIds: ["C4", "D4", "E4", "G4", "D4", "E4", "C4", "C4"],
}).state, "different", "顺序交换必须保留为差异");
assert.equal(adaptPianoNoteSequenceToActivityEvidence({
  expectedNoteIds: definition.target.expectedAnswer.noteIds,
  actualNoteIds: ["C4", "D4", "E4", "G4", "E4", "D4", "C4"],
}).state, "different", "遗漏重复音必须保留为差异");

console.log("piano learning activity adapter tests passed");
