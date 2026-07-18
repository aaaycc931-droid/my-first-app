import assert from "node:assert/strict";

import {
  analyzeOfflinePitchPcm,
  OFFLINE_PITCH_ANALYSIS_VERSION,
  OFFLINE_PITCH_SAMPLE_RATE,
  standardizeOfflinePcm,
  suppressOfflineOctaveJump,
} from "../lib/practice/offlinePitchAnalysis";

const sine = (frequency: number, seconds: number, sampleRate: number, amplitude = 0.35, dc = 0) => {
  const output = new Float32Array(Math.round(seconds * sampleRate));
  for (let index = 0; index < output.length; index += 1) {
    output[index] = dc + amplitude * Math.sin(2 * Math.PI * frequency * index / sampleRate);
  }
  return output;
};

const left = sine(440, 0.8, 48_000, 0.4, 0.03);
const right = sine(440, 0.8, 48_000, 0.3, 0.03);
const pcm = standardizeOfflinePcm({ sampleRate: 48_000, channels: [left, right] });
assert.equal(pcm.sampleRate, OFFLINE_PITCH_SAMPLE_RATE);
assert.equal(pcm.samples.length, 12_800);
assert.ok(Math.abs(pcm.diagnostics.dcOffset - 0.03) < 0.001);
assert.equal(pcm.diagnostics.inputChannelCount, 2);

const first = analyzeOfflinePitchPcm(pcm);
const second = analyzeOfflinePitchPcm(pcm);
assert.equal(first.version, OFFLINE_PITCH_ANALYSIS_VERSION);
assert.equal(first.summary.representativeNote, "A4");
assert.ok(Math.abs((first.summary.representativeFrequencyHz ?? 0) - 440) < 2);
assert.ok(first.summary.voicedRatio > 0.9);
assert.ok((first.summary.engineAgreementRatio ?? 0) > 0.9);
assert.deepEqual(first.frames, second.frames, "相同标准 PCM 必须产生确定性等价轨迹");

const silence = standardizeOfflinePcm({
  sampleRate: 16_000,
  channels: [new Float32Array(8_000)],
});
const silenceResult = analyzeOfflinePitchPcm(silence);
assert.equal(silenceResult.summary.voicedFrames, 0);
assert.equal(silenceResult.summary.representativeFrequencyHz, null);
assert.ok(silenceResult.frames.every((frame) => frame.state === "quiet"));

assert.deepEqual(suppressOfflineOctaveJump(880, 440), { frequencyHz: 440, adjusted: true });
assert.deepEqual(suppressOfflineOctaveJump(466.16, 440), { frequencyHz: 466.16, adjusted: false });

assert.throws(() => standardizeOfflinePcm({ sampleRate: 48_000, channels: [] }), /1–8/);
assert.throws(() => standardizeOfflinePcm({ sampleRate: 16_000, channels: [new Float32Array(100)] }), /太短/);
assert.throws(() => standardizeOfflinePcm({ sampleRate: 16_000, channels: [new Float32Array(16_000 * 30 + 1)] }), /最多处理 30 秒/);

console.log("P112 offline pitch analysis tests passed.");
