import type {
  MusicXMLNoteDuration,
  ParsedScore,
} from "./musicxmlTypes";

/**
 * Returns the text inside the first matching MusicXML element.
 */
function getElementText(xml: string, tagName: string): string | undefined {
  const match = xml.match(
    new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"),
  );

  return match?.[1].trim();
}

function parseDuration(
  noteXml: string,
  divisions: number,
): MusicXMLNoteDuration {
  const type = getElementText(noteXml, "type")?.toLowerCase();

  if (
    type === "whole" ||
    type === "half" ||
    type === "quarter" ||
    type === "eighth"
  ) {
    return type;
  }

  const rawDuration = Number(getElementText(noteXml, "duration"));
  const durationInQuarterNotes =
    Number.isFinite(rawDuration) && divisions > 0 ? rawDuration / divisions : 1;

  if (durationInQuarterNotes >= 4) return "whole";
  if (durationInQuarterNotes >= 2) return "half";
  if (durationInQuarterNotes >= 1) return "quarter";
  return "eighth";
}

function durationToBeats(duration: MusicXMLNoteDuration): number {
  switch (duration) {
    case "whole":
      return 4;
    case "half":
      return 2;
    case "eighth":
      return 0.5;
    default:
      return 1;
  }
}

function parsePitch(noteXml: string): string | undefined {
  const pitchXml = noteXml.match(
    /<pitch(?:\s[^>]*)?>([\s\S]*?)<\/pitch>/i,
  )?.[1];

  if (!pitchXml) return undefined;

  const step = getElementText(pitchXml, "step")?.toUpperCase();
  const octave = getElementText(pitchXml, "octave");

  if (!step || !/^[A-G]$/.test(step) || !octave) return undefined;

  const alter = Number(getElementText(pitchXml, "alter") ?? 0);
  const accidental = alter === 1 ? "#" : alter === -1 ? "b" : "";

  return `${step}${accidental}${octave}`;
}

/**
 * Parses a small, single-voice subset of partwise MusicXML.
 */
export function parseMusicXML(xml: string): ParsedScore {
  if (!xml.trim()) return { notes: [] };

  const notes: ParsedScore["notes"] = [];
  const measurePattern =
    /<measure\b([^>]*)>([\s\S]*?)<\/measure>/gi;
  let measureMatch: RegExpExecArray | null;
  let measureIndex = 0;
  let divisions = 1;

  while ((measureMatch = measurePattern.exec(xml)) !== null) {
    measureIndex += 1;

    const measureAttributes = measureMatch[1];
    const measureXml = measureMatch[2];
    const numberMatch = measureAttributes.match(
      /\bnumber\s*=\s*["']([^"']+)["']/i,
    );
    const parsedMeasureNumber = Number(numberMatch?.[1]);
    const measure =
      Number.isFinite(parsedMeasureNumber) && parsedMeasureNumber > 0
        ? parsedMeasureNumber
        : measureIndex;

    const parsedDivisions = Number(getElementText(measureXml, "divisions"));
    if (Number.isFinite(parsedDivisions) && parsedDivisions > 0) {
      divisions = parsedDivisions;
    }

    let elapsedBeats = 0;
    const notePattern = /<note\b[^>]*>([\s\S]*?)<\/note>/gi;
    let noteMatch: RegExpExecArray | null;

    while ((noteMatch = notePattern.exec(measureXml)) !== null) {
      const noteXml = noteMatch[1];
      const duration = parseDuration(noteXml, divisions);
      const beat = elapsedBeats + 1;

      // Rests occupy time but are not emitted as recognized notes.
      if (!/<rest(?:\s[^>]*)?\/?\s*>/i.test(noteXml)) {
        const pitch = parsePitch(noteXml);

        if (pitch) {
          notes.push({
            pitch,
            note: pitch,
            duration,
            measure,
            beat,
            confidence: 0.8,
            source: "musicxml",
          });
        }
      }

      // Chord timing is intentionally deferred for the MVP parser.
      elapsedBeats += durationToBeats(duration);
    }
  }

  return { notes };
}
