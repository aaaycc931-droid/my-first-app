import assert from "node:assert/strict";

import {
  LOCAL_SCORE_PROJECT_MAX_HISTORY,
  LocalScoreProjectConflictError,
  applyLocalScoreProjectContent,
  createLocalScoreProject,
  deserializeLocalScoreProject,
  getLocalScoreProjectContent,
  parseLocalScoreProject,
  redoLocalScoreProject,
  serializeLocalScoreProject,
  undoLocalScoreProject,
} from "../lib/music/localScoreProject";
import type { LocalNotationProjectScoreDocumentV1 } from "../lib/music/scoreDocument";

const createdAt = "2026-07-24T00:00:00.000Z";
const project = createLocalScoreProject({
  projectId: "project-1",
  title: "  第一份谱  ",
  now: createdAt,
});
assert.equal(project.title, "第一份谱");
assert.equal(project.document.schemaVersion, "score-document-v1");
assert.equal(project.document.documentKind, "notation-project");
assert.equal(project.document.documentId, "local.score-project.project-1");
assert.equal(project.document.revision, 1);
assert.equal(project.document.sessionOnly, false);

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

const futureSchema = JSON.parse(serialized) as { schemaVersion: string };
futureSchema.schemaVersion = "local-score-project-storage-v2";
assert.equal(parseLocalScoreProject(futureSchema), null);

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

console.log("Local score project domain tests passed.");
