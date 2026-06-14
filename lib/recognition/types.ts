export type RecognizedNoteDuration = "quarter" | "half" | "eighth" | "whole";

/**
 * Recognition result source.
 *
 * `mock` keeps the current MVP recognizer compatible. The remaining values are
 * reserved for the future real recognition pipeline: AI model inference, OCR,
 * and MusicXML imports.
 */
export type RecognizedNoteSource = "mock" | "ai" | "ocr" | "musicxml";

export type RecognitionProvider = RecognizedNoteSource;

export type RecognitionFormat = "json" | "musicxml";

export type RecognizedPitch = {
  /** Scientific pitch notation, for example C4 or F#5. */
  value: string;
  step?: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  octave?: number;
  alter?: -2 | -1 | 0 | 1 | 2;
};

/**
 * Canonical note returned by sheet-music recognition.
 *
 * The required fields are the stable contract for playback and display:
 * pitch, duration, measure, beat, and confidence. The legacy `note` field stays
 * required so existing mock recognition responses and current playback code do
 * not need to change yet.
 */
export type RecognizedNote = {
  /** Standard pitch value for recognition providers, such as C4 or F#5. */
  pitch: string;
  /** Legacy mock-compatible field used by the current UI and playback code. */
  note: string;
  duration: RecognizedNoteDuration;
  measure: number;
  beat: number;
  confidence: number;
  source?: RecognizedNoteSource;
  pitchDetail?: RecognizedPitch;
  durationBeats?: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  musicXml?: {
    partId?: string;
    voice?: string;
    staff?: number;
    noteId?: string;
  };
};

export type RecognitionMetadata = {
  provider: RecognitionProvider;
  format: RecognitionFormat;
  version: string;
  imageId?: string;
  warnings?: string[];
};

/**
 * API response for POST /api/recognize.
 *
 * `notes` remains optional for error compatibility with the current mock flow,
 * while successful responses should populate it with RecognizedNote objects.
 */
export type RecognizeResponse = {
  notes?: RecognizedNote[];
  source?: RecognizedNoteSource;
  metadata?: RecognitionMetadata;
  raw?: {
    musicXml?: string;
    ocrText?: string;
    providerPayload?: unknown;
  };
  error?: string;
};
