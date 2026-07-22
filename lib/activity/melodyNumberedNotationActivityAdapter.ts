import type { ActivityAnswer } from "./activityAnswer";
import type { ActivityDefinitionV1 } from "./activityDefinition";
import type { ActivityCheckEvidence } from "./activitySession";
import type {
  MelodyDictationNumberedAnswerScoreDocumentV1,
  ScoreDocumentV1,
} from "../music/scoreDocument";
import {
  earTrainingMelodyNoteIds,
  type EarTrainingMelodyNoteId,
  type LocalEarTrainingMelodyQuestion,
} from "../practice/localEarTrainingMelodyDictation";
import {
  MELODY_NUMBERED_NOTATION_CONTEXT,
  getMelodyNumberedNotationAnswerDocumentId,
  getMelodyNumberedNotationDraftFingerprint,
  getMelodyNumberedNotationDraftId,
} from "../practice/localMelodyNumberedNotationDraft";

const isSupportedNoteId = (value: unknown): value is EarTrainingMelodyNoteId =>
  typeof value === "string"
  && (earTrainingMelodyNoteIds as readonly string[]).includes(value);

const insufficient = (explanation: string): ActivityCheckEvidence => ({
  state: "insufficient",
  assessmentMode: "non-scoring",
  explanation,
});

const hasSupportedOrderedTarget = (
  definition: ActivityDefinitionV1,
  question?: LocalEarTrainingMelodyQuestion,
) => {
  const expected = definition.target.expectedAnswer;
  return definition.family === "melody-dictation"
    && expected.mode === "choice"
    && definition.target.answerPolicy?.choiceOrder === "ordered"
    && expected.optionIds.length === 3
    && expected.optionIds.every(isSupportedNoteId)
    && (!question || (
      question.melody.noteIds.length === 3
      && question.melody.noteIds.every(isSupportedNoteId)
      && expected.optionIds.every((noteId, index) => noteId === question.melody.noteIds[index])
    ));
};

export const enableMelodyNumberedNotationInput = (
  definition: ActivityDefinitionV1,
): ActivityDefinitionV1 => {
  if (!hasSupportedOrderedTarget(definition)) {
    throw new Error("简谱输入只支持当前三音、有序且固定 C 映射明确的旋律听写活动。");
  }
  return {
    ...definition,
    allowedInputModes: Array.from(new Set([
      ...definition.allowedInputModes,
      "choice" as const,
      "numbered-notation" as const,
    ])),
  };
};

export const createMelodyNumberedNotationAnswer = (
  document: MelodyDictationNumberedAnswerScoreDocumentV1,
): { mode: "numbered-notation"; documentId: string; revision: number } => ({
  mode: "numbered-notation",
  documentId: document.documentId,
  revision: document.revision,
});

