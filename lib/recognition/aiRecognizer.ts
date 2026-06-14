import { MockRecognizer } from "./mockRecognizer";
import type { RecognizeResponse, Recognizer } from "./types";

/**
 * Placeholder entry layer for a future real AI sheet-music recognizer.
 *
 * This class intentionally does not connect to any AI model yet. It documents
 * the expected integration contract so the app can add a real provider later
 * without changing UI or playback code.
 */
export class AIRecognizer implements Recognizer {
  private readonly fallbackRecognizer = new MockRecognizer();

  async recognize(image: File): Promise<RecognizeResponse> {
    // Future AI recognition flow:
    // 1. image preprocessing: normalize size, contrast, rotation, and noise.
    // 2. staff line detection: locate staff systems and line spacing.
    // 3. note detection: find note heads, stems, beams, rests, and symbols.
    // 4. pitch mapping: map detected notes to staff positions and clefs.
    // 5. rhythm parsing: infer durations, measures, beats, and timing.

    return this.fallbackRecognizer.recognize(image);
  }
}
