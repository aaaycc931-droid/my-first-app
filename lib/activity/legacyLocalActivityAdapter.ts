import type { ActivityDefinitionV1, ActivityDifficulty } from "./activityDefinition";
import type { LocalEarTrainingSinglePitchQuestion, EarTrainingSinglePitchDifficulty } from "../practice/localEarTrainingSinglePitch";
import type { LocalEarTrainingQuestion } from "../practice/localEarTrainingIntervals";
import type { LocalEarTrainingRhythmQuestion } from "../practice/localEarTrainingRhythm";
import type { LocalEarTrainingMelodyQuestion } from "../practice/localEarTrainingMelodyDictation";
import type { LocalEarTrainingChordQuestion } from "../practice/localEarTrainingChords";
import type { LocalEarTrainingHarmonyProgressionQuestion } from "../practice/localEarTrainingHarmonyProgressions";
import type { LocalEarTrainingScaleModeQuestion } from "../practice/localEarTrainingScaleModes";

const DIFFICULTY: Record<EarTrainingSinglePitchDifficulty, ActivityDifficulty> = {
  基础: "foundation", 进阶: "intermediate", 挑战: "challenge",
};

export const adaptSinglePitchQuestionToActivity = (
  question: LocalEarTrainingSinglePitchQuestion,
): ActivityDefinitionV1 => ({
  schemaVersion: "activity-definition-v1",
  activityId: `local.single-pitch.${question.variantId}`,
  activityVersion: "1",
  contentVersion: "local-ear-training-v2",
  family: "pitch-relation",
  title: "单音听辨",
  instructions: "听参考单音后选择音名。",
  skillTags: ["单音", "音名", "听辨"],
  difficulty: DIFFICULTY[question.difficulty],
  assessmentMode: "non-scoring",
  source: { kind: "built-in", reviewState: "confirmed" },
  allowedInputModes: ["choice"],
  target: {
    targetId: `pitch:${question.pitch.id}`,
    label: question.pitch.label,
    expectedAnswer: { mode: "choice", optionIds: [question.pitch.id] },
  },
  explanation: `本题参考音是 ${question.pitch.label}。`,
  music: { range: { lowestNoteId: question.pitch.id, highestNoteId: question.pitch.id }, referenceTimbre: "web-audio-sine-compatibility" },
});

export const adaptIntervalQuestionToActivity = (
  question: LocalEarTrainingQuestion,
): ActivityDefinitionV1 => ({
  schemaVersion: "activity-definition-v1",
  activityId: `local.interval.${question.variantId}.${question.direction}`,
  activityVersion: "1",
  contentVersion: "local-ear-training-v2",
  family: "interval",
  title: "音程听辨",
  instructions: `听两个依次播放的音，选择${question.direction}音程。`,
  skillTags: ["音程", question.direction, "旋律音程", "听辨"],
  difficulty: DIFFICULTY[question.difficulty],
  assessmentMode: "non-scoring",
  source: { kind: "built-in", reviewState: "confirmed" },
  allowedInputModes: ["choice"],
  target: {
    targetId: `interval:${question.direction}:${question.interval.id}`,
    label: `${question.direction}${question.interval.label}`,
    expectedAnswer: { mode: "choice", optionIds: [question.interval.id] },
  },
  explanation: question.interval.explanation,
  music: { referenceTimbre: "web-audio-sine-compatibility" },
});

export const adaptChordQuestionToActivity = (
  question: LocalEarTrainingChordQuestion,
): ActivityDefinitionV1 => ({
  schemaVersion: "activity-definition-v1",
  activityId: `local.chord.${question.variantId}`,
  activityVersion: "1",
  contentVersion: "local-harmony-training-v1",
  family: "chord",
  title: "和弦性质与转位听辨",
  instructions: "听三个音，选择三和弦性质与转位。",
  skillTags: ["和弦", question.quality.label, question.inversionLabel, "听辨"],
  difficulty: DIFFICULTY[question.difficulty],
  assessmentMode: "non-scoring",
  source: { kind: "built-in", reviewState: "confirmed" },
  allowedInputModes: ["choice"],
  target: {
    targetId: `chord:${question.quality.id}:${question.inversionId}`,
    label: `${question.quality.label} · ${question.inversionLabel}`,
    expectedAnswer: { mode: "choice", optionIds: [question.answerOptionId] },
  },
  explanation: question.explanation,
  music: { key: question.root.label, referenceTimbre: "web-audio-sine-compatibility" },
});

