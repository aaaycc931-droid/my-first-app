import { existsSync, readFileSync } from "node:fs";
import { extname, isAbsolute, normalize, resolve, sep } from "node:path";
import {
  inRepoAutocorrelationPitchEngine,
  loadPitchyMcleodPitchEngine,
  type PitchEngineAdapter,
  type PitchEngineComparisonReportRow,
  type PitchEngineNoPitchKind,
} from "../lib/practice/pitchEngineComparison";
import type { PitchAudioBufferLike } from "../lib/practice/pitchEstimate";

const fixturesRoot = resolve(process.cwd(), "local-fixtures/real-voice");
const metadataPath = resolve(fixturesRoot, "metadata.local.json");
const humanVoiceRangeMinHz = 50;
const humanVoiceRangeMaxHz = 2000;
const grossPitchErrorCents = 50;
const octaveLikelyErrorCents = 1200;

type LocalRealPhoneSample = {
  id?: unknown;
  audioFile?: unknown;
  targetNote?: unknown;
  expectedFrequencyHz?: unknown;
  targetFrequencyHz?: unknown;
  localOnly?: unknown;
  includeInPitchEngineComparison?: unknown;
  caveats?: unknown;
};

type SkippedSample = {
  sampleId: string;
  reason: string;
  notes: string[];
};

type DecodedPcmWav = PitchAudioBufferLike & {
  formatNote: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatNumber(value: number | undefined, fractionDigits = 2): string {
  return value === undefined || !Number.isFinite(value)
    ? "n/a"
    : value.toFixed(fractionDigits);
}

function resolveIgnoredLocalAudioPath(audioFile: string): string | null {
  if (isAbsolute(audioFile) || audioFile.includes("..")) {
    return null;
  }

  const normalizedAudioFile = normalize(audioFile);
  if (
    normalizedAudioFile === "metadata.local.json" ||
    normalizedAudioFile.startsWith(`metadata.local.json${sep}`)
  ) {
    return null;
  }

  const resolvedAudioPath = resolve(fixturesRoot, normalizedAudioFile);
  const fixturesPrefix = `${fixturesRoot}${sep}`;

  if (!resolvedAudioPath.startsWith(fixturesPrefix)) {
    return null;
  }

  return resolvedAudioPath;
}

function readAscii(buffer: Buffer, offset: number, length: number): string {
  return buffer.toString("ascii", offset, offset + length);
}

function readPcmSample(buffer: Buffer, byteOffset: number, bitsPerSample: number): number {
  if (bitsPerSample === 8) {
    return (buffer.readUInt8(byteOffset) - 128) / 128;
  }

  if (bitsPerSample === 16) {
    return buffer.readInt16LE(byteOffset) / 32768;
  }

  if (bitsPerSample === 24) {
    const value = buffer.readIntLE(byteOffset, 3);
    return value / 8388608;
  }

  if (bitsPerSample === 32) {
    return buffer.readInt32LE(byteOffset) / 2147483648;
  }

  throw new Error(`Unsupported PCM bit depth: ${bitsPerSample}.`);
}

function decodePcmWav(audioPath: string): DecodedPcmWav {
  const buffer = readFileSync(audioPath);

  if (buffer.length < 44 || readAscii(buffer, 0, 4) !== "RIFF" || readAscii(buffer, 8, 4) !== "WAVE") {
    throw new Error("unsupported-audio-decoding: only RIFF/WAVE files are supported by this local skeleton.");
  }

  let offset = 12;
  let audioFormat: number | undefined;
  let numberOfChannels: number | undefined;
  let sampleRate: number | undefined;
  let bitsPerSample: number | undefined;
  let dataOffset: number | undefined;
  let dataSize: number | undefined;

  while (offset + 8 <= buffer.length) {
    const chunkId = readAscii(buffer, offset, 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataOffset = offset + 8;

    if (chunkId === "fmt ") {
      audioFormat = buffer.readUInt16LE(chunkDataOffset);
      numberOfChannels = buffer.readUInt16LE(chunkDataOffset + 2);
      sampleRate = buffer.readUInt32LE(chunkDataOffset + 4);
      bitsPerSample = buffer.readUInt16LE(chunkDataOffset + 14);
    }

    if (chunkId === "data") {
      dataOffset = chunkDataOffset;
      dataSize = chunkSize;
    }

    offset = chunkDataOffset + chunkSize + (chunkSize % 2);
  }

  if (
    audioFormat === undefined ||
    numberOfChannels === undefined ||
    sampleRate === undefined ||
    bitsPerSample === undefined ||
    dataOffset === undefined ||
    dataSize === undefined
  ) {
    throw new Error("unsupported-audio-decoding: WAV fmt/data chunks are incomplete.");
  }

  if (audioFormat !== 1 || ![8, 16, 24, 32].includes(bitsPerSample)) {
    throw new Error("unsupported-audio-decoding: this script currently supports uncompressed PCM WAV only.");
  }

  const bytesPerSample = bitsPerSample / 8;
  const frameSize = bytesPerSample * numberOfChannels;
  const frameCount = Math.floor(dataSize / frameSize);
  const channels = Array.from({ length: numberOfChannels }, () => new Float32Array(frameCount));

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex += 1) {
      const sampleOffset = dataOffset + frameIndex * frameSize + channelIndex * bytesPerSample;
      channels[channelIndex][frameIndex] = readPcmSample(buffer, sampleOffset, bitsPerSample);
    }
  }

  return {
    length: frameCount,
    numberOfChannels,
    sampleRate,
    getChannelData(channelIndex: number) {
      return channels[channelIndex];
    },
    formatNote: `pcm-wav-${bitsPerSample}bit-${numberOfChannels}ch-${sampleRate}hz`,
  };
}

