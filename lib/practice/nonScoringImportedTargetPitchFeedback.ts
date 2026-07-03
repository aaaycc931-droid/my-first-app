export type NonScoringImportedTargetPitchFeedbackCategory =
  | "no-target-data"
  | "no-reliable-pitch"
  | "close"
  | "above"
  | "below";

export type NonScoringImportedTargetPitchFeedbackInput = {
  targetFrequencyHz: number | null | undefined;
  estimatedFrequencyHz: number | null | undefined;
  confidence?: number | null;
  validPitchFrames?: number | null;
};

export type NonScoringImportedTargetPitchFeedback = {
  category: NonScoringImportedTargetPitchFeedbackCategory;
  title: string;
  message: string;
  centsDifference: number | null;
};

const closeCentsThreshold = 25;
const minimumReliableConfidence = 0.4;

const isPositiveFrequency = (
  frequencyHz: number | null | undefined,
): frequencyHz is number =>
  typeof frequencyHz === "number" &&
  Number.isFinite(frequencyHz) &&
  frequencyHz > 0;

export const calculateImportedTargetPitchCentsDifference = (
  estimatedFrequencyHz: number,
  targetFrequencyHz: number,
) => 1200 * Math.log2(estimatedFrequencyHz / targetFrequencyHz);

export const getNonScoringImportedTargetPitchFeedback = ({
  targetFrequencyHz,
  estimatedFrequencyHz,
  confidence,
  validPitchFrames,
}: NonScoringImportedTargetPitchFeedbackInput): NonScoringImportedTargetPitchFeedback => {
  if (!isPositiveFrequency(targetFrequencyHz)) {
    return {
      category: "no-target-data",
      title: "Pitch feedback",
      message:
        "Imported target pitch feedback is available only when target pitch data exists.",
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
      title: "Non-scoring feedback",
      message: "No reliable pitch was detected.",
      centsDifference: null,
    };
  }

  const reliableEstimatedFrequencyHz = estimatedFrequencyHz;
  const reliableTargetFrequencyHz = targetFrequencyHz;
  const centsDifference = calculateImportedTargetPitchCentsDifference(
    reliableEstimatedFrequencyHz,
    reliableTargetFrequencyHz,
  );

  if (Math.abs(centsDifference) <= closeCentsThreshold) {
    return {
      category: "close",
      title: "Non-scoring feedback",
      message: "Your pitch was close to the target.",
      centsDifference,
    };
  }

  if (centsDifference > 0) {
    return {
      category: "above",
      title: "Non-scoring feedback",
      message: "Your pitch was above the target.",
      centsDifference,
    };
  }

  return {
    category: "below",
    title: "Non-scoring feedback",
    message: "Your pitch was below the target.",
    centsDifference,
  };
};
