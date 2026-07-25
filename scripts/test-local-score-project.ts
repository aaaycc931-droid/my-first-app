import assert from "node:assert/strict";

import {
  LOCAL_SCORE_PROJECT_MAX_HISTORY,
  LocalScoreProjectConflictError,
  LocalScoreProjectDomainError,
  addLocalScoreProjectEvent,
  appendLocalScoreProjectMeasure,
  applyLocalScoreProjectContent,
  changeLocalScoreProjectMeter,
  changeLocalScoreProjectTempo,
  copyLocalScoreProjectEvent,
  createLocalScoreProject,
  deleteEmptyLocalScoreProjectMeasure,
  deleteLocalScoreProjectEvent,
  deserializeLocalScoreProject,
  getLocalScoreProjectContent,
  moveLocalScoreProjectEvent,
  pasteLocalScoreProjectEvent,
  parseLocalScoreProject,
  redoLocalScoreProject,
  renameLocalScoreProject,
  serializeLocalScoreProject,
  undoLocalScoreProject,
  updateLocalScoreProjectEvent,
} from "../lib/music/localScoreProject";
import type { LocalNotationProjectScoreDocumentV1 } from "../lib/music/scoreDocument";

const createdAt = "2026-07-24T00:00:00.000Z";
const project = createLocalScoreProject({
  projectId: "project-1",
  title: "  第一份谱  ",
  now: createdAt,
});
assert.equal(project.title, "第一份谱");
assert.equal(project.schemaVersion, "local-score-project-storage-v2");
assert.equal(project.tempoBpm, 90);
assert.equal(project.document.schemaVersion, "score-document-v1");
assert.equal(project.document.documentKind, "notation-project");
assert.equal(project.document.documentId, "local.score-project.project-1");
assert.equal(project.document.revision, 1);
assert.equal(project.document.sessionOnly, false);
assert.throws(
  () => createLocalScoreProject({
    projectId: "invalid-date",
    title: "日期错误",
    now: "2026-07-24",
  }),
  /时间/,
);

const firstContent = getLocalScoreProjectContent(project);
const contentWithNote = {
  ...firstContent,
  parts: [{
    ...firstContent.parts[0],
    staves: [{
      ...firstContent.parts[0].staves[0],
      voices: [{
        ...firstContent.parts[0].staves[0].voices[0],
        measures: [{
          measureNumber: 1,
          events: [{
            id: "note-1",
            type: "note" as const,
            pitch: "C4" as const,
            duration: "quarter" as const,
            measure: 1 as const,
          }],
        }],
      }],
    }],
  }],
};
const edited = applyLocalScoreProjectContent({
  project,
  expectedRevision: 1,
  content: contentWithNote,
  now: "2026-07-24T00:00:01.000Z",
});
assert.equal(edited.document.revision, 2);
assert.equal(edited.document.documentId, project.document.documentId);
assert.equal(edited.undoStack.length, 1);
assert.equal(edited.redoStack.length, 0);
assert.equal(project.document.parts[0].staves[0].voices[0].measures[0].events.length, 0);

assert.throws(
  () => applyLocalScoreProjectContent({
    project: edited,
    expectedRevision: 1,
    content: firstContent,
    now: "2026-07-24T00:00:02.000Z",
  }),
  LocalScoreProjectConflictError,
);

const undone = undoLocalScoreProject({
  project: edited,
  expectedRevision: 2,
  now: "2026-07-24T00:00:02.000Z",
});
assert.equal(undone.document.revision, 3);
assert.deepEqual(getLocalScoreProjectContent(undone), firstContent);
assert.equal(undone.redoStack.length, 1);

const redone = redoLocalScoreProject({
  project: undone,
  expectedRevision: 3,
  now: "2026-07-24T00:00:03.000Z",
});
assert.equal(redone.document.revision, 4);
assert.deepEqual(getLocalScoreProjectContent(redone), contentWithNote);
assert.equal(redone.redoStack.length, 0);

