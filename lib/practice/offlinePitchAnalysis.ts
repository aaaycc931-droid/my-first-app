import { PitchDetector } from "pitchy";

import { estimateFrameFrequency, getNearestPitchNote } from "./pitchEstimate";

export const OFFLINE_PITCH_ANALYSIS_VERSION = "offline-pitch-multicandidate-v1" as const;
export const OFFLINE_PITCH_SAMPLE_RATE = 16_000;
export const OFFLINE_PITCH_FRAME_SIZE = 2_048;
export const OFFLINE_PITCH_HOP_SIZE = 320;
export const OFFLINE_PITCH_MAX_DURATION_SECONDS = 30;

export type OfflinePcmInput = {
  sampleRate: number;
  channels: readonly Float32Array[];
};

export type StandardizedOfflinePcm = {
  sampleRate: typeof OFFLINE_PITCH_SAMPLE_RATE;
  samples: Float32Array;
  durationSeconds: number;
  diagnostics: {
    inputSampleRate: number;
    inputChannelCount: number;
    dcOffset: number;
    inputRms: number;
    inputPeak: number;
    clippedSampleRatio: number;
    appliedGain: number;
  };
};

export type OfflinePitchCandidate = {
  engineId: "autocorrelation-baseline" | "pitchy-mcleod";
  frequencyHz: number | null;
  confidence: number;
};

export type OfflinePitchFrame = {
  index: number;
  timestampMs: number;
  state: "voiced" | "quiet" | "low-confidence" | "engine-disagreement" | "out-of-range";
  frequencyHz: number | null;
  midi: number | null;
  confidence: number;
  rms: number;
  octaveAdjusted: boolean;
  candidates: readonly OfflinePitchCandidate[];
  reason: string;
};

export type OfflinePitchAnalysisResult = {
  version: typeof OFFLINE_PITCH_ANALYSIS_VERSION;
  pcm: StandardizedOfflinePcm;
  frames: readonly OfflinePitchFrame[];
  summary: {
    totalFrames: number;
    voicedFrames: number;
    voicedRatio: number;
    representativeFrequencyHz: number | null;
    representativeNote: string | null;
    minFrequencyHz: number | null;
    maxFrequencyHz: number | null;
    engineComparableFrames: number;
    engineAgreementRatio: number | null;
    octaveAdjustedFrames: number;
    rejectedFrames: number;
  };
};

const isPositive = (value: number) => Number.isFinite(value) && value > 0;

const rms = (samples: Float32Array, start = 0, length = samples.length) => {
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    const value = samples[start + index] ?? 0;
    sum += value * value;
  }
  return length > 0 ? Math.sqrt(sum / length) : 0;
};

