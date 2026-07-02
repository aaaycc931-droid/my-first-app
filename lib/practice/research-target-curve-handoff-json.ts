import {
  RESEARCH_TARGET_PITCH_CURVE_DIAGNOSTIC_SOURCE,
  type ResearchTargetPitchCurveDiagnostic,
  type ResearchTargetPitchCurveSegmentDiagnostic,
} from "../research/local-audio-decode/research-target-pitch-curve-diagnostics";

export type ParseResearchTargetCurveHandoffJsonResult =
  | {
      ok: true;
      diagnostic: ResearchTargetPitchCurveDiagnostic;
    }
  | {
      ok: false;
      errorCode:
        | "empty-input"
        | "invalid-json"
        | "invalid-shape"
        | "unsupported-source"
        | "unsupported-confidence"
        | "invalid-number";
      message: string;
    };

type JsonRecord = Record<string, unknown>;

const SEGMENT_NUMBER_FIELDS = [
  "segmentIndex",
  "startTimeSeconds",
  "endTimeSeconds",
  "durationSeconds",
  "targetFrequencyHz",
  "sourceFrameCount",
  "bridgedNullFrameCount",
] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasFiniteNumber(record: JsonRecord, fieldName: string): boolean {
  return typeof record[fieldName] === "number" && Number.isFinite(record[fieldName]);
}

function invalidShape(message: string): ParseResearchTargetCurveHandoffJsonResult {
  return { ok: false, errorCode: "invalid-shape", message };
}

function invalidNumber(message: string): ParseResearchTargetCurveHandoffJsonResult {
  return { ok: false, errorCode: "invalid-number", message };
}

export function parseResearchTargetCurveHandoffJson(
  input: string,
): ParseResearchTargetCurveHandoffJsonResult {
  if (input.trim().length === 0) {
    return {
      ok: false,
      errorCode: "empty-input",
      message: "Paste diagnostic JSON text before importing the research preview.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return {
      ok: false,
      errorCode: "invalid-json",
      message: "The pasted text is not valid diagnostic JSON.",
    };
  }

  if (!isRecord(parsed)) {
    return invalidShape("The diagnostic JSON must be an object.");
  }

  if (typeof parsed.curveId !== "string") {
    return invalidShape("The diagnostic JSON must include a string curveId.");
  }

  if (typeof parsed.source !== "string") {
    return invalidShape("The diagnostic JSON must include a source.");
  }

  if (parsed.source !== RESEARCH_TARGET_PITCH_CURVE_DIAGNOSTIC_SOURCE) {
    return {
      ok: false,
      errorCode: "unsupported-source",
      message: "Only local audio decode note-like segment diagnostics are supported.",
    };
  }

  if (!Array.isArray(parsed.segments)) {
    return invalidShape("The diagnostic JSON must include a segments array.");
  }

  if (!isRecord(parsed.summary)) {
    return invalidShape("The diagnostic JSON must include a summary object.");
  }

  const segments: ResearchTargetPitchCurveSegmentDiagnostic[] = [];
  let lowConfidenceSegmentCount = 0;

  for (const rawSegment of parsed.segments) {
    if (!isRecord(rawSegment)) {
      return invalidShape("Each segment must be an object.");
    }

    for (const fieldName of SEGMENT_NUMBER_FIELDS) {
      if (!hasFiniteNumber(rawSegment, fieldName)) {
        return invalidNumber(`Segment ${fieldName} must be a finite number.`);
      }
    }

    const segmentIndex = rawSegment.segmentIndex as number;
    const startTimeSeconds = rawSegment.startTimeSeconds as number;
    const endTimeSeconds = rawSegment.endTimeSeconds as number;
    const durationSeconds = rawSegment.durationSeconds as number;
    const targetFrequencyHz = rawSegment.targetFrequencyHz as number;
    const sourceFrameCount = rawSegment.sourceFrameCount as number;
    const bridgedNullFrameCount = rawSegment.bridgedNullFrameCount as number;

    if (targetFrequencyHz <= 0) {
      return invalidNumber("Segment targetFrequencyHz must be a positive finite number.");
    }

    if (sourceFrameCount < 0) {
      return invalidNumber("Segment sourceFrameCount must be a non-negative finite number.");
    }

    if (bridgedNullFrameCount < 0) {
      return invalidNumber(
        "Segment bridgedNullFrameCount must be a non-negative finite number.",
      );
    }

    if (
      rawSegment.diagnosticConfidence !== "normal" &&
      rawSegment.diagnosticConfidence !== "low"
    ) {
      return {
        ok: false,
        errorCode: "unsupported-confidence",
        message: "Segment diagnosticConfidence must be normal or low.",
      };
    }

    if (
      rawSegment.targetNoteLabel !== undefined &&
      typeof rawSegment.targetNoteLabel !== "string"
    ) {
      return invalidShape("Segment targetNoteLabel must be a string when present.");
    }

    if (rawSegment.diagnosticConfidence === "low") {
      lowConfidenceSegmentCount += 1;
    }

    const segment: ResearchTargetPitchCurveSegmentDiagnostic = {
      segmentIndex,
      startTimeSeconds,
      endTimeSeconds,
      durationSeconds,
      targetFrequencyHz,
      diagnosticConfidence: rawSegment.diagnosticConfidence,
      sourceFrameCount,
      bridgedNullFrameCount,
    };

    if (rawSegment.targetNoteLabel !== undefined) {
      segment.targetNoteLabel = rawSegment.targetNoteLabel as string;
    }

    segments.push(segment);
  }

  if (!hasFiniteNumber(parsed.summary, "segmentCount")) {
    return invalidNumber("Summary segmentCount must be a finite number.");
  }

  if (parsed.summary.segmentCount !== segments.length) {
    return invalidShape("Summary segmentCount must match segments length.");
  }

  if (!hasFiniteNumber(parsed.summary, "totalDurationSeconds")) {
    return invalidNumber("Summary totalDurationSeconds must be a finite number.");
  }

  const totalDurationSeconds = parsed.summary.totalDurationSeconds as number;

  if (totalDurationSeconds < 0) {
    return invalidNumber("Summary totalDurationSeconds must be non-negative.");
  }

  if (!hasFiniteNumber(parsed.summary, "lowConfidenceSegmentCount")) {
    return invalidNumber("Summary lowConfidenceSegmentCount must be a finite number.");
  }

  if (parsed.summary.lowConfidenceSegmentCount !== lowConfidenceSegmentCount) {
    return invalidShape(
      "Summary lowConfidenceSegmentCount must match low-confidence segments.",
    );
  }

  return {
    ok: true,
    diagnostic: {
      curveId: parsed.curveId,
      source: parsed.source,
      segments,
      summary: {
        segmentCount: parsed.summary.segmentCount,
        totalDurationSeconds,
        lowConfidenceSegmentCount: parsed.summary.lowConfidenceSegmentCount,
      },
    },
  };
}
