import type { RecognizeResponse } from "./types";
import { getRecognizer } from "./recognizerFactory";

/**
 * Unified sheet music recognition entry point.
 *
 * The active recognizer is resolved through the factory so API routes depend on
 * the Recognizer interface instead of a concrete mock implementation. Future
 * AIRecognizer or OCRRecognizer adapters can be switched in the factory without
 * changing the frontend or API response shape.
 */
export async function recognizeSheetMusic(image: File): Promise<RecognizeResponse> {
  return getRecognizer().recognize(image);
}
