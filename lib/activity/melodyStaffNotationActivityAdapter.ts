import type { ActivityAnswer } from "./activityAnswer";
import type { ActivityDefinitionV1 } from "./activityDefinition";
import type { ActivityCheckEvidence } from "./activitySession";
import type { MelodyDictationAnswerScoreDocumentV1 } from "../music/scoreDocument";
import {
  earTrainingMelodyNoteIds,
  type EarTrainingMelodyNoteId,
  type LocalEarTrainingMelodyQuestion,
} from "../practice/localEarTrainingMelodyDictation";
import {
  getMelodyStaffNotationAnswerDocumentId,
  getMelodyStaffNotationDraftId,
  getMelodyStaffNotationDraftFingerprint,
} from "../practice/localMelodyStaffNotationDraft";

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

export const enableMelodyStaffNotationInput = (
  definition: ActivityDefinitionV1,
): ActivityDefinitionV1 => {
  if (!hasSupportedOrderedTarget(definition)) {
    throw new Error("五线谱输入只支持当前三音、有序且音域明确的旋律听写活动。");
  }
  return {
    ...definition,
    allowedInputModes: Array.from(new Set([
      ...definition.allowedInputModes,
      "choice" as const,
      "staff-notation" as const,
    ])),
  };
};

export const createMelodyStaffNotationAnswer = (
  document: MelodyDictationAnswerScoreDocumentV1,
): { mode: "staff-notation"; documentId: string; revision: number } => ({
  mode: "staff-notation",
  documentId: document.documentId,
  revision: document.revision,
});

const getDocumentNoteIds = (document: MelodyDictationAnswerScoreDocumentV1) =>
  document.parts[0]?.staves[0]?.voices[0]?.measures[0]?.events ?? [];

export const adaptMelodyStaffNotationAnswerToActivityEvidence = ({
  definition,
  question,
  document,
  answer,
  attemptId,
  playbackQualificationId,
}: {
  definition: ActivityDefinitionV1;
  question: LocalEarTrainingMelodyQuestion;
  document: MelodyDictationAnswerScoreDocumentV1 | null;
  answer: ActivityAnswer | undefined;
  attemptId: string;
  playbackQualificationId: string;
}): ActivityCheckEvidence => {
  if (!hasSupportedOrderedTarget(definition, question)) {
    return insufficient("当前旋律目标无法可靠转换为五线谱音符序列进行检查。");
  }
  if (!definition.allowedInputModes.includes("staff-notation")) {
    return insufficient("当前活动没有启用五线谱输入。");
  }
  if (!attemptId.trim() || !playbackQualificationId.trim()) {
    return insufficient("当前尝试缺少有效的完整播放资格，已拒绝检查。");
  }
  if (
    !document
    || document.schemaVersion !== "score-document-v1"
    || document.documentKind !== "melody-dictation-answer"
    || document.reviewState !== "confirmed"
    || document.localOnly !== true
    || document.sessionOnly !== true
    || !Number.isSafeInteger(document.revision)
    || document.revision < 0
  ) {
    return insufficient("尚未提交经过预览、检查和确认的五线谱旋律答案文档。");
  }
  const events = getDocumentNoteIds(document);
  const eventShapeIsValid = events.length === 3
    && events.every((event, index) =>
      event.eventId === `melody-answer-note-${index + 1}`
      && event.type === "note"
      && event.position === index
      && isSupportedNoteId(event.noteId)
    );
  if (!eventShapeIsValid) {
    return insufficient("五线谱旋律答案文档的音符位置、顺序或内容无效，已拒绝检查。");
  }
  const noteIds = events.map((event) => event.noteId) as [
    EarTrainingMelodyNoteId,
    EarTrainingMelodyNoteId,
    EarTrainingMelodyNoteId,
  ];
  const expectedFingerprint = getMelodyStaffNotationDraftFingerprint({
    questionId: document.source.questionId,
    questionVariantId: document.source.questionVariantId,
    attemptId: document.source.attemptId,
    playbackQualificationId: document.source.playbackQualificationId,
    revision: document.revision,
    clef: "treble",
    meter: document.meter,
    noteIds,
  });
  const expectedDocumentId = getMelodyStaffNotationAnswerDocumentId({
    questionId: document.source.questionId,
    questionVariantId: document.source.questionVariantId,
    attemptId: document.source.attemptId,
    playbackQualificationId: document.source.playbackQualificationId,
    revision: document.revision,
    noteIds,
  });
  const identityIsValid = document.source.kind === "confirmed-melody-staff-notation-draft"
    && document.source.draftId === getMelodyStaffNotationDraftId({
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
    && document.parts[0].partId === "melody-answer-part-1"
    && document.parts[0].staves[0].staffId === "melody-answer-staff-1"
    && document.parts[0].staves[0].staffKind === "pitched"
    && document.parts[0].staves[0].clef === "treble"
    && document.parts[0].staves[0].voices[0].voiceId === "melody-answer-voice-1"
    && document.parts[0].staves[0].voices[0].measures[0].measureNumber === 1;
  if (!identityIsValid) {
    return insufficient("五线谱旋律答案文档与本题、当前尝试、播放资格或修订内容不一致，已拒绝检查。");
  }
  if (
    !answer
    || answer.mode !== "staff-notation"
    || answer.documentId !== document.documentId
    || answer.revision !== document.revision
  ) {
    return insufficient("提交的活动答案没有引用当前已确认的五线谱旋律文档与修订。");
  }
  const expected = definition.target.expectedAnswer;
  if (expected.mode !== "choice") {
    return insufficient("当前旋律目标没有可检查的有序音高答案。");
  }
  const consistent = expected.optionIds.every((noteId, index) => noteIds[index] === noteId);
  return {
    state: consistent ? "consistent" : "different",
    assessmentMode: "non-scoring",
    explanation: consistent
      ? "已确认五线谱答案的三个音高、顺序与重复音均和当前旋律一致；这是非评分内容对照。"
      : "已确认五线谱答案与当前旋律的音高或顺序存在差异；这里只解释题目内容，不推断听辨能力。",
  };
};
