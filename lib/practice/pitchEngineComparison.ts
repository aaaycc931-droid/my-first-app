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
  getNearestPitchNote,
  type PitchAudioBufferLike,
  type PitchEstimateResult,
} from "./pitchEstimate";

export type PitchEngineId = "in-repo-autocorrelation" | "pitchy-mcleod";

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

type PitchyModule = typeof import("pitchy");

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
  isNoPitchExpected: boolean;
  isNoPitchResult: boolean;
  isUnknownResult: boolean;
  isGrossPitchError: boolean;
  isOctaveLikelyError: boolean;
  isOutOfHumanVoiceRange: boolean;
  isOutOfExpectedTargetRange: boolean;
  isExploratoryCase: boolean;
  anomalyLabels: string[];
  anomalyNotes: string[];
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
    anomalyCounts: {
      grossPitchErrors: number;
      outOfHumanVoiceRange: number;
      possibleFalseVoiced: number;
      possibleOctaveOrCatastrophicErrors: number;
      outOfExpectedTargetRange: number;
      expectedNoPitchBehavior: number;
      unknownResults: number;
      exploratoryAnomalies: number;
    };
  };
  caveats: string[];
  rows: PitchEngineComparisonReportRow[];
};

const humanVoiceRangeMinHz = 50;
const humanVoiceRangeMaxHz = 2000;
const grossPitchErrorCents = 50;
const octaveLikelyErrorCents = 1200;

