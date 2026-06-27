import {
  inRepoAutocorrelationPitchEngine,
  loadPitchyMcleodPitchEngine,
  runPitchEngineComparisonHarness,
} from "../lib/practice/pitchEngineComparison";

const formatNumber = (value: number | undefined, fractionDigits = 2) =>
  value === undefined || !Number.isFinite(value)
    ? "n/a"
    : value.toFixed(fractionDigits);

const main = async () => {
  const pitchyEngine = await loadPitchyMcleodPitchEngine();
  const report = runPitchEngineComparisonHarness([
    inRepoAutocorrelationPitchEngine,
    pitchyEngine,
  ]);

  console.log(`${report.reportLabel} completed.`);
  console.log(
    "This is a reporting-only comparison harness, not a professional accuracy claim, not formal scoring, not a gate change, and not conservatory-grade assessment.",
  );
  console.log(
    `Summary: engines=${report.summary.engineCount} | rows=${report.summary.rowCount} | pitchCases=${report.summary.pitchCaseCount} | noPitchCases=${report.summary.noPitchCaseCount} | exploratoryCases=${report.summary.exploratoryCaseCount} | grossPitchErrors=${report.summary.anomalyCounts.grossPitchErrors} | outOfHumanVoiceRange=${report.summary.anomalyCounts.outOfHumanVoiceRange} | possibleFalseVoiced=${report.summary.anomalyCounts.possibleFalseVoiced} | possibleOctaveOrCatastrophicErrors=${report.summary.anomalyCounts.possibleOctaveOrCatastrophicErrors} | outOfExpectedTargetRange=${report.summary.anomalyCounts.outOfExpectedTargetRange} | expectedNoPitchBehavior=${report.summary.anomalyCounts.expectedNoPitchBehavior} | unknownResults=${report.summary.anomalyCounts.unknownResults} | exploratoryAnomalies=${report.summary.anomalyCounts.exploratoryAnomalies}`,
  );
  console.log("Caveats:");
  for (const caveat of report.caveats) {
    console.log(`- ${caveat}`);
  }

  console.log("Registered engines:");
  for (const engineId of Array.from(
    new Set(report.rows.map((row) => row.engineId)),
  )) {
    console.log(`- ${engineId}`);
  }

  console.log("Reporting-only comparison rows:");
  for (const row of report.rows) {
    console.log(
      [
        `- engineId=${row.engineId}`,
        `engineLabel=${row.engineLabel}`,
        `testCaseId=${row.testCaseId}`,
        `caseKind=${row.caseKind}`,
        `targetFrequencyHz=${formatNumber(row.targetFrequencyHz)}`,
        `expectedFrequencyHz=${formatNumber(row.expectedFrequencyHz)}`,
        `estimatedFrequencyHz=${formatNumber(row.estimatedFrequencyHz)}`,
        `nearestNote=${row.nearestNote ?? "n/a"}`,
        `centsError=${formatNumber(row.centsError)}`,
        `confidence=${formatNumber(row.confidence, 3)}`,
        `clarity=${formatNumber(row.clarity, 3)}`,
        `voicing=${formatNumber(row.voicing, 3)}`,
        `validFrameCount=${row.validFrameCount ?? "n/a"}`,
        `frameFrequencyMinHz=${formatNumber(row.frameFrequencyMinHz)}`,
        `frameFrequencyMedianHz=${formatNumber(row.frameFrequencyMedianHz)}`,
        `frameFrequencyMaxHz=${formatNumber(row.frameFrequencyMaxHz)}`,
        `firstHalfMedianHz=${formatNumber(row.firstHalfMedianHz)}`,
        `secondHalfMedianHz=${formatNumber(row.secondHalfMedianHz)}`,
        `driftCents=${formatNumber(row.driftCents)}`,
        `noPitch=${row.noPitch ?? "n/a"}`,
        `isNoPitchExpected=${row.isNoPitchExpected}`,
        `isNoPitchResult=${row.isNoPitchResult}`,
        `isUnknownResult=${row.isUnknownResult}`,
        `isGrossPitchError=${row.isGrossPitchError}`,
        `isOctaveLikelyError=${row.isOctaveLikelyError}`,
        `isOutOfHumanVoiceRange=${row.isOutOfHumanVoiceRange}`,
        `isOutOfExpectedTargetRange=${row.isOutOfExpectedTargetRange}`,
        `isExploratoryCase=${row.isExploratoryCase}`,
        `anomalyLabels=${row.anomalyLabels.length > 0 ? row.anomalyLabels.join(",") : "none"}`,
        `anomalyNotes=${row.anomalyNotes.length > 0 ? row.anomalyNotes.join(" / ") : "none"}`,
      ].join(" | "),
    );
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