const noUndo = undoLocalScoreProject({
  project,
  expectedRevision: 1,
  now: "2026-07-24T00:00:01.000Z",
});
assert.equal(noUndo, project);
const noChange = applyLocalScoreProjectContent({
  project,
  expectedRevision: 1,
  content: firstContent,
  now: "2026-07-24T00:00:01.000Z",
});
assert.equal(noChange, project);

const multiStaffContent = {
  meter: "4/4" as const,
  parts: [
    {
      partId: "right-hand",
      staves: [{
        staffId: "staff-right",
        staffKind: "pitched" as const,
        clef: "treble" as const,
        voices: [
          {
            voiceId: "voice-right-1",
            measures: [{
              measureNumber: 1,
              events: [{
                id: "right-note-1",
                type: "note" as const,
                pitch: "C5" as const,
                duration: "half" as const,
                measure: 1 as const,
              }],
            }],
          },
          {
            voiceId: "voice-right-2",
            measures: [{
              measureNumber: 1,
              events: [{
                id: "right-rest-1",
                type: "rest" as const,
                pitch: null,
                duration: "quarter" as const,
                measure: 1 as const,
              }],
            }],
          },
        ],
      }],
    },
    {
      partId: "second-part",
      staves: [{
        staffId: "staff-second",
        staffKind: "pitched" as const,
        clef: "treble" as const,
        voices: [{
          voiceId: "voice-second-1",
          measures: [{
            measureNumber: 2,
            events: [{
              id: "second-note-1",
              type: "note" as const,
              pitch: "G4" as const,
              duration: "quarter" as const,
              measure: 2 as const,
            }],
          }],
        }],
      }],
    },
  ],
};
const multiStaff = applyLocalScoreProjectContent({
  project,
  expectedRevision: 1,
  content: multiStaffContent,
  now: "2026-07-24T00:00:01.000Z",
});
const serialized = serializeLocalScoreProject(multiStaff);
assert.equal(serializeLocalScoreProject(multiStaff), serialized);
assert.deepEqual(deserializeLocalScoreProject(serialized), multiStaff);
assert.equal(
  multiStaff.document.parts[0].staves[0].voices.length,
  2,
);
assert.equal(multiStaff.document.parts.length, 2);

const duplicateEvent = JSON.parse(serialized) as {
  document: LocalNotationProjectScoreDocumentV1;
};
const firstEvent =
  duplicateEvent.document.parts[0].staves[0].voices[0].measures[0].events[0];
(duplicateEvent.document.parts[0].staves[0].voices[1].measures[0].events as unknown[])
  .push({ ...firstEvent });
assert.equal(parseLocalScoreProject(duplicateEvent), null);

const legacySchema = JSON.parse(serialized) as {
  schemaVersion: string;
  tempoBpm?: number;
};
legacySchema.schemaVersion = "local-score-project-storage-v1";
delete legacySchema.tempoBpm;
const legacyBefore = JSON.stringify(legacySchema);
const migratedLegacy = parseLocalScoreProject(legacySchema);
assert.equal(migratedLegacy?.schemaVersion, "local-score-project-storage-v2");
assert.equal(migratedLegacy?.tempoBpm, 90);
assert.equal(migratedLegacy?.projectId, multiStaff.projectId);
assert.equal(migratedLegacy?.createdAt, multiStaff.createdAt);
assert.equal(migratedLegacy?.updatedAt, multiStaff.updatedAt);
assert.equal(
  migratedLegacy?.document.revision,
  multiStaff.document.revision,
);
assert.deepEqual(migratedLegacy?.undoStack, multiStaff.undoStack);
assert.deepEqual(migratedLegacy?.redoStack, multiStaff.redoStack);
assert.equal(JSON.stringify(legacySchema), legacyBefore, "读取旧版不得原地修改");
assert.equal(
  deserializeLocalScoreProject(legacyBefore)?.tempoBpm,
  90,
);
assert.match(
  serializeLocalScoreProject(migratedLegacy!),
  /local-score-project-storage-v2/,
);

