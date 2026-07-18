import assert from "node:assert/strict";

import {
  adaptPianoNoteSequenceToActivityEvidence,
  createPianoLearningActivityDefinition,
} from "../lib/activity/pianoLearningActivityAdapter";
import { P110_ORIGINAL_PIANO_EXERCISE } from "../lib/piano/pianoLearningScore";

const definition = createPianoLearningActivityDefinition(P110_ORIGINAL_PIANO_EXERCISE);
assert.equal(definition.activityId, "local.piano-learning.p110-original-step-and-leap");
assert.equal(definition.family, "melody-imitation");
assert.deepEqual(definition.allowedInputModes, ["piano"]);
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
