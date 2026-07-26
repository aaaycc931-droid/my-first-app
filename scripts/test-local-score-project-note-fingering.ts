import assert from "node:assert/strict";

import {
  LocalScoreProjectConflictError,
  LocalScoreProjectDomainError,
  addLocalScoreProjectEvent,
  changeLocalScoreProjectEventFingering,
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
import type { LocalScoreProjectFingeringV1 } from "../lib/music/scoreDocument";

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
) => getEvents(project).find((event) => event.id === eventId);
const getNote = (
  project: ReturnType<typeof createLocalScoreProject>,
  eventId: string,
) => {
  const event = getEvent(project, eventId);
  assert.equal(event?.type, "note");
  if (event?.type !== "note") throw new Error(`expected note ${eventId}`);
  return event;
};

const created = createLocalScoreProject({
  projectId: "note-fingering",
  title: "单音指法",
  now: "2026-07-26T00:00:00.000Z",
});
assert.equal(created.schemaVersion, "local-score-project-storage-v10");
assert.equal(created.document.schemaVersion, "score-document-v9");

const withNote = addLocalScoreProjectEvent({
  project: created,
  expectedRevision: 1,
  location,
  eventId: "note-1",
  input: { type: "note", pitch: "C4", duration: "quarter" },
  now: "2026-07-26T00:00:01.000Z",
});
assert.equal(getNote(withNote, "note-1").fingering, null);

let boundaryProject = withNote;
const fingerings = [1, 2, 3, 4, 5, null] as const;
for (let index = 0; index < fingerings.length; index += 1) {
  const fingering = fingerings[index];
  const previous = boundaryProject;
  boundaryProject = changeLocalScoreProjectEventFingering({
    project: previous,
    expectedRevision: previous.document.revision,
    location,
    eventId: "note-1",
    fingering,
    now: `2026-07-26T00:00:0${index + 2}.000Z`,
  });
  assert.equal(getNote(boundaryProject, "note-1").fingering, fingering);
  assert.equal(
    boundaryProject.document.revision,
    previous.document.revision + 1,
  );
}

const fingered = changeLocalScoreProjectEventFingering({
  project: withNote,
  expectedRevision: 2,
  location,
  eventId: "note-1",
  fingering: 3,
  now: "2026-07-26T00:00:02.000Z",
});
const staffPresentation =
  createLocalScoreProjectStaffPresentation(fingered.document);
if (staffPresentation.status !== "ready") throw new Error(staffPresentation.reason);
const staffToken = staffPresentation.tokens[0];
assert.equal(staffToken?.type, "note");
if (staffToken?.type !== "note") throw new Error("expected staff note token");
assert.equal(staffToken.fingering, 3);
assert.match(staffToken.accessibleLabel, /指法 3/);

const numberedPresentation =
  createLocalScoreProjectNumberedPresentation(fingered.document);
if (numberedPresentation.status !== "ready") {
  throw new Error(numberedPresentation.reason);
}
const numberedToken = numberedPresentation.tokens[0];
assert.equal(numberedToken?.type, "note");
if (numberedToken?.type !== "note") {
  throw new Error("expected numbered note token");
}
assert.equal(numberedToken.fingering, 3);
assert.match(numberedToken.accessibleLabel, /指法 3/);

const playbackWithoutFingering = createLocalScoreProjectPlaybackPlan({
  document: withNote.document,
  bpm: 120,
});
const playbackWithFingering = createLocalScoreProjectPlaybackPlan({
  document: fingered.document,
  bpm: 120,
});
assert.equal(playbackWithoutFingering.status, "ready");
assert.equal(playbackWithFingering.status, "ready");
if (
  playbackWithoutFingering.status !== "ready"
  || playbackWithFingering.status !== "ready"
) throw new Error("expected playable documents");
const playbackSemantics = (
  events: typeof playbackWithFingering.events,
) => events.map((event) => event.type === "all-notes-off"
  ? event
  : {
    type: event.type,
    delayMs: event.delayMs,
    midi: event.midi,
    sourceEventId: event.sourceEventId,
  });
assert.deepEqual(
  playbackSemantics(playbackWithFingering.events),
  playbackSemantics(playbackWithoutFingering.events),
);
assert.deepEqual(playbackWithFingering.spans, playbackWithoutFingering.spans);
assert.equal(playbackWithFingering.durationMs, playbackWithoutFingering.durationMs);

const noOp = changeLocalScoreProjectEventFingering({
  project: fingered,
  expectedRevision: 3,
  location,
  eventId: "note-1",
  fingering: 3,
  now: "2026-07-26T00:00:03.000Z",
});
assert.equal(noOp, fingered, "相同指法必须返回原项目且不产生 revision");