export const adaptMelodyNumberedNotationAnswerToActivityEvidence = ({
  definition,
  question,
  document,
  answer,
  attemptId,
  playbackQualificationId,
}: {
  definition: ActivityDefinitionV1;
  question: LocalEarTrainingMelodyQuestion;
  document: ScoreDocumentV1 | null;
  answer: ActivityAnswer | undefined;
  attemptId: string;
  playbackQualificationId: string;
}): ActivityCheckEvidence => {
  if (!hasSupportedOrderedTarget(definition, question)) {
    return insufficient("当前旋律目标无法可靠转换为简谱音符序列进行检查。");
  }
  if (!definition.allowedInputModes.includes("numbered-notation")) {
    return insufficient("当前活动没有启用简谱输入。");
  }
  if (!attemptId.trim() || !playbackQualificationId.trim()) {
    return insufficient("当前尝试缺少有效的完整播放资格，已拒绝检查。");
  }
  if (
    !document
    || document.schemaVersion !== "score-document-v1"
    || document.documentKind !== "melody-dictation-numbered-answer"
    || document.reviewState !== "confirmed"
    || document.localOnly !== true
    || document.sessionOnly !== true
    || !Number.isSafeInteger(document.revision)
    || document.revision < 0
  ) {
    return insufficient("尚未提交经过预览、检查和确认的简谱旋律答案文档。");
  }
  const events = document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events ?? [];
  const eventShapeIsValid = events.length === 3
    && events.every((event, index) =>
      event.eventId === `melody-numbered-answer-note-${index + 1}`
      && event.type === "note"
      && event.position === index
      && isSupportedNoteId(event.noteId)
    );
  if (!eventShapeIsValid) {
    return insufficient("简谱旋律答案文档的音位、顺序或 canonical 音高无效，已拒绝检查。");
  }
  const noteIds = events.map((event) => event.noteId) as [
    EarTrainingMelodyNoteId,
    EarTrainingMelodyNoteId,
    EarTrainingMelodyNoteId,
  ];
  const expectedFingerprint = getMelodyNumberedNotationDraftFingerprint({
    representationContext: document.source.representationContext,
    questionId: document.source.questionId,
    questionVariantId: document.source.questionVariantId,
    attemptId: document.source.attemptId,
    playbackQualificationId: document.source.playbackQualificationId,
    revision: document.revision,
    meter: document.meter,
    noteIds,
  });
  const expectedDocumentId = getMelodyNumberedNotationAnswerDocumentId({
    representationContext: document.source.representationContext,
    questionId: document.source.questionId,
    questionVariantId: document.source.questionVariantId,
    attemptId: document.source.attemptId,
    playbackQualificationId: document.source.playbackQualificationId,
    revision: document.revision,
    noteIds,
  });
  const identityIsValid = document.source.kind === "confirmed-melody-numbered-notation-draft"
    && document.source.representationContext === MELODY_NUMBERED_NOTATION_CONTEXT
    && document.source.draftId === getMelodyNumberedNotationDraftId({
      questionVariantId: document.source.questionVariantId,
      attemptId: document.source.attemptId,
      playbackQualificationId: document.source.playbackQualificationId,
    })
    && document.source.questionId === question.id
    && document.source.questionVariantId === question.variantId
    && document.source.attemptId === attemptId
    && document.source.playbackQualificationId === playbackQualificationId
    && document.source.draftFingerprint === expectedFingerprint
    && document.documentId === expectedDocumentId
    && document.meter === "unmetered"
    && document.parts[0].partId === "melody-numbered-answer-part-1"
    && document.parts[0].staves[0].staffId === "melody-numbered-answer-staff-1"
    && document.parts[0].staves[0].staffKind === "numbered-notation"
    && document.parts[0].staves[0].voices[0].voiceId === "melody-numbered-answer-voice-1"
    && document.parts[0].staves[0].voices[0].measures[0].measureNumber === 1;
  if (!identityIsValid) {
    return insufficient("简谱旋律答案文档与表示上下文、本题、当前尝试、播放资格或修订内容不一致，已拒绝检查。");
  }
  if (
    !answer
    || answer.mode !== "numbered-notation"
    || answer.documentId !== document.documentId
    || answer.revision !== document.revision
  ) {
    return insufficient("提交的活动答案没有引用当前已确认的简谱旋律文档与修订。");
  }
  const expected = definition.target.expectedAnswer;
  if (expected.mode !== "choice") {
    return insufficient("当前旋律目标没有可检查的有序 canonical 音高答案。");
  }
  const consistent = expected.optionIds.every((noteId, index) => noteIds[index] === noteId);
  return {
    state: consistent ? "consistent" : "different",
    assessmentMode: "non-scoring",
    explanation: consistent
      ? "已确认简谱答案的三个 canonical 音高、顺序与重复音均和当前旋律一致；这是非评分内容对照。"
      : "已确认简谱答案与当前旋律的音高或顺序存在差异；这里只解释题目内容，不推断听辨能力。",
  };
};

