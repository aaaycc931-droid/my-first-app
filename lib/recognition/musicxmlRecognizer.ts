import { parseMusicXML } from "../musicxml/musicxmlParser";
import type { RecognizeResponse, Recognizer } from "./types";

const metadata: NonNullable<RecognizeResponse["metadata"]> = {
  provider: "musicxml",
  format: "musicxml",
  version: "2026-06-14",
};

/**
 * Adapts a MusicXML file to the recognition response used by the application.
 */
export class MusicXMLRecognizer implements Recognizer {
  async recognize(file: File): Promise<RecognizeResponse> {
    try {
      const xml = await file.text();
      const parsed = parseMusicXML(xml);

      return {
        notes: parsed.notes,
        source: "musicxml",
        metadata: { ...metadata },
        raw: {
          musicXml: xml,
        },
      };
    } catch (error) {
      return {
        notes: [],
        source: "musicxml",
        metadata: { ...metadata },
        error:
          error instanceof Error
            ? error.message
            : "Failed to read the MusicXML file.",
      };
    }
  }
}
