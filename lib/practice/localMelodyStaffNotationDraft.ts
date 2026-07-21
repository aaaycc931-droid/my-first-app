import {
  earTrainingMelodyNoteIds,
  type EarTrainingMelodyNoteId,
  type LocalEarTrainingMelodyQuestion,
} from "./localEarTrainingMelodyDictation";

export type MelodyStaffNotationDraftReviewState =
  | "draft"
  | "checked"
  | "confirmed"
  | "cleared";

export type MelodyStaffNotationDraftV1 = Readonly<{
  schemaVersion: "melody-staff-notation-draft-v1";
  draftId: string;
  questionId: string;
  questionVariantId: string;
  attemptId: string;
  playbackQualificationId: string;
  revision: number;
  reviewState: MelodyStaffNotationDraftReviewState;
  localOnly: true;
  sessionOnly: true;
  clef: "treble";
  meter: "unmetered";
  noteIds: readonly [
    EarTrainingMelodyNoteId | null,
    EarTrainingMelodyNoteId | null,
    EarTrainingMelodyNoteId | null,
  ];
  checkedFingerprint: string | null;
}>;

export type MelodyStaffNotationDraftValidation = Readonly<{
  status: "valid" | "invalid";
  fingerprint: string;
  noteCount: number;
  messages: readonly string[];
}>;

const isSupportedNoteId = (value: unknown): value is EarTrainingMelodyNoteId =>
  typeof value === "string"
  && (earTrainingMelodyNoteIds as readonly string[]).includes(value);

export const getMelodyStaffNotationDraftId = ({
  questionVariantId,
  attemptId,
  playbackQualificationId,
}: {
  questionVariantId: string;
  attemptId: string;
  playbackQualificationId: string;
}) => `melody-staff-notation-draft:${questionVariantId}:${attemptId}:${playbackQualificationId}`;

export const getMelodyStaffNotationDraftFingerprint = (
  draft: Pick<
    MelodyStaffNotationDraftV1,
    | "questionId"
    | "questionVariantId"
    | "attemptId"
    | "playbackQualificationId"
    | "revision"
    | "clef"
    | "meter"
    | "noteIds"
  >,
) => JSON.stringify({
  questionId: draft.questionId,
  questionVariantId: draft.questionVariantId,
  attemptId: draft.attemptId,
  playbackQualificationId: draft.playbackQualificationId,
  revision: draft.revision,
  clef: draft.clef,
  meter: draft.meter,
  noteIds: [...draft.noteIds],
});

export const getMelodyStaffNotationAnswerDocumentId = ({
  questionId,
  questionVariantId,
  attemptId,
  playbackQualificationId,
  revision,
  noteIds,
}: {
  questionId: string;
  questionVariantId: string;
  attemptId: string;
  playbackQualificationId: string;
  revision: number;
  noteIds: readonly EarTrainingMelodyNoteId[];
}) => `local.melody-dictation-answer.${encodeURIComponent(questionId)}.${encodeURIComponent(questionVariantId)}.${encodeURIComponent(attemptId)}.${encodeURIComponent(playbackQualificationId)}.revision-${revision}.${noteIds.join("-")}`;

export const createMelodyStaffNotationDraft = ({
  question,
  attemptId,
  playbackQualificationId,
}: {
  question: LocalEarTrainingMelodyQuestion;
  attemptId: string;
  playbackQualificationId: string;
}): MelodyStaffNotationDraftV1 => {
  if (!question.id.trim() || !question.variantId.trim() || !attemptId.trim() || !playbackQualificationId.trim()) {
    throw new Error("五线谱旋律草稿缺少题目、尝试或完整播放资格身份。");
  }
  if (question.melody.noteIds.length !== 3 || !question.melody.noteIds.every(isSupportedNoteId)) {
    throw new Error("五线谱旋律草稿只支持当前音域内的三音旋律题目。");
  }
  return {
    schemaVersion: "melody-staff-notation-draft-v1",
    draftId: getMelodyStaffNotationDraftId({
      questionVariantId: question.variantId,
      attemptId,
      playbackQualificationId,
    }),
    questionId: question.id,
    questionVariantId: question.variantId,
    attemptId,
    playbackQualificationId,
    revision: 0,
    reviewState: "draft",
    localOnly: true,
    sessionOnly: true,
    clef: "treble",
    meter: "unmetered",
    noteIds: [null, null, null],
    checkedFingerprint: null,
  };
};

