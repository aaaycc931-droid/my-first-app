import assert from "node:assert/strict";

import {
  LocalScoreProjectConflictError,
  LocalScoreProjectDomainError,
  addLocalScoreProjectEvent,
  changeLocalScoreProjectEventDynamicMark,
  copyLocalScoreProjectEvent,
  createLocalScoreProject,
  parseLocalScoreProject,
  pasteLocalScoreProjectEvent,
  redoLocalScoreProject,
  serializeLocalScoreProject,
  undoLocalScoreProject,
  type LocalScoreProjectDynamicMarkV1,
} from "../lib/music/localScoreProject";
import { createLocalScoreProjectNumberedPresentation } from "../lib/music/localScoreProjectNumberedPresentation";
import { createLocalScoreProjectPlaybackPlan } from "../lib/music/localScoreProjectPlayback";
import { createLocalScoreProjectStaffPresentation } from "../lib/music/localScoreProjectStaffPresentation";

const location = {
  partId: "part-1",
  staffId: "staff-1",
  voiceId: "voice-1",
  measureNumber: 1,
} as const;

const getEvent = (
  project: ReturnType<typeof createLocalScoreProject>,
  eventId: string,
) => project.document.parts[0]!.staves[0]!.voices[0]!.measures[0]!
  .events.find((event) => event.id === eventId)!;

let project = createLocalScoreProject({
  projectId: "dynamic-mark",
  title: "力度记号",
  now: "2026-07-26T08:00:00.000Z",
});
assert.equal(project.schemaVersion, "local-score-project-storage-v13");
assert.equal(project.document.schemaVersion, "score-document-v12");

project = addLocalScoreProjectEvent({
  project,
  expectedRevision: 1,
  location,
  eventId: "note-1",
  input: { type: "note", pitch: "C4", duration: "quarter" },
  now: "2026-07-26T08:00:01.000Z",
});
project = addLocalScoreProjectEvent({
  project,
  expectedRevision: 2,
  location,
  eventId: "rest-1",
  input: { type: "rest", pitch: null, duration: "quarter" },
  now: "2026-07-26T08:00:02.000Z",
});
assert.equal(getEvent(project, "note-1").dynamicMark, null);
assert.equal(getEvent(project, "rest-1").dynamicMark, null);

const allowed = ["pp", "p", "mp", "mf", "f", "ff"] as const;
for (let index = 0; index < allowed.length; index += 1) {
  const dynamicMark = allowed[index]!;
  project = changeLocalScoreProjectEventDynamicMark({
    project,
    expectedRevision: project.document.revision,
    location,
    eventId: index % 2 === 0 ? "note-1" : "rest-1",
    dynamicMark,
    now: `2026-07-26T08:01:0${index}.000Z`,
  });
  assert.equal(
    getEvent(project, index % 2 === 0 ? "note-1" : "rest-1").dynamicMark,
    dynamicMark,
  );
}

const marked = changeLocalScoreProjectEventDynamicMark({
  project,
  expectedRevision: project.document.revision,
  location,
  eventId: "note-1",
  dynamicMark: "mf",
  now: "2026-07-26T08:02:00.000Z",
});
assert.strictEqual(changeLocalScoreProjectEventDynamicMark({
  project: marked,
  expectedRevision: marked.document.revision,
  location,
  eventId: "note-1",
  dynamicMark: "mf",
  now: "2026-07-26T08:02:01.000Z",
}), marked);

for (const invalid of ["", "fff", "MF", 1, undefined]) {
  assert.throws(
    () => changeLocalScoreProjectEventDynamicMark({
      project: marked,
      expectedRevision: marked.document.revision,
      location,
      eventId: "note-1",
      dynamicMark: invalid as LocalScoreProjectDynamicMarkV1,
      now: "2026-07-26T08:02:02.000Z",
    }),
    (error: unknown) =>
      error instanceof LocalScoreProjectDomainError
      && error.code === "invalid-input",
  );
}
assert.throws(() => changeLocalScoreProjectEventDynamicMark({
  project: marked,
  expectedRevision: marked.document.revision - 1,
  location,
  eventId: "note-1",
  dynamicMark: "f",
  now: "2026-07-26T08:02:03.000Z",
}), LocalScoreProjectConflictError);
assert.throws(() => changeLocalScoreProjectEventDynamicMark({
  project: marked,
  expectedRevision: marked.document.revision,
  location,
  eventId: "missing",
  dynamicMark: "f",
  now: "2026-07-26T08:02:03.000Z",
}), (error: unknown) =>
  error instanceof LocalScoreProjectDomainError && error.code === "not-found");
