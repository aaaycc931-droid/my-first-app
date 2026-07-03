import assert from "node:assert/strict";

import {
  applyLocalMelodyGuideDecodedMetadata,
  createLocalMelodyGuideFileSummary,
  formatLocalMelodyGuideFileSize,
  localMelodyGuideBestSourceCopy,
  localMelodyGuideBrowserDecodeSupportCopy,
  localMelodyGuideFullMixedSongDeferredWarning,
  localMelodyGuideLocalOnlyCopy,
} from "../lib/practice/localMelodyGuideAudio";
import { detectAudioOnsets } from "../lib/rhythm/audioOnsetDetection";
import { getAudioOnsetRhythmFeedback } from "../lib/rhythm/audioOnsetRhythmFeedback";
import { getRhythmTapFeedback } from "../lib/rhythm/rhythmTapFeedback";
import { getRhythmLatencyCalibration } from "../lib/rhythm/rhythmLatencyCalibration";
import { createMetronomeBeatGrid } from "../lib/metronome/metronomeGrid";
import { getNonScoringImportedTargetPitchFeedback } from "../lib/practice/nonScoringImportedTargetPitchFeedback";

const summary = createLocalMelodyGuideFileSummary({
  name: "teacher-guide.m4a",
  type: "audio/mp4",
  size: 2_097_152,
});

assert.equal(summary.fileName, "teacher-guide.m4a");
assert.equal(summary.fileType, "audio/mp4");
assert.equal(summary.fileSizeBytes, 2_097_152);
assert.equal(summary.fileSizeLabel, "2.0 MB");
assert.equal(summary.status, "selected");
assert.equal(summary.decodedDurationSeconds, null);
assert.equal(localMelodyGuideBrowserDecodeSupportCopy.includes("WAV / MP3 / M4A"), true);
assert.equal(localMelodyGuideBestSourceCopy.includes("clean vocal"), true);
assert.equal(formatLocalMelodyGuideFileSize(512), "512 B");
assert.equal(formatLocalMelodyGuideFileSize(1536), "1.5 KB");
assert.equal(formatLocalMelodyGuideFileSize(-1), "Unknown size");

const decoded = applyLocalMelodyGuideDecodedMetadata(summary, {
  decodedDurationSeconds: 12.5,
  sampleRate: 44100,
  channelCount: 2,
});
assert.equal(decoded.status, "decoded");
assert.equal(decoded.decodedDurationSeconds, 12.5);
assert.equal(decoded.sampleRate, 44100);
assert.equal(decoded.channelCount, 2);
assert.equal(decoded.warnings.includes(localMelodyGuideFullMixedSongDeferredWarning), true);

const emptyInvalid = createLocalMelodyGuideFileSummary({
  name: "",
  type: "",
  size: 0,
});
assert.equal(emptyInvalid.fileName, "Unnamed local audio file");
assert.equal(emptyInvalid.warnings.some((warning) => warning.includes("empty")), true);
assert.equal(emptyInvalid.warnings.some((warning) => warning.includes("MIME type")), true);
assert.equal(emptyInvalid.warnings.includes(localMelodyGuideFullMixedSongDeferredWarning), true);

const forbiddenProductFields = [
  "upload",
  "cloud",
  "account",
  "database",
  "score",
  "grade",
  "pass",
  "fail",
  "accuracyPercentage",
  "assessment",
];
const helperPayload = JSON.stringify(decoded);
for (const field of forbiddenProductFields) {
  assert.equal(Object.prototype.hasOwnProperty.call(decoded, field), false);
  assert.equal(helperPayload.includes(`"${field}"`), false);
}
assert.equal(localMelodyGuideLocalOnlyCopy.includes("No upload."), true);
assert.equal(localMelodyGuideLocalOnlyCopy.includes("No account/database."), true);

const onsetInput = new Float32Array(2048);
onsetInput[512] = 1;
const onsetResult = detectAudioOnsets(onsetInput, 44100);
assert.equal(typeof onsetResult.onsetCount, "number");

const rhythmFeedback = getAudioOnsetRhythmFeedback({
  onsetResult,
  config: { bpm: 72, meter: "4/4", countIn: { enabled: false, bars: 0 }, subdivision: "quarter" },
  barCount: 1,
  latencyOffsetMs: 0,
  alignmentMode: "recording-start",
});
assert.equal(Array.isArray(rhythmFeedback.timelineMarkers), true);

const tapFeedback = getRhythmTapFeedback({
  targets: [],
  taps: [],
  phase: "idle",
  nowMs: 0,
  latencyOffsetMs: 0,
});
assert.equal(tapFeedback.status, "not-started");

const latency = getRhythmLatencyCalibration({ targets: [], taps: [] });
assert.equal(latency.offsetMs, null);

const schedule = createMetronomeBeatGrid({
  config: { bpm: 72, meter: "4/4", countIn: { enabled: false, bars: 0 }, subdivision: "quarter" },
  startTimeSeconds: 1,
  beatCount: 4,
});
assert.equal(schedule.length, 4);

const pitchFeedback = getNonScoringImportedTargetPitchFeedback({
  targetFrequencyHz: 440,
  estimatedFrequencyHz: 441,
  confidence: 0.9,
  validPitchFrames: 12,
});
assert.equal(pitchFeedback.title.includes("Non-scoring"), true);

console.log("local melody guide audio import foundation tests passed");
