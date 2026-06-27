import {
  createSilentSyntheticPitchBuffer,
  createSyntheticPitchBuffer,
  type SyntheticNoPitchBenchmarkCase,
} from "./syntheticPitchBenchmark";
import {
  defaultSyntheticNoPitchBenchmarkCases,
  defaultSyntheticPitchBenchmarkCases,
  exploratorySyntheticPitchBenchmarkCases,
  robustnessSyntheticPitchBenchmarkCases,
  type SyntheticPitchBenchmarkSuitePitchCase,
} from "./syntheticPitchBenchmarkSuite";
import {
  estimateLocalPitch,
  type PitchAudioBufferLike,
  type PitchEstimateResult,
} from "./pitchEstimate";

export type PitchEngineId = "in-repo-autocorrelation";

export type PitchEngineDescriptor = {
  engineId: PitchEngineId;
  engineLabel: string;
  engineVersion?: string;
  implementationNote: string;
};

export type PitchEngineNoPitchKind = "no-pitch" | "unknown" | "too-short";

export type PitchEngineResult = {
  estimatedFrequencyHz?: number;
  nearestNote?: string;
  centsError?: number;
  confidence?: number;
  clarity?: number;
  voicing?: number;
  validFrameCount?: number;
  analyzedFrameCount?: number;
  frameFrequencyMinHz?: number;
  frameFrequencyMedianHz?: number;
  frameFrequencyMaxHz?: number;
  firstHalfMedianHz?: number;
  secondHalfMedianHz?: number;
  driftCents?: number;
  noPitch?: PitchEngineNoPitchKind;
  notes?: string[];
};

export type PitchEngineAdapter = PitchEngineDescriptor & {
  estimate(audioBuffer: PitchAudioBufferLike): PitchEngineResult;
};

export type PitchEngineComparisonCaseKind =
  | "blocking-pitch"
  | "blocking-robustness"
  | "exploratory-pitch"
  | "blocking-no-pitch";

export type PitchEngineComparisonReportRow = PitchEngineDescriptor & {
  testCaseId: string;
  caseKind: PitchEngineComparisonCaseKind;
  expectedFrequencyHz?: number;
  targetFrequencyHz?: number;
  estimatedFrequencyHz?: number;
  nearestNote?: string;
  centsError?: number;
  confidence?: number;
  clarity?: number;
  voicing?: number;
  validFrameCount?: number;
  analyzedFrameCount?: number;
  frameFrequencyMinHz?: number;
  frameFrequencyMedianHz?: number;
  frameFrequencyMaxHz?: number;
  firstHalfMedianHz?: number;
  secondHalfMedianHz?: number;
  driftCents?: number;
  noPitch?: PitchEngineNoPitchKind;
  notes: string[];
  caveats: string[];
};

export type PitchEngineComparisonReport = {
  reportLabel: string;
  generatedAt: string;
  summary: {
    engineCount: number;
    rowCount: number;
    pitchCaseCount: number;
    noPitchCaseCount: number;
    exploratoryCaseCount: number;
  };
  caveats: string[];
  rows: PitchEngineComparisonReportRow[];
};

const calculateCentsError = (
  estimatedFrequencyHz: number,
  targetFrequencyHz: number,
) => 1200 * Math.log2(estimatedFrequencyHz / targetFrequencyHz);

const classifyNoPitch = (error: unknown): PitchEngineNoPitchKind => {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Recording is too short")) {
    return "too-short";
  }

  if (message.includes("No usable pitch frames were found")) {
    return "no-pitch";
  }

  return "unknown";
};

const mapLocalEstimate = (
  estimate: PitchEstimateResult,
): Omit<PitchEngineResult, "centsError"> => ({
  estimatedFrequencyHz: estimate.estimatedFrequencyHz,
  nearestNote: estimate.nearestNote,
  confidence: estimate.confidence,
  validFrameCount: estimate.validPitchFrames,
  analyzedFrameCount: estimate.framesAnalyzed,
  frameFrequencyMinHz: estimate.frameFrequencyMinHz,
  frameFrequencyMedianHz: estimate.frameFrequencyMedianHz,
  frameFrequencyMaxHz: estimate.frameFrequencyMaxHz,
  firstHalfMedianHz: estimate.firstHalfMedianFrequencyHz,
  secondHalfMedianHz: estimate.secondHalfMedianFrequencyHz,
  driftCents: estimate.firstToSecondHalfDriftCents,
});

export const inRepoAutocorrelationPitchEngine: PitchEngineAdapter = {
  engineId: "in-repo-autocorrelation",
  engineLabel: "Current in-repo autocorrelation estimator",
  engineVersion: "current-repository-implementation",
  implementationNote:
    "Baseline adapter around lib/practice/pitchEstimate.ts; no external pitch library is connected.",
  estimate(audioBuffer) {
    try {
      return mapLocalEstimate(estimateLocalPitch(audioBuffer));
    } catch (error) {
      return {
        noPitch: classifyNoPitch(error),
        notes: [
          error instanceof Error
            ? error.message
            : "Unknown pitch estimation error.",
        ],
      };
    }
  },
};

