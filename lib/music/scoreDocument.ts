import type {
  NotationDraftEvent,
  NotationTimeSignature,
} from "../practice/localNotationFragmentDraft";
import type { NotationTemporaryPracticeTarget } from "../practice/localNotationDraftPracticeTarget";
import {
  getRhythmDictationDraftFingerprint,
  getRhythmDictationDocumentId,
  getRhythmDictationInputGrid,
  getCanonicalRhythmDictationOnsets,
  validateRhythmDictationDraft,
  type RhythmDictationDraftV1,
} from "../practice/localRhythmDictation";
import type { LocalEarTrainingRhythmQuestion } from "../practice/localEarTrainingRhythm";
import type {
  EarTrainingMelodyNoteId,
  LocalEarTrainingMelodyQuestion,
} from "../practice/localEarTrainingMelodyDictation";
import {
  getMelodyStaffNotationAnswerDocumentId,
  getMelodyStaffNotationDraftFingerprint,
  validateMelodyStaffNotationDraft,
  type MelodyStaffNotationDraftV1,
} from "../practice/localMelodyStaffNotationDraft";
import {
  MELODY_NUMBERED_NOTATION_CONTEXT,
  getMelodyNumberedNotationAnswerDocumentId,
  getMelodyNumberedNotationDraftFingerprint,
  validateMelodyNumberedNotationDraft,
  type MelodyNumberedNotationDraftV1,
} from "../practice/localMelodyNumberedNotationDraft";

export type ScoreDocumentEventV1 = Readonly<
  Omit<NotationDraftEvent, "measure"> & {
    measure: number;
  }
>;

export type NotationScoreDocumentV1 = Readonly<{
  schemaVersion: "score-document-v1";
  documentKind: "notation-fragment";
  documentId: string;
  revision: number;
  reviewState: "confirmed";
  localOnly: true;
  sessionOnly: true;
  source: {
    kind: "confirmed-notation-practice-target";
    draftFingerprint: string;
  };
  meter: NotationTimeSignature;
  parts: readonly [
    Readonly<{
      partId: "part-1";
      staves: readonly [
        Readonly<{
          staffId: "staff-1";
          staffKind: "pitched";
          clef: "treble";
          voices: readonly [
            Readonly<{
              voiceId: "voice-1";
              measures: readonly Readonly<{
                measureNumber: number;
                events: readonly ScoreDocumentEventV1[];
              }>[];
            }>,
          ];
        }>,
      ];
    }>,
  ];
}>;

export type LocalNotationProjectScoreDocumentV1 = Readonly<{
  schemaVersion: "score-document-v1";
  documentKind: "notation-project";
  documentId: string;
  revision: number;
  reviewState: "draft";
  localOnly: true;
  sessionOnly: false;
  source: Readonly<{
    kind: "local-score-project";
    projectId: string;
  }>;
  meter: NotationTimeSignature;
  parts: readonly Readonly<{
    partId: string;
    staves: readonly Readonly<{
      staffId: string;
      staffKind: "pitched";
      clef: "treble";
      voices: readonly Readonly<{
        voiceId: string;
        measures: readonly Readonly<{
          measureNumber: number;
          events: readonly ScoreDocumentEventV1[];
        }>[];
      }>[];
    }>[];
  }>[];
}>;

export type RhythmDictationScoreDocumentV1 = Readonly<{
  schemaVersion: "score-document-v1";
  documentKind: "rhythm-dictation";
  documentId: string;
  revision: 1;
  reviewState: "confirmed";
  localOnly: true;
  sessionOnly: true;
  source: Readonly<{
    kind: "confirmed-rhythm-dictation-draft";
    draftFingerprint: string;
    questionId: string;
    questionVariantId: string;
  }>;
  meter: "4/4";
  parts: readonly [Readonly<{
    partId: "rhythm-part-1";
    staves: readonly [Readonly<{
      staffId: "rhythm-staff-1";
      staffKind: "rhythm";
      voices: readonly [Readonly<{
        voiceId: "rhythm-voice-1";
        measures: readonly [Readonly<{
          measureNumber: 1;
          events: readonly Readonly<{
            eventId: string;
            type: "rhythm-hit";
            onsetBeat: number;
          }>[];
        }>];
      }>];
    }>];
  }>];
}>;