function calculateCentsError(estimatedFrequencyHz: number, targetFrequencyHz: number): number {
  return 1200 * Math.log2(estimatedFrequencyHz / targetFrequencyHz);
}

function buildAnomalyReport({
  estimatedFrequencyHz,
  centsError,
  noPitch,
}: {
  estimatedFrequencyHz?: number;
  centsError?: number;
  noPitch?: PitchEngineNoPitchKind;
}) {
  const anomalyLabels: string[] = [];
  const anomalyNotes: string[] = [];
  const isNoPitchResult = noPitch !== undefined;
  const isUnknownResult = noPitch === "unknown";
  const hasFrequency = estimatedFrequencyHz !== undefined;
  const absoluteCentsError = centsError === undefined ? undefined : Math.abs(centsError);
  const isGrossPitchError = absoluteCentsError !== undefined && absoluteCentsError > grossPitchErrorCents;
  const isOctaveLikelyError = absoluteCentsError !== undefined && absoluteCentsError > octaveLikelyErrorCents;
  const isOutOfHumanVoiceRange =
    hasFrequency && (estimatedFrequencyHz < humanVoiceRangeMinHz || estimatedFrequencyHz > humanVoiceRangeMaxHz);

  if (isNoPitchResult) {
    anomalyLabels.push("possible-false-unvoiced");
    anomalyNotes.push("A target phone sample returned a no-pitch result; this is reporting-only, not a fail label.");
  }

  if (isUnknownResult) {
    anomalyLabels.push("unknown-result");
    anomalyNotes.push("The engine returned an unknown no-pitch result.");
  }

  if (isOutOfHumanVoiceRange) {
    anomalyLabels.push("out-of-human-voice-range");
    anomalyNotes.push(`Estimated frequency is outside the reporting-only ${humanVoiceRangeMinHz}-${humanVoiceRangeMaxHz}Hz human voice sanity range.`);
  }

  if (isGrossPitchError) {
    anomalyLabels.push("gross-pitch-error");
    anomalyNotes.push(`Absolute cents error exceeds the reporting-only ${grossPitchErrorCents} cent gross-error threshold.`);
  }

  if (isOctaveLikelyError) {
    anomalyLabels.push("possible-octave-or-catastrophic-error");
    anomalyNotes.push(`Absolute cents error exceeds the reporting-only ${octaveLikelyErrorCents} cent catastrophic-error threshold.`);
  }

  return {
    isNoPitchExpected: false,
    isNoPitchResult,
    isUnknownResult,
    isGrossPitchError,
    isOctaveLikelyError,
    isOutOfHumanVoiceRange,
    isOutOfExpectedTargetRange: isGrossPitchError,
    isExploratoryCase: true,
    anomalyLabels,
    anomalyNotes,
  };
}

