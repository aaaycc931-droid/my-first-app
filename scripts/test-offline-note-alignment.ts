import assert from "node:assert/strict";

import {
  analyzeOfflineNoteAlignment,
  OFFLINE_NOTE_ALIGNMENT_VERSION,
  segmentOfflinePitchFrames,
  type OfflineAlignmentTarget,
} from "../lib/practice/offlineNoteAlignment";
import {
  OFFLINE_PITCH_ANALYSIS_VERSION,
  OFFLINE_PITCH_SAMPLE_RATE,
  type OfflinePitchAnalysisResult,
  type OfflinePitchFrame,
} from "../lib/practice/offlinePitchAnalysis";

const midiToFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

const voicedFrame = (index: number, midi: number, confidence = 0.92): OfflinePitchFrame => ({
  index,
  timestampMs: index * 20,
  state: "voiced",
  frequencyHz: midiToFrequency(midi),
  midi,
  confidence,
  rms: 0.2,
  octaveAdjusted: false,
  candidates: [],
  reason: "synthetic voiced frame",
});

const rejectedFrame = (index: number): OfflinePitchFrame => ({
  index,
  timestampMs: index * 20,
  state: "low-confidence",
  frequencyHz: null,
  midi: null,
  confidence: 0.3,
  rms: 0.1,
  octaveAdjusted: false,
  candidates: [],
  reason: "synthetic rejection",
});

const frames: OfflinePitchFrame[] = [
  ...Array.from({ length: 8 }, (_, index) => voicedFrame(index, 69 + (index % 2 === 0 ? -0.03 : 0.03))),
  rejectedFrame(8),
  ...Array.from({ length: 7 }, (_, index) => voicedFrame(index + 9, 69)),
  rejectedFrame(16),
  rejectedFrame(17),
  ...Array.from({ length: 8 }, (_, index) => voicedFrame(index + 18, 72 + (index % 2 === 0 ? -0.04 : 0.04))),
  rejectedFrame(26),
  rejectedFrame(27),
  voicedFrame(28, 74, 0.7),
  voicedFrame(29, 74, 0.7),
];

const segments = segmentOfflinePitchFrames(frames);
assert.equal(segments.length, 3);
assert.equal(segments[0]?.state, "usable");
assert.equal(segments[0]?.bridgedFrameCount, 1);
assert.equal(segments[1]?.state, "usable");
assert.equal(segments[2]?.state, "rejected");
assert.match(segments[2]?.reason ?? "", /过短/);

const analysis: OfflinePitchAnalysisResult = {
  version: OFFLINE_PITCH_ANALYSIS_VERSION,
  pcm: {
    sampleRate: OFFLINE_PITCH_SAMPLE_RATE,
    samples: new Float32Array(16_000),
    durationSeconds: 1,
    diagnostics: {
      inputSampleRate: 48_000,
      inputChannelCount: 1,
      dcOffset: 0,
      inputRms: 0.2,
      inputPeak: 0.4,
      clippedSampleRatio: 0,
      appliedGain: 1,
    },
  },
  frames,
  summary: {
    totalFrames: frames.length,
    voicedFrames: frames.filter((frame) => frame.state === "voiced").length,
    voicedRatio: 0.8,
    representativeFrequencyHz: 440,
    representativeNote: "A4",
    minFrequencyHz: 440,
    maxFrequencyHz: midiToFrequency(74),
    engineComparableFrames: 0,
    engineAgreementRatio: null,
    octaveAdjustedFrames: 0,
    rejectedFrames: frames.filter((frame) => frame.state !== "voiced").length,
  },
};

const targets: OfflineAlignmentTarget[] = [
  { targetId: "target-1", index: 0, phraseIndex: 0, label: "A4", midi: 69, startMs: 0, endMs: 330 },
  { targetId: "target-2", index: 1, phraseIndex: 0, label: "C5", midi: 72, startMs: 340, endMs: 560 },
  { targetId: "target-3", index: 2, phraseIndex: 1, label: "D5", midi: 74, startMs: 560, endMs: 760 },
  { targetId: "target-4", index: 3, phraseIndex: 1, label: "E5", midi: 76, startMs: 780, endMs: 980 },
];

const result = analyzeOfflineNoteAlignment(analysis, { targets });
assert.equal(result.version, OFFLINE_NOTE_ALIGNMENT_VERSION);
assert.equal(result.sourceAnalysisVersion, OFFLINE_PITCH_ANALYSIS_VERSION);
assert.equal(result.summary.segmentCount, 3);
assert.equal(result.summary.usableSegmentCount, 2);
assert.equal(result.targetEvidence[0]?.state, "close");
assert.equal(result.targetEvidence[0]?.detectedNote, "A4");
assert.equal(result.targetEvidence[0]?.phases.map((phase) => phase.label).join(","), "音头,稳定段,尾音");
assert.equal(result.targetEvidence[1]?.state, "close");
assert.equal(result.targetEvidence[2]?.state, "unreliable");
assert.equal(result.targetEvidence[3]?.state, "missing");
assert.equal(result.phraseEvidence[0]?.state, "available");
assert.equal(result.phraseEvidence[1]?.state, "unavailable");
assert.match(result.alignmentReason, /目标不会修改/);

const wrongTarget = analyzeOfflineNoteAlignment(analysis, {
  targets: [{ targetId: "wrong", index: 0, phraseIndex: 0, label: "G4", midi: 67, startMs: 0, endMs: 330 }],
});
assert.equal(wrongTarget.targetEvidence[0]?.state, "high");
assert.ok((wrongTarget.targetEvidence[0]?.medianCents ?? 0) > 190);
assert.ok(Math.abs(wrongTarget.segments[0]!.medianMidi - 69) < 0.1, "目标不得吸附或改写检测片段");

const noTarget = analyzeOfflineNoteAlignment(analysis);
assert.equal(noTarget.targetEvidence.length, 0);
assert.match(noTarget.alignmentReason, /没有已确认目标/);

console.log("P113 offline note segmentation and alignment tests passed.");
