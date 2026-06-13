import type { RecognizedNote } from "./recognitionTypes";
import { mockRecognizer } from "./mockRecognizer";

export async function recognizeSheetMusic(image: File): Promise<RecognizedNote[]> {
  return mockRecognizer(image);
}
