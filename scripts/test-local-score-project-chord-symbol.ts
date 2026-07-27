import assert from "node:assert/strict";

import {
  LocalScoreProjectConflictError,
  LocalScoreProjectDomainError,
  addLocalScoreProjectEvent,
  changeLocalScoreProjectEventChordSymbol,
  copyLocalScoreProjectEvent,
  createLocalScoreProject,
  parseLocalScoreProject,
  pasteLocalScoreProjectEvent,
  redoLocalScoreProject,
  serializeLocalScoreProject,
  undoLocalScoreProject,
} from "../lib/music/localScoreProject";
import {
  createLocalScoreProjectNumberedPresentation,
} from "../lib/music/localScoreProjectNumberedPresentation";
import {
  createLocalScoreProjectPlaybackPlan,
} from "../lib/music/localScoreProjectPlayback";
import {
  createLocalScoreProjectStaffPresentation,
} from "../lib/music/localScoreProjectStaffPresentation";

const location = {
  partId: "part-1",
  staffId: "staff-1",
  voiceId: "voice-1",
  measureNumber: 1,
};

const getEvents = (project: ReturnType<typeof createLocalScoreProject>) =>
  project.document.parts[0]!.staves[0]!.voices[0]!.measures[0]!.events;
const getEvent = (
  project: ReturnType<typeof createLocalScoreProject>,
  eventId: string,
) => {
  const event = getEvents(project).find((candidate) => candidate.id === eventId);
  if (!event) throw new Error(`expected event ${eventId}`);
  return event;
};

const created = createLocalScoreProject({
  projectId: "chord-symbol",
  title: "和弦标记",
  now: "2026-07-26T01:00:00.000Z",
});
assert.equal(created.schemaVersion, "local-score-project-storage-v14");
assert.equal(created.document.schemaVersion, "score-document-v13");

const withNote = addLocalScoreProjectEvent({
  project: created,
  expectedRevision: 1,
  location,
  eventId: "note-1",
  input: { type: "note", pitch: "C4", duration: "quarter" },
  now: "2026-07-26T01:00:01.000Z",
});
const withNoteAndRest = addLocalScoreProjectEvent({
  project: withNote,
  expectedRevision: 2,
  location,
  eventId: "rest-1",
  input: { type: "rest", pitch: null, duration: "quarter" },
  now: "2026-07-26T01:00:02.000Z",
});
assert.equal(getEvent(withNoteAndRest, "note-1").chordSymbol, null);
assert.equal(getEvent(withNoteAndRest, "rest-1").chordSymbol, null);

const noteMarked = changeLocalScoreProjectEventChordSymbol({
  project: withNoteAndRest,
  expectedRevision: 3,
  location,
  eventId: "note-1",
  chordSymbol: "  Cmaj7  ",
  now: "2026-07-26T01:00:03.000Z",
});
assert.equal(getEvent(noteMarked, "note-1").chordSymbol, "Cmaj7");
assert.equal(noteMarked.document.revision, 4);

const restMarked = changeLocalScoreProjectEventChordSymbol({
  project: noteMarked,
  expectedRevision: 4,
  location,
  eventId: "rest-1",
  chordSymbol: "Dm7",
  now: "2026-07-26T01:00:04.000Z",
});
assert.equal(getEvent(restMarked, "rest-1").chordSymbol, "Dm7");

const restCleared = changeLocalScoreProjectEventChordSymbol({
  project: restMarked,
  expectedRevision: 5,
  location,
  eventId: "rest-1",
  chordSymbol: " \t ",
  now: "2026-07-26T01:00:05.000Z",
});
assert.equal(getEvent(restCleared, "rest-1").chordSymbol, null);
const blankNoOp = changeLocalScoreProjectEventChordSymbol({
  project: restCleared,
  expectedRevision: 6,
  location,
  eventId: "rest-1",
  chordSymbol: "",
  now: "2026-07-26T01:00:06.000Z",
});
assert.equal(blankNoOp, restCleared);

const fortyCodePoints = "和".repeat(39) + "😀";
assert.equal(Array.from(fortyCodePoints).length, 40);
const boundaryMarked = changeLocalScoreProjectEventChordSymbol({
  project: restCleared,
  expectedRevision: 6,
  location,
  eventId: "rest-1",
  chordSymbol: fortyCodePoints,
  now: "2026-07-26T01:00:06.000Z",
});
assert.equal(getEvent(boundaryMarked, "rest-1").chordSymbol, fortyCodePoints);

for (const invalid of [
  "和".repeat(41),
  "C\nG",
  "C\u0000G",
  "C\u0085G",
  7,
  true,
  {},
  [],
]) {
  assert.throws(
    () => changeLocalScoreProjectEventChordSymbol({
      project: boundaryMarked,
      expectedRevision: 7,
      location,
      eventId: "rest-1",
      chordSymbol: invalid as string,
      now: "2026-07-26T01:00:07.000Z",
    }),
    (error) =>
      error instanceof LocalScoreProjectDomainError
      && error.code === "invalid-input",
  );
  assert.equal(getEvent(boundaryMarked, "rest-1").chordSymbol, fortyCodePoints);
}

