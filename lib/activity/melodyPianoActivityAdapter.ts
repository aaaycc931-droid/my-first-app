import type { ActivityAnswer } from "./activityAnswer";
import type { ActivityDefinitionV1 } from "./activityDefinition";
import type { ActivityCheckEvidence } from "./activitySession";
import {
  earTrainingMelodyNotes,
  type EarTrainingMelodyNoteId,
} from "../practice/localEarTrainingMelodyDictation";
import type { NoteEventV1 } from "../music/noteEvent";
import { adaptScreenPianoNoteEventsToNoteIds } from "./pianoNoteEventActivityAdapter";

const MELODY_NOTE_ID_BY_SCIENTIFIC_NAME: Record<string, EarTrainingMelodyNoteId> = {
  C4: "c4",
  D4: "d4",
  E4: "e4",
  F4: "f4",
  "F#4": "f-sharp-4",
  G4: "g4",
  A4: "a4",
  B4: "b4",
  C5: "c5",
};

const isMelodyPianoNoteId = (noteId: string): noteId is EarTrainingMelodyNoteId =>
  Object.prototype.hasOwnProperty.call(earTrainingMelodyNotes, noteId);

const hasSupportedOrderedTarget = (definition: ActivityDefinitionV1) => {
  const expected = definition.target.expectedAnswer;
  return definition.family === "melody-dictation"
    && expected.mode === "choice"
    && definition.target.answerPolicy?.choiceOrder === "ordered"
    && expected.optionIds.length === 3
    && expected.optionIds.every(isMelodyPianoNoteId);
};

const insufficient = (explanation: string): ActivityCheckEvidence => ({
  state: "insufficient",
  assessmentMode: "non-scoring",
  explanation,
});

export const createMelodyPianoInputOriginId = ({
  questionVariantId,
  attemptId,
  inputRun,
}: {
  questionVariantId: string;
  attemptId: string;
  inputRun: number;
}): string => {
  if (!questionVariantId.trim() || !attemptId.trim() || !Number.isSafeInteger(inputRun) || inputRun < 1) {
    throw new Error("屏幕钢琴输入来源缺少题目、尝试或有效运行序号。");
  }
  return `melody-piano:${questionVariantId}:${attemptId}:run-${inputRun}`;
};

/**
 * Enables screen-piano input while retaining the existing ordered note-id
 * sequence as the canonical three-note melody target.
 */
export const enableMelodyPianoInput = (
  definition: ActivityDefinitionV1,
): ActivityDefinitionV1 => {
  if (!hasSupportedOrderedTarget(definition)) {
    throw new Error("屏幕钢琴输入只支持当前三音、有序且音域明确的旋律听写活动。");
  }

  return {
    ...definition,
    allowedInputModes: Array.from(new Set([
      ...definition.allowedInputModes,
      "choice" as const,
      "piano" as const,
    ])),
  };
};

export const createMelodyPianoAnswer = (
  noteIds: readonly string[],
): ActivityAnswer | null => {
  if (noteIds.length !== 3 || !noteIds.every(isMelodyPianoNoteId)) return null;
  return { mode: "piano", noteIds: [...noteIds] };
};

export const adaptMelodyScreenPianoNoteEventsToNoteIds = (
  events: readonly NoteEventV1[],
  expectedOriginId: string,
): EarTrainingMelodyNoteId[] | null => {
  if (!expectedOriginId.trim()) return null;
  const noteOnEvents = events.filter(
    (event) => event.type === "note-on" && event.source.producer === "screen-piano",
  );
  if (
    noteOnEvents.some((event) => event.time.originId !== expectedOriginId)
    || new Set(noteOnEvents.map((event) => event.eventId)).size !== noteOnEvents.length
    || new Set(noteOnEvents.map((event) => event.sequence)).size !== noteOnEvents.length
  ) return null;
  const orderedEvents = [...noteOnEvents].sort((left, right) => left.sequence - right.sequence);
  if (orderedEvents.some((event, index) => event.sequence !== index)) return null;
  const noteIds = adaptScreenPianoNoteEventsToNoteIds(orderedEvents).flatMap((scientificName) => {
  const noteId = MELODY_NOTE_ID_BY_SCIENTIFIC_NAME[scientificName];
  return noteId ? [noteId] : [];
});
  return noteIds.length === orderedEvents.length ? noteIds : null;
};

export const createMelodyPianoAnswerFromNoteEvents = (
  events: readonly NoteEventV1[],
  expectedOriginId: string,
): ActivityAnswer | null => {
  const noteIds = adaptMelodyScreenPianoNoteEventsToNoteIds(events, expectedOriginId);
  return noteIds ? createMelodyPianoAnswer(noteIds) : null;
};

export const adaptMelodyPianoAnswerToActivityEvidence = ({
  definition,
  answer,
}: {
  definition: ActivityDefinitionV1;
  answer: ActivityAnswer | undefined;
}): ActivityCheckEvidence => {
  if (!hasSupportedOrderedTarget(definition)) {
    return insufficient("当前旋律目标无法可靠转换为屏幕钢琴音符序列进行检查。");
  }
  if (!definition.allowedInputModes.includes("piano")) {
    return insufficient("当前活动没有启用屏幕钢琴输入。");
  }
  if (!answer || answer.mode !== "piano") {
    return insufficient("当前没有可供检查的屏幕钢琴答案。");
  }
  if (
    answer.noteIds.length !== 3
    || !answer.noteIds.every(isMelodyPianoNoteId)
  ) {
    return insufficient("屏幕钢琴答案不完整或包含当前音域不支持的音符，无法可靠检查。");
  }

  const expected = definition.target.expectedAnswer;
  if (expected.mode !== "choice") {
    return insufficient("当前旋律目标没有可检查的有序音高答案。");
  }
  const consistent = expected.optionIds.every(
    (noteId, index) => answer.noteIds[index] === noteId,
  );
  return {
    state: consistent ? "consistent" : "different",
    assessmentMode: "non-scoring",
    explanation: consistent
      ? "本轮屏幕钢琴输入的三个音高、顺序与重复音均和当前旋律一致；这不是正式评分。"
      : "本轮屏幕钢琴输入与当前旋律的音高或顺序存在差异，请重听后重新尝试。",
  };
};
