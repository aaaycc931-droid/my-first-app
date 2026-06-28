/**
 * This is a type-only planning contract for future target pitch curve work.
 * It does not implement conversion, rendering, microphone access, audio import,
 * scoring, or persistence.
 */

export type TargetCurveSourceType =
  | "mock-melody-step"
  | "score-note-sequence"
  | "musicxml"
  | "midi"
  | "local-melody-guide-audio";

export type TargetSegmentKind = "pitched-note" | "rest-gap";

export type TieRole = "start" | "continue" | "end";

export interface TargetPitchSegment {
  targetId: string;
  sourceType: TargetCurveSourceType;
  segmentKind: TargetSegmentKind;
  sourceNoteIds: string[];
  noteName?: string;
  frequencyHz?: number;
  expectedMidiNumber?: number;
  startTimeMs: number;
  endTimeMs: number;
  startBeat?: number;
  endBeat?: number;
  measureNumber?: number;
  beatInMeasure?: number;
  displayLabel: string;
  centsToleranceGuide?: number;
  melodyStepIndex?: number;
  melodyStepId?: string;
  tieGroupId?: string;
  tieRole?: TieRole;
  shouldRenderAsTargetBlock: boolean;
  shouldCreateFormalScore: false;
}

export interface TargetPitchCurve {
  curveId: string;
  sourceType: TargetCurveSourceType;
  segments: TargetPitchSegment[];
  tempoBpm?: number;
  timeSignature?: string;
  createdForPracticeModeOnly?: boolean;
}
