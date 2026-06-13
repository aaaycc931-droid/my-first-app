export type RecognizedNoteDuration = "quarter" | "half" | "whole";

export type RecognizedNote = {
  note: string;
  duration: RecognizedNoteDuration;
  confidence: number;
  measure: number;
  beat: number;
};

export type RecognizeResponse = {
  notes?: RecognizedNote[];
  error?: string;
};
