import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMetronomeBeatGrid } from "../lib/metronome/metronomeGrid";
import { getNonScoringImportedTargetPitchFeedback } from "../lib/practice/nonScoringImportedTargetPitchFeedback";
import { detectAudioOnsets, type AudioOnsetDetectionResult } from "../lib/rhythm/audioOnsetDetection";
import {
  audioOnsetRhythmCompactMarkerLabels,
  audioOnsetRhythmFeedbackBoundary,
  audioOnsetRhythmMarkerLegendItems,
  convertAudioOnsetsToRhythmTapEvents,
  getAudioOnsetRhythmMarkerDensitySummary,
  getAudioOnsetRhythmFeedback,
  hasAudioOnsetRhythmFeedbackScoringFields,
} from "../lib/rhythm/audioOnsetRhythmFeedback";
import { getRhythmLatencyCalibration } from "../lib/rhythm/rhythmLatencyCalibration";
import { getRhythmTapFeedback } from "../lib/rhythm/rhythmTapFeedback";

const config = { bpm: 120, meter: "4/4" as const, subdivision: "quarter" as const };
const onsetResult = (times: number[]): AudioOnsetDetectionResult => ({
  sampleRate: 1000,
  durationMs: 2600,
  frameSize: 20,
  hopSize: 10,
  onsetCount: times.length,
  candidates: times.map((time, index) => ({
    onsetTimeMs: time,
    frameIndex: index,
    strength: 0.5 + index / 10,
    energy: 0.6,
    threshold: 0.2,
    confidence: "high",
    diagnosticLabel: "high diagnostic onset candidate",
    aboveThreshold: true,
  })),
  diagnosticSummary: "fixture onsets; diagnostic only",
  warnings: [],
  sensitivityPreset: "balanced",
  sensitivityDescription: "fixture sensitivity",
  thresholdMultiplier: 2.8,
  minimumEnergy: 0.015,
  minimumStrength: 0.012,
  minOnsetGapMs: 90,
  threshold: 0.2,
  averageStrength: 0.1,
  strengthDeviation: 0.02,
  maxStrength: 0.8,
  timeline: [],
  timelinePointCount: 0,
  timelineSourcePointCount: 0,
  timelineMaxPoints: 300,
  isTimelineDownsampled: false,
});

assert.deepEqual(
  convertAudioOnsetsToRhythmTapEvents(onsetResult([0, 500])).map((tap) => tap.timestampMs),
  [0, 500],
);

const legendText = audioOnsetRhythmMarkerLegendItems
  .map((item) => `${item.label} ${item.description}`)
  .join(" ");
for (const expected of [
  "Candidate marker",
  "Rhythm target marker",
  "Close",
  "Early",
  "Late",
  "Missed",
  "Extra",
  "First-onset origin",
  "Threshold reference",
]) {
  assert.match(legendText, new RegExp(expected));
}
const compactLabelText = Object.values(audioOnsetRhythmCompactMarkerLabels).join(" ");
assert.doesNotMatch(compactLabelText, /score|grade|pass|fail|accuracyPercentage|assessment/i);
assert.deepEqual(
  [
    audioOnsetRhythmCompactMarkerLabels.close,
    audioOnsetRhythmCompactMarkerLabels.early,
    audioOnsetRhythmCompactMarkerLabels.late,
    audioOnsetRhythmCompactMarkerLabels.missed,
    audioOnsetRhythmCompactMarkerLabels.extra,
  ],
  ["C", "E", "L", "M", "X"],
);
const denseSummary = getAudioOnsetRhythmMarkerDensitySummary({
  candidateCount: 8,
  targetCount: 8,
  feedbackMarkerCount: 8,
  missedCount: 1,
  extraCount: 2,
});
assert.equal(denseSummary.totalMarkerCount, 24);
assert.equal(denseSummary.isDense, true);
assert.match(denseSummary.compactModeNote, /compact labels/);
assert.doesNotMatch(JSON.stringify(denseSummary), /score|grade|pass|fail|accuracyPercentage|assessment/i);

const recordingStartClose = getAudioOnsetRhythmFeedback({
  onsetResult: onsetResult([40]),
  config,
  barCount: 1,
  alignmentMode: "recording-start",
});
assert.equal(recordingStartClose.feedbackItems[0]?.category, "close");
assert.equal(recordingStartClose.alignmentMode, "recording-start");
assert.equal(recordingStartClose.alignmentOffsetMs, 0);
assert.equal(recordingStartClose.feedbackItems[0]?.onsetCandidateIndex, 0);
assert.match(recordingStartClose.feedbackItems[0]?.markerId ?? "", /feedback-0-close/);
assert.equal(
  getAudioOnsetRhythmFeedback({ onsetResult: onsetResult([380]), config, barCount: 1 })
    .feedbackItems.some((item) => item.category === "early"),
  true,
);
assert.equal(
  getAudioOnsetRhythmFeedback({ onsetResult: onsetResult([130]), config, barCount: 1 })
    .feedbackItems[0]?.category,
  "late",
);
assert.equal(
  getAudioOnsetRhythmFeedback({ onsetResult: onsetResult([0, 500, 1500]), config, barCount: 1 })
    .missedCount,
  1,
);
assert.equal(
  getAudioOnsetRhythmFeedback({ onsetResult: onsetResult([0, 500, 1000, 1500, 2300]), config, barCount: 1 })
    .extraCount,
  1,
);

