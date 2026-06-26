import { runDefaultSyntheticPitchBenchmarkSuite } from "../lib/practice/syntheticPitchBenchmarkSuite";

const result = runDefaultSyntheticPitchBenchmarkSuite();

const formatNumber = (value: number, fractionDigits = 2) =>
  Number.isFinite(value) ? value.toFixed(fractionDigits) : String(value);

const formatOptionalNumber = (value: number | undefined, fractionDigits = 2) =>
  value === undefined ? "n/a" : formatNumber(value, fractionDigits);

const printPitchDiagnostics = (
  pitchResults: typeof result.pitchResults,
  failedStatus = "failed",
  includeExploratoryDetails = false,
) => {
  for (const pitchResult of pitchResults) {
    const status = pitchResult.passed ? "passed" : failedStatus;

    console.log(
      [
        `- caseName=${pitchResult.caseName}`,
        `targetFrequencyHz=${formatNumber(pitchResult.targetFrequencyHz)}`,
        `estimatedFrequencyHz=${formatNumber(pitchResult.estimatedFrequencyHz)}`,
        `centsError=${formatNumber(pitchResult.centsError)}`,
        `nearestNote=${pitchResult.nearestNote}`,
        `confidence=${formatNumber(pitchResult.confidence, 3)}`,
        `frames=${pitchResult.validPitchFrames}/${pitchResult.framesAnalyzed}`,
        `frameFrequencyMinHz=${formatNumber(pitchResult.frameFrequencyMinHz)}`,
        `frameFrequencyMedianHz=${formatNumber(pitchResult.frameFrequencyMedianHz)}`,
        `frameFrequencyMaxHz=${formatNumber(pitchResult.frameFrequencyMaxHz)}`,
        `frameFrequencyRangeCents=${formatNumber(pitchResult.frameFrequencyRangeCents)}`,
        `firstHalfMedianFrequencyHz=${formatNumber(pitchResult.firstHalfMedianFrequencyHz)}`,
        `secondHalfMedianFrequencyHz=${formatNumber(pitchResult.secondHalfMedianFrequencyHz)}`,
        `firstToSecondHalfDriftCents=${formatNumber(pitchResult.firstToSecondHalfDriftCents)}`,
        `sustainedPitchInstabilityThresholdCents=${formatNumber(pitchResult.sustainedPitchInstabilityThresholdCents)}`,
        `sustainedPitchInstabilityObserved=${pitchResult.sustainedPitchInstabilityObserved}`,
        ...(includeExploratoryDetails && pitchResult.frequencyEndHz !== undefined
          ? [
              `driftStartFrequencyHz=${formatNumber(pitchResult.targetFrequencyHz)}`,
              `driftMidpointFrequencyHz=${formatOptionalNumber(
                pitchResult.midpointFrequencyHz,
              )}`,
              `driftExpectedMedianFrequencyHz=${formatOptionalNumber(
                pitchResult.expectedMedianFrequencyHz,
              )}`,
              `driftEndFrequencyHz=${formatNumber(pitchResult.frequencyEndHz)}`,
              `driftEstimatedFrequencyHz=${formatNumber(
                pitchResult.estimatedFrequencyHz,
              )}`,
              `driftCentsVsStart=${formatNumber(
                pitchResult.centsErrorAgainstStart,
              )}`,
              `driftCentsVsMidpoint=${formatOptionalNumber(
                pitchResult.centsErrorAgainstMidpoint,
              )}`,
              `driftCentsVsEnd=${formatOptionalNumber(
                pitchResult.centsErrorAgainstEnd,
              )}`,
              `driftCentsVsExpectedMedian=${formatOptionalNumber(
                pitchResult.centsErrorAgainstExpectedMedian,
              )}`,
              `driftSemanticDiagnostic=${
                pitchResult.semanticDiagnostic ?? "n/a"
              }`,
            ]
          : []),
        ...(includeExploratoryDetails &&
        (pitchResult.vibratoDepthCents !== undefined ||
          pitchResult.vibratoRateHz !== undefined)
          ? [
              `vibratoBaseFrequencyHz=${formatNumber(
                pitchResult.targetFrequencyHz,
              )}`,
              `vibratoDepthCents=${formatOptionalNumber(
                pitchResult.vibratoDepthCents,
              )}`,
              `vibratoRateHz=${formatOptionalNumber(pitchResult.vibratoRateHz)}`,
              `vibratoEstimatedFrequencyHz=${formatNumber(
                pitchResult.estimatedFrequencyHz,
              )}`,
            ]
          : []),
        `status=${status}`,
      ].join(" | "),
    );
  }
};

