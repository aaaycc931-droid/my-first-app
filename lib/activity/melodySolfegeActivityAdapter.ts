import type { ActivityAnswer } from "./activityAnswer";
import type { ActivityDefinitionV1 } from "./activityDefinition";
import type { ActivityCheckEvidence } from "./activitySession";

export const FIXED_SOLFEGE_TOKEN_BY_NOTE_ID = {
  c4: "do4",
  d4: "re4",
  e4: "mi4",
  f4: "fa4",
  "f-sharp-4": "fi4",
  g4: "sol4",
  a4: "la4",
  b4: "ti4",
  c5: "do5",
} as const;

export type FixedSolfegeNoteId = keyof typeof FIXED_SOLFEGE_TOKEN_BY_NOTE_ID;
export type FixedSolfegeToken = (typeof FIXED_SOLFEGE_TOKEN_BY_NOTE_ID)[FixedSolfegeNoteId];

const NOTE_ID_BY_FIXED_SOLFEGE_TOKEN = Object.fromEntries(
  Object.entries(FIXED_SOLFEGE_TOKEN_BY_NOTE_ID).map(([noteId, token]) => [token, noteId]),
) as Record<FixedSolfegeToken, FixedSolfegeNoteId>;

const isFixedSolfegeNoteId = (noteId: string): noteId is FixedSolfegeNoteId =>
  noteId in FIXED_SOLFEGE_TOKEN_BY_NOTE_ID;

const isFixedSolfegeToken = (token: string): token is FixedSolfegeToken =>
  token in NOTE_ID_BY_FIXED_SOLFEGE_TOKEN;

const insufficient = (explanation: string): ActivityCheckEvidence => ({
  state: "insufficient",
  assessmentMode: "non-scoring",
  explanation,
});

/**
 * Adds fixed-solfege as an allowed representation while retaining the existing
 * ordered choice answer as the canonical three-note target.
 */
export const enableMelodyFixedSolfegeInput = (
  definition: ActivityDefinitionV1,
): ActivityDefinitionV1 => {
  const expected = definition.target.expectedAnswer;
  if (
    definition.family !== "melody-dictation"
    || expected.mode !== "choice"
    || definition.target.answerPolicy?.choiceOrder !== "ordered"
    || expected.optionIds.length !== 3
    || !expected.optionIds.every(isFixedSolfegeNoteId)
  ) {
    throw new Error("固定唱名输入只支持当前三音、有序且音域明确的旋律听写活动。");
  }

  return {
    ...definition,
    allowedInputModes: Array.from(new Set([
      ...definition.allowedInputModes,
      "choice" as const,
      "solfege" as const,
    ])),
  };
};

export const createFixedSolfegeAnswer = (
  noteIds: readonly string[],
): ActivityAnswer | null => {
  if (noteIds.length !== 3 || !noteIds.every(isFixedSolfegeNoteId)) return null;
  return {
    mode: "solfege",
    tokens: noteIds.map((noteId) => FIXED_SOLFEGE_TOKEN_BY_NOTE_ID[noteId]),
  };
};

export const adaptFixedSolfegeAnswerToActivityEvidence = ({
  definition,
  answer,
}: {
  definition: ActivityDefinitionV1;
  answer: ActivityAnswer | undefined;
}): ActivityCheckEvidence => {
  const expected = definition.target.expectedAnswer;
  if (
    definition.family !== "melody-dictation"
    || expected.mode !== "choice"
    || definition.target.answerPolicy?.choiceOrder !== "ordered"
    || expected.optionIds.length !== 3
    || !expected.optionIds.every(isFixedSolfegeNoteId)
  ) {
    return insufficient("当前旋律目标无法可靠转换为固定唱名进行检查。");
  }
  if (!definition.allowedInputModes.includes("solfege")) {
    return insufficient("当前活动没有启用固定唱名输入。");
  }
  if (!answer || answer.mode !== "solfege") {
    return insufficient("当前没有可供检查的固定唱名答案。");
  }
  if (answer.tokens.length !== expected.optionIds.length || !answer.tokens.every(isFixedSolfegeToken)) {
    return insufficient("固定唱名答案不完整或包含当前音域不支持的内容，无法可靠检查。");
  }

  const actualNoteIds = answer.tokens.map((token) => NOTE_ID_BY_FIXED_SOLFEGE_TOKEN[token]);
  const consistent = expected.optionIds.every(
    (noteId, index) => actualNoteIds[index] === noteId,
  );
  return {
    state: consistent ? "consistent" : "different",
    assessmentMode: "non-scoring",
    explanation: consistent
      ? "本轮固定唱名的音高、顺序与重复音均和当前三音旋律一致；这不是正式评分。"
      : "本轮固定唱名与当前三音旋律的音高或顺序存在差异，请重听后重新尝试。",
  };
};
