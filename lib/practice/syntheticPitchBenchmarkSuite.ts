import {
  runSyntheticNoPitchBenchmarkCase,
  runSyntheticPitchBenchmarkCase,
  type SyntheticNoPitchBenchmarkCase,
  type SyntheticNoPitchBenchmarkResult,
  type SyntheticPitchBenchmarkCase,
  type SyntheticPitchBenchmarkResult,
} from "./syntheticPitchBenchmark";

const defaultDurationSeconds = 1;
const defaultSampleRate = 44100;
const defaultAmplitude = 0.2;
const defaultToleranceCents = 50;

export type SyntheticPitchBenchmarkSuitePitchCase =
  SyntheticPitchBenchmarkCase & {
    caseName: string;
  };

export type SyntheticPitchBenchmarkSuitePitchResult =
  SyntheticPitchBenchmarkResult & {
    caseName: string;
  };

export type DefaultSyntheticPitchBenchmarkSuiteResult = {
  pitchResults: SyntheticPitchBenchmarkSuitePitchResult[];
  noPitchResults: SyntheticNoPitchBenchmarkResult[];
  robustnessPitchResults: SyntheticPitchBenchmarkSuitePitchResult[];
  exploratoryPitchResults: SyntheticPitchBenchmarkSuitePitchResult[];
  passed: boolean;
  failedCaseNames: string[];
  failedCount: number;
  blockingPassed: boolean;
  pitchPassed: boolean;
  robustnessPitchPassed: boolean;
  noPitchPassed: boolean;
  blockingFailedCaseNames: string[];
  pitchFailedCaseNames: string[];
  robustnessPitchFailedCaseNames: string[];
  noPitchFailedCaseNames: string[];
  blockingFailedCount: number;
  pitchFailedCount: number;
  robustnessPitchFailedCount: number;
  noPitchFailedCount: number;
};

const coreSyntheticPitchBenchmarkCases: SyntheticPitchBenchmarkSuitePitchCase[] =
  [
    {
      caseName: "A4 440Hz",
      frequencyHz: 440,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      toleranceCents: defaultToleranceCents,
    },
    {
      caseName: "C4 261.63Hz",
      frequencyHz: 261.63,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      toleranceCents: defaultToleranceCents,
    },
    {
      caseName: "G4 392Hz",
      frequencyHz: 392,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      toleranceCents: defaultToleranceCents,
    },
    {
      caseName: "E4 329.63Hz",
      frequencyHz: 329.63,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      toleranceCents: defaultToleranceCents,
    },
  ];

const promotedSyntheticPitchBenchmarkCases: SyntheticPitchBenchmarkSuitePitchCase[] =
  [
    {
      caseName: "A3 220Hz",
      frequencyHz: 220,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      toleranceCents: defaultToleranceCents,
    },
    {
      caseName: "C3 130.81Hz",
      frequencyHz: 130.81,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      toleranceCents: defaultToleranceCents,
    },
    {
      caseName: "E3 164.81Hz",
      frequencyHz: 164.81,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      toleranceCents: defaultToleranceCents,
    },
    {
      caseName: "C5 523.25Hz",
      frequencyHz: 523.25,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      toleranceCents: defaultToleranceCents,
    },
    {
      caseName: "A5 880Hz",
      frequencyHz: 880,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      toleranceCents: defaultToleranceCents,
    },
  ];

export const defaultSyntheticPitchBenchmarkCases: SyntheticPitchBenchmarkSuitePitchCase[] =
  [
    ...promotedSyntheticPitchBenchmarkCases,
    ...coreSyntheticPitchBenchmarkCases,
  ];

export const robustnessSyntheticPitchBenchmarkCases: SyntheticPitchBenchmarkSuitePitchCase[] =
  [
    {
      caseName: "A4 440Hz quiet amplitude 0.05",
      frequencyHz: 440,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: 0.05,
      toleranceCents: defaultToleranceCents,
    },
    {
      caseName: "C4 261.63Hz quiet amplitude 0.05",
      frequencyHz: 261.63,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: 0.05,
      toleranceCents: defaultToleranceCents,
    },
    {
      caseName: "A4 440Hz short duration 0.5s",
      frequencyHz: 440,
      durationSeconds: 0.5,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      toleranceCents: defaultToleranceCents,
    },
    {
      caseName: "C4 261.63Hz short duration 0.5s",
      frequencyHz: 261.63,
      durationSeconds: 0.5,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      toleranceCents: defaultToleranceCents,
    },
    {
      caseName: "A4 440Hz deterministic light noise",
      frequencyHz: 440,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      noiseAmount: 0.01,
      toleranceCents: defaultToleranceCents,
    },
    {
      caseName: "C4 261.63Hz deterministic light noise",
      frequencyHz: 261.63,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      noiseAmount: 0.01,
      toleranceCents: defaultToleranceCents,
    },
  ];

