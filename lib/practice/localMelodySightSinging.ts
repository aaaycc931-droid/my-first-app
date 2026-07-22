import {
  earTrainingMelodyNotes,
  type EarTrainingMelodyNoteId,
} from "./localEarTrainingMelodyDictation";
import {
  getLocalMelodyImitationP113Targets,
  validateLocalMelodyImitationTimeline,
  type LocalMelodyImitationTimeline,
  type LocalMelodyImitationTimelineEvent,
} from "./localMelodyImitation";
import type { OfflineAlignmentTarget } from "./offlineNoteAlignment";

export const LOCAL_MELODY_SIGHT_SINGING_TARGET_VERSION = "local-melody-sight-singing-target-v1";
export const LOCAL_MELODY_SIGHT_SINGING_PRESENTATION_VERSION = "local-melody-sight-singing-presentation-v1";

export type LocalMelodySightSingingEvent = LocalMelodyImitationTimelineEvent;

export type LocalMelodySightSingingTarget = Readonly<{
  targetVersion: string;
  presentationVersion: string;
  timelineVersion: string;
  targetId: string;
  timedTargetId: string;
  visiblePresentationId: string;
  questionId: string;
  variantId: string;
  difficulty: LocalMelodyImitationTimeline["difficulty"];
  sequence: number;
  bpm: number;
  meter: LocalMelodyImitationTimeline["meter"];
  countIn: LocalMelodyImitationTimeline["countIn"];
  recordingZeroMs: number;
  events: LocalMelodyImitationTimeline["events"];
  phrase: LocalMelodyImitationTimeline["phrase"];
  recordingWindow: LocalMelodyImitationTimeline["recordingWindow"];
  totalWindowMs: number;
  clef: "treble";
  solfegeSystem: "fixed-do";
}>;

export type LocalMelodySightSingingPresentationEvent = Readonly<{
  position: 0 | 1 | 2;
  noteId: EarTrainingMelodyNoteId;
  noteLabel: string;
  fixedSolfegeToken: "do4" | "re4" | "mi4" | "fa4" | "fi4" | "sol4" | "la4" | "ti4" | "do5";
  fixedSolfegeLabel: "do" | "re" | "mi" | "fa" | "升 fa" | "sol" | "la" | "si" | "高音 do";
  staffStepFromBottomLine: -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;
  accidental: "sharp" | null;
  ledgerLine: "c4-below-staff" | null;
  accessibleLabel: string;
}>;

const NOTE_PRESENTATION: Readonly<Record<
  EarTrainingMelodyNoteId,
  Omit<LocalMelodySightSingingPresentationEvent, "position" | "noteId" | "noteLabel" | "accessibleLabel">
>> = {
  c4: { fixedSolfegeToken: "do4", fixedSolfegeLabel: "do", staffStepFromBottomLine: -2, accidental: null, ledgerLine: "c4-below-staff" },
  d4: { fixedSolfegeToken: "re4", fixedSolfegeLabel: "re", staffStepFromBottomLine: -1, accidental: null, ledgerLine: null },
  e4: { fixedSolfegeToken: "mi4", fixedSolfegeLabel: "mi", staffStepFromBottomLine: 0, accidental: null, ledgerLine: null },
  f4: { fixedSolfegeToken: "fa4", fixedSolfegeLabel: "fa", staffStepFromBottomLine: 1, accidental: null, ledgerLine: null },
  "f-sharp-4": { fixedSolfegeToken: "fi4", fixedSolfegeLabel: "升 fa", staffStepFromBottomLine: 1, accidental: "sharp", ledgerLine: null },
  g4: { fixedSolfegeToken: "sol4", fixedSolfegeLabel: "sol", staffStepFromBottomLine: 2, accidental: null, ledgerLine: null },
  a4: { fixedSolfegeToken: "la4", fixedSolfegeLabel: "la", staffStepFromBottomLine: 3, accidental: null, ledgerLine: null },
  b4: { fixedSolfegeToken: "ti4", fixedSolfegeLabel: "si", staffStepFromBottomLine: 4, accidental: null, ledgerLine: null },
  c5: { fixedSolfegeToken: "do5", fixedSolfegeLabel: "高音 do", staffStepFromBottomLine: 5, accidental: null, ledgerLine: null },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(`Invalid local melody sight-singing target: ${message}`);
};

const stableHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const targetIdentityPayload = (
  target: Omit<LocalMelodySightSingingTarget, "targetId" | "visiblePresentationId">,
): string => JSON.stringify({
  targetVersion: target.targetVersion,
  presentationVersion: target.presentationVersion,
  timelineVersion: target.timelineVersion,
  timedTargetId: target.timedTargetId,
  questionId: target.questionId,
  variantId: target.variantId,
  difficulty: target.difficulty,
  sequence: target.sequence,
  bpm: target.bpm,
  meter: target.meter,
  countIn: target.countIn,
  recordingZeroMs: target.recordingZeroMs,
  events: target.events,
  phrase: target.phrase,
  recordingWindow: target.recordingWindow,
  totalWindowMs: target.totalWindowMs,
  clef: target.clef,
  solfegeSystem: target.solfegeSystem,
});

const createTargetId = (
  target: Omit<LocalMelodySightSingingTarget, "targetId" | "visiblePresentationId">,
): string => `local-melody-sight-singing:${stableHash(targetIdentityPayload(target))}`;

const presentationForEvents = (
  events: LocalMelodySightSingingTarget["events"],
): readonly [
  LocalMelodySightSingingPresentationEvent,
  LocalMelodySightSingingPresentationEvent,
  LocalMelodySightSingingPresentationEvent,
] => events.map((event) => {
  const noteLabel = earTrainingMelodyNotes[event.noteId].label;
  const presentation = NOTE_PRESENTATION[event.noteId];
  return {
    position: event.position,
    noteId: event.noteId,
    noteLabel,
    ...presentation,
    accessibleLabel: `第 ${event.position + 1} 个音：${noteLabel}，固定唱名 ${presentation.fixedSolfegeLabel}`,
  };
}) as unknown as readonly [
  LocalMelodySightSingingPresentationEvent,
  LocalMelodySightSingingPresentationEvent,
  LocalMelodySightSingingPresentationEvent,
];

const createVisiblePresentationId = ({
  targetId,
  presentationVersion,
  events,
}: Pick<LocalMelodySightSingingTarget, "targetId" | "presentationVersion" | "events">): string =>
  `local-melody-sight-singing-presentation:${stableHash(JSON.stringify({
    targetId,
    presentationVersion,
    clef: "treble",
    solfegeSystem: "fixed-do",
    events: presentationForEvents(events),
  }))}`;

const asImitationTimeline = (target: LocalMelodySightSingingTarget): LocalMelodyImitationTimeline => ({
  timelineVersion: target.timelineVersion,
  targetId: target.timedTargetId,
  questionId: target.questionId,
  variantId: target.variantId,
  difficulty: target.difficulty,
  sequence: target.sequence,
  bpm: target.bpm,
  meter: target.meter,
  countIn: target.countIn,
  recordingZeroMs: target.recordingZeroMs,
  events: target.events,
  phrase: target.phrase,
  recordingWindow: target.recordingWindow,
  totalWindowMs: target.totalWindowMs,
});

export const createLocalMelodySightSingingTarget = ({
  timeline,
  targetVersion = LOCAL_MELODY_SIGHT_SINGING_TARGET_VERSION,
  presentationVersion = LOCAL_MELODY_SIGHT_SINGING_PRESENTATION_VERSION,
}: {
  timeline: LocalMelodyImitationTimeline;
  targetVersion?: string;
  presentationVersion?: string;
}): LocalMelodySightSingingTarget => {
  const validTimeline = validateLocalMelodyImitationTimeline(timeline);
  assert(typeof targetVersion === "string" && targetVersion.length > 0, "targetVersion is required.");
  assert(typeof presentationVersion === "string" && presentationVersion.length > 0, "presentationVersion is required.");
  const withoutIds: Omit<LocalMelodySightSingingTarget, "targetId" | "visiblePresentationId"> = {
    targetVersion,
    presentationVersion,
    timelineVersion: validTimeline.timelineVersion,
    timedTargetId: validTimeline.targetId,
    questionId: validTimeline.questionId,
    variantId: validTimeline.variantId,
    difficulty: validTimeline.difficulty,
    sequence: validTimeline.sequence,
    bpm: validTimeline.bpm,
    meter: validTimeline.meter,
    countIn: validTimeline.countIn,
    recordingZeroMs: validTimeline.recordingZeroMs,
    events: validTimeline.events,
    phrase: validTimeline.phrase,
    recordingWindow: validTimeline.recordingWindow,
    totalWindowMs: validTimeline.totalWindowMs,
    clef: "treble",
    solfegeSystem: "fixed-do",
  };
  const targetId = createTargetId(withoutIds);
  return validateLocalMelodySightSingingTarget({
    ...withoutIds,
    targetId,
    visiblePresentationId: createVisiblePresentationId({
      targetId,
      presentationVersion,
      events: validTimeline.events,
    }),
  });
};

