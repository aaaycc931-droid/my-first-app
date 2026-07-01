import {
  NOTE_LIKE_SEGMENT_DIAGNOSTIC_PITCH_JUMP_CENTS,
  deriveNoteLikeSegmentDiagnostics,
  type DiagnosticPitchFrame,
} from "../lib/research/local-audio-decode/note-like-segment-diagnostics";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function frame(timeSeconds: number, frequencyHz: number | null): DiagnosticPitchFrame {
  return { timeSeconds, frequencyHz, clarity: frequencyHz === null ? null : 1 };
}

const cleanSegments = deriveNoteLikeSegmentDiagnostics([
  frame(0, 440),
  frame(0.1, 441),
  frame(0.2, 442),
  frame(0.3, 443),
]);
assert(cleanSegments.length === 1, "clean continuous voiced frames should form one note-like segment diagnostic");
assert(cleanSegments[0].voicedFrameCount === 4, "clean segment should count all voiced frames");
assert(cleanSegments[0].frameCount === 4, "clean segment should have no bridged null frame in frame count");
assert(cleanSegments[0].bridgedNullFrameCount === 0, "clean segment should not bridge null frames");
assert(cleanSegments[0].representativeFrequencyHz === 441.5, "representative frequency should use voiced-frequency median");
assert(cleanSegments[0].nearestNoteName === "A4", "nearest note name should be a diagnostic nearest label only");
assert(cleanSegments[0].diagnosticConfidence === "normal", "clean longer segment should be normal diagnostic confidence");

const oneNullGapSegments = deriveNoteLikeSegmentDiagnostics([
  frame(0, 440),
  frame(0.1, 441),
  frame(0.2, null),
  frame(0.3, 442),
  frame(0.4, 443),
]);
assert(oneNullGapSegments.length === 1, "a 1-frame null gap should be conservatively bridged");
assert(oneNullGapSegments[0].frameCount === 5, "bridged segment should keep the bridged diagnostic null frame in frame count");
assert(oneNullGapSegments[0].voicedFrameCount === 4, "bridged segment should only count valid voiced frames as voiced");
assert(oneNullGapSegments[0].bridgedNullFrameCount === 1, "bridged segment should count one bridged null frame");
assert(oneNullGapSegments[0].representativeFrequencyHz === 441.5, "bridged null frame should not enter representative frequency");

const twoNullGapSegments = deriveNoteLikeSegmentDiagnostics([
  frame(0, 440),
  frame(0.1, 441),
  frame(0.2, null),
  frame(0.3, null),
  frame(0.4, 442),
  frame(0.5, 443),
  frame(0.6, 444),
]);
assert(twoNullGapSegments.length === 2, "a 2-frame null gap must split note-like segment diagnostics");
assert(twoNullGapSegments[0].splitReason === "null-gap-over-1-frame", "2-frame null gap split should record diagnostic split reason");
assert(twoNullGapSegments[0].bridgedNullFrameCount === 0, "unbridged null gap should not be kept inside the first segment");

const jumpSegments = deriveNoteLikeSegmentDiagnostics([
  frame(0, 440),
  frame(0.1, 441),
  frame(0.2, 442),
  frame(0.3, 660),
  frame(0.4, 661),
  frame(0.5, 662),
]);
assert(jumpSegments.length === 2, "obvious pitch jump should split note-like segment diagnostics");
assert(
  jumpSegments[0].splitReason === "pitch-jump-over-120-cents-research-diagnostic-threshold",
  `pitch jump split should use the ${NOTE_LIKE_SEGMENT_DIAGNOSTIC_PITCH_JUMP_CENTS}-cent research diagnostic threshold`,
);

const shortIslandSegments = deriveNoteLikeSegmentDiagnostics([
  frame(0, null),
  frame(0.1, 440),
  frame(0.2, 441),
  frame(0.3, null),
  frame(0.4, null),
]);
assert(shortIslandSegments.length === 1, "short voiced island should remain visible as a low-confidence diagnostic");
assert(shortIslandSegments[0].diagnosticConfidence === "low", "short voiced island should be marked low diagnostic confidence");
assert(shortIslandSegments[0].voicedFrameCount === 2, "short island should only count its valid voiced frames");

const nullOnlySegments = deriveNoteLikeSegmentDiagnostics([
  frame(0, null),
  frame(0.1, null),
  frame(0.2, null),
]);
assert(nullOnlySegments.length === 0, "null-only input should return empty note-like segment diagnostics");

const invalidAndNullSegments = deriveNoteLikeSegmentDiagnostics([
  frame(0, 440),
  frame(0.1, Number.NaN),
  frame(0.2, null),
  frame(0.3, -220),
  frame(0.4, 441),
  frame(0.5, 442),
]);
assert(invalidAndNullSegments.length === 2, "invalid plus null diagnostic frames should not create an artificial bridge over more than one unusable frame");
assert(invalidAndNullSegments[0].representativeFrequencyHz === 440, "invalid and null frames should not enter representative frequency");
assert(invalidAndNullSegments[1].representativeFrequencyHz === 441.5, "valid voiced frequencies should determine the second representative median");

const summarySegments = deriveNoteLikeSegmentDiagnostics([
  frame(0, 330),
  frame(0.1, null),
  frame(0.2, 331),
  frame(0.3, 332),
  frame(0.4, Number.POSITIVE_INFINITY),
]);
assert(summarySegments.length === 1, "valid voiced frames with one null bridge should remain one diagnostic segment");
assert(summarySegments[0].minFrequencyHz === 330, "min summary should use valid voiced frequencies only");
assert(summarySegments[0].medianFrequencyHz === 331, "median summary should use valid voiced frequencies only");
assert(summarySegments[0].maxFrequencyHz === 332, "max summary should use valid voiced frequencies only");
assert(summarySegments[0].representativeFrequencyHz === 331, "representative frequency should match valid-frequency median");

const noCreatedSegment = deriveNoteLikeSegmentDiagnostics([
  frame(0, Number.NaN),
  frame(0.1, null),
  frame(0.2, 0),
  frame(0.3, 49),
]);
assert(noCreatedSegment.length === 0, "null, invalid, and unvoiced diagnostic frames must not create note-like segment diagnostics");

console.log("local audio decode note-like segment diagnostics synthetic checks passed");
