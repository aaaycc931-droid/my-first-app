export type MusicXMLNoteDuration = "eighth" | "quarter" | "half" | "whole";

/**
 * Canonical note shape for MusicXML imports.
 *
 * This mirrors the current recognition contract so future Audiveris output can
 * enter the system without changing UI or playback code.
 */
export type MusicXMLNote = {
  note: string;
  duration: MusicXMLNoteDuration;
  measure: number;
  beat: number;
  confidence: number;
};

export type ParsedScore = {
  notes: MusicXMLNote[];
};