const buildPitchRow = (
  engine: PitchEngineAdapter,
  benchmarkCase: SyntheticPitchBenchmarkSuitePitchCase,
  caseKind: PitchEngineComparisonCaseKind,
): PitchEngineComparisonReportRow => {
  const result = engine.estimate(createSyntheticPitchBuffer(benchmarkCase));
  const centsError =
    result.estimatedFrequencyHz === undefined
      ? undefined
      : calculateCentsError(result.estimatedFrequencyHz, benchmarkCase.frequencyHz);

  return {
    engineId: engine.engineId,
    engineLabel: engine.engineLabel,
    engineVersion: engine.engineVersion,
    implementationNote: engine.implementationNote,
    testCaseId: benchmarkCase.caseName,
    caseKind,
    expectedFrequencyHz:
      benchmarkCase.expectedMedianFrequencyHz ?? benchmarkCase.frequencyHz,
    targetFrequencyHz: benchmarkCase.frequencyHz,
    estimatedFrequencyHz: result.estimatedFrequencyHz,
    nearestNote: result.nearestNote,
    centsError,
    confidence: result.confidence,
    clarity: result.clarity,
    voicing: result.voicing,
    validFrameCount: result.validFrameCount,
    analyzedFrameCount: result.analyzedFrameCount,
    frameFrequencyMinHz: result.frameFrequencyMinHz,
    frameFrequencyMedianHz: result.frameFrequencyMedianHz,
    frameFrequencyMaxHz: result.frameFrequencyMaxHz,
    firstHalfMedianHz: result.firstHalfMedianHz,
    secondHalfMedianHz: result.secondHalfMedianHz,
    driftCents: result.driftCents,
    noPitch: result.noPitch,
    notes: result.notes ?? [],
    caveats: [
      "Reporting-only comparison row; not a formal score, grade, pass, fail, or professional accuracy claim.",
      ...(caseKind === "exploratory-pitch"
        ? ["Exploratory case remains non-blocking."]
        : []),
    ],
  };
};

const buildNoPitchRow = (
  engine: PitchEngineAdapter,
  benchmarkCase: SyntheticNoPitchBenchmarkCase,
): PitchEngineComparisonReportRow => {
  const result = engine.estimate(createSilentSyntheticPitchBuffer(benchmarkCase));

  return {
    engineId: engine.engineId,
    engineLabel: engine.engineLabel,
    engineVersion: engine.engineVersion,
    implementationNote: engine.implementationNote,
    testCaseId: benchmarkCase.caseName,
    caseKind: "blocking-no-pitch",
    noPitch: result.noPitch ?? "unknown",
    notes: result.notes ?? [],
    caveats: [
      "No-pitch behavior is represented without assigning a user-facing grade or score.",
      "This comparison harness does not change existing no-pitch validation gates.",
    ],
  };
};

export const runPitchEngineComparisonHarness = (
  engines: PitchEngineAdapter[] = [inRepoAutocorrelationPitchEngine],
): PitchEngineComparisonReport => {
  const rows = engines.flatMap((engine) => [
    ...defaultSyntheticPitchBenchmarkCases.map((benchmarkCase) =>
      buildPitchRow(engine, benchmarkCase, "blocking-pitch"),
    ),
    ...robustnessSyntheticPitchBenchmarkCases.map((benchmarkCase) =>
      buildPitchRow(engine, benchmarkCase, "blocking-robustness"),
    ),
    ...exploratorySyntheticPitchBenchmarkCases.map((benchmarkCase) =>
      buildPitchRow(engine, benchmarkCase, "exploratory-pitch"),
    ),
    ...defaultSyntheticNoPitchBenchmarkCases.map((benchmarkCase) =>
      buildNoPitchRow(engine, benchmarkCase),
    ),
  ]);

  return {
    reportLabel: "P7d pitch engine comparison harness skeleton",
    generatedAt: new Date().toISOString(),
    summary: {
      engineCount: engines.length,
      rowCount: rows.length,
      pitchCaseCount: rows.filter((row) => row.targetFrequencyHz !== undefined)
        .length,
      noPitchCaseCount: rows.filter((row) => row.caseKind === "blocking-no-pitch")
        .length,
      exploratoryCaseCount: rows.filter(
        (row) => row.caseKind === "exploratory-pitch",
      ).length,
    },
    caveats: [
      "Skeleton only: the only registered engine is the current in-repo autocorrelation estimator.",
      "Pitchy, Pitchfinder, CREPE, RMVPE, and SwiftF0 are not installed or connected.",
      "Synthetic comparison output is reporting-only and does not change existing benchmark gates or tolerances.",
      "No real phone recording benchmark is executed by this harness.",
      "Do not use this report as a conservatory-grade or professional accuracy claim.",
    ],
    rows,
  };
};
