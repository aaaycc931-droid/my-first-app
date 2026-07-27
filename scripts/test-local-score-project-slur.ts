import assert from "node:assert/strict";

import {
  LocalScoreProjectConflictError,
  LocalScoreProjectDomainError,
  addLocalScoreProjectEvent,
  appendLocalScoreProjectMeasure,
  changeLocalScoreProjectEventSlur,
  copyLocalScoreProjectEvent,
  createLocalScoreProject,
  deleteLocalScoreProjectEvent,
  deserializeLocalScoreProject,
  moveLocalScoreProjectEvent,
  parseLocalScoreProject,
  pasteLocalScoreProjectEvent,
  redoLocalScoreProject,
  serializeLocalScoreProject,
  undoLocalScoreProject,
  type LocalScoreProjectEventLocation,
  type LocalScoreProjectV1,
} from "../lib/music/localScoreProject.js";
import {
  createLocalScoreProjectPlaybackPlan,
} from "../lib/music/localScoreProjectPlayback.js";

const location: LocalScoreProjectEventLocation = {
  partId: "part-1",
  staffId: "staff-1",
  voiceId: "voice-1",
  measureNumber: 1,
};

const eventAt = (project: LocalScoreProjectV1, eventId: string) =>
  project.document.parts[0]!.staves[0]!.voices[0]!.measures[0]!
    .events.find((event) => event.id === eventId);
const noteAt = (project: LocalScoreProjectV1, eventId: string) => {
  const event = eventAt(project, eventId);
  assert.equal(event?.type, "note");
  if (!event || event.type !== "note") throw new Error("expected note");
  return event;
};

const expectDomainCode = (
  action: () => unknown,
  code: LocalScoreProjectDomainError["code"],
) => assert.throws(
  action,
  (error: unknown) =>
    error instanceof LocalScoreProjectDomainError && error.code === code,
);

let project = createLocalScoreProject({
  projectId: "slur-core",
  title: "圆滑线核心",
  now: "2026-07-27T01:00:00.000Z",
});
project = addLocalScoreProjectEvent({
  project,
  expectedRevision: project.document.revision,
  location,
  eventId: "note-1",
  input: { type: "note", pitch: "C4", duration: "quarter" },
  now: "2026-07-27T01:00:01.000Z",
});
project = addLocalScoreProjectEvent({
  project,
  expectedRevision: project.document.revision,
  location,
  eventId: "note-2",
  input: { type: "note", pitch: "D4", duration: "quarter" },
  now: "2026-07-27T01:00:02.000Z",
});
project = addLocalScoreProjectEvent({
  project,
  expectedRevision: project.document.revision,
  location,
  eventId: "rest-1",
  input: { type: "rest", pitch: null, duration: "quarter" },
  now: "2026-07-27T01:00:03.000Z",
});

assert.equal(project.schemaVersion, "local-score-project-storage-v14");
assert.equal(project.document.schemaVersion, "score-document-v13");
assert.equal(noteAt(project, "note-1").slurToNext, false);
assert.equal("slurToNext" in eventAt(project, "rest-1")!, false);

const beforeSlurRevision = project.document.revision;
project = changeLocalScoreProjectEventSlur({
  project,
  expectedRevision: beforeSlurRevision,
  location,
  eventId: "note-1",
  slurToNext: true,
  now: "2026-07-27T01:00:04.000Z",
});
assert.equal(project.document.revision, beforeSlurRevision + 1);
assert.equal(noteAt(project, "note-1").slurToNext, true);

