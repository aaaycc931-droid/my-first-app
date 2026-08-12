import type {
  PracticeRecordingAnalysisPort,
  PracticeRecordingDecodedAudio,
} from "../audio/practiceRecordingAnalysis";
import type { PitchEstimateResult } from "./pitchEstimate";
import type {
  AudioOnsetDetectionOptions,
  AudioOnsetDetectionResult,
  AudioOnsetSensitivityPreset,
} from "../rhythm/audioOnsetDetection";

export type PracticeRecordingLevelResult = {
  durationSeconds: number;
  peakLevel: number;
  rmsLevel: number;
  simpleLevelHint: string;
};

export type PracticeRecordingAnalysisTask<Result> = {
  status: "idle" | "running" | "ready" | "error";
  result: Result | null;
  error: string;
};

export type PracticeRecordingPitchContext = {
  recordingAttemptKey: number | null;
  attemptHistoryGeneration: number;
  melodyStepId: string;
  melodyStepIndex: number;
  targetNote: string;
  importedSegmentKey: string | null;
  notationTargetKey: string | null;
};

export type PracticeRecordingPitchResult = {
  estimate: PitchEstimateResult;
  context: PracticeRecordingPitchContext;
};

export const canAppendPracticeRecordingPitchAttempt = ({
  context,
  currentRecordingAttemptKey,
  currentHistoryGeneration,
  recordedPracticeAttemptKey,
}: {
  context: PracticeRecordingPitchContext;
  currentRecordingAttemptKey: number | null;
  currentHistoryGeneration: number;
  recordedPracticeAttemptKey: number | null;
}) =>
  context.recordingAttemptKey !== null &&
  context.recordingAttemptKey === currentRecordingAttemptKey &&
  context.attemptHistoryGeneration === currentHistoryGeneration &&
  recordedPracticeAttemptKey !== context.recordingAttemptKey;

export type PracticeRecordingAnalysisSnapshot = {
  level: PracticeRecordingAnalysisTask<PracticeRecordingLevelResult>;
  pitch: PracticeRecordingAnalysisTask<PracticeRecordingPitchResult>;
  onset: PracticeRecordingAnalysisTask<AudioOnsetDetectionResult>;
};

export type PracticeRecordingAnalysisController = {
  getSnapshot: () => PracticeRecordingAnalysisSnapshot;
  subscribe: (listener: () => void) => () => void;
  attach: () => void;
  detach: () => void;
  clear: () => void;
  analyzeLevel: (recording: Blob | null) => Promise<boolean>;
  estimatePitch: (
    recording: Blob | null,
    context: PracticeRecordingPitchContext,
  ) => Promise<boolean>;
  detectOnsets: (
    recording: Blob | null,
    sensitivityPreset: AudioOnsetSensitivityPreset,
  ) => Promise<boolean>;
};

const idleTask = <Result>(): PracticeRecordingAnalysisTask<Result> => ({
  status: "idle",
  result: null,
  error: "",
});

const createEmptySnapshot = (): PracticeRecordingAnalysisSnapshot => ({
  level: idleTask(),
  pitch: idleTask(),
  onset: idleTask(),
});

export const calculatePracticeRecordingLevel = (
  decoded: PracticeRecordingDecodedAudio,
): PracticeRecordingLevelResult => {
  let peakLevel = 0;
  let squaredSampleSum = 0;
  let sampleCount = 0;
  decoded.channels.forEach((channelData) => {
    channelData.forEach((sample) => {
      const sampleLevel = Math.abs(sample);
      peakLevel = Math.max(peakLevel, sampleLevel);
      squaredSampleSum += sample ** 2;
      sampleCount += 1;
    });
  });
  const rmsLevel =
    sampleCount > 0 ? Math.sqrt(squaredSampleSum / sampleCount) : 0;
  let simpleLevelHint = "录音电平看起来可用";
  if (peakLevel >= 0.98) simpleLevelHint = "录音可能削波";
  else if (peakLevel < 0.08 || rmsLevel < 0.015)
    simpleLevelHint = "录音可能太轻";
  return {
    durationSeconds: decoded.durationSeconds,
    peakLevel,
    rmsLevel,
    simpleLevelHint,
  };
};

