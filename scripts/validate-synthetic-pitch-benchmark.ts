import { runDefaultSyntheticPitchBenchmarkSuite } from "../lib/practice/syntheticPitchBenchmarkSuite";

const result = runDefaultSyntheticPitchBenchmarkSuite();

if (result.passed) {
  console.log(
    `Synthetic pitch benchmark validation passed: ${result.pitchResults.length} pitch cases and ${result.noPitchResults.length} no-pitch cases passed.`,
  );
  console.log(
    "This is an early CI-safe synthetic benchmark gate using generated in-memory buffers, not production accuracy proof.",
  );
  process.exit(0);
}

console.error(
  `Synthetic pitch benchmark validation failed: ${result.failedCount} case(s) failed.`,
);
console.error(`Failed cases: ${result.failedCaseNames.join(", ")}`);
console.error(
  "This synthetic benchmark validation failure is not a production accuracy claim.",
);
process.exit(1);
