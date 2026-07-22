import {
  earTrainingMelodyNoteIds,
  type EarTrainingMelodyNoteId,
  type LocalEarTrainingMelodyQuestion,
} from "./localEarTrainingMelodyDictation";

export const MELODY_NUMBERED_NOTATION_CONTEXT = "numbered-notation-fixed-c-v1" as const;

export type MelodyNumberedNotationPresentation = Readonly<{
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  accidental: "natural" | "sharp";
  octave: "base" | "upper";
  optionLabel: string;
}>;

export const MELODY_NUMBERED_NOTATION_PRESENTATION: Readonly<
  Record<EarTrainingMelodyNoteId, MelodyNumberedNotationPresentation>
> = {
  c4: { degree: 1, accidental: "natural", octave: "base", optionLabel: "1（C4）" },
  d4: { degree: 2, accidental: "natural", octave: "base", optionLabel: "2（D4）" },
  e4: { degree: 3, accidental: "natural", octave: "base", optionLabel: "3（E4）" },
  f4: { degree: 4, accidental: "natural", octave: "base", optionLabel: "4（F4）" },
  "f-sharp-4": { degree: 4, accidental: "sharp", octave: "base", optionLabel: "升 4（F♯4）" },
  g4: { degree: 5, accidental: "natural", octave: "base", optionLabel: "5（G4）" },
  a4: { degree: 6, accidental: "natural", octave: "base", optionLabel: "6（A4）" },
  b4: { degree: 7, accidental: "natural", octave: "base", optionLabel: "7（B4）" },
  c5: { degree: 1, accidental: "natural", octave: "upper", optionLabel: "高音 1（C5）" },
};

export const getMelodyNumberedNotationPresentation = (
  noteId: EarTrainingMelodyNoteId,
) => MELODY_NUMBERED_NOTATION_PRESENTATION[noteId];

export type MelodyNumberedNotationDraftReviewState =
  | "draft"
  | "checked"
  | "confirmed"
  | "cleared";

export type MelodyNumberedNotationDraftV1 = Readonly<{
  schemaVersion: "melody-numbered-notation-draft-v1";
  representationContext: typeof MELODY_NUMBERED_NOTATION_CONTEXT;
  draftId: string;
  questionId: string;
  questionVariantId: string;
  attemptId: string;
  playbackQualificationId: string;
  revision: number;
  reviewState: MelodyNumberedNotationDraftReviewState;
  localOnly: true;
  sessionOnly: true;
  meter: "unmetered";
  noteIds: readonly [
    EarTrainingMelodyNoteId | null,
    EarTrainingMelodyNoteId | null,
    EarTrainingMelodyNoteId | null,
  ];
  checkedFingerprint: string | null;
}>;

export type MelodyNumberedNotationDraftValidation = Readonly<{
  status: "valid" | "invalid";
  fingerprint: string;
  noteCount: number;
  messages: readonly string[];
}>;

const isSupportedNoteId = (value: unknown): value is EarTrainingMelodyNoteId =>
  typeof value === "string"
  && (earTrainingMelodyNoteIds as readonly string[]).includes(value);

export const getMelodyNumberedNotationDraftId = ({
  questionVariantId,
  attemptId,
  playbackQualificationId,
}: {
  questionVariantId: string;
  attemptId: string;
  playbackQualificationId: string;
}) => `melody-numbered-notation-draft:${questionVariantId}:${attemptId}:${playbackQualificationId}`;

export const getMelodyNumberedNotationDraftFingerprint = (
  draft: Pick<
    MelodyNumberedNotationDraftV1,
    | "representationContext"
    | "questionId"
    | "questionVariantId"
    | "attemptId"
    | "playbackQualificationId"
    | "revision"
    | "meter"
    | "noteIds"
  >,
) => JSON.stringify({
  representationContext: draft.representationContext,
  questionId: draft.questionId,
  questionVariantId: draft.questionVariantId,
  attemptId: draft.attemptId,
  playbackQualificationId: draft.playbackQualificationId,
  revision: draft.revision,
  meter: draft.meter,
  noteIds: [...draft.noteIds],
});

export const getMelodyNumberedNotationAnswerDocumentId = ({
  representationContext,
  questionId,
  questionVariantId,
  attemptId,
  playbackQualificationId,
  revision,
  noteIds,
}: {
  representationContext: typeof MELODY_NUMBERED_NOTATION_CONTEXT;
  questionId: string;
  questionVariantId: string;
  attemptId: string;
  playbackQualificationId: string;
  revision: number;
  noteIds: readonly EarTrainingMelodyNoteId[];
}) => `local.melody-dictation-numbered-answer.${representationContext}.${encodeURIComponent(questionId)}.${encodeURIComponent(questionVariantId)}.${encodeURIComponent(attemptId)}.${encodeURIComponent(playbackQualificationId)}.revision-${revision}.${noteIds.join("-")}`;

