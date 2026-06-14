import type { ParsedScore } from "./musicxmlTypes";

/**
 * Parses Audiveris MusicXML output into the app's canonical note structure.
 *
 * Phase A1 keeps this as a stable interface layer only. The `xml` parameter is
 * intentionally accepted now so the future parser can replace the mock mapping
 * without changing callers.
 */
export function parseMusicXML(_xml: string): ParsedScore {
  return {
    notes: [
      {
        note: "C4",
        duration: "quarter",
        measure: 1,
        beat: 1,
        confidence: 1,
      },
      {
        note: "D4",
        duration: "quarter",
        measure: 1,
        beat: 2,
        confidence: 1,
      },
      {
        note: "E4",
        duration: "half",
        measure: 1,
        beat: 3,
        confidence: 1,
      },
    ],
  };
}
