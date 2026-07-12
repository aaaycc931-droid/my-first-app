import type { NotationPitch } from "./localNotationFragmentDraft";

export type NonScoringNotationTargetPitchFeedbackCategory =
  | "no-target-data"
  | "no-reliable-pitch"
  | "close"
  | "above"
  | "below";

export type NonScoringNotationTargetPitchFeedbackInput = {
  targetFrequencyHz: number | null | undefined;
  estimatedFrequencyHz: number | null | undefined;
  confidence?: number | null;
  validPitchFrames?: number | null;
};

export type NonScoringNotationTargetPitchFeedback = {
  category: NonScoringNotationTargetPitchFeedbackCategory;
  title: string;
  message: string;
  centsDifference: number | null;
};

const notationPitchFrequenciesHz: Record<NotationPitch, number> = {
  C4: 261.625565,
  D4: 293.664768,
  E4: 329.627557,
  F4: 349.228231,
  G4: 391.995436,
  A4: 440,
  B4: 493.883301,
  C5: 523.251131,
};

const closeCentsThreshold = 25;
const minimumReliableConfidence = 0.4;

const isPositiveFrequency = (
  frequencyHz: number | null | undefined,
): frequencyHz is number =>
  typeof frequencyHz === "number" &&
  Number.isFinite(frequencyHz) &&
  frequencyHz > 0;

export const getNotationTargetPitchFrequencyHz = (
  pitch: NotationPitch | null,
): number | null => (pitch ? notationPitchFrequenciesHz[pitch] : null);

export const calculateNotationTargetPitchCentsDifference = (
  estimatedFrequencyHz: number,
  targetFrequencyHz: number,
) => 1200 * Math.log2(estimatedFrequencyHz / targetFrequencyHz);

export const getNonScoringNotationTargetPitchFeedback = ({
  targetFrequencyHz,
  estimatedFrequencyHz,
  confidence,
  validPitchFrames,
}: NonScoringNotationTargetPitchFeedbackInput): NonScoringNotationTargetPitchFeedback => {
  if (!isPositiveFrequency(targetFrequencyHz)) {
    return {
      category: "no-target-data",
      title: "当前事件没有可用音高目标",
      message: "只有带有当前阶段支持音高的视唱音符可以使用本地音高跟练。",
      centsDifference: null,
    };
  }

  if (
    !isPositiveFrequency(estimatedFrequencyHz) ||
    confidence === null ||
    confidence === undefined ||
    confidence < minimumReliableConfidence ||
    validPitchFrames === 0
  ) {
    return {
      category: "no-reliable-pitch",
      title: "没有检测到稳定音高",
      message: "请录制更清晰、更稳定的单音后再次进行本地音高估计。",
      centsDifference: null,
    };
  }

  const centsDifference = calculateNotationTargetPitchCentsDifference(
    estimatedFrequencyHz,
    targetFrequencyHz,
  );

  if (Math.abs(centsDifference) <= closeCentsThreshold) {
    return {
      category: "close",
      title: "接近目标音",
      message: "这次本地估计接近当前视唱音符的参考音高。",
      centsDifference,
    };
  }

  if (centsDifference > 0) {
    return {
      category: "above",
      title: "略偏高，可以稍微放低一点",
      message: "这次本地估计高于当前视唱音符的参考音高。",
      centsDifference,
    };
  }

  return {
    category: "below",
    title: "略偏低，可以稍微抬高一点",
    message: "这次本地估计低于当前视唱音符的参考音高。",
    centsDifference,
  };
};