export const exploratorySyntheticPitchBenchmarkCases: SyntheticPitchBenchmarkSuitePitchCase[] =
  [
    {
      caseName: "A4 440Hz exploratory higher noise",
      frequencyHz: 440,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      noiseAmount: 0.05,
      toleranceCents: defaultToleranceCents,
    },
    {
      caseName: "A4 exploratory frequency drift 440Hz to 466.16Hz",
      frequencyHz: 440,
      frequencyEndHz: 466.16,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      toleranceCents: defaultToleranceCents,
    },
    {
      caseName: "A4 440Hz exploratory vibrato 35 cents at 5Hz",
      frequencyHz: 440,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      vibratoDepthCents: 35,
      vibratoRateHz: 5,
      toleranceCents: defaultToleranceCents,
    },
    {
      caseName: "A4 440Hz exploratory mixed harmonics",
      frequencyHz: 440,
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      amplitude: defaultAmplitude,
      harmonics: [
        { multiple: 2, amplitudeRatio: 0.45 },
        { multiple: 3, amplitudeRatio: 0.25 },
      ],
      toleranceCents: defaultToleranceCents,
    },
  ];

export const defaultSyntheticNoPitchBenchmarkCases: SyntheticNoPitchBenchmarkCase[] =
  [
    {
      caseName: "silent sustained buffer",
      durationSeconds: defaultDurationSeconds,
      sampleRate: defaultSampleRate,
      expectedErrorKind: "no-usable-pitch-frames",
    },
    {
      caseName: "too-short buffer",
      durationSeconds: 0.05,
      sampleRate: defaultSampleRate,
      expectedErrorKind: "too-short",
    },
  ];

export const runDefaultSyntheticPitchBenchmarkSuite =
  (): DefaultSyntheticPitchBenchmarkSuiteResult => {
    const pitchResults = defaultSyntheticPitchBenchmarkCases.map(
      (benchmarkCase) => ({
        caseName: benchmarkCase.caseName,
        ...runSyntheticPitchBenchmarkCase(benchmarkCase),
      }),
    );

    const noPitchResults = defaultSyntheticNoPitchBenchmarkCases.map(
      runSyntheticNoPitchBenchmarkCase,
    );

    const exploratoryPitchResults = exploratorySyntheticPitchBenchmarkCases.map(
      (benchmarkCase) => ({
        caseName: benchmarkCase.caseName,
        ...runSyntheticPitchBenchmarkCase(benchmarkCase),
      }),
    );

    const robustnessPitchResults = robustnessSyntheticPitchBenchmarkCases.map(
      (benchmarkCase) => ({
        caseName: benchmarkCase.caseName,
        ...runSyntheticPitchBenchmarkCase(benchmarkCase),
      }),
    );

    const pitchFailedCaseNames = pitchResults
      .filter((result) => !result.passed)
      .map((result) => result.caseName);
    const robustnessPitchFailedCaseNames = robustnessPitchResults
      .filter((result) => !result.passed)
      .map((result) => result.caseName);
    const noPitchFailedCaseNames = noPitchResults
      .filter((result) => !result.passed)
      .map((result) => result.caseName);
    const blockingFailedCaseNames = [
      ...pitchFailedCaseNames,
      ...robustnessPitchFailedCaseNames,
      ...noPitchFailedCaseNames,
    ];
    const failedCaseNames = blockingFailedCaseNames;
    const pitchPassed = pitchFailedCaseNames.length === 0;
    const robustnessPitchPassed = robustnessPitchFailedCaseNames.length === 0;
    const noPitchPassed = noPitchFailedCaseNames.length === 0;
    const blockingPassed =
      pitchPassed && robustnessPitchPassed && noPitchPassed;

    return {
      pitchResults,
      noPitchResults,
      robustnessPitchResults,
      exploratoryPitchResults,
      passed: blockingPassed,
      failedCaseNames,
      failedCount: failedCaseNames.length,
      blockingPassed,
      pitchPassed,
      robustnessPitchPassed,
      noPitchPassed,
      blockingFailedCaseNames,
      pitchFailedCaseNames,
      robustnessPitchFailedCaseNames,
      noPitchFailedCaseNames,
      blockingFailedCount: blockingFailedCaseNames.length,
      pitchFailedCount: pitchFailedCaseNames.length,
      robustnessPitchFailedCount: robustnessPitchFailedCaseNames.length,
      noPitchFailedCount: noPitchFailedCaseNames.length,
    };
  };
