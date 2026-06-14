import { readFile, stat } from "node:fs/promises";
import { performance } from "node:perf_hooks";

import { parseMusicXML } from "../lib/musicxml/musicxmlParser.ts";

const fixturePaths = [
  "lib/musicxml/__fixtures__/simple-score.musicxml",
  "lib/musicxml/__fixtures__/omr-like-score.musicxml",
  "lib/musicxml/__fixtures__/audiveris/audiveris-basic-01.musicxml",
];

function formatCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

async function collectFixtureMetrics(fixturePath) {
  let sizeBytes = "—";
  let sizeKb = "—";
  let notesCount = "—";
  let parseDurationMs = "—";

  try {
    const fixtureUrl = new URL(`../${fixturePath}`, import.meta.url);
    const [musicXml, fixtureStat] = await Promise.all([
      readFile(fixtureUrl, "utf8"),
      stat(fixtureUrl),
    ]);

    sizeBytes = fixtureStat.size;
    sizeKb = (fixtureStat.size / 1024).toFixed(2);

    const parseStartedAt = performance.now();
    const parsed = parseMusicXML(musicXml);
    parseDurationMs = (performance.now() - parseStartedAt).toFixed(3);
    notesCount = parsed.notes.length;

    return {
      fixturePath,
      sizeBytes,
      sizeKb,
      notesCount,
      parseDurationMs,
      succeeded: true,
      errorMessage: "",
    };
  } catch (error) {
    return {
      fixturePath,
      sizeBytes,
      sizeKb,
      notesCount,
      parseDurationMs,
      succeeded: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

const metrics = [];

for (const fixturePath of fixturePaths) {
  metrics.push(await collectFixtureMetrics(fixturePath));
}

console.log(
  "| Fixture path | File size (bytes) | File size (KB) | Notes | Parse duration (ms) | Parse succeeded | Error |",
);
console.log("| --- | ---: | ---: | ---: | ---: | :---: | --- |");

for (const metric of metrics) {
  console.log(
    `| ${[
      metric.fixturePath,
      metric.sizeBytes,
      metric.sizeKb,
      metric.notesCount,
      metric.parseDurationMs,
      metric.succeeded ? "yes" : "no",
      metric.errorMessage || "—",
    ]
      .map(formatCell)
      .join(" | ")} |`,
  );
}

if (metrics.some((metric) => !metric.succeeded)) {
  process.exitCode = 1;
}