console.log(
  `Synthetic pitch benchmark validation completed: ${result.pitchResults.length} clean sine blocking synthetic pitch regression case(s), ${result.robustnessPitchResults.length} robustness blocking synthetic pitch regression case(s), ${result.noPitchResults.length} blocking no-pitch case(s), ${result.exploratoryPitchResults.length} exploratory non-blocking pitch diagnostic case(s).`,
);
console.log(
  "Clean sine A3/C3/E3/A4/C4/E4/G4/C5/A5 cases are blocking synthetic pitch regression cases; any failure exits 1.",
);
console.log(
  "Robustness cases are now blocking synthetic robustness regression cases; any quiet-amplitude, short-duration, or deterministic light-noise failure exits 1.",
);
console.log(
  "Exploratory higher-noise, frequency-drift, vibrato, mixed-harmonics, and sustained-pitch instability diagnostic fields are non-blocking diagnostics only; their results never make this command fail.",
);
console.log(
  "This command is a generated in-memory synthetic regression gate, not production accuracy proof, not formal scoring, and not proof of real singing accuracy.",
);

console.log("Clean sine blocking pitch regression diagnostics:");
printPitchDiagnostics(result.pitchResults);

console.log("Robustness blocking pitch regression diagnostics:");
console.log(
  "Robustness cases cover generated in-memory amplitude, duration, and deterministic light-noise variants. They are blocking synthetic robustness regression cases, but they are not production accuracy proof, not formal scoring, and do not prove real singing accuracy.",
);
printPitchDiagnostics(result.robustnessPitchResults);

console.log("Exploratory non-blocking pitch diagnostics:");
console.log(
  "Exploratory cases cover generated in-memory higher noise, frequency drift, vibrato, and mixed harmonics. Frequency drift now reports start/midpoint/expected-median/end comparisons plus sustained-pitch instability diagnostic fields. These are observation-only diagnostics and do not affect the validation exit code.",
);
printPitchDiagnostics(
  result.exploratoryPitchResults,
  "observed-outside-tolerance",
  true,
);

console.log("Blocking no-pitch validation:");
for (const noPitchResult of result.noPitchResults) {
  const status = noPitchResult.passed ? "passed" : "failed";

  console.log(
    [
      `- caseName=${noPitchResult.caseName}`,
      `expectedErrorKind=${noPitchResult.expectedErrorKind}`,
      `actualErrorMessage=${noPitchResult.actualErrorMessage ?? "none"}`,
      `status=${status}`,
    ].join(" | "),
  );
}

if (result.pitchPassed) {
  console.log(
    `Clean sine blocking pitch regression cases passed: ${result.pitchResults.length}/${result.pitchResults.length}.`,
  );
} else {
  console.error(
    `Clean sine blocking pitch regression cases failed: ${result.pitchFailedCount} case(s).`,
  );
  console.error(
    `Failed clean sine pitch cases: ${result.pitchFailedCaseNames.join(", ")}`,
  );
}

if (result.robustnessPitchPassed) {
  console.log(
    `Robustness blocking pitch regression cases passed: ${result.robustnessPitchResults.length}/${result.robustnessPitchResults.length}.`,
  );
} else {
  console.error(
    `Robustness blocking pitch regression cases failed: ${result.robustnessPitchFailedCount} case(s).`,
  );
  console.error(
    `Failed robustness pitch cases: ${result.robustnessPitchFailedCaseNames.join(", ")}`,
  );
}

if (result.noPitchPassed) {
  console.log(
    `Blocking no-pitch validation passed: ${result.noPitchResults.length}/${result.noPitchResults.length} case(s).`,
  );
} else {
  console.error(
    `Blocking no-pitch validation failed: ${result.noPitchFailedCount} case(s).`,
  );
  console.error(
    `Failed no-pitch cases: ${result.noPitchFailedCaseNames.join(", ")}`,
  );
}

if (result.blockingPassed) {
  process.exit(0);
}

console.error(
  `Blocking failed cases: ${result.blockingFailedCaseNames.join(", ")}`,
);
console.error(
  "Clean sine blocking pitch failures, robustness blocking pitch failures, blocking no-pitch failures, script exceptions, or compilation failures make this command exit 1.",
);
process.exit(1);
