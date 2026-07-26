import assert from "node:assert/strict";

import {
  LocalScoreProjectConflictError,
  LocalScoreProjectDomainError,
  addLocalScoreProjectEvent,
  changeLocalScoreProjectEventArticulations,
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
import type {
  LocalScoreProjectArticulationV1,
} from "../lib/music/scoreDocument";

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
const getNote = (
  project: ReturnType<typeof createLocalScoreProject>,
  eventId: string,
) => {
  const event = getEvent(project, eventId);
  if (event.type !== "note") throw new Error(`expected note ${eventId}`);
  return event;
};

const created = createLocalScoreProject({
  projectId: "note-articulations",
  title: "单音演奏法",
  now: "2026-07-26T02:00:00.000Z",
});
assert.equal(created.schemaVersion, "local-score-project-storage-v11");
assert.equal(created.document.schemaVersion, "score-document-v10");

const withNote = addLocalScoreProjectEvent({
  project: created,
  expectedRevision: 1,
  location,
  eventId: "note-1",
  input: { type: "note", pitch: "C4", duration: "quarter" },
  now: "2026-07-26T02:00:01.000Z",
});
const withNoteAndRest = addLocalScoreProjectEvent({
  project: withNote,
  expectedRevision: 2,
  location,
  eventId: "rest-1",
  input: { type: "rest", pitch: null, duration: "quarter" },
  now: "2026-07-26T02:00:02.000Z",
});
assert.deepEqual(getNote(withNoteAndRest, "note-1").articulations, []);
assert.equal("articulations" in getEvent(withNoteAndRest, "rest-1"), false);

for (const articulation of [
  "accent",
  "staccato",
  "tenuto",
] as const) {
  const singlyMarked = changeLocalScoreProjectEventArticulations({
    project: withNoteAndRest,
    expectedRevision: 3,
    location,
    eventId: "note-1",
    articulations: [articulation],
    now: "2026-07-26T02:00:03.000Z",
  });
  assert.deepEqual(getNote(singlyMarked, "note-1").articulations, [articulation]);
}

const marked = changeLocalScoreProjectEventArticulations({
  project: withNoteAndRest,
  expectedRevision: 3,
  location,
  eventId: "note-1",
  articulations: ["tenuto", "accent", "staccato", "accent"],
  now: "2026-07-26T02:00:03.000Z",
});
assert.deepEqual(
  getNote(marked, "note-1").articulations,
  ["accent", "staccato", "tenuto"],
);
assert.equal(marked.document.revision, 4);

const normalizedNoOp = changeLocalScoreProjectEventArticulations({
  project: marked,
  expectedRevision: 4,
  location,
  eventId: "note-1",
  articulations: ["tenuto", "accent", "accent", "staccato"],
  now: "2026-07-26T02:00:04.000Z",
});
assert.equal(normalizedNoOp, marked);

for (const invalid of [
  ["accent", "unknown"],
  "accent",
  null,
  {},
  1,
]) {
  assert.throws(
    () => changeLocalScoreProjectEventArticulations({
      project: marked,
      expectedRevision: 4,
      location,
      eventId: "note-1",
      articulations:
        invalid as unknown as readonly LocalScoreProjectArticulationV1[],
      now: "2026-07-26T02:00:04.000Z",
    }),
    (error) =>
      error instanceof LocalScoreProjectDomainError
      && error.code === "invalid-input",
  );
  assert.deepEqual(
    getNote(marked, "note-1").articulations,
    ["accent", "staccato", "tenuto"],
  );
}

assert.throws(
  () => changeLocalScoreProjectEventArticulations({
    project: marked,
    expectedRevision: 4,
    location,
    eventId: "rest-1",
    articulations: ["accent"],
    now: "2026-07-26T02:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "invalid-input",
);
assert.throws(
  () => changeLocalScoreProjectEventArticulations({
    project: marked,
    expectedRevision: 3,
    location,
    eventId: "note-1",
    articulations: [],
    now: "2026-07-26T02:00:04.000Z",
  }),
  LocalScoreProjectConflictError,
);
assert.throws(
  () => changeLocalScoreProjectEventArticulations({
    project: marked,
    expectedRevision: 4,
    location,
    eventId: "note-1",
    articulations: [],
    now: "2026-07-26T02:00:00.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "clock-regression",
);
assert.throws(
  () => changeLocalScoreProjectEventArticulations({
    project: marked,
    expectedRevision: 4,
    location,
    eventId: "missing-event",
    articulations: [],
    now: "2026-07-26T02:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-found",
);

const cleared = changeLocalScoreProjectEventArticulations({
  project: marked,
  expectedRevision: 4,
  location,
  eventId: "note-1",
  articulations: [],
  now: "2026-07-26T02:00:04.000Z",
});
assert.deepEqual(getNote(cleared, "note-1").articulations, []);
assert.equal(cleared.document.revision, 5);

const undone = undoLocalScoreProject({
  project: marked,
  expectedRevision: 4,
  now: "2026-07-26T02:00:04.000Z",
});
assert.deepEqual(getNote(undone, "note-1").articulations, []);
const redone = redoLocalScoreProject({
  project: undone,
  expectedRevision: 5,
  now: "2026-07-26T02:00:05.000Z",
});
assert.deepEqual(
  getNote(redone, "note-1").articulations,
  ["accent", "staccato", "tenuto"],
);
const changedAfterUndo = changeLocalScoreProjectEventArticulations({
  project: undone,
  expectedRevision: 5,
  location,
  eventId: "note-1",
  articulations: ["tenuto"],
  now: "2026-07-26T02:00:05.000Z",
});
assert.equal(changedAfterUndo.redoStack.length, 0);

const copied = copyLocalScoreProjectEvent({
  project: marked,
  location,
  eventId: "note-1",
});
assert.deepEqual(
  copied.articulations,
  ["accent", "staccato", "tenuto"],
);
assert.notEqual(copied.articulations, getNote(marked, "note-1").articulations);
const pasted = pasteLocalScoreProjectEvent({
  project: marked,
  expectedRevision: 4,
  destination: location,
  eventId: "note-2",
  input: copied,
  now: "2026-07-26T02:00:04.000Z",
});
assert.deepEqual(
  getNote(pasted, "note-2").articulations,
  ["accent", "staccato", "tenuto"],
);
assert.notEqual(
  getNote(pasted, "note-2").articulations,
  copied.articulations,
);
assert.notEqual(
  getNote(pasted, "note-2").articulations,
  getNote(pasted, "note-1").articulations,
);

const serialized = serializeLocalScoreProject(pasted);
assert.deepEqual(parseLocalScoreProject(JSON.parse(serialized)), pasted);

const staff = createLocalScoreProjectStaffPresentation(marked.document);
if (staff.status !== "ready") throw new Error(staff.reason);
const staffToken = staff.tokens.find((token) => token.eventId === "note-1");
assert.equal(staffToken?.type, "note");
if (!staffToken || staffToken.type !== "note") throw new Error("expected note");
assert.deepEqual(
  staffToken.articulations,
  ["accent", "staccato", "tenuto"],
);
assert.match(staffToken.accessibleLabel, /重音/);
assert.match(staffToken.accessibleLabel, /断奏/);
assert.match(staffToken.accessibleLabel, /保持/);

const numbered =
  createLocalScoreProjectNumberedPresentation(marked.document);
if (numbered.status !== "ready") throw new Error(numbered.reason);
const numberedToken = numbered.tokens.find(
  (token) => token.eventId === "note-1",
);
assert.equal(numberedToken?.type, "note");
if (!numberedToken || numberedToken.type !== "note") {
  throw new Error("expected numbered note");
}
assert.deepEqual(
  numberedToken.articulations,
  ["accent", "staccato", "tenuto"],
);
assert.match(numberedToken.accessibleLabel, /重音/);
assert.match(numberedToken.accessibleLabel, /断奏/);
assert.match(numberedToken.accessibleLabel, /保持/);

const playbackWithoutArticulations = createLocalScoreProjectPlaybackPlan({
  document: withNoteAndRest.document,
  bpm: 120,
});
const playbackWithArticulations = createLocalScoreProjectPlaybackPlan({
  document: marked.document,
  bpm: 120,
});
assert.equal(playbackWithoutArticulations.status, "ready");
assert.equal(playbackWithArticulations.status, "ready");
if (
  playbackWithoutArticulations.status !== "ready"
  || playbackWithArticulations.status !== "ready"
) throw new Error("expected playable documents");
const playbackMusicSemantics = (
  plan: typeof playbackWithArticulations,
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
  playbackMusicSemantics(playbackWithArticulations),
  playbackMusicSemantics(playbackWithoutArticulations),
);
assert.notEqual(
  playbackWithArticulations.scheduleId,
  playbackWithoutArticulations.scheduleId,
);
const pointerIds = (plan: typeof playbackWithArticulations) => {
  if (plan.status !== "ready") throw new Error("expected ready playback");
  return plan.events.flatMap((event) =>
    event.type === "all-notes-off" ? [] : [event.pointerId]);
};
assert.notDeepEqual(
  pointerIds(playbackWithArticulations),
  pointerIds(playbackWithoutArticulations),
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
    for (const part of content.parts) for (const staffValue of part.staves) {
      for (const voice of staffValue.voices) {
        for (const measure of voice.measures) {
          for (const event of measure.events) visit(event);
        }
      }
    }
  }
};

for (const mutate of [
  (fixture: JsonProject) => {
    const event = fixture.document.parts[0]!.staves[0]!.voices[0]!
      .measures[0]!.events[0]!;
    event.articulations = ["staccato", "accent"];
  },
  (fixture: JsonProject) => {
    const event = fixture.document.parts[0]!.staves[0]!.voices[0]!
      .measures[0]!.events[0]!;
    event.articulations = ["accent", "accent"];
  },
  (fixture: JsonProject) => {
    const event = fixture.document.parts[0]!.staves[0]!.voices[0]!
      .measures[0]!.events[0]!;
    event.articulations = ["marcato"];
  },
  (fixture: JsonProject) => {
    const event = fixture.document.parts[0]!.staves[0]!.voices[0]!
      .measures[0]!.events[1]!;
    event.articulations = ["accent"];
  },
]) {
  const fixture = JSON.parse(serializeLocalScoreProject(marked)) as JsonProject;
  mutate(fixture);
  assert.equal(
    parseLocalScoreProject(fixture),
    null,
    "current storage must strictly reject non-canonical articulation data",
  );
}

const legacyHistorySource = undoLocalScoreProject({
  project: marked,
  expectedRevision: 4,
  now: "2026-07-26T02:00:04.000Z",
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
  "score-document-v8",
] as const;

for (let version = 1; version <= 9; version += 1) {
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
    if (version <= 8) delete event.chordSymbol;
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
  assert.equal(migrated.schemaVersion, "local-score-project-storage-v11");
  assert.equal(migrated.document.schemaVersion, "score-document-v10");
  for (const content of [
    migrated.document,
    ...migrated.undoStack,
    ...migrated.redoStack,
  ]) {
    for (const part of content.parts) for (const staffValue of part.staves) {
      for (const voice of staffValue.voices) {
        for (const measure of voice.measures) {
          for (const event of measure.events) {
            if (event.type === "note") {
              assert.deepEqual(
                event.articulations,
                [],
                `storage v${version} history note`,
              );
            } else {
              assert.equal("articulations" in event, false);
            }
          }
        }
      }
    }
  }
}

console.log("local score project note articulation tests passed");
