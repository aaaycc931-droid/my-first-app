import type { RecognizedNote } from "./recognitionTypes";

const mockRecognizedNotes: RecognizedNote[] = [
  { note: "C4", duration: "quarter", confidence: 0.95, measure: 1, beat: 1 },
  { note: "D4", duration: "quarter", confidence: 0.88, measure: 1, beat: 2 },
  { note: "E4", duration: "half", confidence: 0.68, measure: 1, beat: 3 },
  { note: "G4", duration: "quarter", confidence: 0.91, measure: 2, beat: 1 },
];

export async function mockRecognizer(_image: File): Promise<RecognizedNote[]> {
  return mockRecognizedNotes;
}
