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
  passed: boolean;
  failedCaseNames: string[];
  failedCount: number;
};

export const defaultSyntheticPitchBenchmarkCases: SyntheticPitchBenchmarkSuitePitchCase[] =
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

    const failedPitchCaseNames = pitchResults
      .filter((result) => !result.passed)
      .map((result) => result.caseName);
    const failedNoPitchCaseNames = noPitchResults
      .filter((result) => !result.passed)
      .map((result) => result.caseName);
    const failedCaseNames = [
      ...failedPitchCaseNames,
      ...failedNoPitchCaseNames,
    ];

    return {
      pitchResults,
      noPitchResults,
      passed: failedCaseNames.length === 0,
      failedCaseNames,
      failedCount: failedCaseNames.length,
    };
  };