const median = (values: readonly number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

const cents = (frequency: number, reference: number) => 1_200 * Math.log2(frequency / reference);

const chromaDistance = (absoluteCents: number) => {
  const remainder = Math.abs(absoluteCents) % 1_200;
  return Math.min(remainder, 1_200 - remainder);
};

const resampleLinear = (samples: Float32Array, inputRate: number) => {
  if (inputRate === OFFLINE_PITCH_SAMPLE_RATE) return new Float32Array(samples);
  const outputLength = Math.max(1, Math.floor(samples.length * OFFLINE_PITCH_SAMPLE_RATE / inputRate));
  const output = new Float32Array(outputLength);
  const scale = inputRate / OFFLINE_PITCH_SAMPLE_RATE;
  for (let index = 0; index < output.length; index += 1) {
    const position = index * scale;
    const left = Math.min(samples.length - 1, Math.floor(position));
    const right = Math.min(samples.length - 1, left + 1);
    const fraction = position - left;
    output[index] = samples[left] * (1 - fraction) + samples[right] * fraction;
  }
  return output;
};

export const standardizeOfflinePcm = (input: OfflinePcmInput): StandardizedOfflinePcm => {
  if (!isPositive(input.sampleRate) || input.sampleRate < 8_000 || input.sampleRate > 192_000) {
    throw new Error("录音采样率无效或超出 8–192 kHz 本机处理范围。");
  }
  if (input.channels.length < 1 || input.channels.length > 8) {
    throw new Error("录音必须包含 1–8 个 PCM 声道。");
  }
  const length = input.channels[0]?.length ?? 0;
  if (length === 0 || input.channels.some((channel) => channel.length !== length)) {
    throw new Error("录音 PCM 声道为空或长度不一致。");
  }
  const durationSeconds = length / input.sampleRate;
  if (durationSeconds < OFFLINE_PITCH_FRAME_SIZE / OFFLINE_PITCH_SAMPLE_RATE) {
    throw new Error("录音太短，至少需要约 0.13 秒可解码声音。");
  }
  if (durationSeconds > OFFLINE_PITCH_MAX_DURATION_SECONDS) {
    throw new Error(`本地多候选分析单次最多处理 ${OFFLINE_PITCH_MAX_DURATION_SECONDS} 秒，请缩短后重录。`);
  }

  const mono = new Float32Array(length);
  let dcOffset = 0;
  let peak = 0;
  let clipped = 0;
  for (let index = 0; index < length; index += 1) {
    let value = 0;
    for (const channel of input.channels) value += Number.isFinite(channel[index]) ? channel[index] : 0;
    value /= input.channels.length;
    mono[index] = value;
    dcOffset += value;
    peak = Math.max(peak, Math.abs(value));
    if (Math.abs(value) >= 0.999) clipped += 1;
  }
  dcOffset /= length;
  const inputRms = rms(mono);
  const appliedGain = peak > 1 ? 0.98 / peak : 1;
  for (let index = 0; index < mono.length; index += 1) {
    mono[index] = Math.max(-1, Math.min(1, (mono[index] - dcOffset) * appliedGain));
  }
  const samples = resampleLinear(mono, input.sampleRate);
  return {
    sampleRate: OFFLINE_PITCH_SAMPLE_RATE,
    samples,
    durationSeconds: samples.length / OFFLINE_PITCH_SAMPLE_RATE,
    diagnostics: {
      inputSampleRate: input.sampleRate,
      inputChannelCount: input.channels.length,
      dcOffset,
      inputRms,
      inputPeak: peak,
      clippedSampleRatio: clipped / length,
      appliedGain,
    },
  };
};

const octaveEquivalentNearest = (frequency: number, reference: number) => {
  const candidates = [frequency / 2, frequency, frequency * 2]
    .filter((candidate) => candidate >= 65 && candidate <= 1_100);
  return candidates.sort((left, right) => Math.abs(cents(left, reference)) - Math.abs(cents(right, reference)))[0] ?? frequency;
};

export const suppressOfflineOctaveJump = (frequency: number, previousFrequency: number | null) => {
  if (!previousFrequency || Math.abs(cents(frequency, previousFrequency)) < 700) {
    return { frequencyHz: frequency, adjusted: false };
  }
  const adjusted = octaveEquivalentNearest(frequency, previousFrequency);
  return Math.abs(cents(adjusted, previousFrequency)) <= 180
    ? { frequencyHz: adjusted, adjusted: adjusted !== frequency }
    : { frequencyHz: frequency, adjusted: false };
};

const candidateInRange = (frequency: number | null) =>
  frequency !== null && Number.isFinite(frequency) && frequency >= 65 && frequency <= 1_100;

export const analyzeOfflinePitchPcm = (pcm: StandardizedOfflinePcm): OfflinePitchAnalysisResult => {
  if (pcm.sampleRate !== OFFLINE_PITCH_SAMPLE_RATE || pcm.samples.length < OFFLINE_PITCH_FRAME_SIZE) {
    throw new Error("必须先把录音标准化为 16 kHz 单声道 PCM。");
  }
  const detector = PitchDetector.forFloat32Array(OFFLINE_PITCH_FRAME_SIZE);
  const frames: OfflinePitchFrame[] = [];
  let previousFrequency: number | null = null;
  let comparableFrames = 0;
  let agreementFrames = 0;

  for (let start = 0, index = 0; start + OFFLINE_PITCH_FRAME_SIZE <= pcm.samples.length; start += OFFLINE_PITCH_HOP_SIZE, index += 1) {
    const frameSamples = pcm.samples.subarray(start, start + OFFLINE_PITCH_FRAME_SIZE);
    const frameRms = rms(frameSamples);
    const timestampMs = (start / pcm.sampleRate) * 1_000;
    if (frameRms < 0.008) {
      const candidates: OfflinePitchCandidate[] = [
        { engineId: "autocorrelation-baseline", frequencyHz: null, confidence: 0 },
        { engineId: "pitchy-mcleod", frequencyHz: null, confidence: 0 },
      ];
      frames.push({ index, timestampMs, rms: frameRms, candidates, state: "quiet", frequencyHz: null, midi: null, confidence: 0, octaveAdjusted: false, reason: "帧能量低于本地 voiced 门槛。" });
      continue;
    }
    const autocorrelation = estimateFrameFrequency(
      pcm.samples,
      start,
      OFFLINE_PITCH_FRAME_SIZE,
      pcm.sampleRate,
      65,
      1_100,
    );
    const [pitchyFrequency, pitchyClarity] = detector.findPitch(frameSamples, pcm.sampleRate);
    const candidates: OfflinePitchCandidate[] = [
      {
        engineId: "autocorrelation-baseline",
        frequencyHz: autocorrelation && candidateInRange(autocorrelation.frequencyHz) ? autocorrelation.frequencyHz : null,
        confidence: autocorrelation?.confidence ?? 0,
      },
      {
        engineId: "pitchy-mcleod",
        frequencyHz: candidateInRange(pitchyFrequency) ? pitchyFrequency : null,
        confidence: Number.isFinite(pitchyClarity) ? pitchyClarity : 0,
      },
    ];
    const base = { index, timestampMs, rms: frameRms, candidates };

    const auto = candidates[0];
    const mcleod = candidates[1];
    const validAuto = auto.frequencyHz !== null && auto.confidence >= 0.65;
    const validMcleod = mcleod.frequencyHz !== null && mcleod.confidence >= 0.75;
    let selected: number | null = null;
    let confidence = 0;
    let reason = "";
    if (validAuto && validMcleod) {
      comparableFrames += 1;
      const alignedMcleod = octaveEquivalentNearest(mcleod.frequencyHz as number, auto.frequencyHz as number);
      const distance = Math.abs(cents(alignedMcleod, auto.frequencyHz as number));
      if (distance <= 80) {
        agreementFrames += 1;
        const weight = auto.confidence + mcleod.confidence;
        selected = 2 ** ((Math.log2(auto.frequencyHz as number) * auto.confidence + Math.log2(alignedMcleod) * mcleod.confidence) / weight);
        confidence = weight / 2;
        reason = "两个候选引擎在八度校正后达成一致。";
      } else if (Math.max(auto.confidence, mcleod.confidence) >= 0.94 && distance <= 350) {
        selected = auto.confidence >= mcleod.confidence ? auto.frequencyHz : alignedMcleod;
        confidence = Math.max(auto.confidence, mcleod.confidence) * 0.9;
        reason = "候选存在偏差，保留高置信候选并降低合并置信度。";
      } else {
        frames.push({ ...base, state: "engine-disagreement", frequencyHz: null, midi: null, confidence: Math.max(auto.confidence, mcleod.confidence), octaveAdjusted: false, reason: "候选引擎分歧过大，本帧拒答。" });
        continue;
      }
    } else if (validAuto || validMcleod) {
      const candidate = validAuto ? auto : mcleod;
      if (candidate.confidence < 0.88) {
        frames.push({ ...base, state: "low-confidence", frequencyHz: null, midi: null, confidence: candidate.confidence, octaveAdjusted: false, reason: "只有一个候选有效且置信度不足，本帧拒答。" });
        continue;
      }
      selected = candidate.frequencyHz;
      confidence = candidate.confidence * 0.88;
      reason = "仅一个候选引擎有效，已降低合并置信度。";
    } else {
      frames.push({ ...base, state: "low-confidence", frequencyHz: null, midi: null, confidence: Math.max(auto.confidence, mcleod.confidence), octaveAdjusted: false, reason: "没有候选达到 voiced 置信门槛。" });
      continue;
    }

    if (!selected || !candidateInRange(selected)) {
      frames.push({ ...base, state: "out-of-range", frequencyHz: null, midi: null, confidence, octaveAdjusted: false, reason: "合并候选超出 65–1100 Hz 单声部观察范围。" });
      continue;
    }
    const suppressed = suppressOfflineOctaveJump(selected, previousFrequency);
    if (previousFrequency && !suppressed.adjusted && Math.abs(cents(suppressed.frequencyHz, previousFrequency)) > 900 && confidence < 0.95) {
      frames.push({ ...base, state: "low-confidence", frequencyHz: null, midi: null, confidence, octaveAdjusted: false, reason: "连续轨迹出现无法解释的大跳，本帧拒答。" });
      continue;
    }
    selected = suppressed.frequencyHz;
    previousFrequency = selected;
    frames.push({
      ...base,
      state: "voiced",
      frequencyHz: selected,
      midi: 69 + 12 * Math.log2(selected / 440),
      confidence,
      octaveAdjusted: suppressed.adjusted,
      reason: suppressed.adjusted ? `${reason} 连续轨迹抑制了一次整八度跳变。` : reason,
    });
  }

  const voiced = frames.filter((frame) => frame.state === "voiced" && frame.frequencyHz !== null);
  const frequencies = voiced.map((frame) => frame.frequencyHz as number);
  const representative = median(frequencies);
  return {
    version: OFFLINE_PITCH_ANALYSIS_VERSION,
    pcm,
    frames,
    summary: {
      totalFrames: frames.length,
      voicedFrames: voiced.length,
      voicedRatio: frames.length > 0 ? voiced.length / frames.length : 0,
      representativeFrequencyHz: representative,
      representativeNote: representative === null ? null : getNearestPitchNote(representative).nearestNote,
      minFrequencyHz: frequencies.length > 0 ? Math.min(...frequencies) : null,
      maxFrequencyHz: frequencies.length > 0 ? Math.max(...frequencies) : null,
      engineComparableFrames: comparableFrames,
      engineAgreementRatio: comparableFrames > 0 ? agreementFrames / comparableFrames : null,
      octaveAdjustedFrames: voiced.filter((frame) => frame.octaveAdjusted).length,
      rejectedFrames: frames.filter((frame) => frame.state !== "voiced" && frame.state !== "quiet").length,
    },
  };
};
