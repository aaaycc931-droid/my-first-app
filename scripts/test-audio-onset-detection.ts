import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMetronomeBeatGrid } from "../lib/metronome/metronomeGrid";
import { getNonScoringImportedTargetPitchFeedback } from "../lib/practice/nonScoringImportedTargetPitchFeedback";
import { getRhythmLatencyCalibration } from "../lib/rhythm/rhythmLatencyCalibration";
import { getRhythmTapFeedback } from "../lib/rhythm/rhythmTapFeedback";
import {
  detectAudioOnsets,
  hasAudioOnsetScoringFields,
} from "../lib/rhythm/audioOnsetDetection";

const sampleRate = 1000;
const makeSamples = (length = 1200) => new Float32Array(length);
const withImpulse = (positions: number[], amplitude = 1) => {
  const samples = makeSamples();
  positions.forEach((position) => {
    samples[position] = amplitude;
    samples[position + 1] = amplitude * 0.8;
  });
  return samples;
};

assert.equal(detectAudioOnsets(makeSamples(), sampleRate).onsetCount, 0);

const single = detectAudioOnsets(withImpulse([500]), sampleRate, {
  frameSize: 20,
  hopSize: 10,
  minimumEnergy: 0.02,
  minimumStrength: 0.02,
});
assert.equal(single.onsetCount, 1);
assert.ok(Math.abs(single.candidates[0]!.onsetTimeMs - 490) <= 20);

const multiple = detectAudioOnsets(withImpulse([200, 500, 900]), sampleRate, {
  frameSize: 20,
  hopSize: 10,
  minOnsetGapMs: 80,
  minimumEnergy: 0.02,
  minimumStrength: 0.02,
});
assert.equal(multiple.onsetCount, 3);

const duplicateBlocked = detectAudioOnsets(
  withImpulse([200, 240]),
  sampleRate,
  {
    frameSize: 20,
    hopSize: 10,
    minOnsetGapMs: 90,
    minimumEnergy: 0.02,
    minimumStrength: 0.02,
  },
);
assert.equal(duplicateBlocked.onsetCount, 1);

const weak = detectAudioOnsets(withImpulse([500], 0.01), sampleRate, {
  frameSize: 20,
  hopSize: 10,
  minimumEnergy: 0.02,
  minimumStrength: 0.02,
});
assert.equal(weak.onsetCount, 0);

const sustained = makeSamples();
for (let index = 200; index < 900; index += 1) sustained[index] = 0.3;
const sustainedResult = detectAudioOnsets(sustained, sampleRate, {
  frameSize: 20,
  hopSize: 10,
  minOnsetGapMs: 90,
  minimumEnergy: 0.02,
  minimumStrength: 0.02,
});
assert.ok(sustainedResult.onsetCount <= 1);

assert.equal(multiple.sampleRate, sampleRate);
assert.equal(multiple.frameSize, 20);
assert.equal(multiple.hopSize, 10);
assert.equal(Math.round(multiple.durationMs), 1200);

assert.equal(detectAudioOnsets(new Float32Array(), sampleRate).onsetCount, 0);
assert.equal(detectAudioOnsets(makeSamples(), 0).sampleRate, 0);

assert.equal(hasAudioOnsetScoringFields(single), false);
single.candidates.forEach((candidate) =>
  assert.equal(hasAudioOnsetScoringFields(candidate), false),
);

assert.equal(
  getRhythmTapFeedback({ targets: [], taps: [], phase: "practice", nowMs: 0 })
    .targetCount,
  0,
);
assert.equal(
  getRhythmLatencyCalibration({ targets: [], taps: [] }).acceptedSampleCount,
  0,
);
assert.equal(
  createMetronomeBeatGrid({
    config: { bpm: 120, meter: "4/4" },
    startTimeSeconds: 0,
    beatCount: 4,
  }).length,
  4,
);
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
assert.match(practicePage, /Audio Onset Detection Foundation/);
assert.match(practicePage, /No upload \/ cloud \/ AI/);
assert.match(practicePage, /This is not rhythm scoring/);
