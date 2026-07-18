import type { ActivityDefinitionV1 } from "./activityDefinition";
import type { ActivityCheckEvidence } from "./activitySession";
import type { PianoLearningScore } from "../piano/pianoLearningScore";
import { createConfirmedOriginalPianoPracticeTarget } from "./pianoLearningPracticeTargetAdapter";

export const createPianoLearningActivityDefinition = (
  score: PianoLearningScore,
): ActivityDefinitionV1 => {
  const practiceTarget = createConfirmedOriginalPianoPracticeTarget(score);
  const expectedNoteIds = [...practiceTarget.content.noteIds];
  return {
    schemaVersion: "activity-definition-v1",
    activityId: `local.piano-learning.${score.id}`,
    activityVersion: "1",
    contentVersion: practiceTarget.targetVersion,
    family: "melody-imitation",
    title: "屏幕钢琴跟弹",
    instructions: "按谱面顺序在屏幕钢琴上弹奏音符，然后检查本轮输入。",
    skillTags: ["钢琴", "跟弹", "音符顺序", "屏幕输入"],
    difficulty: "foundation",
    assessmentMode: practiceTarget.assessmentMode,
    source: { kind: practiceTarget.source.kind, reviewState: practiceTarget.reviewState },
    allowedInputModes: [...practiceTarget.inputRequirement.allowedInputModes],
    target: {
      targetId: practiceTarget.targetId,
      label: practiceTarget.label,
      expectedAnswer: { mode: "piano", noteIds: expectedNoteIds },
    },
    explanation: "反馈只比较本轮屏幕琴键与项目原创谱面的音符顺序，不判断力度、时值或演奏水平。",
    music: {
      range: {
        lowestNoteId: score.notes.reduce((lowest, note) => note.midi < lowest.midi ? note : lowest).pitch,
        highestNoteId: score.notes.reduce((highest, note) => note.midi > highest.midi ? note : highest).pitch,
      },
      referenceTimbre: "local-piano-provider",
    },
  };
};

export const adaptPianoNoteSequenceToActivityEvidence = ({
  expectedNoteIds,
  actualNoteIds,
}: {
  expectedNoteIds: readonly string[];
  actualNoteIds: readonly string[];
}): ActivityCheckEvidence => {
  if (actualNoteIds.length === 0) {
    return {
      state: "insufficient",
      assessmentMode: "non-scoring",
      explanation: "本轮还没有屏幕琴键输入，无法比较音符顺序。",
    };
  }

  const consistent = expectedNoteIds.length === actualNoteIds.length
    && expectedNoteIds.every((noteId, index) => actualNoteIds[index] === noteId);
  return {
    state: consistent ? "consistent" : "different",
    assessmentMode: "non-scoring",
    explanation: consistent
      ? "本轮屏幕琴键的音符与重复音顺序均和当前原创谱面一致；这不是正式评分。"
      : "本轮屏幕琴键与当前原创谱面的音符数量或顺序存在差异，请查看目标后重新尝试。",
  };
};
