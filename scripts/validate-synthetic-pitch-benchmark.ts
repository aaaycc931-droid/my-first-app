import { runDefaultSyntheticPitchBenchmarkSuite } from "../lib/practice/syntheticPitchBenchmarkSuite";

const result = runDefaultSyntheticPitchBenchmarkSuite();

console.log(
  `Synthetic pitch benchmark validation completed: ${result.noPitchResults.length} blocking no-pitch case(s), ${result.pitchResults.length} exploratory known-frequency pitch case(s).`,
);
console.log(
  "Known-frequency pitch cases are exploratory/non-blocking for now; failures show the current estimator is not yet benchmark-accurate.",
);
console.log(
  "This command is a baseline-safe validation gate, not production accuracy proof.",
);

if (result.exploratoryPitchPassed) {
  console.log(
    `Exploratory known-frequency pitch cases passed: ${result.pitchResults.length}/${result.pitchResults.length}.`,
  );
} else {
  console.warn(
    `Exploratory known-frequency pitch cases failed: ${result.exploratoryFailedCount} case(s).`,
  );
  console.warn(
    `Exploratory failed cases: ${result.exploratoryFailedCaseNames.join(", ")}`,
  );
  console.warn(
    "These exploratory failures are reported for future algorithm work and do not fail this validation command.",
  );
}

if (result.blockingPassed) {
  console.log(
    `Blocking no-pitch validation passed: ${result.noPitchResults.length}/${result.noPitchResults.length} case(s).`,
  );
  process.exit(0);
}

console.error(
  `Blocking no-pitch validation failed: ${result.blockingFailedCount} case(s).`,
);
console.error(`Blocking failed cases: ${result.blockingFailedCaseNames.join(", ")}`);
console.error(
  "Only blocking no-pitch failures, script exceptions, or compilation failures should make this command exit 1.",
);
process.exit(1);