export type MelodyDictationAnswerScoreDocumentV1 = Readonly<{
  schemaVersion: "score-document-v1";
  documentKind: "melody-dictation-answer";
  documentId: string;
  revision: number;
  reviewState: "confirmed";
  localOnly: true;
  sessionOnly: true;
  source: Readonly<{
    kind: "confirmed-melody-staff-notation-draft";
    draftId: string;
    draftFingerprint: string;
    questionId: string;
    questionVariantId: string;
    attemptId: string;
    playbackQualificationId: string;
  }>;
  meter: "unmetered";
  parts: readonly [Readonly<{
    partId: "melody-answer-part-1";
    staves: readonly [Readonly<{
      staffId: "melody-answer-staff-1";
      staffKind: "pitched";
      clef: "treble";
      voices: readonly [Readonly<{
        voiceId: "melody-answer-voice-1";
        measures: readonly [Readonly<{
          measureNumber: 1;
          events: readonly Readonly<{
            eventId: string;
            type: "note";
            position: 0 | 1 | 2;
            noteId: EarTrainingMelodyNoteId;
          }>[];
        }>];
      }>];
    }>];
  }>];
}>;

export type MelodyDictationNumberedAnswerScoreDocumentV1 = Readonly<{
  schemaVersion: "score-document-v1";
  documentKind: "melody-dictation-numbered-answer";
  documentId: string;
  revision: number;
  reviewState: "confirmed";
  localOnly: true;
  sessionOnly: true;
  source: Readonly<{
    kind: "confirmed-melody-numbered-notation-draft";
    representationContext: typeof MELODY_NUMBERED_NOTATION_CONTEXT;
    draftId: string;
    draftFingerprint: string;
    questionId: string;
    questionVariantId: string;
    attemptId: string;
    playbackQualificationId: string;
  }>;
  meter: "unmetered";
  parts: readonly [Readonly<{
    partId: "melody-numbered-answer-part-1";
    staves: readonly [Readonly<{
      staffId: "melody-numbered-answer-staff-1";
      staffKind: "numbered-notation";
      voices: readonly [Readonly<{
        voiceId: "melody-numbered-answer-voice-1";
        measures: readonly [Readonly<{
          measureNumber: 1;
          events: readonly Readonly<{
            eventId: string;
            type: "note";
            position: 0 | 1 | 2;
            noteId: EarTrainingMelodyNoteId;
          }>[];
        }>];
      }>];
    }>];
  }>];
}>;

export type ScoreDocumentV1 =
  | NotationScoreDocumentV1
  | LocalNotationProjectScoreDocumentV1
  | RhythmDictationScoreDocumentV1
  | MelodyDictationAnswerScoreDocumentV1
  | MelodyDictationNumberedAnswerScoreDocumentV1;

export function createScoreDocumentFromMelodyNumberedNotationDraft({
  question,
  draft,
}: {
  question: LocalEarTrainingMelodyQuestion;
  draft: MelodyNumberedNotationDraftV1;
}): MelodyDictationNumberedAnswerScoreDocumentV1 {
  const validation = validateMelodyNumberedNotationDraft(draft);
  const fingerprint = getMelodyNumberedNotationDraftFingerprint(draft);
  if (
    draft.reviewState !== "confirmed"
    || validation.status !== "valid"
    || draft.checkedFingerprint !== fingerprint
    || draft.questionId !== question.id
    || draft.questionVariantId !== question.variantId
  ) {
    throw new Error("只有属于当前题目、通过检查并明确确认的简谱旋律草稿才能冻结为答案文档。");
  }
  const noteIds = draft.noteIds;
  if (noteIds.some((noteId) => noteId === null)) {
    throw new Error("简谱旋律答案文档缺少音符。");
  }
  const confirmedNoteIds = noteIds as readonly [
    EarTrainingMelodyNoteId,
    EarTrainingMelodyNoteId,
    EarTrainingMelodyNoteId,
  ];
  return {
    schemaVersion: "score-document-v1",
    documentKind: "melody-dictation-numbered-answer",
    documentId: getMelodyNumberedNotationAnswerDocumentId({
      representationContext: draft.representationContext,
      questionId: draft.questionId,
      questionVariantId: draft.questionVariantId,
      attemptId: draft.attemptId,
      playbackQualificationId: draft.playbackQualificationId,
      revision: draft.revision,
      noteIds: confirmedNoteIds,
    }),
    revision: draft.revision,
    reviewState: "confirmed",
    localOnly: true,
    sessionOnly: true,
    source: {
      kind: "confirmed-melody-numbered-notation-draft",
      representationContext: draft.representationContext,
      draftId: draft.draftId,
      draftFingerprint: fingerprint,
      questionId: draft.questionId,
      questionVariantId: draft.questionVariantId,
      attemptId: draft.attemptId,
      playbackQualificationId: draft.playbackQualificationId,
    },
    meter: "unmetered",
    parts: [{
      partId: "melody-numbered-answer-part-1",
      staves: [{
        staffId: "melody-numbered-answer-staff-1",
        staffKind: "numbered-notation",
        voices: [{
          voiceId: "melody-numbered-answer-voice-1",
          measures: [{
            measureNumber: 1,
            events: confirmedNoteIds.map((noteId, position) => ({
              eventId: `melody-numbered-answer-note-${position + 1}`,
              type: "note" as const,
              position: position as 0 | 1 | 2,
              noteId,
            })),
          }],
        }],
      }],
    }],
  };
}