const quarter = getAudioOnsetRhythmFeedback({
  onsetResult: onsetResult([0, 500, 1000, 1500]),
  config,
  pattern: "quarter-note-pulse",
  barCount: 1,
});
assert.equal(quarter.targetPattern, "quarter-note-pulse");
assert.equal(quarter.matchedCount, 4);
assert.equal(quarter.targetMarkers.length, 4);
assert.deepEqual(quarter.targetMarkers.map((marker) => marker.targetIndex), [0, 1, 2, 3]);
assert.equal(quarter.targetMarkers[1]?.targetTimeMs, 500);

const eighth = getAudioOnsetRhythmFeedback({
  onsetResult: onsetResult([0, 250, 500, 750, 1000, 1250, 1500, 1750]),
  config,
  pattern: "eighth-note-pulse",
  barCount: 1,
});
assert.equal(eighth.targetPattern, "eighth-note-pulse");
assert.equal(eighth.matchedCount, 8);
assert.equal(eighth.targetMarkers.length, 8);
assert.equal(eighth.targetMarkers[1]?.targetTimeMs, 250);

const firstOnsetClose = getAudioOnsetRhythmFeedback({
  onsetResult: onsetResult([700, 1200, 1700, 2200]),
  config,
  barCount: 1,
  alignmentMode: "first-onset",
});
assert.equal(firstOnsetClose.alignmentMode, "first-onset");
assert.equal(firstOnsetClose.alignmentOffsetMs, 700);
assert.equal(firstOnsetClose.firstOnsetTimeMs, 700);
assert.equal(firstOnsetClose.firstTargetTimeMs, 0);
assert.equal(firstOnsetClose.alignmentDiagnostics.mode, "first-onset");
assert.equal(firstOnsetClose.alignmentDiagnostics.alignmentOffsetMs, 700);
assert.equal(firstOnsetClose.alignmentDiagnostics.firstOnsetTimeMs, 700);
assert.equal(firstOnsetClose.alignmentDiagnostics.firstTargetTimeMs, 0);
assert.equal(firstOnsetClose.alignmentDiagnostics.firstOnsetCandidateIndex, 0);
assert.equal(firstOnsetClose.alignmentDiagnostics.originMarkerId, "candidate-0");
assert.equal(firstOnsetClose.matchedCount, 4);
assert.equal(firstOnsetClose.feedbackItems[0]?.category, "close");
assert.equal(firstOnsetClose.feedbackItems[0]?.onsetTimeMs, 700);
assert.equal(firstOnsetClose.feedbackItems[0]?.adjustedOnsetTimeMs, 0);

const leadingSilenceRecordingStart = getAudioOnsetRhythmFeedback({
  onsetResult: onsetResult([700, 1200, 1700, 2200]),
  config,
  barCount: 1,
  alignmentMode: "recording-start",
});
assert.ok(leadingSilenceRecordingStart.missedCount > firstOnsetClose.missedCount);
assert.ok(leadingSilenceRecordingStart.extraCount > firstOnsetClose.extraCount);

const firstOnsetMissed = getAudioOnsetRhythmFeedback({
  onsetResult: onsetResult([700, 1200, 2200]),
  config,
  barCount: 1,
  alignmentMode: "first-onset",
});
assert.equal(firstOnsetMissed.missedCount, 1);
assert.equal(firstOnsetMissed.feedbackItems.find((item) => item.category === "missed")?.onsetCandidateIndex, null);
assert.equal(firstOnsetMissed.timelineMarkers.find((marker) => marker.category === "missed")?.onsetCandidateIndex, null);
assert.equal(firstOnsetMissed.timelineMarkers.find((marker) => marker.category === "missed")?.targetIndex, 2);
assert.equal(firstOnsetMissed.feedbackItems.find((item) => item.category === "missed")?.targetTimeMs, 1000);

const firstOnsetExtra = getAudioOnsetRhythmFeedback({
  onsetResult: onsetResult([700, 1200, 1700, 2200, 2900]),
  config,
  barCount: 1,
  alignmentMode: "first-onset",
});
assert.equal(firstOnsetExtra.extraCount, 1);
assert.equal(firstOnsetExtra.feedbackItems.find((item) => item.category === "extra")?.targetIndex, null);
assert.equal(firstOnsetExtra.timelineMarkers.find((marker) => marker.category === "extra")?.targetIndex, null);
assert.equal(firstOnsetExtra.timelineMarkers.find((marker) => marker.category === "extra")?.onsetCandidateIndex, 4);
assert.equal(firstOnsetExtra.feedbackItems.find((item) => item.category === "extra")?.onsetTimeMs, 2900);