export const validateLocalMelodySightSingingTarget = (
  value: unknown,
): LocalMelodySightSingingTarget => {
  assert(isRecord(value), "target must be an object.");
  assert(typeof value.targetVersion === "string" && value.targetVersion.length > 0, "targetVersion is required.");
  assert(typeof value.presentationVersion === "string" && value.presentationVersion.length > 0, "presentationVersion is required.");
  assert(typeof value.timelineVersion === "string" && value.timelineVersion.length > 0, "timelineVersion is required.");
  assert(typeof value.targetId === "string" && value.targetId.length > 0, "targetId is required.");
  assert(typeof value.timedTargetId === "string" && value.timedTargetId.length > 0, "timedTargetId is required.");
  assert(typeof value.visiblePresentationId === "string" && value.visiblePresentationId.length > 0, "visiblePresentationId is required.");
  assert(value.clef === "treble", "clef must be treble.");
  assert(value.solfegeSystem === "fixed-do", "solfegeSystem must be fixed-do.");

  const target = value as unknown as LocalMelodySightSingingTarget;
  const validTimeline = validateLocalMelodyImitationTimeline({
    ...asImitationTimeline(target),
    timelineVersion: target.timelineVersion,
  });
  assert(validTimeline.targetId === target.timedTargetId, "timed target identity does not match canonical timing content.");
  const { targetId: _targetId, visiblePresentationId: _visiblePresentationId, ...withoutIds } = target;
  assert(target.targetId === createTargetId(withoutIds), "target identity does not match canonical content.");
  assert(
    target.visiblePresentationId === createVisiblePresentationId(target),
    "visible presentation identity does not match target content.",
  );
  assert(presentationForEvents(target.events).length === 3, "exactly three presentation events are required.");
  return target;
};

export const validateLocalMelodySightSingingTargetMatch = ({
  presentationTarget,
  analysisTarget,
}: {
  presentationTarget: unknown;
  analysisTarget: unknown;
}): LocalMelodySightSingingTarget => {
  const presentation = validateLocalMelodySightSingingTarget(presentationTarget);
  const analysis = validateLocalMelodySightSingingTarget(analysisTarget);
  assert(
    presentation.targetId === analysis.targetId
      && presentation.visiblePresentationId === analysis.visiblePresentationId
      && targetIdentityPayload(presentation) === targetIdentityPayload(analysis),
    "presentation and analysis targets do not match.",
  );
  return analysis;
};

export const getLocalMelodySightSingingPresentation = (
  target: LocalMelodySightSingingTarget,
): readonly [
  LocalMelodySightSingingPresentationEvent,
  LocalMelodySightSingingPresentationEvent,
  LocalMelodySightSingingPresentationEvent,
] => presentationForEvents(validateLocalMelodySightSingingTarget(target).events);

export const getLocalMelodySightSingingP113Targets = (
  target: LocalMelodySightSingingTarget,
): OfflineAlignmentTarget[] => {
  const valid = validateLocalMelodySightSingingTarget(target);
  return getLocalMelodyImitationP113Targets(asImitationTimeline(valid)).map((p113Target) => ({
    ...p113Target,
    targetId: `${valid.targetId}:position-${p113Target.index}`,
  }));
};