export function createScoreDocumentFromMelodyStaffNotationDraft({
  question,
  draft,
}: {
  question: LocalEarTrainingMelodyQuestion;
  draft: MelodyStaffNotationDraftV1;
}): MelodyDictationAnswerScoreDocumentV1 {
  const validation = validateMelodyStaffNotationDraft(draft);
  const fingerprint = getMelodyStaffNotationDraftFingerprint(draft);
  if (
    draft.reviewState !== "confirmed"
    || validation.status !== "valid"
    || draft.checkedFingerprint !== fingerprint
    || draft.questionId !== question.id
    || draft.questionVariantId !== question.variantId
  ) {
    throw new Error("只有属于当前题目、通过检查并明确确认的五线谱旋律草稿才能冻结为答案文档。");
  }
  const noteIds = draft.noteIds;
  if (noteIds.some((noteId) => noteId === null)) {
    throw new Error("五线谱旋律答案文档缺少音符。");
  }
  const confirmedNoteIds = noteIds as readonly [
    EarTrainingMelodyNoteId,
    EarTrainingMelodyNoteId,
    EarTrainingMelodyNoteId,
  ];
  return {
    schemaVersion: "score-document-v1",
    documentKind: "melody-dictation-answer",
    documentId: getMelodyStaffNotationAnswerDocumentId({
      questionId: draft.questionId,
      questionVariantId: draft.questionVariantId,
      attemptId: draft.attemptId,
      playbackQualificationId: draft.playbackQualificationId,
      revision: draft.revision,
      noteIds: confirmedNoteIds,
    }),
    revision: draft.revision,
    reviewState: "confirmed",
    localOnly: true,
    sessionOnly: true,
    source: {
      kind: "confirmed-melody-staff-notation-draft",
      draftId: draft.draftId,
      draftFingerprint: fingerprint,
      questionId: draft.questionId,
      questionVariantId: draft.questionVariantId,
      attemptId: draft.attemptId,
      playbackQualificationId: draft.playbackQualificationId,
    },
    meter: "unmetered",
    parts: [{
      partId: "melody-answer-part-1",
      staves: [{
        staffId: "melody-answer-staff-1",
        staffKind: "pitched",
        clef: "treble",
        voices: [{
          voiceId: "melody-answer-voice-1",
          measures: [{
            measureNumber: 1,
            events: confirmedNoteIds.map((noteId, position) => ({
              eventId: `melody-answer-note-${position + 1}`,
              type: "note" as const,
              position: position as 0 | 1 | 2,
              noteId,
            })),
          }],
        }],
      }],
    }],
  };
}