const sameNoOp = changeLocalScoreProjectEventChordSymbol({
  project: noteMarked,
  expectedRevision: 4,
  location,
  eventId: "note-1",
  chordSymbol: "Cmaj7",
  now: "2026-07-26T01:00:04.000Z",
});
assert.equal(sameNoOp, noteMarked);
assert.throws(
  () => changeLocalScoreProjectEventChordSymbol({
    project: noteMarked,
    expectedRevision: 3,
    location,
    eventId: "note-1",
    chordSymbol: "G7",
    now: "2026-07-26T01:00:04.000Z",
  }),
  LocalScoreProjectConflictError,
);
assert.throws(
  () => changeLocalScoreProjectEventChordSymbol({
    project: noteMarked,
    expectedRevision: 4,
    location,
    eventId: "note-1",
    chordSymbol: "G7",
    now: "2026-07-26T01:00:00.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "clock-regression",
);
assert.throws(
  () => changeLocalScoreProjectEventChordSymbol({
    project: noteMarked,
    expectedRevision: 4,
    location,
    eventId: "missing-event",
    chordSymbol: "G7",
    now: "2026-07-26T01:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-found",
);

const undone = undoLocalScoreProject({
  project: noteMarked,
  expectedRevision: 4,
  now: "2026-07-26T01:00:04.000Z",
});
assert.equal(getEvent(undone, "note-1").chordSymbol, null);
const redone = redoLocalScoreProject({
  project: undone,
  expectedRevision: 5,
  now: "2026-07-26T01:00:05.000Z",
});
assert.equal(getEvent(redone, "note-1").chordSymbol, "Cmaj7");
const changedAfterUndo = changeLocalScoreProjectEventChordSymbol({
  project: undone,
  expectedRevision: 5,
  location,
  eventId: "note-1",
  chordSymbol: "F7",
  now: "2026-07-26T01:00:05.000Z",
});
assert.equal(changedAfterUndo.redoStack.length, 0);

const copiedNote = copyLocalScoreProjectEvent({
  project: noteMarked,
  location,
  eventId: "note-1",
});
assert.equal(copiedNote.chordSymbol, "Cmaj7");
const withPastedNote = pasteLocalScoreProjectEvent({
  project: noteMarked,
  expectedRevision: 4,
  destination: location,
  eventId: "note-2",
  input: copiedNote,
  now: "2026-07-26T01:00:04.000Z",
});
assert.equal(getEvent(withPastedNote, "note-2").chordSymbol, "Cmaj7");
const copiedRest = copyLocalScoreProjectEvent({
  project: restMarked,
  location,
  eventId: "rest-1",
});
assert.equal(copiedRest.chordSymbol, "Dm7");
const withPastedRest = pasteLocalScoreProjectEvent({
  project: restMarked,
  expectedRevision: 5,
  destination: location,
  eventId: "rest-2",
  input: copiedRest,
  now: "2026-07-26T01:00:05.000Z",
});
assert.equal(getEvent(withPastedRest, "rest-2").chordSymbol, "Dm7");

const serialized = serializeLocalScoreProject(withPastedNote);
assert.deepEqual(parseLocalScoreProject(JSON.parse(serialized)), withPastedNote);

const staffPresentation =
  createLocalScoreProjectStaffPresentation(noteMarked.document);
if (staffPresentation.status !== "ready") {
  throw new Error(staffPresentation.reason);
}
const staffToken = staffPresentation.tokens.find(
  (token) => token.eventId === "note-1",
);
assert.equal(staffToken?.chordSymbol, "Cmaj7");
assert.match(staffToken?.accessibleLabel ?? "", /和弦.*Cmaj7/);

const numberedPresentation =
  createLocalScoreProjectNumberedPresentation(noteMarked.document);
if (numberedPresentation.status !== "ready") {
  throw new Error(numberedPresentation.reason);
}
const numberedToken = numberedPresentation.tokens.find(
  (token) => token.eventId === "note-1",
);
assert.equal(numberedToken?.chordSymbol, "Cmaj7");
assert.match(numberedToken?.accessibleLabel ?? "", /和弦.*Cmaj7/);

const playbackWithoutSymbol = createLocalScoreProjectPlaybackPlan({
  document: withNoteAndRest.document,
  bpm: 120,
});
const playbackWithSymbol = createLocalScoreProjectPlaybackPlan({
  document: noteMarked.document,
  bpm: 120,
});
assert.equal(playbackWithoutSymbol.status, "ready");
assert.equal(playbackWithSymbol.status, "ready");
if (
  playbackWithoutSymbol.status !== "ready"
  || playbackWithSymbol.status !== "ready"
) throw new Error("expected playable documents");
const playbackSemantics = (
  plan: typeof playbackWithSymbol,
) => {
  if (plan.status !== "ready") throw new Error("expected ready playback");
  return {
    documentId: plan.documentId,
    bpm: plan.bpm,
    voiceSelection: plan.voiceSelection,
    durationMs: plan.durationMs,
    events: plan.events.map((event) => event.type === "all-notes-off"
      ? event
      : {
        type: event.type,
        delayMs: event.delayMs,
        midi: event.midi,
        sourceEventId: event.sourceEventId,
      }),
    spans: plan.spans,
    warnings: plan.warnings,
  };
};
assert.deepEqual(
  playbackSemantics(playbackWithSymbol),
  playbackSemantics(playbackWithoutSymbol),
);
assert.notEqual(
  playbackWithSymbol.scheduleId,
  playbackWithoutSymbol.scheduleId,
  "canonical revision changes retain the existing revision-scoped schedule identity",
);
const pointerIds = (plan: typeof playbackWithSymbol) => {
  if (plan.status !== "ready") throw new Error("expected ready playback");
  return plan.events.flatMap((event) =>
    event.type === "all-notes-off" ? [] : [event.pointerId]);
};
assert.notDeepEqual(
  pointerIds(playbackWithSymbol),
  pointerIds(playbackWithoutSymbol),
  "canonical revision changes retain the existing revision-scoped pointer identity",
);

type JsonRecord = Record<string, unknown>;
type JsonContent = JsonRecord & {
  parts: Array<JsonRecord & {
    staves: Array<JsonRecord & {
      voices: Array<JsonRecord & {
        measures: Array<JsonRecord & {
          events: JsonRecord[];
        }>;
      }>;
    }>;
  }>;
};
type JsonProject = JsonRecord & {
  schemaVersion: string;
  tempoBpm?: number;
  document: JsonContent & { schemaVersion: string };
  undoStack: JsonContent[];
  redoStack: JsonContent[];
};

const allContents = (fixture: JsonProject) => [
  fixture.document,
  ...fixture.undoStack,
  ...fixture.redoStack,
];
const forEachEvent = (
  fixture: JsonProject,
  visit: (event: JsonRecord) => void,
) => {
  for (const content of allContents(fixture)) {
    for (const part of content.parts) for (const staff of part.staves) {
      for (const voice of staff.voices) for (const measure of voice.measures) {
        for (const event of measure.events) visit(event);
      }
    }
  }
};

const legacyHistorySource = undoLocalScoreProject({
  project: restMarked,
  expectedRevision: 5,
  now: "2026-07-26T01:00:05.000Z",
});
assert.ok(legacyHistorySource.undoStack.length > 0);
assert.ok(legacyHistorySource.redoStack.length > 0);

const documentVersions = [
  "score-document-v1",
  "score-document-v1",
  "score-document-v2",
  "score-document-v3",
  "score-document-v4",
  "score-document-v5",
  "score-document-v6",
  "score-document-v7",
] as const;

for (let version = 1; version <= 8; version += 1) {
  const fixture = JSON.parse(
    serializeLocalScoreProject(legacyHistorySource),
  ) as JsonProject;
  fixture.schemaVersion = `local-score-project-storage-v${version}`;
  fixture.document.schemaVersion = documentVersions[version - 1]!;
  if (version === 1) delete fixture.tempoBpm;

  for (const content of allContents(fixture)) {
    if (version <= 3) delete content.keySignature;
    if (version <= 6) delete content.scoreCredits;
    for (const part of content.parts) {
      if (version <= 4) delete part.name;
      if (version <= 5) delete part.instrument;
    }
  }
  forEachEvent(fixture, (event) => {
    delete event.articulations;
    delete event.chordSymbol;
    if (version <= 7) delete event.fingering;
    if (version <= 2) {
      delete event.augmentationDots;
      delete event.tieToNext;
      delete event.lyric;
    }
  });

  const before = JSON.stringify(fixture);
  const migrated = parseLocalScoreProject(fixture);
  assert.ok(migrated, `storage v${version} must migrate`);
  assert.equal(JSON.stringify(fixture), before, `storage v${version} input`);
  assert.equal(migrated.schemaVersion, "local-score-project-storage-v14");
  assert.equal(migrated.document.schemaVersion, "score-document-v13");
  for (const content of [
    migrated.document,
    ...migrated.undoStack,
    ...migrated.redoStack,
  ]) {
    for (const part of content.parts) for (const staff of part.staves) {
      for (const voice of staff.voices) for (const measure of voice.measures) {
        for (const event of measure.events) {
          assert.equal(
            event.chordSymbol,
            null,
            `storage v${version} history event`,
          );
        }
      }
    }
  }
}

console.log("local score project chord symbol tests passed");