const missingTempo = JSON.parse(serialized) as { tempoBpm?: number };
delete missingTempo.tempoBpm;
assert.equal(parseLocalScoreProject(missingTempo), null);

const futureSchema = JSON.parse(serialized) as { schemaVersion: string };
futureSchema.schemaVersion = "local-score-project-storage-v3";
assert.equal(parseLocalScoreProject(futureSchema), null);

const tempo30 = changeLocalScoreProjectTempo({
  project,
  expectedRevision: project.document.revision,
  tempoBpm: 30,
  now: "2026-07-24T00:00:01.000Z",
});
assert.equal(tempo30.tempoBpm, 30);
assert.equal(tempo30.document.revision, 2);
assert.deepEqual(tempo30.undoStack, project.undoStack);
assert.deepEqual(tempo30.redoStack, project.redoStack);
const tempo240 = changeLocalScoreProjectTempo({
  project: tempo30,
  expectedRevision: tempo30.document.revision,
  tempoBpm: 240,
  now: "2026-07-24T00:00:02.000Z",
});
assert.equal(tempo240.tempoBpm, 240);
const tempoAfterContent = changeLocalScoreProjectTempo({
  project: edited,
  expectedRevision: edited.document.revision,
  tempoBpm: 72,
  now: "2026-07-24T00:00:02.000Z",
});
const contentUndoAfterTempo = undoLocalScoreProject({
  project: tempoAfterContent,
  expectedRevision: tempoAfterContent.document.revision,
  now: "2026-07-24T00:00:03.000Z",
});
assert.equal(contentUndoAfterTempo.tempoBpm, 72);
assert.equal(contentUndoAfterTempo.document.revision, 4);
assert.deepEqual(getLocalScoreProjectContent(contentUndoAfterTempo), firstContent);
const contentRedoAfterTempo = redoLocalScoreProject({
  project: contentUndoAfterTempo,
  expectedRevision: contentUndoAfterTempo.document.revision,
  now: "2026-07-24T00:00:04.000Z",
});
assert.equal(contentRedoAfterTempo.tempoBpm, 72);
assert.equal(contentRedoAfterTempo.document.revision, 5);
assert.deepEqual(
  getLocalScoreProjectContent(contentRedoAfterTempo),
  contentWithNote,
);
assert.equal(changeLocalScoreProjectTempo({
  project,
  expectedRevision: project.document.revision,
  tempoBpm: 90,
  now: "2026-07-24T00:00:01.000Z",
}), project);
for (const tempoBpm of [29, 241, 90.5, Number.NaN]) {
  assert.throws(
    () => changeLocalScoreProjectTempo({
      project,
      expectedRevision: project.document.revision,
      tempoBpm,
      now: "2026-07-24T00:00:01.000Z",
    }),
    /30–240.*整数 BPM/,
  );
  assert.equal(project.tempoBpm, 90);
  assert.equal(project.document.revision, 1);
}

let historyProject = project;
for (let index = 0; index < LOCAL_SCORE_PROJECT_MAX_HISTORY + 5; index += 1) {
  const current = getLocalScoreProjectContent(historyProject);
  historyProject = applyLocalScoreProjectContent({
    project: historyProject,
    expectedRevision: historyProject.document.revision,
    content: {
      ...current,
      meter: index % 2 === 0 ? "3/4" : "4/4",
    },
    now: `2026-07-24T00:01:${String(index).padStart(2, "0")}.000Z`,
  });
}
assert.equal(historyProject.undoStack.length, LOCAL_SCORE_PROJECT_MAX_HISTORY);

const afterUndo = undoLocalScoreProject({
  project: redone,
  expectedRevision: redone.document.revision,
  now: "2026-07-24T00:00:04.000Z",
});
const newEditAfterUndo = applyLocalScoreProjectContent({
  project: afterUndo,
  expectedRevision: afterUndo.document.revision,
  content: { ...getLocalScoreProjectContent(afterUndo), meter: "2/4" },
  now: "2026-07-24T00:00:05.000Z",
});
assert.equal(newEditAfterUndo.redoStack.length, 0);