export const setMelodyStaffNotationDraftNote = (
  draft: MelodyStaffNotationDraftV1,
  position: number,
  noteId: EarTrainingMelodyNoteId | null,
): MelodyStaffNotationDraftV1 => {
  if (!Number.isInteger(position) || position < 0 || position > 2) {
    throw new Error("五线谱旋律草稿位置必须是 0 至 2。");
  }
  if (noteId !== null && !isSupportedNoteId(noteId)) {
    throw new Error("五线谱旋律草稿包含当前音域不支持的音高。");
  }
  const noteIds = [...draft.noteIds] as [
    EarTrainingMelodyNoteId | null,
    EarTrainingMelodyNoteId | null,
    EarTrainingMelodyNoteId | null,
  ];
  noteIds[position] = noteId;
  return {
    ...draft,
    revision: draft.revision + 1,
    reviewState: "draft",
    noteIds,
    checkedFingerprint: null,
  };
};

export const clearMelodyStaffNotationDraft = (
  draft: MelodyStaffNotationDraftV1,
): MelodyStaffNotationDraftV1 => ({
  ...draft,
  revision: draft.revision + 1,
  reviewState: "cleared",
  noteIds: [null, null, null],
  checkedFingerprint: null,
});

export const validateMelodyStaffNotationDraft = (
  draft: MelodyStaffNotationDraftV1,
): MelodyStaffNotationDraftValidation => {
  const messages: string[] = [];
  if (draft.schemaVersion !== "melody-staff-notation-draft-v1") messages.push("草稿协议版本无效。");
  if (draft.localOnly !== true || draft.sessionOnly !== true) messages.push("草稿越过了本地会话边界。");
  if (!draft.draftId || !draft.questionId || !draft.questionVariantId || !draft.attemptId || !draft.playbackQualificationId) {
    messages.push("草稿缺少题目、尝试或完整播放资格身份。");
  }
  if (draft.draftId !== getMelodyStaffNotationDraftId(draft)) messages.push("草稿标识与当前来源身份不一致。");
  if (!Number.isSafeInteger(draft.revision) || draft.revision < 0) messages.push("草稿修订号无效。");
  if (draft.clef !== "treble" || draft.meter !== "unmetered") messages.push("草稿谱号或无节拍上下文无效。");
  if (draft.noteIds.length !== 3) messages.push("草稿必须包含三个固定音符位置。");
  const presentNotes = draft.noteIds.filter((noteId): noteId is EarTrainingMelodyNoteId => noteId !== null);
  if (presentNotes.length !== 3) messages.push("请先填写全部三个音符位置。");
  if (!presentNotes.every(isSupportedNoteId)) messages.push("草稿包含当前音域不支持的音高。");
  return {
    status: messages.length === 0 ? "valid" : "invalid",
    fingerprint: getMelodyStaffNotationDraftFingerprint(draft),
    noteCount: presentNotes.length,
    messages,
  };
};

export const checkMelodyStaffNotationDraft = (
  draft: MelodyStaffNotationDraftV1,
): MelodyStaffNotationDraftV1 => {
  const validation = validateMelodyStaffNotationDraft(draft);
  if (validation.status !== "valid") return draft;
  return { ...draft, reviewState: "checked", checkedFingerprint: validation.fingerprint };
};

export const canConfirmMelodyStaffNotationDraft = (draft: MelodyStaffNotationDraftV1) => {
  const validation = validateMelodyStaffNotationDraft(draft);
  return draft.reviewState === "checked"
    && draft.checkedFingerprint === validation.fingerprint
    && validation.status === "valid";
};

export const confirmMelodyStaffNotationDraft = (
  draft: MelodyStaffNotationDraftV1,
): MelodyStaffNotationDraftV1 => canConfirmMelodyStaffNotationDraft(draft)
  ? { ...draft, reviewState: "confirmed" }
  : draft;
