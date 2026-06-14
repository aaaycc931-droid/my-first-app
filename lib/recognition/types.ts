export type RecognizedNoteDuration = "eighth" | "quarter" | "half" | "whole";

export type RecognizedNoteSource = "mock" | "ai";

export type RecognizedNote = {
  note: string;
  duration: RecognizedNoteDuration;
  confidence: number;
  measure: number;
  beat: number;
  source?: RecognizedNoteSource;
};

export type RecognizeResponse = {
  notes?: RecognizedNote[];
  error?: string;
};
