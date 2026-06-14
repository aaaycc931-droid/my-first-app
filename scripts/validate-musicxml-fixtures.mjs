import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { parseMusicXML } from "../lib/musicxml/musicxmlParser.ts";

const fixtureNames = [
  "simple-score",
  "omr-like-score",
  "audiveris/audiveris-basic-01",
];

const noteFields = [
  "pitch",
  "note",
  "duration",
  "measure",
  "beat",
  "confidence",
  "source",
];

const fixturesDirectory = new URL("../lib/musicxml/__fixtures__/", import.meta.url);

function selectNoteFields(note) {
  return Object.fromEntries(noteFields.map((field) => [field, note[field]]));
}

async function validateFixture(fixtureName) {
  const musicXmlUrl = new URL(`${fixtureName}.musicxml`, fixturesDirectory);
  const expectedUrl = new URL(`${fixtureName}.expected.json`, fixturesDirectory);
  const [musicXml, expectedJson] = await Promise.all([
    readFile(musicXmlUrl, "utf8"),
    readFile(expectedUrl, "utf8"),
  ]);

  const actual = parseMusicXML(musicXml);
  const expected = JSON.parse(expectedJson);

  assert.ok(
    Array.isArray(expected.notes),
    `${fileURLToPath(expectedUrl)} must contain a notes array`,
  );
  assert.equal(
    actual.notes.length,
    expected.notes.length,
    `${fixtureName}: notes.length`,
  );

  assert.deepEqual(
    actual.notes.map(selectNoteFields),
    expected.notes.map(selectNoteFields),
    `${fixtureName}: note fields (${noteFields.join(", ")})`,
  );

  console.log(`✓ ${fixtureName} (${actual.notes.length} notes)`);
}

try {
  for (const fixtureName of fixtureNames) {
    await validateFixture(fixtureName);
  }

  console.log(
    `MusicXML fixture validation passed: ${fixtureNames.length} fixtures.`,
  );
} catch (error) {
  console.error("MusicXML fixture validation failed.");
  console.error(error);
  process.exit(1);
}
