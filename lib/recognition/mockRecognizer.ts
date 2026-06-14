import type { RecognizedNote } from "./types";

const mockRecognizedNotes: RecognizedNote[] = [
  { note: "C4", duration: "quarter", confidence: 0.95, measure: 1, beat: 1, source: "mock" },
  { note: "D4", duration: "quarter", confidence: 0.88, measure: 1, beat: 2, source: "mock" },
  { note: "E4", duration: "half", confidence: 0.68, measure: 1, beat: 3, source: "mock" },
  { note: "G4", duration: "quarter", confidence: 0.91, measure: 2, beat: 1, source: "mock" },
];

export async function mockRecognizer(_image: File): Promise<RecognizedNote[]> {
  return mockRecognizedNotes.map((note) => ({ ...note }));
}