const empty = getAudioOnsetRhythmFeedback({
  onsetResult: onsetResult([]),
  config,
  barCount: 1,
  alignmentMode: "first-onset",
});
assert.match(empty.diagnosticSummary, /Waiting for detected audio onsets/);
assert.equal(empty.onsetCount, 0);
assert.equal(empty.alignmentOffsetMs, 0);
assert.equal(
  empty.warnings.some((warning) => warning.includes("No onset candidates available")),
  true,
);

const latencyAdjusted = getAudioOnsetRhythmFeedback({
  onsetResult: onsetResult([120]),
  config,
  barCount: 1,
  latencyOffsetMs: 100,
});
assert.equal(latencyAdjusted.feedbackItems[0]?.category, "close");
assert.equal(latencyAdjusted.feedbackItems[0]?.offsetMs, 20);
assert.equal(latencyAdjusted.latencyOffsetAppliedMs, 100);
assert.equal(latencyAdjusted.alignmentDiagnostics.latencyOffsetAppliedMs, 100);

const firstOnsetWithLatency = getAudioOnsetRhythmFeedback({
  onsetResult: onsetResult([700, 1300]),
  config,
  barCount: 1,
  alignmentMode: "first-onset",
  latencyOffsetMs: 100,
});
assert.equal(firstOnsetWithLatency.alignmentOffsetMs, 700);
assert.equal(firstOnsetWithLatency.feedbackItems[0]?.adjustedOnsetTimeMs, -100);
assert.equal(firstOnsetWithLatency.feedbackItems[0]?.category, "early");
assert.equal(firstOnsetWithLatency.feedbackItems[1]?.category, "close");
assert.equal(firstOnsetWithLatency.feedbackItems[1]?.offsetMs, 0);

assert.match(audioOnsetRhythmFeedbackBoundary, /not a score/);
[recordingStartClose, quarter, eighth, empty, latencyAdjusted, firstOnsetClose, firstOnsetWithLatency].forEach((result) => {
  assert.equal(hasAudioOnsetRhythmFeedbackScoringFields(result), false);
  result.feedbackItems.forEach((item) =>
    assert.equal(hasAudioOnsetRhythmFeedbackScoringFields(item), false),
  );
  result.targetMarkers.forEach((marker) =>
    assert.equal(hasAudioOnsetRhythmFeedbackScoringFields(marker), false),
  );
  result.timelineMarkers.forEach((marker) =>
    assert.equal(hasAudioOnsetRhythmFeedbackScoringFields(marker), false),
  );
});

const impulseSamples = new Float32Array(1200);
impulseSamples[500] = 1;
impulseSamples[501] = 0.8;
const detected = detectAudioOnsets(impulseSamples, 1000, {
  frameSize: 20,
  hopSize: 10,
  minimumEnergy: 0.02,
  minimumStrength: 0.02,
});
assert.ok(detected.onsetCount >= 1);
assert.equal(getRhythmTapFeedback({ targets: [], taps: [], phase: "practice", nowMs: 0 }).targetCount, 0);
assert.equal(getRhythmLatencyCalibration({ targets: [], taps: [] }).sampleCount, 0);
assert.equal(createMetronomeBeatGrid({ config, startTimeSeconds: 0, beatCount: 2 }).length, 2);
assert.equal(
  getNonScoringImportedTargetPitchFeedback({
    targetFrequencyHz: 440,
    estimatedFrequencyHz: 440,
    confidence: 0.8,
    validPitchFrames: 8,
  }).category,
  "close",
);

const practicePage = readFileSync("app/practice/page.tsx", "utf8");
const audioOnsetTimelinePreview = readFileSync("components/practice/AudioOnsetTimelinePreview.tsx", "utf8");
const audioOnsetRhythmFeedbackPanel = readFileSync("components/practice/AudioOnsetRhythmFeedbackPanel.tsx", "utf8");
const practiceRhythmDiagnosticSource = `${practicePage}\n${audioOnsetTimelinePreview}\n${audioOnsetRhythmFeedbackPanel}`;
assert.match(practiceRhythmDiagnosticSource, /Use detected onsets for rhythm feedback/);
assert.match(practiceRhythmDiagnosticSource, /recording-start/);
assert.match(practiceRhythmDiagnosticSource, /first-onset/);
assert.match(practiceRhythmDiagnosticSource, /First detected onset/);
assert.match(practiceRhythmDiagnosticSource, /Alignment diagnostics/);
assert.match(practiceRhythmDiagnosticSource, /Marker #/);
assert.match(practiceRhythmDiagnosticSource, /candidateIndex/);
assert.match(practiceRhythmDiagnosticSource, /targetMarkers/);
assert.match(practiceRhythmDiagnosticSource, /firstOnsetOrigin|First-onset origin/);
assert.match(practiceRhythmDiagnosticSource, /Compact marker legend/);
assert.match(practiceRhythmDiagnosticSource, /audioOnsetMarkerDensitySummary/);
assert.match(practiceRhythmDiagnosticSource, /latency offset applied/);
assert.match(practiceRhythmDiagnosticSource, /not a score/);
assert.equal(quarter.warnings.includes("This assumes recording timing aligns with the target timeline."), true);
assert.doesNotMatch(practiceRhythmDiagnosticSource, /accuracyPercentage/);
