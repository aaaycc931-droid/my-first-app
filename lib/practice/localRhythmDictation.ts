import type {
  EarTrainingRhythmDifficulty,
  LocalEarTrainingRhythmQuestion,
} from "./localEarTrainingRhythm";

export type RhythmDictationDraftReviewState =
  | "draft"
  | "checked"
  | "confirmed"
  | "cleared";

export type RhythmDictationDraftV1 = Readonly<{
  schemaVersion: "rhythm-dictation-draft-v1";
  draftId: string;
  questionId: string;
  questionVariantId: string;
  revision: number;
  reviewState: RhythmDictationDraftReviewState;
  localOnly: true;
  sessionOnly: true;
  meter: "4/4";
  allowedOnsetBeats: readonly number[];
  onsetBeats: readonly number[];
  checkedFingerprint: string | null;
}>;

export type RhythmDictationDraftValidation = Readonly<{
  status: "valid" | "invalid";
  fingerprint: string;
  eventCount: number;
  messages: readonly string[];
}>;

const subdivisionsByDifficulty: Record<EarTrainingRhythmDifficulty, readonly number[]> = {
  基础: [0, 0.5],
  进阶: [0, 0.5],
  挑战: [0, 0.25, 1 / 3, 0.5, 2 / 3, 0.75],
};

const normalizeOnset = (value: number) => Math.round(value * 12) / 12;

const uniqueSortedOnsets = (values: readonly number[]) => Array.from(
  new Set(values.map(normalizeOnset)),
).sort((left, right) => left - right);

export const getCanonicalRhythmDictationOnsets = (
  values: readonly number[],
) => uniqueSortedOnsets(values);

const hasOnset = (values: readonly number[], candidate: number) =>
  values.some((value) => Math.abs(value - candidate) < 0.001);

export const getRhythmDictationInputGrid = (
  difficulty: EarTrainingRhythmDifficulty,
): readonly number[] => uniqueSortedOnsets(
  Array.from({ length: 4 }, (_, beat) =>
    subdivisionsByDifficulty[difficulty].map((subdivision) => beat + subdivision),
  ).flat(),
);

export const getRhythmDictationDraftFingerprint = (
  draft: Pick<
    RhythmDictationDraftV1,
    "questionId" | "questionVariantId" | "meter" | "onsetBeats"
  >,
) => JSON.stringify({
  questionId: draft.questionId,
  questionVariantId: draft.questionVariantId,
  meter: draft.meter,
  onsetBeats: uniqueSortedOnsets(draft.onsetBeats),
});

export const getRhythmDictationDocumentId = ({
  question,
  onsetBeats,
}: {
  question: LocalEarTrainingRhythmQuestion;
  onsetBeats: readonly number[];
}) => `local.rhythm-dictation.${question.id}.${question.variantId}.${uniqueSortedOnsets(onsetBeats)
  .map((onset) => Math.round(onset * 12))
  .join("-") || "empty"}`;

export const createRhythmDictationDraft = (
  question: LocalEarTrainingRhythmQuestion,
  attemptId: string,
): RhythmDictationDraftV1 => ({
  schemaVersion: "rhythm-dictation-draft-v1",
  draftId: `rhythm-dictation-draft:${question.variantId}:${question.sequence}:${attemptId}`,
  questionId: question.id,
  questionVariantId: question.variantId,
  revision: 0,
  reviewState: "draft",
  localOnly: true,
  sessionOnly: true,
  meter: "4/4",
  allowedOnsetBeats: getRhythmDictationInputGrid(question.difficulty),
  onsetBeats: [],
  checkedFingerprint: null,
});

export const toggleRhythmDictationDraftOnset = (
  draft: RhythmDictationDraftV1,
  onsetBeat: number,
): RhythmDictationDraftV1 => {
  const normalized = normalizeOnset(onsetBeat);
  if (!hasOnset(draft.allowedOnsetBeats, normalized)) return draft;
  const nextOnsets = hasOnset(draft.onsetBeats, normalized)
    ? draft.onsetBeats.filter((value) => Math.abs(value - normalized) >= 0.001)
    : [...draft.onsetBeats, normalized];
  return {
    ...draft,
    revision: draft.revision + 1,
    reviewState: "draft",
    onsetBeats: uniqueSortedOnsets(nextOnsets),
    checkedFingerprint: null,
  };
};