assert.throws(() => changeLocalScoreProjectEventDynamicMark({
  project: marked,
  expectedRevision: marked.document.revision,
  location,
  eventId: "note-1",
  dynamicMark: "f",
  now: "2026-07-26T08:01:59.000Z",
}), (error: unknown) =>
  error instanceof LocalScoreProjectDomainError
  && error.code === "clock-regression");

const undone = undoLocalScoreProject({
  project: marked,
  expectedRevision: marked.document.revision,
  now: "2026-07-26T08:03:00.000Z",
});
assert.equal(getEvent(undone, "note-1").dynamicMark, "f");
const redone = redoLocalScoreProject({
  project: undone,
  expectedRevision: undone.document.revision,
  now: "2026-07-26T08:03:01.000Z",
});
assert.equal(getEvent(redone, "note-1").dynamicMark, "mf");
const editedAfterUndo = changeLocalScoreProjectEventDynamicMark({
  project: undone,
  expectedRevision: undone.document.revision,
  location,
  eventId: "note-1",
  dynamicMark: "p",
  now: "2026-07-26T08:03:00.500Z",
});
assert.equal(editedAfterUndo.redoStack.length, 0);
assert.strictEqual(redoLocalScoreProject({
  project: editedAfterUndo,
  expectedRevision: editedAfterUndo.document.revision,
  now: "2026-07-26T08:03:00.750Z",
}), editedAfterUndo);

const copied = copyLocalScoreProjectEvent({
  project: marked,
  location,
  eventId: "note-1",
});
assert.equal(copied.dynamicMark, "mf");
const pasted = pasteLocalScoreProjectEvent({
  project: marked,
  expectedRevision: marked.document.revision,
  destination: location,
  eventId: "note-2",
  input: copied,
  now: "2026-07-26T08:04:00.000Z",
});
assert.equal(getEvent(pasted, "note-2").dynamicMark, "mf");

const staff = createLocalScoreProjectStaffPresentation(marked.document);
assert.equal(staff.status, "ready");
if (staff.status === "ready") {
  assert.equal(staff.tokens[0]?.dynamicMark, "mf");
  assert.match(staff.tokens[0]?.accessibleLabel ?? "", /力度记号 中强（mf）/);
}
const numbered = createLocalScoreProjectNumberedPresentation(marked.document);
assert.equal(numbered.status, "ready");
if (numbered.status === "ready") {
  assert.equal(numbered.tokens[0]?.dynamicMark, "mf");
  assert.match(numbered.tokens[0]?.accessibleLabel ?? "", /力度记号 中强（mf）/);
}

const withoutMark = changeLocalScoreProjectEventDynamicMark({
  project: marked,
  expectedRevision: marked.document.revision,
  location,
  eventId: "note-1",
  dynamicMark: null,
  now: "2026-07-26T08:05:00.000Z",
});
const withPlan = createLocalScoreProjectPlaybackPlan({
  document: marked.document,
  bpm: marked.tempoBpm,
});
const withoutPlan = createLocalScoreProjectPlaybackPlan({
  document: withoutMark.document,
  bpm: withoutMark.tempoBpm,
});
assert.equal(withPlan.status, "ready");
assert.equal(withoutPlan.status, "ready");
if (withPlan.status === "ready" && withoutPlan.status === "ready") {
  assert.deepEqual(
    {
      durationMs: withPlan.durationMs,
      events: withPlan.events.map((event) =>
        event.type === "all-notes-off"
          ? event
          : {
            type: event.type,
            delayMs: event.delayMs,
            midi: event.midi,
            sourceEventId: event.sourceEventId,
          }),
      spans: withPlan.spans,
      warnings: withPlan.warnings,
    },
    {
      durationMs: withoutPlan.durationMs,
      events: withoutPlan.events.map((event) =>
        event.type === "all-notes-off"
          ? event
          : {
            type: event.type,
            delayMs: event.delayMs,
            midi: event.midi,
            sourceEventId: event.sourceEventId,
          }),
      spans: withoutPlan.spans,
      warnings: withoutPlan.warnings,
    },
  );
}

