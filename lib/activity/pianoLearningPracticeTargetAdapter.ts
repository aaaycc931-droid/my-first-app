import {
  PIANO_LEARNING_SCORE_VERSION,
  type PianoLearningScore,
} from "../piano/pianoLearningScore";
import {
  validatePracticeTargetV1,
  type PracticeTargetV1,
} from "./practiceTarget";

const validateConfirmedOriginalScore = (score: PianoLearningScore) => {
  if (
    score.version !== PIANO_LEARNING_SCORE_VERSION
    || score.source !== "project-original"
    || score.reviewState !== "confirmed"
    || score.notes.length === 0
  ) {
    throw new Error("首个钢琴活动只接受项目原创、已确认且非空的谱面。");
  }
};

export const createConfirmedOriginalPianoPracticeTarget = (
  score: PianoLearningScore,
): PracticeTargetV1 => {
  validateConfirmedOriginalScore(score);
  const noteIds = score.notes.map((note) => note.pitch);
  const targetVersion = `${score.version}.${score.id}.${noteIds.join("-")}`;
  return validatePracticeTargetV1({
    schemaVersion: "practice-target-v1",
    targetId: `piano-learning:${score.id}`,
    targetVersion,
    label: `${score.name} · ${score.notes.length} 音`,
    source: {
      kind: "built-in",
      sourceId: score.id,
      sourceVersion: score.version,
    },
    reviewState: "confirmed",
    assessmentMode: "non-scoring",
    content: {
      kind: "ordered-note-sequence",
      noteIds,
    },
    comparisonPolicy: {
      kind: "exact-note-identity",
      order: "ordered",
      preserveRepeatedNotes: true,
      compareTiming: false,
      compareVelocity: false,
    },
    inputRequirement: {
      kind: "note-sequence",
      allowedInputModes: ["piano"],
      expectedNoteCount: noteIds.length,
      requireCompleteSequence: true,
      stopAtExpectedLength: true,
    },
  });
};
