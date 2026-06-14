import type { RecognizedNote } from "./types";
import { mockRecognizer } from "./mockRecognizer";

/**
 * Unified sheet music recognition entry point.
 *
 * The app currently uses mock recognition for the MVP flow. Keep API routes
 * calling this abstraction so a future realRecognizer() can be switched in
 * here without changing the frontend or API response shape.
 */
export async function recognizeSheetMusic(image: File): Promise<RecognizedNote[]> {
  return mockRecognizer(image);
}