const location = {
  partId: "part-1",
  staffId: "staff-1",
  voiceId: "voice-1",
  measureNumber: 1,
};
const commandAdded = addLocalScoreProjectEvent({
  project,
  expectedRevision: 1,
  location,
  eventId: "command-note-1",
  input: { type: "note", pitch: "D4", duration: "quarter" },
  now: "2026-07-24T00:00:01.000Z",
});
assert.equal(
  commandAdded.document.parts[0].staves[0].voices[0].measures[0].events[0]?.pitch,
  "D4",
);
assert.equal(commandAdded.document.revision, 2);
assert.throws(
  () => addLocalScoreProjectEvent({
    project: commandAdded,
    expectedRevision: 2,
    location,
    eventId: "command-note-1",
    input: { type: "note", pitch: "E4", duration: "quarter" },
    now: "2026-07-24T00:00:02.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "duplicate",
);
const commandUpdated = updateLocalScoreProjectEvent({
  project: commandAdded,
  expectedRevision: 2,
  location,
  eventId: "command-note-1",
  input: { type: "rest", pitch: null, duration: "quarter" },
  now: "2026-07-24T00:00:02.000Z",
});
assert.equal(
  commandUpdated.document.parts[0].staves[0].voices[0].measures[0].events[0]?.type,
  "rest",
);
const commandDeleted = deleteLocalScoreProjectEvent({
  project: commandUpdated,
  expectedRevision: 3,
  location,
  eventId: "command-note-1",
  now: "2026-07-24T00:00:03.000Z",
});
assert.equal(
  commandDeleted.document.parts[0].staves[0].voices[0].measures[0].events.length,
  0,
);
assert.throws(
  () => deleteLocalScoreProjectEvent({
    project: commandDeleted,
    expectedRevision: 4,
    location,
    eventId: "missing",
    now: "2026-07-24T00:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-found",
);

const appendedMeasure = appendLocalScoreProjectMeasure({
  project,
  expectedRevision: 1,
  partId: "part-1",
  staffId: "staff-1",
  voiceId: "voice-1",
  now: "2026-07-24T00:00:01.000Z",
});
assert.equal(appendedMeasure.document.revision, 2);
assert.deepEqual(
  appendedMeasure.document.parts[0].staves[0].voices[0].measures.map(
    (measure) => measure.measureNumber,
  ),
  [1, 2],
);
assert.equal(appendedMeasure.undoStack.length, 1);
assert.throws(
  () => appendLocalScoreProjectMeasure({
    project: appendedMeasure,
    expectedRevision: 1,
    partId: "part-1",
    staffId: "staff-1",
    voiceId: "voice-1",
    now: "2026-07-24T00:00:02.000Z",
  }),
  LocalScoreProjectConflictError,
);

const appendedThirdMeasure = appendLocalScoreProjectMeasure({
  project: appendedMeasure,
  expectedRevision: 2,
  partId: "part-1",
  staffId: "staff-1",
  voiceId: "voice-1",
  now: "2026-07-24T00:00:02.000Z",
});
const appendedMeasureNumbers =
  appendedThirdMeasure.document.parts[0].staves[0].voices[0].measures.map(
    (measure) => measure.measureNumber,
  );
assert.deepEqual(appendedMeasureNumbers, [1, 2, 3]);
assert.equal(
  new Set(appendedMeasureNumbers).size,
  appendedMeasureNumbers.length,
  "追加小节必须保持编号唯一且连续，不得产生重复或 gap",
);

const deletedEmptyMeasure = deleteEmptyLocalScoreProjectMeasure({
  project: appendedThirdMeasure,
  expectedRevision: 3,
  partId: "part-1",
  staffId: "staff-1",
  voiceId: "voice-1",
  now: "2026-07-24T00:00:03.000Z",
});
assert.equal(deletedEmptyMeasure.document.revision, 4);
assert.deepEqual(
  deletedEmptyMeasure.document.parts[0].staves[0].voices[0].measures.map(
    (measure) => measure.measureNumber,
  ),
  [1, 2],
);
assert.throws(
  () => deleteEmptyLocalScoreProjectMeasure({
    project: appendedThirdMeasure,
    expectedRevision: 2,
    partId: "part-1",
    staffId: "staff-1",
    voiceId: "voice-1",
    now: "2026-07-24T00:00:03.000Z",
  }),
  LocalScoreProjectConflictError,
);
assert.throws(
  () => deleteEmptyLocalScoreProjectMeasure({
    project,
    expectedRevision: 1,
    partId: "part-1",
    staffId: "staff-1",
    voiceId: "voice-1",
    now: "2026-07-24T00:00:01.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "would-empty",
);

const secondMeasureLocation = {
  partId: "part-1",
  staffId: "staff-1",
  voiceId: "voice-1",
  measureNumber: 2,
};
const nonEmptyLastMeasure = addLocalScoreProjectEvent({
  project: appendedMeasure,
  expectedRevision: 2,
  location: secondMeasureLocation,
  eventId: "measure-2-note",
  input: { type: "note", pitch: "G4", duration: "quarter" },
  now: "2026-07-24T00:00:02.000Z",
});
assert.throws(
  () => deleteEmptyLocalScoreProjectMeasure({
    project: nonEmptyLastMeasure,
    expectedRevision: 3,
    partId: "part-1",
    staffId: "staff-1",
    voiceId: "voice-1",
    now: "2026-07-24T00:00:03.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-empty",
);

const undoneMeasureDelete = undoLocalScoreProject({
  project: deletedEmptyMeasure,
  expectedRevision: 4,
  now: "2026-07-24T00:00:04.000Z",
});
assert.equal(undoneMeasureDelete.document.revision, 5);
assert.deepEqual(
  undoneMeasureDelete.document.parts[0].staves[0].voices[0].measures.map(
    (measure) => measure.measureNumber,
  ),
  [1, 2, 3],
);
const redoneMeasureDelete = redoLocalScoreProject({
  project: undoneMeasureDelete,
  expectedRevision: 5,
  now: "2026-07-24T00:00:05.000Z",
});
assert.equal(redoneMeasureDelete.document.revision, 6);
assert.deepEqual(
  redoneMeasureDelete.document.parts[0].staves[0].voices[0].measures.map(
    (measure) => measure.measureNumber,
  ),
  [1, 2],
);
const reopenedMeasureProject = deserializeLocalScoreProject(
  serializeLocalScoreProject(redoneMeasureDelete),
);
assert.deepEqual(reopenedMeasureProject, redoneMeasureDelete);

const meterChanged = changeLocalScoreProjectMeter({
  project,
  expectedRevision: 1,
  meter: "3/4",
  now: "2026-07-24T00:00:01.000Z",
});
assert.equal(meterChanged.document.meter, "3/4");
assert.equal(meterChanged.document.revision, 2);

const renamed = renameLocalScoreProject({
  project,
  expectedRevision: 1,
  title: "重命名",
  now: "2026-07-24T00:00:01.000Z",
});
assert.equal(renamed.title, "重命名");
assert.equal(renamed.document.revision, 2);
assert.equal(renamed.undoStack.length, 0);
assert.throws(
  () => renameLocalScoreProject({
    project: renamed,
    expectedRevision: 1,
    title: "过期写入",
    now: "2026-07-24T00:00:02.000Z",
  }),
  LocalScoreProjectConflictError,
);
assert.throws(
  () => changeLocalScoreProjectMeter({
    project: renamed,
    expectedRevision: 2,
    meter: "2/4",
    now: createdAt,
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "clock-regression",
);

const measureThreeContent = getLocalScoreProjectContent(project);
const withThirdMeasure = applyLocalScoreProjectContent({
  project,
  expectedRevision: 1,
  content: {
    ...measureThreeContent,
    parts: [{
      ...measureThreeContent.parts[0],
      staves: [{
        ...measureThreeContent.parts[0].staves[0],
        voices: [{
          ...measureThreeContent.parts[0].staves[0].voices[0],
          measures: [
            ...measureThreeContent.parts[0].staves[0].voices[0].measures,
            { measureNumber: 3, events: [] },
          ],
        }],
      }],
    }],
  },
  now: "2026-07-24T00:00:01.000Z",
});
const noteInThirdMeasure = addLocalScoreProjectEvent({
  project: withThirdMeasure,
  expectedRevision: 2,
  location: { ...location, measureNumber: 3 },
  eventId: "measure-3-note",
  input: { type: "note", pitch: "G4", duration: "half" },
  now: "2026-07-24T00:00:02.000Z",
});
assert.equal(
  noteInThirdMeasure.document.parts[0].staves[0].voices[0].measures[1]
    .events[0]?.measure,
  3,
  "canonical project events must support positive measure numbers beyond P44's 1/2 draft limit",
);

const moveFixtureContent = getLocalScoreProjectContent(appendedMeasure);
const moveFixture = applyLocalScoreProjectContent({
  project: appendedMeasure,
  expectedRevision: appendedMeasure.document.revision,
  content: {
    ...moveFixtureContent,
    parts: moveFixtureContent.parts.map((part) => ({
      ...part,
      staves: part.staves.map((staff) => ({
        ...staff,
        voices: staff.voices.map((voice) => ({
          ...voice,
          measures: voice.measures.map((measure) => ({
            ...measure,
            events: measure.measureNumber === 1
              ? [
                {
                  id: "move-a",
                  type: "note" as const,
                  pitch: "C4" as const,
                  duration: "quarter" as const,
                  measure: 1,
                },
                {
                  id: "move-b",
                  type: "rest" as const,
                  pitch: null,
                  duration: "quarter" as const,
                  measure: 1,
                },
                {
                  id: "move-c",
                  type: "note" as const,
                  pitch: "G4" as const,
                  duration: "half" as const,
                  measure: 1,
                },
              ]
              : [{
                id: "move-d",
                type: "note" as const,
                pitch: "E4" as const,
                duration: "quarter" as const,
                measure: 2,
              }],
          })),
        })),
      })),
    })),
  },
  now: "2026-07-24T00:00:02.000Z",
});
const moveFixtureBefore = JSON.stringify(moveFixture);
const moveMeasureOne = (candidate: typeof moveFixture) =>
  candidate.document.parts[0].staves[0].voices[0].measures[0].events;
const moveMeasureTwo = (candidate: typeof moveFixture) =>
  candidate.document.parts[0].staves[0].voices[0].measures[1].events;

const movedUp = moveLocalScoreProjectEvent({
  project: moveFixture,
  expectedRevision: moveFixture.document.revision,
  source: location,
  destination: location,
  eventId: "move-c",
  targetIndex: 0,
  now: "2026-07-24T00:00:03.000Z",
});
assert.deepEqual(moveMeasureOne(movedUp).map((event) => event.id), [
  "move-c",
  "move-a",
  "move-b",
]);
assert.equal(movedUp.document.revision, moveFixture.document.revision + 1);
assert.equal(movedUp.undoStack.length, moveFixture.undoStack.length + 1);
assert.equal(JSON.stringify(moveFixture), moveFixtureBefore);

const movedDown = moveLocalScoreProjectEvent({
  project: movedUp,
  expectedRevision: movedUp.document.revision,
  source: location,
  destination: location,
  eventId: "move-c",
  targetIndex: 2,
  now: "2026-07-24T00:00:04.000Z",
});
assert.deepEqual(moveMeasureOne(movedDown).map((event) => event.id), [
  "move-a",
  "move-b",
  "move-c",
]);

const movedAcrossMeasures = moveLocalScoreProjectEvent({
  project: movedDown,
  expectedRevision: movedDown.document.revision,
  source: location,
  destination: secondMeasureLocation,
  eventId: "move-a",
  targetIndex: 1,
  now: "2026-07-24T00:00:05.000Z",
});
assert.deepEqual(
  moveMeasureOne(movedAcrossMeasures).map((event) => event.id),
  ["move-b", "move-c"],
);
assert.deepEqual(
  moveMeasureTwo(movedAcrossMeasures).map((event) => event.id),
  ["move-d", "move-a"],
);
assert.deepEqual(moveMeasureTwo(movedAcrossMeasures)[1], {
  id: "move-a",
  type: "note",
  pitch: "C4",
  duration: "quarter",
  measure: 2,
});

const undoneMove = undoLocalScoreProject({
  project: movedAcrossMeasures,
  expectedRevision: movedAcrossMeasures.document.revision,
  now: "2026-07-24T00:00:06.000Z",
});
assert.deepEqual(
  getLocalScoreProjectContent(undoneMove),
  getLocalScoreProjectContent(movedDown),
);
const redoneMove = redoLocalScoreProject({
  project: undoneMove,
  expectedRevision: undoneMove.document.revision,
  now: "2026-07-24T00:00:07.000Z",
});
assert.deepEqual(
  getLocalScoreProjectContent(redoneMove),
  getLocalScoreProjectContent(movedAcrossMeasures),
);

assert.throws(
  () => moveLocalScoreProjectEvent({
    project: moveFixture,
    expectedRevision: moveFixture.document.revision - 1,
    source: location,
    destination: secondMeasureLocation,
    eventId: "move-a",
    now: "2026-07-24T00:00:03.000Z",
  }),
  LocalScoreProjectConflictError,
);
assert.equal(JSON.stringify(moveFixture), moveFixtureBefore);

assert.throws(
  () => moveLocalScoreProjectEvent({
    project: moveFixture,
    expectedRevision: moveFixture.document.revision,
    source: location,
    destination: secondMeasureLocation,
    eventId: "missing-event",
    now: "2026-07-24T00:00:03.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-found",
);
assert.equal(JSON.stringify(moveFixture), moveFixtureBefore);

for (const targetIndex of [-1, 3, 1.5]) {
  assert.throws(
    () => moveLocalScoreProjectEvent({
      project: moveFixture,
      expectedRevision: moveFixture.document.revision,
      source: location,
      destination: location,
      eventId: "move-a",
      targetIndex,
      now: "2026-07-24T00:00:03.000Z",
    }),
    (error) =>
      error instanceof LocalScoreProjectDomainError
      && error.code === "invalid-input",
  );
  assert.equal(JSON.stringify(moveFixture), moveFixtureBefore);
}

assert.throws(
  () => moveLocalScoreProjectEvent({
    project: moveFixture,
    expectedRevision: moveFixture.document.revision,
    source: location,
    destination: { ...secondMeasureLocation, measureNumber: 99 },
    eventId: "move-a",
    targetIndex: 0,
    now: "2026-07-24T00:00:03.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-found",
);
assert.equal(JSON.stringify(moveFixture), moveFixtureBefore);

const copiedMoveEvent = copyLocalScoreProjectEvent({
  project: moveFixture,
  location,
  eventId: "move-a",
});
assert.deepEqual(copiedMoveEvent, {
  type: "note",
  pitch: "C4",
  duration: "quarter",
});
assert.equal(JSON.stringify(moveFixture), moveFixtureBefore);

const pastedHalf = pasteLocalScoreProjectEvent({
  project: moveFixture,
  expectedRevision: moveFixture.document.revision,
  destination: secondMeasureLocation,
  targetIndex: 0,
  eventId: "pasted-half",
  input: { type: "note", pitch: "F4", duration: "half" },
  now: "2026-07-24T00:00:03.000Z",
});
assert.deepEqual(
  moveMeasureTwo(pastedHalf).map((event) => event.id),
  ["pasted-half", "move-d"],
);
assert.equal(pastedHalf.document.revision, moveFixture.document.revision + 1);
assert.equal(pastedHalf.undoStack.length, moveFixture.undoStack.length + 1);

const pastedToExactCapacity = pasteLocalScoreProjectEvent({
  project: pastedHalf,
  expectedRevision: pastedHalf.document.revision,
  destination: secondMeasureLocation,
  eventId: "pasted-quarter",
  input: { type: "rest", pitch: null, duration: "quarter" },
  now: "2026-07-24T00:00:04.000Z",
});
assert.deepEqual(
  moveMeasureTwo(pastedToExactCapacity).map((event) => event.id),
  ["pasted-half", "move-d", "pasted-quarter"],
);

const pastedHalfBefore = JSON.stringify(pastedHalf);
assert.throws(
  () => moveLocalScoreProjectEvent({
    project: pastedHalf,
    expectedRevision: pastedHalf.document.revision,
    source: location,
    destination: secondMeasureLocation,
    eventId: "move-c",
    now: "2026-07-24T00:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "measure-capacity",
);
assert.equal(JSON.stringify(pastedHalf), pastedHalfBefore);

const exactCapacityBefore = JSON.stringify(pastedToExactCapacity);
assert.throws(
  () => pasteLocalScoreProjectEvent({
    project: pastedToExactCapacity,
    expectedRevision: pastedToExactCapacity.document.revision,
    destination: secondMeasureLocation,
    eventId: "over-capacity",
    input: { type: "note", pitch: "A4", duration: "eighth" },
    now: "2026-07-24T00:00:05.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "measure-capacity",
);
assert.equal(JSON.stringify(pastedToExactCapacity), exactCapacityBefore);

const legacyOverfullContent = getLocalScoreProjectContent(moveFixture);
const legacyOverfull = applyLocalScoreProjectContent({
  project: moveFixture,
  expectedRevision: moveFixture.document.revision,
  content: {
    ...legacyOverfullContent,
    parts: legacyOverfullContent.parts.map((part) => ({
      ...part,
      staves: part.staves.map((staff) => ({
        ...staff,
        voices: staff.voices.map((voice) => ({
          ...voice,
          measures: voice.measures.map((measure) => ({
            ...measure,
            events: measure.measureNumber === 1
              ? [...measure.events, {
                id: "legacy-overfull",
                type: "note" as const,
                pitch: "B4" as const,
                duration: "eighth" as const,
                measure: 1,
              }]
              : measure.events,
          })),
        })),
      })),
    })),
  },
  now: "2026-07-24T00:00:03.000Z",
});
const reorderedLegacyOverfull = moveLocalScoreProjectEvent({
  project: legacyOverfull,
  expectedRevision: legacyOverfull.document.revision,
  source: location,
  destination: location,
  eventId: "legacy-overfull",
  targetIndex: 0,
  now: "2026-07-24T00:00:04.000Z",
});
assert.equal(moveMeasureOne(reorderedLegacyOverfull)[0]?.id, "legacy-overfull");
assert.throws(
  () => pasteLocalScoreProjectEvent({
    project: legacyOverfull,
    expectedRevision: legacyOverfull.document.revision,
    destination: location,
    eventId: "legacy-overfull-paste",
    input: { type: "note", pitch: "B4", duration: "eighth" },
    now: "2026-07-24T00:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "measure-capacity",
);
const legacyOverfullBeforeMoveIn = JSON.stringify(legacyOverfull);
assert.throws(
  () => moveLocalScoreProjectEvent({
    project: legacyOverfull,
    expectedRevision: legacyOverfull.document.revision,
    source: secondMeasureLocation,
    destination: location,
    eventId: "move-d",
    now: "2026-07-24T00:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "measure-capacity",
);
assert.equal(JSON.stringify(legacyOverfull), legacyOverfullBeforeMoveIn);
const repairedLegacyOverfull = moveLocalScoreProjectEvent({
  project: legacyOverfull,
  expectedRevision: legacyOverfull.document.revision,
  source: location,
  destination: secondMeasureLocation,
  eventId: "legacy-overfull",
  now: "2026-07-24T00:00:04.000Z",
});
assert.equal(
  moveMeasureOne(repairedLegacyOverfull)
    .some((event) => event.id === "legacy-overfull"),
  false,
);
assert.equal(
  moveMeasureTwo(repairedLegacyOverfull)
    .some((event) => event.id === "legacy-overfull"),
  true,
);

console.log("Local score project domain tests passed.");
