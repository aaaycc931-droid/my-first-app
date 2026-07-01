import { isValidDiagnosticFrequencyEstimate } from "./pitch-frame-diagnostics";

export const NOTE_LIKE_SEGMENT_DIAGNOSTIC_PITCH_JUMP_CENTS = 120;
export const NOTE_LIKE_SEGMENT_DIAGNOSTIC_MAX_BRIDGED_NULL_FRAMES = 1;
export const NOTE_LIKE_SEGMENT_DIAGNOSTIC_NORMAL_MIN_VOICED_FRAMES = 3;

export type DiagnosticPitchFrame = {
  timeSeconds: number;
  frequencyHz: number | null;
  clarity?: number | null;
};

export type NoteLikeSegmentDiagnosticConfidence = "normal" | "low";

export type NoteLikeSegmentDiagnostic = {
  startTimeSeconds: number;
  endTimeSeconds: number;
  durationSeconds: number;
  representativeFrequencyHz: number;
  nearestNoteName?: string;
  frameCount: number;
  voicedFrameCount: number;
  bridgedNullFrameCount: number;
  minFrequencyHz: number;
  medianFrequencyHz: number;
  maxFrequencyHz: number;
  diagnosticConfidence: NoteLikeSegmentDiagnosticConfidence;
  splitReason?: string;
};

type SegmentCandidateFrame = {
  timeSeconds: number;
  frequencyHz: number | null;
};


const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function getMedianFrequency(frequencies: number[]) {
  const sortedFrequencies = [...frequencies].sort((a, b) => a - b);
  const middleIndex = Math.floor(sortedFrequencies.length / 2);

  return sortedFrequencies.length % 2 === 0
    ? (sortedFrequencies[middleIndex - 1] + sortedFrequencies[middleIndex]) / 2
    : sortedFrequencies[middleIndex];
}

function getCentsDifference(frequencyA: number, frequencyB: number) {
  return Math.abs(1200 * Math.log2(frequencyB / frequencyA));
}

function getNearestNoteName(frequencyHz: number) {
  if (!isValidDiagnosticFrequencyEstimate(frequencyHz)) {
    return undefined;
  }

  const midiNote = Math.round(69 + 12 * Math.log2(frequencyHz / 440));
  const noteName = NOTE_NAMES[((midiNote % 12) + 12) % 12];
  const octave = Math.floor(midiNote / 12) - 1;

  return `${noteName}${octave}`;
}

function createSegmentDiagnostic(
  frames: SegmentCandidateFrame[],
  splitReason?: string,
): NoteLikeSegmentDiagnostic | null {
  const voicedFrequencies = frames
    .map((frame) => frame.frequencyHz)
    .filter(
      (frequency): frequency is number =>
        typeof frequency === "number" &&
        isValidDiagnosticFrequencyEstimate(frequency),
    );

  if (voicedFrequencies.length === 0) {
    return null;
  }

  const sortedFrequencies = [...voicedFrequencies].sort((a, b) => a - b);
  const medianFrequencyHz = getMedianFrequency(sortedFrequencies);
  const startTimeSeconds = frames[0].timeSeconds;
  const endTimeSeconds = frames[frames.length - 1].timeSeconds;

  return {
    startTimeSeconds,
    endTimeSeconds,
    durationSeconds: Math.max(0, endTimeSeconds - startTimeSeconds),
    representativeFrequencyHz: medianFrequencyHz,
    nearestNoteName: getNearestNoteName(medianFrequencyHz),
    frameCount: frames.length,
    voicedFrameCount: voicedFrequencies.length,
    bridgedNullFrameCount: frames.length - voicedFrequencies.length,
    minFrequencyHz: sortedFrequencies[0],
    medianFrequencyHz,
    maxFrequencyHz: sortedFrequencies[sortedFrequencies.length - 1],
    diagnosticConfidence:
      voicedFrequencies.length >= NOTE_LIKE_SEGMENT_DIAGNOSTIC_NORMAL_MIN_VOICED_FRAMES
        ? "normal"
        : "low",
    ...(splitReason ? { splitReason } : {}),
  };
}

function isValidVoicedFrame(frame: DiagnosticPitchFrame) {
  return (
    typeof frame.timeSeconds === "number" &&
    Number.isFinite(frame.timeSeconds) &&
    typeof frame.frequencyHz === "number" &&
    isValidDiagnosticFrequencyEstimate(frame.frequencyHz)
  );
}

export function deriveNoteLikeSegmentDiagnostics(
  frames: DiagnosticPitchFrame[],
): NoteLikeSegmentDiagnostic[] {
  const segments: NoteLikeSegmentDiagnostic[] = [];
  let candidateFrames: SegmentCandidateFrame[] = [];
  let pendingNullFrames: SegmentCandidateFrame[] = [];
  let lastVoicedFrequencyHz: number | null = null;

  const flushCandidate = (splitReason?: string) => {
    const segment = createSegmentDiagnostic(candidateFrames, splitReason);

    if (segment !== null) {
      segments.push(segment);
    }

    candidateFrames = [];
    pendingNullFrames = [];
    lastVoicedFrequencyHz = null;
  };

  for (const frame of frames) {
    if (!isValidVoicedFrame(frame)) {
      if (candidateFrames.length > 0) {
        pendingNullFrames.push({
          timeSeconds: frame.timeSeconds,
          frequencyHz: null,
        });

        if (
          pendingNullFrames.length >
          NOTE_LIKE_SEGMENT_DIAGNOSTIC_MAX_BRIDGED_NULL_FRAMES
        ) {
          flushCandidate("null-gap-over-1-frame");
        }
      }

      continue;
    }

    const voicedFrequencyHz = frame.frequencyHz as number;
    const voicedFrame = {
      timeSeconds: frame.timeSeconds,
      frequencyHz: voicedFrequencyHz,
    };

    if (
      lastVoicedFrequencyHz !== null &&
      getCentsDifference(lastVoicedFrequencyHz, voicedFrequencyHz) >
        NOTE_LIKE_SEGMENT_DIAGNOSTIC_PITCH_JUMP_CENTS
    ) {
      flushCandidate("pitch-jump-over-120-cents-research-diagnostic-threshold");
    }

    if (
      pendingNullFrames.length > 0 &&
      pendingNullFrames.length <=
        NOTE_LIKE_SEGMENT_DIAGNOSTIC_MAX_BRIDGED_NULL_FRAMES &&
      candidateFrames.length > 0
    ) {
      candidateFrames.push(...pendingNullFrames);
    }

    pendingNullFrames = [];
    candidateFrames.push(voicedFrame);
    lastVoicedFrequencyHz = voicedFrequencyHz;
  }

  flushCandidate();

  return segments;
}