export function createScoreDocumentFromRhythmDictationDraft({
  question,
  draft,
}: {
  question: LocalEarTrainingRhythmQuestion;
  draft: RhythmDictationDraftV1;
}): RhythmDictationScoreDocumentV1 {
  const fingerprint = getRhythmDictationDraftFingerprint(draft);
  const validation = validateRhythmDictationDraft(draft);
  const canonicalOnsets = getCanonicalRhythmDictationOnsets(draft.onsetBeats);
  const expectedGrid = getRhythmDictationInputGrid(question.difficulty);
  const hasExpectedGrid = expectedGrid.length === draft.allowedOnsetBeats.length
    && expectedGrid.every((onset, index) =>
      Math.abs(onset - draft.allowedOnsetBeats[index]) < 0.001
    );
  if (
    draft.reviewState !== "confirmed"
    || draft.checkedFingerprint !== fingerprint
    || validation.status !== "valid"
    || draft.questionId !== question.id
    || draft.questionVariantId !== question.variantId
    || !hasExpectedGrid
  ) {
    throw new Error("只有属于当前题目、通过完整校验并确认的节奏听写草稿才能冻结为谱面文档。");
  }
  return {
    schemaVersion: "score-document-v1",
    documentKind: "rhythm-dictation",
    documentId: getRhythmDictationDocumentId({ question, onsetBeats: draft.onsetBeats }),
    revision: 1,
    reviewState: "confirmed",
    localOnly: true,
    sessionOnly: true,
    source: {
      kind: "confirmed-rhythm-dictation-draft",
      draftFingerprint: fingerprint,
      questionId: draft.questionId,
      questionVariantId: draft.questionVariantId,
    },
    meter: "4/4",
    parts: [{
      partId: "rhythm-part-1",
      staves: [{
        staffId: "rhythm-staff-1",
        staffKind: "rhythm",
        voices: [{
          voiceId: "rhythm-voice-1",
          measures: [{
            measureNumber: 1,
            events: canonicalOnsets.map((onsetBeat, index) => ({
              eventId: `rhythm-dictation-event-${index + 1}`,
              type: "rhythm-hit",
              onsetBeat,
            })),
          }],
        }],
      }],
    }],
  };
}

const cloneEvent = (event: NotationDraftEvent): ScoreDocumentEventV1 => ({
  ...event,
});

export function createScoreDocumentFromNotationTarget(
  target: NotationTemporaryPracticeTarget,
): NotationScoreDocumentV1 {
  if (target.status !== "active" || target.events.length === 0) {
    throw new Error("只有已确认且仍有效的临时乐谱目标才能冻结为谱面文档。");
  }

  const measureNumbers = Array.from(
    new Set(target.events.map((event) => event.measure)),
  ).sort(
    (left, right) => left - right,
  );
  const measures = measureNumbers.map((measureNumber) => ({
    measureNumber,
    events: target.events
      .filter((event) => event.measure === measureNumber)
      .map(cloneEvent),
  }));

  return {
    schemaVersion: "score-document-v1",
    documentKind: "notation-fragment",
    documentId: `local.score-document.${target.draftFingerprint}`,
    revision: 1,
    reviewState: "confirmed",
    localOnly: true,
    sessionOnly: true,
    source: {
      kind: "confirmed-notation-practice-target",
      draftFingerprint: target.draftFingerprint,
    },
    meter: target.timeSignature,
    parts: [
      {
        partId: "part-1",
        staves: [
          {
            staffId: "staff-1",
            staffKind: "pitched",
            clef: "treble",
            voices: [
              {
                voiceId: "voice-1",
                measures,
              },
            ],
          },
        ],
      },
    ],
  };
}

const numberedPitchLabels: Record<NonNullable<NotationDraftEvent["pitch"]>, string> = {
  C4: "1",
  D4: "2",
  E4: "3",
  F4: "4",
  G4: "5",
  A4: "6",
  B4: "7",
  C5: "1·",
};

const durationSuffixes: Record<NotationDraftEvent["duration"], string> = {
  half: " —",
  quarter: "",
  eighth: "_",
};

export function getScoreDocumentPresentation(
  document: NotationScoreDocumentV1,
  mode: "staff-notation" | "numbered-notation",
) {
  const measures = document.parts[0].staves[0].voices[0].measures;
  return measures.map((measure) => ({
    measureNumber: measure.measureNumber,
    tokens: measure.events.map((event) => {
      const base =
        event.type === "rest"
          ? mode === "staff-notation"
            ? "四分休止符"
            : "0"
          : mode === "staff-notation"
            ? event.pitch ?? "未知音高"
            : numberedPitchLabels[event.pitch!];
      return `${base}${durationSuffixes[event.duration]}`;
    }),
  }));
}
