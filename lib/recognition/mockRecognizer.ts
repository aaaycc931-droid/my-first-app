import type { RecognizeResponse, Recognizer } from "./types";

const mockRecognizedNotes: NonNullable<RecognizeResponse["notes"]> = [
  { pitch: "C4", note: "C4", duration: "quarter", confidence: 0.95, measure: 1, beat: 1, source: "mock" },
  { pitch: "D4", note: "D4", duration: "quarter", confidence: 0.88, measure: 1, beat: 2, source: "mock" },
  { pitch: "E4", note: "E4", duration: "half", confidence: 0.68, measure: 1, beat: 3, source: "mock" },
  { pitch: "G4", note: "G4", duration: "quarter", confidence: 0.91, measure: 2, beat: 1, source: "mock" },
];

export class MockRecognizer implements Recognizer {
  async recognize(_image: File): Promise<RecognizeResponse> {
    return {
      notes: mockRecognizedNotes.map((note) => ({ ...note })),
      metadata: {
        provider: "mock",
        format: "json",
        version: "2026-06-14",
      },
    };
  }
}