export const createMelodyNumberedNotationDraft = ({
  question,
  attemptId,
  playbackQualificationId,
}: {
  question: LocalEarTrainingMelodyQuestion;
  attemptId: string;
  playbackQualificationId: string;
}): MelodyNumberedNotationDraftV1 => {
  if (!question.id.trim() || !question.variantId.trim() || !attemptId.trim() || !playbackQualificationId.trim()) {
    throw new Error("简谱旋律草稿缺少题目、尝试或完整播放资格身份。");
  }
  if (question.melody.noteIds.length !== 3 || !question.melody.noteIds.every(isSupportedNoteId)) {
    throw new Error("简谱旋律草稿只支持当前固定 C 映射内的三音旋律题目。");
  }
  return {
    schemaVersion: "melody-numbered-notation-draft-v1",
    representationContext: MELODY_NUMBERED_NOTATION_CONTEXT,
    draftId: getMelodyNumberedNotationDraftId({
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
    meter: "unmetered",
    noteIds: [null, null, null],
    checkedFingerprint: null,
  };
};

export const setMelodyNumberedNotationDraftNote = (
  draft: MelodyNumberedNotationDraftV1,
  position: number,
  noteId: EarTrainingMelodyNoteId | null,
): MelodyNumberedNotationDraftV1 => {
  if (!Number.isInteger(position) || position < 0 || position > 2) {
    throw new Error("简谱旋律草稿位置必须是 0 至 2。");
  }
  if (noteId !== null && !isSupportedNoteId(noteId)) {
    throw new Error("简谱旋律草稿包含当前固定 C 映射不支持的音高。");
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

export const clearMelodyNumberedNotationDraft = (
  draft: MelodyNumberedNotationDraftV1,
): MelodyNumberedNotationDraftV1 => ({
  ...draft,
  revision: draft.revision + 1,
  reviewState: "cleared",
  noteIds: [null, null, null],
  checkedFingerprint: null,
});

export const validateMelodyNumberedNotationDraft = (
  draft: MelodyNumberedNotationDraftV1,
): MelodyNumberedNotationDraftValidation => {
  const messages: string[] = [];
  if (draft.schemaVersion !== "melody-numbered-notation-draft-v1") messages.push("草稿协议版本无效。");
  if (draft.representationContext !== MELODY_NUMBERED_NOTATION_CONTEXT) messages.push("简谱表示上下文无效。");
  if (draft.localOnly !== true || draft.sessionOnly !== true) messages.push("草稿越过了本地会话边界。");
  if (!draft.draftId || !draft.questionId || !draft.questionVariantId || !draft.attemptId || !draft.playbackQualificationId) {
    messages.push("草稿缺少题目、尝试或完整播放资格身份。");
  }
  if (draft.draftId !== getMelodyNumberedNotationDraftId(draft)) messages.push("草稿标识与当前来源身份不一致。");
  if (!Number.isSafeInteger(draft.revision) || draft.revision < 0) messages.push("草稿修订号无效。");
  if (draft.meter !== "unmetered") messages.push("简谱旋律草稿不得虚构节奏上下文。");
  if (draft.noteIds.length !== 3) messages.push("草稿必须包含三个固定简谱音位。");
  const presentNotes = draft.noteIds.filter((noteId): noteId is EarTrainingMelodyNoteId => noteId !== null);
  if (presentNotes.length !== 3) messages.push("请先填写全部三个简谱音位。");
  if (!presentNotes.every(isSupportedNoteId)) messages.push("草稿包含当前固定 C 映射不支持的音高。");
  return {
    status: messages.length === 0 ? "valid" : "invalid",
    fingerprint: getMelodyNumberedNotationDraftFingerprint(draft),
    noteCount: presentNotes.length,
    messages,
  };
};

export const checkMelodyNumberedNotationDraft = (
  draft: MelodyNumberedNotationDraftV1,
): MelodyNumberedNotationDraftV1 => {
  const validation = validateMelodyNumberedNotationDraft(draft);
  if (validation.status !== "valid") return draft;
  return { ...draft, reviewState: "checked", checkedFingerprint: validation.fingerprint };
};

export const canConfirmMelodyNumberedNotationDraft = (draft: MelodyNumberedNotationDraftV1) => {
  const validation = validateMelodyNumberedNotationDraft(draft);
  return draft.reviewState === "checked"
    && draft.checkedFingerprint === validation.fingerprint
    && validation.status === "valid";
};

export const confirmMelodyNumberedNotationDraft = (
  draft: MelodyNumberedNotationDraftV1,
): MelodyNumberedNotationDraftV1 => canConfirmMelodyNumberedNotationDraft(draft)
  ? { ...draft, reviewState: "confirmed" }
  : draft;

