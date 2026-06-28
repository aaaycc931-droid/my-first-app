/**
 * This is an example-only generated fixture for reviewing the mock-only
 * converter output shape. It is not imported by Practice Mode and does not
 * change runtime behavior.
 */

import { createMockMelodyTargetCurveFromSteps } from "./mock-melody-target-segment-converter";
import type { TargetPitchCurve } from "./target-segments";

const mockMelodyGeneratedTargetCurveExampleSteps = [
  {
    id: "step-1",
    noteName: "C4",
    frequencyHz: 261.63,
    displayLabel: "Step 1 · C4",
  },
  {
    id: "step-2",
    noteName: "D4",
    frequencyHz: 293.66,
    displayLabel: "Step 2 · D4",
  },
  {
    id: "step-3",
    noteName: "E4",
    frequencyHz: 329.63,
    displayLabel: "Step 3 · E4",
  },
  {
    id: "step-4",
    noteName: "C4",
    frequencyHz: 261.63,
    displayLabel: "Step 4 · C4 repeated note",
  },
];

export const mockMelodyGeneratedTargetCurveExample: TargetPitchCurve =
  createMockMelodyTargetCurveFromSteps(
    mockMelodyGeneratedTargetCurveExampleSteps,
    {
      curveId: "mock-melody-generated-target-curve-example",
      stepDurationMs: 1000,
      tempoBpm: 60,
      timeSignature: "4/4",
      centsToleranceGuide: 50,
    },
  );