export const createPracticeRecordingAnalysisController = ({
  port,
  estimatePitch,
  detectOnsets,
}: {
  port: PracticeRecordingAnalysisPort;
  estimatePitch: (audio: PracticeRecordingDecodedAudio) => PitchEstimateResult;
  detectOnsets: (
    samples: Float32Array,
    sampleRate: number,
    options: AudioOnsetDetectionOptions,
  ) => AudioOnsetDetectionResult;
}): PracticeRecordingAnalysisController => {
  let snapshot = createEmptySnapshot();
  let attached = true;
  let levelGeneration = 0;
  let pitchGeneration = 0;
  let onsetGeneration = 0;
  const listeners = new Set<() => void>();

  const publish = (patch: Partial<PracticeRecordingAnalysisSnapshot>) => {
    if (!attached) return;
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };

  const run = async <Result>({
    slot,
    recording,
    missingError,
    fallbackError,
    generation,
    getGeneration,
    analyze,
  }: {
    slot: keyof PracticeRecordingAnalysisSnapshot;
    recording: Blob | null;
    missingError: string;
    fallbackError: string;
    generation: number;
    getGeneration: () => number;
    analyze: (audio: PracticeRecordingDecodedAudio) => Result;
  }) => {
    if (!attached) return false;
    if (!recording) {
      publish({
        [slot]: { status: "error", result: null, error: missingError },
      });
      return false;
    }
    publish({ [slot]: { status: "running", result: null, error: "" } });
    try {
      const decoded = await port.decode(recording);
      if (!attached || generation !== getGeneration()) return false;
      const result = analyze(decoded);
      if (!attached || generation !== getGeneration()) return false;
      publish({ [slot]: { status: "ready", result, error: "" } });
      return true;
    } catch (error) {
      if (!attached || generation !== getGeneration()) return false;
      const message =
        slot === "pitch" && error instanceof Error
          ? error.message
          : fallbackError;
      publish({ [slot]: { status: "error", result: null, error: message } });
      return false;
    }
  };

  const clear = () => {
    levelGeneration += 1;
    pitchGeneration += 1;
    onsetGeneration += 1;
    publish(createEmptySnapshot());
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    attach: () => {
      attached = true;
    },
    detach: () => {
      if (!attached) return;
      attached = false;
      levelGeneration += 1;
      pitchGeneration += 1;
      onsetGeneration += 1;
      listeners.clear();
      snapshot = createEmptySnapshot();
    },
    clear,
    analyzeLevel: (recording) => {
      const generation = ++levelGeneration;
      return run({
        slot: "level",
        recording,
        missingError: "请先录制一次本地练习，再运行本地音频分析。",
        fallbackError: "此浏览器无法完成本地音频分析。",
        generation,
        getGeneration: () => levelGeneration,
        analyze: calculatePracticeRecordingLevel,
      });
    },
    estimatePitch: (recording, context) => {
      const generation = ++pitchGeneration;
      const frozenContext = { ...context };
      return run({
        slot: "pitch",
        recording,
        missingError: "请先录制一次本地练习，再进行本地音高估计。",
        fallbackError: "此浏览器无法完成本地音高估计。",
        generation,
        getGeneration: () => pitchGeneration,
        analyze: (audio) => ({
          estimate: estimatePitch(audio),
          context: frozenContext,
        }),
      });
    },
    detectOnsets: (recording, sensitivityPreset) => {
      const generation = ++onsetGeneration;
      return run({
        slot: "onset",
        recording,
        missingError:
          "请先录制一次本地练习，再运行浏览器本地起音检测。",
        fallbackError:
          "此浏览器无法完成本地起音检测。音频不会上传，也不会调用 AI。",
        generation,
        getGeneration: () => onsetGeneration,
        analyze: (audio) =>
          detectOnsets(audio.channels[0] ?? new Float32Array(), audio.sampleRate, {
            sensitivityPreset,
          }),
      });
    },
  };
};
