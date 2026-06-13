import type { RecognizedNote } from "./recognitionTypes";
import { mockRecognizer } from "./mockRecognizer";

/**
 * Unified sheet music recognition entry point.
 *
 * Keep API routes and pages calling this function so the current mock
 * implementation can be replaced by a real AI recognizer later without
 * changing the rest of the app flow.
 */
export async function recognizeSheetMusic(image: File): Promise<RecognizedNote[]> {
  return mockRecognizer(image);
}
