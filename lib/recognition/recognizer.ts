import type { RecognizeResponse, Recognizer } from "./types";
import { MockRecognizer } from "./mockRecognizer";

const activeRecognizer: Recognizer = new MockRecognizer();

/**
 * Unified sheet music recognition entry point.
 *
 * The app currently uses MockRecognizer for the MVP flow. Keep API routes
 * calling this abstraction so future AIRecognizer or OCRRecognizer adapters can
 * be switched in here without changing the frontend or API response shape.
 */
export async function recognizeSheetMusic(image: File): Promise<RecognizeResponse> {
  return activeRecognizer.recognize(image);
}
