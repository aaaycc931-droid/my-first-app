import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMetronomeBeatGrid } from "../lib/metronome/metronomeGrid";
import { getNonScoringImportedTargetPitchFeedback } from "../lib/practice/nonScoringImportedTargetPitchFeedback";
import { getRhythmLatencyCalibration } from "../lib/rhythm/rhythmLatencyCalibration";
import { getRhythmTapFeedback } from "../lib/rhythm/rhythmTapFeedback";
import {
  createAudioOnsetTimeline,
  detectAudioOnsets,
  getAudioOnsetSensitivityConfig,
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

const silentBalanced = detectAudioOnsets(makeSamples(), sampleRate);
assert.equal(silentBalanced.onsetCount, 0);
assert.ok(silentBalanced.timeline.length > 0);
assert.equal(silentBalanced.timeline.some((point) => point.isCandidate), false);
assert.ok(silentBalanced.timeline.every((point) => point.threshold === silentBalanced.threshold));
assert.equal(silentBalanced.sensitivityPreset, "balanced");
assert.ok(silentBalanced.diagnosticSummary.includes("diagnostic"));
assert.equal(silentBalanced.thresholdMultiplier, getAudioOnsetSensitivityConfig("balanced").thresholdMultiplier);

const defaultSingle = detectAudioOnsets(withImpulse([500]), sampleRate, {
  frameSize: 20,
  hopSize: 10,
  minimumEnergy: 0.02,
  minimumStrength: 0.02,
});
const balancedSingle = detectAudioOnsets(withImpulse([500]), sampleRate, {
  sensitivityPreset: "balanced",
  frameSize: 20,
  hopSize: 10,
  minimumEnergy: 0.02,
  minimumStrength: 0.02,
});
assert.equal(balancedSingle.onsetCount, defaultSingle.onsetCount);
assert.equal(balancedSingle.thresholdMultiplier, defaultSingle.thresholdMultiplier);

const single = detectAudioOnsets(withImpulse([500]), sampleRate, {
  frameSize: 20,
  hopSize: 10,
  minimumEnergy: 0.02,
  minimumStrength: 0.02,
});
assert.equal(single.onsetCount, 1);
assert.ok(Math.abs(single.candidates[0]!.onsetTimeMs - 490) <= 20);
assert.ok(single.timeline.length > 0);
assert.ok(single.timeline.some((point) => point.isCandidate && point.candidateIndex === 0));
assert.ok(single.timeline.every((point) => point.sensitivityPreset === "balanced"));
assert.ok(single.timeline.every((point) => Number.isFinite(point.energy)));
assert.ok(single.timeline.every((point) => Number.isFinite(point.onsetStrength)));
assert.ok(single.timeline.every((point) => point.threshold === single.threshold));

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

const weakForPreset = withImpulse([500], 0.035);
const sensitiveWeak = detectAudioOnsets(weakForPreset, sampleRate, {
  sensitivityPreset: "sensitive",
  frameSize: 20,
  hopSize: 10,
});
const balancedWeak = detectAudioOnsets(weakForPreset, sampleRate, {
  sensitivityPreset: "balanced",
  frameSize: 20,
  hopSize: 10,
});
const conservativeWeak = detectAudioOnsets(weakForPreset, sampleRate, {
  sensitivityPreset: "conservative",
  frameSize: 20,
  hopSize: 10,
});
assert.equal(sensitiveWeak.onsetCount, 1);
assert.equal(balancedWeak.onsetCount, 0);
assert.equal(conservativeWeak.onsetCount, 0);
assert.ok(sensitiveWeak.threshold < conservativeWeak.threshold);
assert.ok(sensitiveWeak.timeline.every((point) => point.sensitivityPreset === "sensitive"));
assert.ok(conservativeWeak.timeline.every((point) => point.sensitivityPreset === "conservative"));
assert.equal(
  detectAudioOnsets(weakForPreset, sampleRate, {
    sensitivityPreset: "unknown",
    frameSize: 20,
    hopSize: 10,
  }).sensitivityPreset,
  "balanced",
);
assert.equal(
  detectAudioOnsets(weakForPreset, sampleRate, {
    sensitivityPreset: "unknown",
    frameSize: 20,
    hopSize: 10,
  }).warnings.some((warning) => warning.includes("Unknown sensitivity preset")),
  true,
);

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

const limitedTimeline = detectAudioOnsets(withImpulse([200, 500, 900]), sampleRate, {
  frameSize: 20,
  hopSize: 5,
  minOnsetGapMs: 80,
  minimumEnergy: 0.02,
  minimumStrength: 0.02,
  maxTimelinePoints: 25,
});
assert.ok(limitedTimeline.timeline.length <= 25);
assert.equal(limitedTimeline.timelineMaxPoints, 25);
assert.equal(limitedTimeline.isTimelineDownsampled, true);
assert.ok(limitedTimeline.timeline.some((point) => point.isCandidate));

assert.equal(detectAudioOnsets(new Float32Array(), sampleRate).onsetCount, 0);
assert.equal(detectAudioOnsets(new Float32Array(), sampleRate).timeline.length, 0);
assert.equal(detectAudioOnsets(makeSamples(), 0).sampleRate, 0);
assert.equal(detectAudioOnsets(makeSamples(), 0).timeline.length, 0);
assert.deepEqual(
  createAudioOnsetTimeline({
    energies: [0],
    strengths: [0],
    threshold: 0.1,
    hopSize: 10,
    sampleRate: 0,
    candidates: [],
    sensitivityPreset: "balanced",
  }),
  [],
);

assert.equal(hasAudioOnsetScoringFields(single), false);
single.candidates.forEach((candidate) =>
  assert.equal(hasAudioOnsetScoringFields(candidate), false),
);
single.timeline.forEach((point) =>
  assert.equal(hasAudioOnsetScoringFields(point), false),
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
const audioOnsetTimelinePreview = readFileSync("components/practice/AudioOnsetTimelinePreview.tsx", "utf8");
assert.match(practicePage, /音频起音检测基础/);
assert.match(practicePage, /不上传/);
assert.match(practicePage, /不是节奏评分/);
assert.match(practicePage, /起音灵敏度预设/);
assert.match(practicePage, /灵敏模式可能检测到更弱的起音/);
assert.match(practicePage, /保守模式可能减少额外候选/);
assert.match(`${practicePage}
${audioOnsetTimelinePreview}`, /threshold/);
assert.match(`${practicePage}
${audioOnsetTimelinePreview}`, /起音强度时间线预览/);
assert.match(practicePage, /还没有起音时间线/);
assert.match(`${practicePage}
${audioOnsetTimelinePreview}`, /时间线预览已降采样/);
assert.doesNotMatch(practicePage, /accuracyPercentage/);
