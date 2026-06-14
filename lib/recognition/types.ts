export type RecognizedNoteDuration = "eighth" | "quarter" | "half" | "whole";

export type RecognizedNoteSource = "mock" | "ai" | "ocr" | "musicxml";

export type RecognitionProvider = "mock" | "ai" | "ocr" | "musicxml";

export type RecognitionFormat = "json" | "musicxml";

export type RecognizedPitch = {
  /** Scientific pitch notation, for example C4 or F#5. */
  value: string;
  step?: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  octave?: number;
  alter?: -2 | -1 | 0 | 1 | 2;
};

export type RecognizedNote = {
  /**
   * Standard pitch value for recognition providers.
   * Keep this equal to note while the UI still reads the legacy field.
   */
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

export type RecognizeResponse = {
  notes?: RecognizedNote[];
  metadata?: RecognitionMetadata;
  raw?: {
    musicXml?: string;
    ocrText?: string;
    providerPayload?: unknown;
  };
  error?: string;
};


export type Recognizer = {
  /**
   * Recognizes sheet music from an uploaded image and returns the API response shape.
   * Future AI/OCR adapters should implement this interface without changing UI or playback code.
   */
  recognize(image: File): Promise<RecognizeResponse>;
};
