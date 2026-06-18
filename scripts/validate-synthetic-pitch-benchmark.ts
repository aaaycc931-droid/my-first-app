import { runDefaultSyntheticPitchBenchmarkSuite } from "../lib/practice/syntheticPitchBenchmarkSuite";

const result = runDefaultSyntheticPitchBenchmarkSuite();

const formatNumber = (value: number, fractionDigits = 2) =>
  Number.isFinite(value) ? value.toFixed(fractionDigits) : String(value);

console.log(
  `Synthetic pitch benchmark validation completed: ${result.noPitchResults.length} blocking no-pitch case(s), ${result.pitchResults.length} blocking synthetic known-frequency pitch regression case(s), ${result.extendedPitchDiagnosticResults.length} extended exploratory pitch diagnostic case(s).`,
);
console.log(
  "Known-frequency pitch cases are blocking synthetic pitch regression cases; any A4/C4/G4/E4 failure exits 1.",
);
console.log(
  "This command is a synthetic regression gate, not production accuracy proof, not formal scoring, and not proof of real singing accuracy.",
);
console.log("Blocking synthetic pitch regression diagnostics:");

for (const pitchResult of result.pitchResults) {
  const status = pitchResult.passed ? "passed" : "failed";

  console.log(
    [
      `- caseName=${pitchResult.caseName}`,
      `targetFrequencyHz=${formatNumber(pitchResult.targetFrequencyHz)}`,
      `estimatedFrequencyHz=${formatNumber(pitchResult.estimatedFrequencyHz)}`,
      `centsError=${formatNumber(pitchResult.centsError)}`,
      `nearestNote=${pitchResult.nearestNote}`,
      `confidence=${formatNumber(pitchResult.confidence, 3)}`,
      `frames=${pitchResult.validPitchFrames}/${pitchResult.framesAnalyzed}`,
      `status=${status}`,
    ].join(" | "),
  );
}

console.log("Extended exploratory pitch diagnostics (non-blocking):");
console.log(
  "Extended diagnostics are exploratory and guide future estimator work; they are not product failures, not formal scoring, not production accuracy proof, and do not affect this command's exit code.",
);

for (const pitchResult of result.extendedPitchDiagnosticResults) {
  const status = pitchResult.passed ? "passed" : "exploratory-failed";

  console.log(
    [
      `- caseName=${pitchResult.caseName}`,
      `targetFrequencyHz=${formatNumber(pitchResult.targetFrequencyHz)}`,
      `estimatedFrequencyHz=${formatNumber(pitchResult.estimatedFrequencyHz)}`,
      `centsError=${formatNumber(pitchResult.centsError)}`,
      `nearestNote=${pitchResult.nearestNote}`,
      `confidence=${formatNumber(pitchResult.confidence, 3)}`,
      `frames=${pitchResult.validPitchFrames}/${pitchResult.framesAnalyzed}`,
      `status=${status}`,
    ].join(" | "),
  );
}

if (result.pitchPassed) {
  console.log(
    `Blocking synthetic pitch regression cases passed: ${result.pitchResults.length}/${result.pitchResults.length}.`,
  );
} else {
  console.error(
    `Blocking synthetic pitch regression cases failed: ${result.pitchFailedCount} case(s).`,
  );
  console.error(`Failed pitch cases: ${result.pitchFailedCaseNames.join(", ")}`);
}

if (result.noPitchPassed) {
  console.log(
    `Blocking no-pitch validation passed: ${result.noPitchResults.length}/${result.noPitchResults.length} case(s).`,
  );
} else {
  console.error(
    `Blocking no-pitch validation failed: ${result.noPitchFailedCount} case(s).`,
  );
  console.error(`Failed no-pitch cases: ${result.noPitchFailedCaseNames.join(", ")}`);
}

if (result.blockingPassed) {
  process.exit(0);
}

console.error(`Blocking failed cases: ${result.blockingFailedCaseNames.join(", ")}`);
console.error(
  "Blocking pitch failures, blocking no-pitch failures, script exceptions, or compilation failures make this command exit 1; extended exploratory diagnostics do not affect the exit code.",
);
process.exit(1);