function buildRow(
  engine: PitchEngineAdapter,
  sample: Required<Pick<LocalRealPhoneSample, "id" | "targetNote">> & {
    targetFrequencyHz: number;
    caveats: string[];
  },
  audioBuffer: DecodedPcmWav,
): PitchEngineComparisonReportRow {
  const result = engine.estimate(audioBuffer);
  const centsError =
    result.estimatedFrequencyHz === undefined
      ? undefined
      : calculateCentsError(result.estimatedFrequencyHz, sample.targetFrequencyHz);
  const anomalyReport = buildAnomalyReport({
    estimatedFrequencyHz: result.estimatedFrequencyHz,
    centsError,
    noPitch: result.noPitch,
  });

  return {
    engineId: engine.engineId,
    engineLabel: engine.engineLabel,
    engineVersion: engine.engineVersion,
    implementationNote: engine.implementationNote,
    testCaseId: String(sample.id),
    caseKind: "exploratory-pitch",
    expectedFrequencyHz: sample.targetFrequencyHz,
    targetFrequencyHz: sample.targetFrequencyHz,
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
    notes: [
      ...(result.notes ?? []),
      `Decoded local fixture format: ${audioBuffer.formatNote}.`,
    ],
    caveats: [
      "P7j local real phone comparison is opt-in, local-only, outside CI, and reporting-only.",
      "This row is not a formal score, grade, pass/fail result, professional accuracy claim, or conservatory-grade assessment.",
      ...sample.caveats,
    ],
  };
}

