import type { TargetPitchCurve, TargetPitchSegment } from "./target-segments";

const DEFAULT_CURVE_ID = "mock-melody-target-curve-prototype";
const DEFAULT_STEP_DURATION_MS = 1000;
const DEFAULT_TEMPO_BPM = 60;
const DEFAULT_TIME_SIGNATURE = "4/4";
const DEFAULT_CENTS_TOLERANCE_GUIDE = 50;

export interface MockMelodyTargetStepInput {
  id: string;
  noteName: string;
  frequencyHz: number;
  displayLabel?: string;
}

export interface MockMelodyTargetCurveOptions {
  curveId?: string;
  stepDurationMs?: number;
  tempoBpm?: number;
  timeSignature?: string;
  centsToleranceGuide?: number;
}

/**
 * Converts mock melody step data into a target pitch curve prototype.
 *
 * This converter is intentionally mock-only. Its fixed synthetic timing is for
 * future visual alignment experiments only and does not represent rhythm
 * scoring, notation parsing, imported audio, or Practice Mode runtime behavior.
 */
export function createMockMelodyTargetCurveFromSteps(
  steps: MockMelodyTargetStepInput[],
  options: MockMelodyTargetCurveOptions = {},
): TargetPitchCurve {
  const stepDurationMs = options.stepDurationMs ?? DEFAULT_STEP_DURATION_MS;
  const tempoBpm = options.tempoBpm ?? DEFAULT_TEMPO_BPM;
  const msPerBeat = 60000 / tempoBpm;
  const beatsPerStep = stepDurationMs / msPerBeat;
  const centsToleranceGuide =
    options.centsToleranceGuide ?? DEFAULT_CENTS_TOLERANCE_GUIDE;

  const segments = steps.map((step, index): TargetPitchSegment => {
    const startTimeMs = index * stepDurationMs;
    const endTimeMs = startTimeMs + stepDurationMs;
    const startBeat = index * beatsPerStep;
    const endBeat = startBeat + beatsPerStep;

    return {
      targetId: step.id,
      sourceType: "mock-melody-step",
      segmentKind: "pitched-note",
      sourceNoteIds: [step.id],
      noteName: step.noteName,
      frequencyHz: step.frequencyHz,
      startTimeMs,
      endTimeMs,
      startBeat,
      endBeat,
      displayLabel: step.displayLabel ?? step.noteName,
      centsToleranceGuide,
      melodyStepIndex: index,
      melodyStepId: step.id,
      shouldRenderAsTargetBlock: true,
      shouldCreateFormalScore: false,
    };
  });

  return {
    curveId: options.curveId ?? DEFAULT_CURVE_ID,
    sourceType: "mock-melody-step",
    segments,
    tempoBpm,
    timeSignature: options.timeSignature ?? DEFAULT_TIME_SIGNATURE,
    createdForPracticeModeOnly: true,
  };
}