const buildAnomalyReport = ({
  estimatedFrequencyHz,
  centsError,
  noPitch,
  isNoPitchExpected,
  isExploratoryCase,
}: {
  estimatedFrequencyHz?: number;
  centsError?: number;
  noPitch?: PitchEngineNoPitchKind;
  isNoPitchExpected: boolean;
  isExploratoryCase: boolean;
}) => {
  const anomalyLabels: string[] = [];
  const anomalyNotes: string[] = [];
  const isNoPitchResult = noPitch !== undefined;
  const isUnknownResult = noPitch === "unknown";
  const hasFrequency = estimatedFrequencyHz !== undefined;
  const absoluteCentsError =
    centsError === undefined ? undefined : Math.abs(centsError);
  const isGrossPitchError =
    absoluteCentsError !== undefined && absoluteCentsError > grossPitchErrorCents;
  const isOctaveLikelyError =
    absoluteCentsError !== undefined && absoluteCentsError > octaveLikelyErrorCents;
  const isOutOfHumanVoiceRange =
    hasFrequency &&
    (estimatedFrequencyHz < humanVoiceRangeMinHz ||
      estimatedFrequencyHz > humanVoiceRangeMaxHz);
  const isOutOfExpectedTargetRange = isGrossPitchError;

  if (isNoPitchExpected && isNoPitchResult) {
    anomalyLabels.push("expected-no-pitch-behavior");
    anomalyNotes.push(
      "No-pitch was expected and the engine returned a no-pitch result.",
    );
  }

  if (isNoPitchExpected && hasFrequency) {
    anomalyLabels.push("possible-false-voiced");
    anomalyNotes.push(
      "No-pitch was expected, but the engine returned a frequency estimate.",
    );
  }

  if (isUnknownResult) {
    anomalyLabels.push("unknown-result");
    anomalyNotes.push("The engine returned an unknown no-pitch result.");
  }

  if (isOutOfHumanVoiceRange) {
    anomalyLabels.push("out-of-human-voice-range");
    anomalyNotes.push(
      `Estimated frequency is outside the reporting-only ${humanVoiceRangeMinHz}-${humanVoiceRangeMaxHz}Hz human voice sanity range.`,
    );
  }

  if (isGrossPitchError) {
    anomalyLabels.push("gross-pitch-error");
    anomalyNotes.push(
      `Absolute cents error exceeds the reporting-only ${grossPitchErrorCents} cent gross-error threshold.`,
    );
  }

  if (isOctaveLikelyError) {
    anomalyLabels.push("possible-octave-or-catastrophic-error");
    anomalyNotes.push(
      `Absolute cents error exceeds the reporting-only ${octaveLikelyErrorCents} cent catastrophic-error threshold.`,
    );
  }

  if (isOutOfExpectedTargetRange) {
    anomalyLabels.push("out-of-expected-target-range");
    anomalyNotes.push(
      "Estimate is outside the reporting-only target sanity range; raw engine output is preserved and not corrected.",
    );
  }

  if (isExploratoryCase && anomalyLabels.length > 0) {
    anomalyLabels.push("exploratory-reporting-only");
    anomalyNotes.push(
      "Exploratory anomaly is recorded for diagnostics only and is not a validation blocker.",
    );
  }

  return {
    isNoPitchExpected,
    isNoPitchResult,
    isUnknownResult,
    isGrossPitchError,
    isOctaveLikelyError,
    isOutOfHumanVoiceRange,
    isOutOfExpectedTargetRange,
    isExploratoryCase,
    anomalyLabels,
    anomalyNotes,
  };
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

const mapAudioBufferToMonoSamples = (
  audioBuffer: PitchAudioBufferLike,
): Float32Array => {
  const monoSamples = new Float32Array(audioBuffer.length);

  for (
    let channelIndex = 0;
    channelIndex < audioBuffer.numberOfChannels;
    channelIndex += 1
  ) {
    const channelData = audioBuffer.getChannelData(channelIndex);

    for (
      let sampleIndex = 0;
      sampleIndex < audioBuffer.length;
      sampleIndex += 1
    ) {
      monoSamples[sampleIndex] +=
        channelData[sampleIndex] / audioBuffer.numberOfChannels;
    }
  }

  return monoSamples;
};

export const createPitchyMcleodPitchEngine = (
  pitchyModule: PitchyModule,
): PitchEngineAdapter => ({
  engineId: "pitchy-mcleod",
  engineLabel: "Pitchy / McLeod Pitch Method",
  engineVersion: "pitchy@4.1.0",
  implementationNote:
    "Comparison-only adapter using Pitchy PitchDetector.findPitch over a full synthetic buffer; not wired into production practice evaluation.",
  estimate(audioBuffer) {
    if (audioBuffer.length <= 0) {
      return {
        noPitch: "too-short",
        notes: ["Pitchy adapter received an empty buffer."],
      };
    }

    const monoSamples = mapAudioBufferToMonoSamples(audioBuffer);
    const detector = pitchyModule.PitchDetector.forFloat32Array(
      monoSamples.length,
    );
    const [estimatedFrequencyHz, clarity] = detector.findPitch(
      monoSamples,
      audioBuffer.sampleRate,
    );

    if (
      !Number.isFinite(estimatedFrequencyHz) ||
      estimatedFrequencyHz <= 0 ||
      clarity <= 0
    ) {
      return {
        noPitch: "no-pitch",
        clarity,
        voicing: clarity,
        notes: [
          "Pitchy returned no detected pitch for this synthetic buffer.",
          "Pitchy adapter does not provide frame-level diagnostics in this comparison harness.",
        ],
      };
    }

    const { nearestNote } = getNearestPitchNote(estimatedFrequencyHz);

    return {
      estimatedFrequencyHz,
      nearestNote,
      clarity,
      confidence: clarity,
      voicing: clarity,
      notes: [
        "Pitchy clarity is mapped to confidence/voicing for reporting only.",
        "Frame min/median/max, half medians, and drift cents are unavailable for this adapter.",
      ],
    };
  },
});

export const loadPitchyMcleodPitchEngine = async (): Promise<PitchEngineAdapter> =>
  createPitchyMcleodPitchEngine(await import("pitchy"));

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

  const anomalyReport = buildAnomalyReport({
    estimatedFrequencyHz: result.estimatedFrequencyHz,
    centsError,
    noPitch: result.noPitch,
    isNoPitchExpected: false,
    isExploratoryCase: caseKind === "exploratory-pitch",
  });

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
    ...anomalyReport,
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
  const anomalyReport = buildAnomalyReport({
    estimatedFrequencyHz: result.estimatedFrequencyHz,
    noPitch: result.noPitch ?? "unknown",
    isNoPitchExpected: true,
    isExploratoryCase: false,
  });

  return {
    engineId: engine.engineId,
    engineLabel: engine.engineLabel,
    engineVersion: engine.engineVersion,
    implementationNote: engine.implementationNote,
    testCaseId: benchmarkCase.caseName,
    caseKind: "blocking-no-pitch",
    estimatedFrequencyHz: result.estimatedFrequencyHz,
    nearestNote: result.nearestNote,
    confidence: result.confidence,
    clarity: result.clarity,
    voicing: result.voicing,
    noPitch: result.noPitch ?? "unknown",
    ...anomalyReport,
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

  const anomalyCounts = {
    grossPitchErrors: rows.filter((row) => row.isGrossPitchError).length,
    outOfHumanVoiceRange: rows.filter((row) => row.isOutOfHumanVoiceRange)
      .length,
    possibleFalseVoiced: rows.filter((row) =>
      row.anomalyLabels.includes("possible-false-voiced"),
    ).length,
    possibleOctaveOrCatastrophicErrors: rows.filter(
      (row) => row.isOctaveLikelyError,
    ).length,
    outOfExpectedTargetRange: rows.filter(
      (row) => row.isOutOfExpectedTargetRange,
    ).length,
    expectedNoPitchBehavior: rows.filter((row) =>
      row.anomalyLabels.includes("expected-no-pitch-behavior"),
    ).length,
    unknownResults: rows.filter((row) => row.isUnknownResult).length,
    exploratoryAnomalies: rows.filter(
      (row) => row.isExploratoryCase && row.anomalyLabels.length > 0,
    ).length,
  };

  return {
    reportLabel: "P7g pitch engine comparison anomaly flag report",
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
      anomalyCounts,
    },
    caveats: [
      "P7g adds reporting-only anomaly flags on top of the P7f Pitchy comparison adapter.",
      "P7f registers Pitchy / McLeod Pitch Method as a comparison-only candidate beside the current in-repo baseline.",
      "Pitchy is not a production replacement and is not used by Practice Mode UI or workflow.",
      "Synthetic comparison output is reporting-only and does not change existing benchmark gates or tolerances.",
      "No real phone recording benchmark is executed by this harness.",
      "Do not use this report as a conservatory-grade or professional accuracy claim.",
    ],
    rows,
  };
};
