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

function validateRawDurationTiming() {
  const parsed = parseMusicXML(`
    <score-partwise>
      <part>
        <measure number="1">
          <attributes><divisions>4</divisions></attributes>
          <note>
            <pitch><step>C</step><octave>4</octave></pitch>
            <duration>6</duration>
            <type>quarter</type>
            <dot/>
          </note>
          <note>
            <rest/>
            <duration>3</duration>
            <type>eighth</type>
            <dot/>
          </note>
          <note>
            <pitch><step>D</step><octave>4</octave></pitch>
            <duration>4</duration>
            <type>quarter</type>
          </note>
        </measure>
      </part>
    </score-partwise>
  `);

  assert.deepEqual(
    parsed.notes.map(({ pitch, duration, beat }) => ({
      pitch,
      duration,
      beat,
    })),
    [
      { pitch: "C4", duration: "quarter", beat: 1 },
      { pitch: "D4", duration: "quarter", beat: 3.25 },
    ],
    "valid raw duration/divisions must advance beats without changing base duration enums",
  );

  const fallback = parseMusicXML(`
    <score-partwise>
      <part>
        <measure number="1">
          <attributes><divisions>4</divisions></attributes>
          <note>
            <pitch><step>C</step><octave>4</octave></pitch>
            <duration>0</duration>
            <type>quarter</type>
          </note>
          <note>
            <pitch><step>D</step><octave>4</octave></pitch>
            <duration>not-a-number</duration>
            <type>half</type>
          </note>
          <note>
            <pitch><step>E</step><octave>4</octave></pitch>
            <type>eighth</type>
          </note>
        </measure>
      </part>
    </score-partwise>
  `);

  assert.deepEqual(
    fallback.notes.map(({ pitch, duration, beat }) => ({
      pitch,
      duration,
      beat,
    })),
    [
      { pitch: "C4", duration: "quarter", beat: 1 },
      { pitch: "D4", duration: "half", beat: 2 },
      { pitch: "E4", duration: "eighth", beat: 4 },
    ],
    "missing or invalid raw durations must fall back to base type beats",
  );

  console.log("✓ raw duration beat timing (base duration identity retained)");
}

try {
  for (const fixtureName of fixtureNames) {
    await validateFixture(fixtureName);
  }
  validateRawDurationTiming();

  console.log(
    `MusicXML fixture validation passed: ${fixtureNames.length} fixtures.`,
  );
} catch (error) {
  console.error("MusicXML fixture validation failed.");
  console.error(error);
  process.exit(1);
}
