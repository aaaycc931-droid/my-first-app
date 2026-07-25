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
  createLocalScoreProject,
  deleteEmptyLocalScoreProjectMeasure,
  deleteLocalScoreProjectEvent,
  deserializeLocalScoreProject,
  getLocalScoreProjectContent,
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

console.log("Local score project domain tests passed.");