export const adaptHarmonyProgressionQuestionToActivity = (
  question: LocalEarTrainingHarmonyProgressionQuestion,
): ActivityDefinitionV1 => ({
  schemaVersion: "activity-definition-v1",
  activityId: `local.harmony-progression.${question.variantId}`,
  activityVersion: "1",
  contentVersion: "local-harmony-progression-v1",
  family: "harmony-progression",
  title: "和声进行与终止式听辨",
  instructions: "听一组依次播放的和弦，选择级数进行。",
  skillTags: ["和声进行", "终止式", question.pattern.label, "听辨"],
  difficulty: DIFFICULTY[question.difficulty],
  assessmentMode: "non-scoring",
  source: { kind: "built-in", reviewState: "confirmed" },
  allowedInputModes: ["choice"],
  target: {
    targetId: `harmony-progression:${question.pattern.id}`,
    label: question.pattern.label,
    expectedAnswer: { mode: "choice", optionIds: [question.answerOptionId] },
  },
  explanation: question.explanation,
  music: { key: question.key.label, referenceTimbre: "web-audio-sine-compatibility" },
});

export const adaptScaleModeQuestionToActivity = (
  question: LocalEarTrainingScaleModeQuestion,
): ActivityDefinitionV1 => ({
  schemaVersion: "activity-definition-v1",
  activityId: `local.scale-mode.${question.variantId}`,
  activityVersion: "1",
  contentVersion: "local-scale-mode-v1",
  family: "scale-mode",
  title: "音阶与调式听辨",
  instructions: "听从主音开始的上行音阶，选择音阶或调式类型。",
  skillTags: ["音阶", "调式", question.scaleMode.label, "听辨"],
  difficulty: DIFFICULTY[question.difficulty],
  assessmentMode: "non-scoring",
  source: { kind: "built-in", reviewState: "confirmed" },
  allowedInputModes: ["choice"],
  target: {
    targetId: `scale-mode:${question.scaleMode.id}`,
    label: question.scaleMode.label,
    expectedAnswer: { mode: "choice", optionIds: [question.answerOptionId] },
  },
  explanation: question.explanation,
  music: { key: question.tonic.label, referenceTimbre: "web-audio-sine-compatibility" },
});

export const adaptRhythmQuestionToActivity = (
  question: LocalEarTrainingRhythmQuestion,
): ActivityDefinitionV1 => ({
  schemaVersion: "activity-definition-v1",
  activityId: `local.rhythm.${question.variantId}`,
  activityVersion: "1",
  contentVersion: "local-ear-training-v2",
  family: "rhythm-dictation",
  title: "节奏听辨",
  instructions: "听四拍击拍题，选择最符合的节奏形状。",
  skillTags: ["节奏", "四四拍", "听辨"],
  difficulty: DIFFICULTY[question.difficulty],
  assessmentMode: "non-scoring",
  source: { kind: "built-in", reviewState: "confirmed" },
  allowedInputModes: ["choice"],
  target: {
    targetId: `rhythm:${question.pattern.id}:bpm-${question.bpm}`,
    label: question.pattern.label,
    expectedAnswer: { mode: "choice", optionIds: [question.pattern.id] },
  },
  explanation: question.pattern.explanation,
  music: { meter: "4/4", tempoBpm: question.bpm, referenceTimbre: "web-audio-click-compatibility" },
});

export const adaptMelodyDictationQuestionToActivity = (
  question: LocalEarTrainingMelodyQuestion,
): ActivityDefinitionV1 => ({
  schemaVersion: "activity-definition-v1",
  activityId: `local.melody-dictation.${question.variantId}`,
  activityVersion: "1",
  contentVersion: "local-ear-training-v2",
  family: "melody-dictation",
  title: "三音旋律听写",
  instructions: "听三音短旋律，按播放顺序填写三个音名。",
  skillTags: ["旋律", "听写", "音名", "三音"],
  difficulty: DIFFICULTY[question.difficulty],
  assessmentMode: "non-scoring",
  source: { kind: "built-in", reviewState: "confirmed" },
  allowedInputModes: ["choice"],
  target: {
    targetId: `melody:${question.melody.id}`,
    label: question.melody.label,
    expectedAnswer: { mode: "choice", optionIds: [...question.melody.noteIds] },
    answerPolicy: { choiceOrder: "ordered" },
  },
  explanation: question.melody.explanation,
  music: { referenceTimbre: "web-audio-sine-compatibility" },
});