assert.throws(
  () => changeLocalScoreProjectEventFingering({
    project: fingered,
    expectedRevision: 2,
    location,
    eventId: "note-1",
    fingering: 4,
    now: "2026-07-26T00:00:03.000Z",
  }),
  LocalScoreProjectConflictError,
);
assert.throws(
  () => changeLocalScoreProjectEventFingering({
    project: fingered,
    expectedRevision: 3,
    location,
    eventId: "note-1",
    fingering: 4,
    now: "2026-07-26T00:00:00.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "clock-regression",
);

for (const invalid of [0, 6, -1, 1.5, Number.NaN, "1", true, {}, []]) {
  assert.throws(
    () => changeLocalScoreProjectEventFingering({
      project: fingered,
      expectedRevision: 3,
      location,
      eventId: "note-1",
      fingering: invalid as LocalScoreProjectFingeringV1,
      now: "2026-07-26T00:00:03.000Z",
    }),
    (error) =>
      error instanceof LocalScoreProjectDomainError
      && error.code === "invalid-input",
  );
}

const withRest = addLocalScoreProjectEvent({
  project: fingered,
  expectedRevision: 3,
  location,
  eventId: "rest-1",
  input: { type: "rest", pitch: null, duration: "quarter" },
  now: "2026-07-26T00:00:03.000Z",
});
assert.equal(Object.hasOwn(getEvent(withRest, "rest-1")!, "fingering"), false);
assert.throws(
  () => changeLocalScoreProjectEventFingering({
    project: withRest,
    expectedRevision: 4,
    location,
    eventId: "rest-1",
    fingering: 2,
    now: "2026-07-26T00:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "invalid-input",
);
assert.throws(
  () => changeLocalScoreProjectEventFingering({
    project: withRest,
    expectedRevision: 4,
    location,
    eventId: "missing-note",
    fingering: 2,
    now: "2026-07-26T00:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-found",
);

const undone = undoLocalScoreProject({
  project: fingered,
  expectedRevision: 3,
  now: "2026-07-26T00:00:03.000Z",
});
assert.equal(
  getNote(undone, "note-1").fingering,
  null,
);
const redone = redoLocalScoreProject({
  project: undone,
  expectedRevision: 4,
  now: "2026-07-26T00:00:04.000Z",
});
assert.equal(
  getNote(redone, "note-1").fingering,
  3,
);
const changedAfterUndo = changeLocalScoreProjectEventFingering({
  project: undone,
  expectedRevision: 4,
  location,
  eventId: "note-1",
  fingering: 5,
  now: "2026-07-26T00:00:04.000Z",
});
assert.equal(changedAfterUndo.redoStack.length, 0);

const copied = copyLocalScoreProjectEvent({
  project: fingered,
  location,
  eventId: "note-1",
});
assert.deepEqual(copied, {
  type: "note",
  pitch: "C4",
  duration: "quarter",
  augmentationDots: 0,
  tieToNext: false,
  lyric: null,
  fingering: 3,
  chordSymbol: null,
  articulations: [],
});
const pasted = pasteLocalScoreProjectEvent({
  project: fingered,
  expectedRevision: 3,
  destination: location,
  eventId: "note-2",
  input: copied,
  now: "2026-07-26T00:00:03.000Z",
});
assert.equal(
  getNote(pasted, "note-2").fingering,
  3,
);

const serialized = serializeLocalScoreProject(pasted);
assert.deepEqual(parseLocalScoreProject(JSON.parse(serialized)), pasted);

const previousStorage = JSON.parse(serializeLocalScoreProject(undone)) as {
  schemaVersion: string;
  document: Record<string, unknown>;
  undoStack: Record<string, unknown>[];
  redoStack: Record<string, unknown>[];
};
previousStorage.schemaVersion = "local-score-project-storage-v7";
previousStorage.document.schemaVersion = "score-document-v6";
const removeFingerings = (content: Record<string, unknown>) => {
  const parts = content.parts as Array<{
    staves: Array<{
      voices: Array<{
        measures: Array<{ events: Array<Record<string, unknown>> }>;
      }>;
    }>;
  }>;
  for (const part of parts) for (const staff of part.staves) {
    for (const voice of staff.voices) for (const measure of voice.measures) {
      for (const event of measure.events) {
        delete event.fingering;
        delete event.articulations;
      }
    }
  }
};
removeFingerings(previousStorage.document);
for (const content of [
  ...previousStorage.undoStack,
  ...previousStorage.redoStack,
]) removeFingerings(content);
const migrationInput = JSON.stringify(previousStorage);
const migrated = parseLocalScoreProject(previousStorage);
assert.ok(migrated);
assert.equal(JSON.stringify(previousStorage), migrationInput);
assert.equal(migrated.schemaVersion, "local-score-project-storage-v10");
assert.equal(migrated.document.schemaVersion, "score-document-v9");
for (const content of [
  migrated.document,
  ...migrated.undoStack,
  ...migrated.redoStack,
]) {
  for (const part of content.parts) for (const staff of part.staves) {
    for (const voice of staff.voices) for (const measure of voice.measures) {
      for (const event of measure.events) {
        if (event.type === "note") assert.equal(event.fingering, null);
        else assert.equal(Object.hasOwn(event, "fingering"), false);
      }
    }
  }
}

console.log("local score project note fingering tests passed");