const unchanged = changeLocalScoreProjectEventSlur({
  project,
  expectedRevision: project.document.revision,
  location,
  eventId: "note-1",
  slurToNext: true,
  now: "2026-07-27T01:00:05.000Z",
});
assert.equal(unchanged, project, "相同圆滑线状态必须保持 no-op");
assert.throws(
  () => changeLocalScoreProjectEventSlur({
    project,
    expectedRevision: project.document.revision - 1,
    location,
    eventId: "note-1",
    slurToNext: false,
    now: "2026-07-27T01:00:05.000Z",
  }),
  LocalScoreProjectConflictError,
);
expectDomainCode(
  () => changeLocalScoreProjectEventSlur({
    project,
    expectedRevision: project.document.revision,
    location,
    eventId: "rest-1",
    slurToNext: true,
    now: "2026-07-27T01:00:05.000Z",
  }),
  "invalid-input",
);
expectDomainCode(
  () => changeLocalScoreProjectEventSlur({
    project,
    expectedRevision: project.document.revision,
    location,
    eventId: "note-2",
    slurToNext: true,
    now: "2026-07-27T01:00:05.000Z",
  }),
  "slur-integrity",
);

let gapProject = createLocalScoreProject({
  projectId: "slur-gap",
  title: "圆滑线时值间隙",
  now: "2026-07-27T01:10:00.000Z",
});
gapProject = appendLocalScoreProjectMeasure({
  project: gapProject,
  expectedRevision: gapProject.document.revision,
  partId: location.partId,
  staffId: location.staffId,
  voiceId: location.voiceId,
  now: "2026-07-27T01:10:01.000Z",
});
gapProject = addLocalScoreProjectEvent({
  project: gapProject,
  expectedRevision: gapProject.document.revision,
  location,
  eventId: "gap-source",
  input: { type: "note", pitch: "C4", duration: "half" },
  now: "2026-07-27T01:10:02.000Z",
});
gapProject = addLocalScoreProjectEvent({
  project: gapProject,
  expectedRevision: gapProject.document.revision,
  location: { ...location, measureNumber: 2 },
  eventId: "gap-target",
  input: { type: "note", pitch: "D4", duration: "quarter" },
  now: "2026-07-27T01:10:03.000Z",
});
expectDomainCode(
  () => changeLocalScoreProjectEventSlur({
    project: gapProject,
    expectedRevision: gapProject.document.revision,
    location,
    eventId: "gap-source",
    slurToNext: true,
    now: "2026-07-27T01:10:04.000Z",
  }),
  "slur-integrity",
);

for (const eventId of ["note-1", "note-2"]) {
  expectDomainCode(
    () => moveLocalScoreProjectEvent({
      project,
      expectedRevision: project.document.revision,
      source: location,
      destination: location,
      eventId,
      targetIndex: 2,
      now: "2026-07-27T01:00:05.000Z",
    }),
    "slur-integrity",
  );
  expectDomainCode(
    () => deleteLocalScoreProjectEvent({
      project,
      expectedRevision: project.document.revision,
      location,
      eventId,
      now: "2026-07-27T01:00:05.000Z",
    }),
    "slur-integrity",
  );
}

expectDomainCode(
  () => pasteLocalScoreProjectEvent({
    project,
    expectedRevision: project.document.revision,
    destination: location,
    targetIndex: 1,
    eventId: "blocking-rest",
    input: { type: "rest", pitch: null, duration: "quarter" },
    now: "2026-07-27T01:00:05.000Z",
  }),
  "slur-integrity",
);
assert.equal(eventAt(project, "blocking-rest"), undefined);

const copied = copyLocalScoreProjectEvent({
  project,
  location,
  eventId: "note-1",
});
assert.equal(copied.type, "note");
assert.equal(copied.slurToNext, false);
const pasted = pasteLocalScoreProjectEvent({
  project,
  expectedRevision: project.document.revision,
  destination: location,
  eventId: "note-copy",
  input: copied,
  now: "2026-07-27T01:00:06.000Z",
});
assert.equal(noteAt(pasted, "note-copy").slurToNext, false);

const undone = undoLocalScoreProject({
  project: pasted,
  expectedRevision: pasted.document.revision,
  now: "2026-07-27T01:00:07.000Z",
});
assert.equal(eventAt(undone, "note-copy"), undefined);
assert.equal(noteAt(undone, "note-1").slurToNext, true);
const redone = redoLocalScoreProject({
  project: undone,
  expectedRevision: undone.document.revision,
  now: "2026-07-27T01:00:08.000Z",
});
assert.equal(eventAt(redone, "note-copy")?.type, "note");

