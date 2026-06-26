import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const metadataPath = resolve(
  process.cwd(),
  "local-fixtures/real-voice/metadata.local.json",
);

const requiredFields = [
  "id",
  "targetNote",
  "expectedFrequencyHz",
  "vowel",
  "durationSeconds",
  "singerRange",
  "recordingCondition",
  "deviceClass",
  "consentStatus",
  "localOnly",
  "caveats",
] as const;

type RequiredField = (typeof requiredFields)[number];
type LocalRealVoiceSample = Record<RequiredField, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describePath(index: number, field?: string): string {
  return field ? `samples[${index}].${field}` : `samples[${index}]`;
}

function validateSample(sample: unknown, index: number): string[] {
  const errors: string[] = [];

  if (!isRecord(sample)) {
    return [`${describePath(index)} must be an object.`];
  }

  for (const field of requiredFields) {
    if (!(field in sample)) {
      errors.push(`${describePath(index, field)} is required.`);
    }
  }

  if (errors.length > 0) {
    return errors;
  }

  const typedSample = sample as LocalRealVoiceSample;

  for (const field of [
    "id",
    "targetNote",
    "vowel",
    "singerRange",
    "recordingCondition",
    "deviceClass",
    "consentStatus",
  ] as const) {
    if (typeof typedSample[field] !== "string" || typedSample[field].trim() === "") {
      errors.push(`${describePath(index, field)} must be a non-empty string.`);
    }
  }

  if (
    typeof typedSample.expectedFrequencyHz !== "number" ||
    !Number.isFinite(typedSample.expectedFrequencyHz) ||
    typedSample.expectedFrequencyHz <= 0
  ) {
    errors.push(`${describePath(index, "expectedFrequencyHz")} must be a positive number.`);
  }

  if (
    typeof typedSample.durationSeconds !== "number" ||
    !Number.isFinite(typedSample.durationSeconds) ||
    typedSample.durationSeconds <= 0
  ) {
    errors.push(`${describePath(index, "durationSeconds")} must be a positive number.`);
  }

  if (typedSample.localOnly !== true) {
    errors.push(`${describePath(index, "localOnly")} must be true.`);
  }

  if (!Array.isArray(typedSample.caveats)) {
    errors.push(`${describePath(index, "caveats")} must be an array of strings.`);
  } else if (
    typedSample.caveats.some(
      (caveat) => typeof caveat !== "string" || caveat.trim() === "",
    )
  ) {
    errors.push(`${describePath(index, "caveats")} must contain only non-empty strings.`);
  }

  return errors;
}

function main(): void {
  console.log("Local real voice metadata validation is opt-in, local-only, and non-blocking.");
  console.log("No audio files are read, no data is uploaded, and no network calls are made.");
  console.log(`Checking ${metadataPath}`);

  if (!existsSync(metadataPath)) {
    console.log(
      "No local metadata file found. This is expected for most developers; nothing to validate.",
    );
    process.exit(0);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(metadataPath, "utf8"));
  } catch (error) {
    console.error("metadata.local.json is not valid JSON.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.samples)) {
    console.error("metadata.local.json must be an object with a samples array.");
    process.exit(1);
  }

  const errors = parsed.samples.flatMap((sample, index) => validateSample(sample, index));

  if (errors.length > 0) {
    console.error("Local real voice metadata validation failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Validated ${parsed.samples.length} local metadata sample(s).`);
}

main();