const serialized = serializeLocalScoreProject(marked);
assert.equal(parseLocalScoreProject(JSON.parse(serialized))?.document.parts[0]!
  .staves[0]!.voices[0]!.measures[0]!.events[0]!.dynamicMark, "mf");
const storageV10 = JSON.parse(serialized) as Record<string, unknown> & {
  document: Record<string, unknown>;
  undoStack: unknown[];
  redoStack: unknown[];
};
storageV10.schemaVersion = "local-score-project-storage-v10";
storageV10.document.schemaVersion = "score-document-v9";
const removeDynamicMarks = (value: unknown) => {
  const content = value as {
    parts: Array<{ staves: Array<{ voices: Array<{
      measures: Array<{ events: Array<Record<string, unknown>> }>;
    }> }> }>;
  };
  for (const part of content.parts) for (const staffValue of part.staves) {
    for (const voice of staffValue.voices) for (const measure of voice.measures) {
      for (const event of measure.events) delete event.dynamicMark;
    }
  }
};
removeDynamicMarks(storageV10.document);
storageV10.undoStack.forEach(removeDynamicMarks);
storageV10.redoStack.forEach(removeDynamicMarks);
const beforeMigration = JSON.stringify(storageV10);
const migrated = parseLocalScoreProject(storageV10);
assert.ok(migrated);
assert.equal(JSON.stringify(storageV10), beforeMigration);
assert.equal(migrated.schemaVersion, "local-score-project-storage-v13");
assert.equal(migrated.document.schemaVersion, "score-document-v12");
assert.equal(getEvent(migrated, "note-1").dynamicMark, null);

const directV9Document = JSON.parse(JSON.stringify(marked.document)) as Record<
  string,
  unknown
> & {
  parts: Array<{ staves: Array<{ voices: Array<{
    measures: Array<{ events: Array<Record<string, unknown>> }>;
  }> }> }>;
};
directV9Document.schemaVersion = "score-document-v9";
removeDynamicMarks(directV9Document);
const directV9Note = directV9Document.parts[0]!.staves[0]!.voices[0]!
  .measures[0]!.events[0]!;
directV9Note.fingering = 3;
directV9Note.chordSymbol = "C";
directV9Note.articulations = ["accent"];
const directV9Staff = createLocalScoreProjectStaffPresentation(
  directV9Document as never,
);
assert.equal(directV9Staff.status, "ready");
if (directV9Staff.status === "ready") {
  const token = directV9Staff.tokens[0]!;
  assert.equal(token.type, "note");
  if (token.type === "note") {
    assert.equal(token.fingering, 3);
    assert.equal(token.chordSymbol, "C");
    assert.deepEqual(token.articulations, ["accent"]);
    assert.equal(token.dynamicMark, null);
  }
}
const directV9Numbered = createLocalScoreProjectNumberedPresentation(
  directV9Document as never,
);
assert.equal(directV9Numbered.status, "ready");
if (directV9Numbered.status === "ready") {
  const token = directV9Numbered.tokens[0]!;
  assert.equal(token.type, "note");
  if (token.type === "note") {
    assert.equal(token.fingering, 3);
    assert.equal(token.chordSymbol, "C");
    assert.deepEqual(token.articulations, ["accent"]);
    assert.equal(token.dynamicMark, null);
  }
}
assert.equal(createLocalScoreProjectPlaybackPlan({
  document: directV9Document as never,
  bpm: marked.tempoBpm,
}).status, "ready");

const invalidCurrent = JSON.parse(serialized) as typeof storageV10;
delete (
  invalidCurrent.document.parts as Array<{ staves: Array<{ voices: Array<{
    measures: Array<{ events: Array<Record<string, unknown>> }>;
  }> }> }>
)[0]!.staves[0]!.voices[0]!.measures[0]!.events[0]!.dynamicMark;
assert.equal(parseLocalScoreProject(invalidCurrent), null);

console.log("local score project dynamic mark tests passed");