export const clearRhythmDictationDraft = (
  draft: RhythmDictationDraftV1,
): RhythmDictationDraftV1 => ({
  ...draft,
  revision: draft.revision + 1,
  reviewState: "cleared",
  onsetBeats: [],
  checkedFingerprint: null,
});

export const validateRhythmDictationDraft = (
  draft: RhythmDictationDraftV1,
): RhythmDictationDraftValidation => {
  const messages: string[] = [];
  const unique = uniqueSortedOnsets(draft.onsetBeats);
  if (draft.schemaVersion !== "rhythm-dictation-draft-v1") messages.push("草稿协议版本无效。");
  if (draft.localOnly !== true || draft.sessionOnly !== true) messages.push("草稿越过了本地会话边界。");
  if (draft.meter !== "4/4") messages.push("当前听写草稿只支持四四拍。");
  if (!draft.draftId || !draft.questionId || !draft.questionVariantId) messages.push("草稿缺少题目或尝试身份。");
  if (!Number.isInteger(draft.revision) || draft.revision < 0) messages.push("草稿修订号无效。");
  if (unique.length === 0) messages.push("请先在四拍网格中标记至少一个击拍事件。");
  if (unique.length !== draft.onsetBeats.length) messages.push("草稿包含重复的击拍位置。");
  if (unique.some((onset) => onset < 0 || onset >= 4)) messages.push("草稿包含四拍小节范围外的事件。");
  if (unique.some((onset) => !hasOnset(draft.allowedOnsetBeats, onset))) {
    messages.push("草稿包含当前难度不支持的细分位置。");
  }
  return {
    status: messages.length === 0 ? "valid" : "invalid",
    fingerprint: getRhythmDictationDraftFingerprint(draft),
    eventCount: unique.length,
    messages,
  };
};

export const checkRhythmDictationDraft = (
  draft: RhythmDictationDraftV1,
): RhythmDictationDraftV1 => {
  const validation = validateRhythmDictationDraft(draft);
  if (validation.status !== "valid") return draft;
  return {
    ...draft,
    reviewState: "checked",
    checkedFingerprint: validation.fingerprint,
  };
};

export const confirmRhythmDictationDraft = (
  draft: RhythmDictationDraftV1,
): RhythmDictationDraftV1 => {
  const validation = validateRhythmDictationDraft(draft);
  if (
    draft.reviewState !== "checked"
    || draft.checkedFingerprint !== validation.fingerprint
    || validation.status !== "valid"
  ) return draft;
  return { ...draft, reviewState: "confirmed" };
};

export const canConfirmRhythmDictationDraft = (draft: RhythmDictationDraftV1) => {
  const validation = validateRhythmDictationDraft(draft);
  return draft.reviewState === "checked"
    && draft.checkedFingerprint === validation.fingerprint
    && validation.status === "valid";
};

export const compareRhythmDictationOnsets = ({
  targetOnsetBeats,
  draftOnsetBeats,
}: {
  targetOnsetBeats: readonly number[];
  draftOnsetBeats: readonly number[];
}) => {
  const target = uniqueSortedOnsets(targetOnsetBeats);
  const draft = uniqueSortedOnsets(draftOnsetBeats);
  const missedOnsetBeats = target.filter((onset) => !hasOnset(draft, onset));
  const extraOnsetBeats = draft.filter((onset) => !hasOnset(target, onset));
  return {
    state: missedOnsetBeats.length === 0 && extraOnsetBeats.length === 0
      ? "consistent" as const
      : "different" as const,
    missedOnsetBeats,
    extraOnsetBeats,
  };
};

export const hasRhythmDictationAssessmentFields = (value: object) =>
  ["score", "grade", "pass", "fail", "accuracyPercentage", "assessment"].some(
    (field) => field in value,
  );