const serialized = serializeLocalScoreProject(project);
assert.deepEqual(deserializeLocalScoreProject(serialized), project);

const missingCurrentSlur = JSON.parse(serialized) as Record<string, unknown>;
const currentDocument = missingCurrentSlur.document as Record<string, unknown>;
const currentParts = currentDocument.parts as Array<Record<string, unknown>>;
const currentEvents = (
  (
    (
      currentParts[0]!.staves as Array<Record<string, unknown>>
    )[0]!.voices as Array<Record<string, unknown>>
  )[0]!.measures as Array<Record<string, unknown>>
)[0]!.events as Array<Record<string, unknown>>;
delete currentEvents[0]!.slurToNext;
assert.equal(parseLocalScoreProject(missingCurrentSlur), null);

const legacyV13 = JSON.parse(serialized) as Record<string, unknown>;
legacyV13.schemaVersion = "local-score-project-storage-v13";
const legacyDocument = legacyV13.document as Record<string, unknown>;
legacyDocument.schemaVersion = "score-document-v12";
const stripSlurs = (content: Record<string, unknown>) => {
  for (const part of content.parts as Array<Record<string, unknown>>) {
    for (const staff of part.staves as Array<Record<string, unknown>>) {
      for (const voice of staff.voices as Array<Record<string, unknown>>) {
        for (const measure of voice.measures as Array<Record<string, unknown>>) {
          for (const event of measure.events as Array<Record<string, unknown>>) {
            delete event.slurToNext;
          }
        }
      }
    }
  }
};
stripSlurs(legacyDocument);
for (const content of legacyV13.undoStack as Array<Record<string, unknown>>) {
  stripSlurs(content);
}
for (const content of legacyV13.redoStack as Array<Record<string, unknown>>) {
  stripSlurs(content);
}
const legacyBefore = JSON.stringify(legacyV13);
const migrated = parseLocalScoreProject(legacyV13);
assert.ok(migrated);
assert.equal(JSON.stringify(legacyV13), legacyBefore, "旧版本读取迁移不得改写输入");
assert.equal(migrated.schemaVersion, "local-score-project-storage-v14");
assert.equal(migrated.document.schemaVersion, "score-document-v13");
assert.equal(noteAt(migrated, "note-1").slurToNext, false);

const invalidEndpoint = JSON.parse(serialized) as Record<string, unknown>;
const invalidDocument = invalidEndpoint.document as Record<string, unknown>;
const invalidEvents = (
  (
    (
      (invalidDocument.parts as Array<Record<string, unknown>>)[0]!
        .staves as Array<Record<string, unknown>>
    )[0]!.voices as Array<Record<string, unknown>>
  )[0]!.measures as Array<Record<string, unknown>>
)[0]!.events as Array<Record<string, unknown>>;
invalidEvents[1]!.slurToNext = true;
assert.equal(parseLocalScoreProject(invalidEndpoint), null);

const plainRaw = JSON.parse(serialized) as Record<string, unknown>;
const plainDocument = plainRaw.document as Record<string, unknown>;
const plainEvents = (
  (
    (
      (plainDocument.parts as Array<Record<string, unknown>>)[0]!
        .staves as Array<Record<string, unknown>>
    )[0]!.voices as Array<Record<string, unknown>>
  )[0]!.measures as Array<Record<string, unknown>>
)[0]!.events as Array<Record<string, unknown>>;
plainEvents[0]!.slurToNext = false;
const plain = parseLocalScoreProject(plainRaw);
assert.ok(plain);
const slurredPlan = createLocalScoreProjectPlaybackPlan({
  document: project.document,
  bpm: project.tempoBpm,
});
const plainPlan = createLocalScoreProjectPlaybackPlan({
  document: plain.document,
  bpm: plain.tempoBpm,
});
assert.deepEqual(slurredPlan, plainPlan, "圆滑线不得改变 core-only 播放计划");

console.log("local-score-project slur core tests passed");