async function main(): Promise<void> {
  console.log("P7j local real phone comparison script.");
  console.log("Reporting-only: not formal scoring, not a grade, not pass/fail, not a professional accuracy claim, and not conservatory-grade assessment.");
  console.log("Local-only: no uploads, no network calls, no cloud evaluation, no AI APIs, and not part of CI.");
  console.log(`Checking ${metadataPath}`);

  if (!existsSync(metadataPath)) {
    console.log("No metadata.local.json found. This is expected for most developers; exiting 0 without running comparisons.");
    console.log("Summary: metadataFound=false | totalSamples=0 | includedSamples=0 | missingAudioSamples=0 | skippedSamples=0 | executedSamples=0 | enginesAttempted=0 | rowsGenerated=0 | grossPitchErrors=0 | outOfHumanVoiceRange=0 | possibleFalseVoiced=0 | unknownResults=0");
    return;
  }

  const parsed = JSON.parse(readFileSync(metadataPath, "utf8")) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed.samples)) {
    throw new Error("metadata.local.json must be an object with a samples array.");
  }

  const samples = parsed.samples.filter(isRecord) as LocalRealPhoneSample[];
  const includedSamples = samples.filter((sample) => sample.includeInPitchEngineComparison === true);
  const engines = [inRepoAutocorrelationPitchEngine, await loadPitchyMcleodPitchEngine()];
  const skippedSamples: SkippedSample[] = [];
  const rows: PitchEngineComparisonReportRow[] = [];
  let missingAudioSamples = 0;
  let unsupportedAudioSamples = 0;
  let executedSamples = 0;

  for (const sample of includedSamples) {
    const sampleId = typeof sample.id === "string" && sample.id.trim() !== "" ? sample.id : "unknown-sample";
    const targetFrequencyHz =
      typeof sample.targetFrequencyHz === "number" && Number.isFinite(sample.targetFrequencyHz)
        ? sample.targetFrequencyHz
        : typeof sample.expectedFrequencyHz === "number" && Number.isFinite(sample.expectedFrequencyHz)
          ? sample.expectedFrequencyHz
          : undefined;

    if (sample.localOnly !== true || typeof sample.audioFile !== "string" || targetFrequencyHz === undefined || typeof sample.targetNote !== "string") {
      skippedSamples.push({
        sampleId,
        reason: "invalid-metadata-for-comparison",
        notes: ["Sample needs localOnly=true, audioFile, targetNote, and targetFrequencyHz/expectedFrequencyHz."],
      });
      continue;
    }

    const audioPath = resolveIgnoredLocalAudioPath(sample.audioFile);
    if (audioPath === null) {
      skippedSamples.push({
        sampleId,
        reason: "unsafe-audio-path",
        notes: ["audioFile must be a relative path under local-fixtures/real-voice and must not traverse directories."],
      });
      continue;
    }

    if (!existsSync(audioPath)) {
      missingAudioSamples += 1;
      skippedSamples.push({ sampleId, reason: "skipped-missing-audio", notes: [`Missing ignored local audio fixture: ${sample.audioFile}`] });
      continue;
    }

    if (extname(audioPath).toLowerCase() !== ".wav") {
      unsupportedAudioSamples += 1;
      skippedSamples.push({ sampleId, reason: "unsupported-audio-decoding", notes: ["Only uncompressed PCM .wav is currently supported without adding dependencies."] });
      continue;
    }

    let audioBuffer: DecodedPcmWav;
    try {
      audioBuffer = decodePcmWav(audioPath);
    } catch (error) {
      unsupportedAudioSamples += 1;
      skippedSamples.push({ sampleId, reason: "unsupported-audio-decoding", notes: [error instanceof Error ? error.message : String(error)] });
      continue;
    }

    executedSamples += 1;
    const sampleCaveats = Array.isArray(sample.caveats) ? sample.caveats.filter((caveat): caveat is string => typeof caveat === "string") : [];
    for (const engine of engines) {
      rows.push(buildRow(engine, { id: sampleId, targetNote: sample.targetNote, targetFrequencyHz, caveats: sampleCaveats }, audioBuffer));
    }
  }

  const grossPitchErrors = rows.filter((row) => row.isGrossPitchError).length;
  const outOfHumanVoiceRange = rows.filter((row) => row.isOutOfHumanVoiceRange).length;
  const possibleFalseVoiced = rows.filter((row) => row.anomalyLabels.includes("possible-false-voiced")).length;
  const unknownResults = rows.filter((row) => row.isUnknownResult).length;

  console.log(
    `Summary: metadataFound=true | totalSamples=${samples.length} | includedSamples=${includedSamples.length} | missingAudioSamples=${missingAudioSamples} | unsupportedAudioSamples=${unsupportedAudioSamples} | skippedSamples=${skippedSamples.length} | executedSamples=${executedSamples} | enginesAttempted=${engines.length} | rowsGenerated=${rows.length} | grossPitchErrors=${grossPitchErrors} | outOfHumanVoiceRange=${outOfHumanVoiceRange} | possibleFalseVoiced=${possibleFalseVoiced} | unknownResults=${unknownResults}`,
  );

  if (unsupportedAudioSamples > 0) {
    console.log("Caveat: unsupported-audio-decoding samples were skipped; no estimatedFrequencyHz was fabricated for skipped samples.");
  }

  for (const skippedSample of skippedSamples) {
    console.log(`Skipped: sampleId=${skippedSample.sampleId} | reason=${skippedSample.reason} | notes=${skippedSample.notes.join(" / ")}`);
  }

  for (const row of rows) {
    console.log([
      `Row: engineId=${row.engineId}`,
      `engineLabel=${row.engineLabel}`,
      `sampleId=${row.testCaseId}`,
      `targetNote=${includedSamples.find((sample) => sample.id === row.testCaseId)?.targetNote ?? "n/a"}`,
      `targetFrequencyHz=${formatNumber(row.targetFrequencyHz)}`,
      `estimatedFrequencyHz=${formatNumber(row.estimatedFrequencyHz)}`,
      `nearestNote=${row.nearestNote ?? "n/a"}`,
      `centsError=${formatNumber(row.centsError)}`,
      `confidence=${formatNumber(row.confidence, 3)}`,
      `clarity=${formatNumber(row.clarity, 3)}`,
      `voicing=${formatNumber(row.voicing, 3)}`,
      `noPitch=${row.noPitch ?? "n/a"}`,
      `anomalyLabels=${row.anomalyLabels.length > 0 ? row.anomalyLabels.join(",") : "none"}`,
      `anomalyNotes=${row.anomalyNotes.length > 0 ? row.anomalyNotes.join(" / ") : "none"}`,
      `caveats=${row.caveats.join(" / ")}`,
    ].join(" | "));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
