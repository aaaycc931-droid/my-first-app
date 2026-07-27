import assert from "node:assert/strict";

import {
  LOCAL_SCORE_PROJECT_MAX_HISTORY,
  LocalScoreProjectConflictError,
  LocalScoreProjectDomainError,
  addLocalScoreProjectEvent,
  addLocalScoreProjectPart,
  addLocalScoreProjectStaff,
  addLocalScoreProjectVoice,
  appendLocalScoreProjectMeasure,
  applyLocalScoreProjectContent,
  changeLocalScoreProjectClef,
  changeLocalScoreProjectPartInstrument,
  changeLocalScoreProjectKeySignature,
  changeLocalScoreProjectMeter,
  changeLocalScoreProjectSettings,
  changeLocalScoreProjectTempo,
  copyLocalScoreProjectEvent,
  createLocalScoreProject,
  deleteEmptyLocalScoreProjectMeasure,
  deleteEmptyLocalScoreProjectPart,
  deleteEmptyLocalScoreProjectStaff,
  deleteEmptyLocalScoreProjectVoice,
  deleteLocalScoreProjectEvent,
  deserializeLocalScoreProject,
  getLocalScoreProjectContent,
  moveLocalScoreProjectEvent,
  pasteLocalScoreProjectEvent,
  parseLocalScoreProject,
  redoLocalScoreProject,
  renameLocalScoreProject,
  renameLocalScoreProjectPart,
  serializeLocalScoreProject,
  undoLocalScoreProject,
  updateLocalScoreProjectEvent,
} from "../lib/music/localScoreProject";
import type { LocalNotationProjectScoreDocumentV2 } from "../lib/music/scoreDocument";

const createdAt = "2026-07-24T00:00:00.000Z";
const project = createLocalScoreProject({
  projectId: "project-1",
  title: "  第一份谱  ",
  now: createdAt,
});
assert.equal(project.title, "第一份谱");
assert.equal(project.schemaVersion, "local-score-project-storage-v13");
assert.equal(project.tempoBpm, 90);
assert.equal(project.document.schemaVersion, "score-document-v12");
assert.deepEqual(project.document.keySignature, { fifths: 0 });
assert.equal(project.document.parts[0].staves[0].clef, "treble");
assert.equal(project.document.parts[0].name, "声部组 1");
assert.deepEqual(project.document.parts[0].instrument, { kind: "unassigned" });
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
            augmentationDots: 0 as const,
            tieToNext: false,
            lyric: null,
            fingering: null,
            chordSymbol: null,
            articulations: [],
            dynamicMark: null,
            damperPedalMark: null,
            fermataMark: null,
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

const oneSharp = changeLocalScoreProjectKeySignature({
  project,
  expectedRevision: 1,
  keySignature: { fifths: 1 },
  now: "2026-07-24T00:00:01.000Z",
});
assert.equal(oneSharp.document.revision, 2);
assert.deepEqual(oneSharp.document.keySignature, { fifths: 1 });
assert.deepEqual(oneSharp.undoStack[0]?.keySignature, { fifths: 0 });
assert.equal(oneSharp.redoStack.length, 0);
assert.equal(changeLocalScoreProjectKeySignature({
  project: oneSharp,
  expectedRevision: 2,
  keySignature: { fifths: 1 },
  now: "2026-07-24T00:00:02.000Z",
}), oneSharp);

const bassClef = changeLocalScoreProjectClef({
  project: oneSharp,
  expectedRevision: 2,
  location: { partId: "part-1", staffId: "staff-1" },
  clef: "bass",
  now: "2026-07-24T00:00:02.000Z",
});
assert.equal(bassClef.document.revision, 3);
assert.equal(bassClef.document.parts[0].staves[0].clef, "bass");
assert.deepEqual(bassClef.document.keySignature, { fifths: 1 });
assert.equal(bassClef.undoStack.length, 2);
assert.equal(changeLocalScoreProjectClef({
  project: bassClef,
  expectedRevision: 3,
  location: { partId: "part-1", staffId: "staff-1" },
  clef: "bass",
  now: "2026-07-24T00:00:03.000Z",
}), bassClef);

const clefUndone = undoLocalScoreProject({
  project: bassClef,
  expectedRevision: 3,
  now: "2026-07-24T00:00:03.000Z",
});
assert.equal(clefUndone.document.parts[0].staves[0].clef, "treble");
assert.deepEqual(clefUndone.document.keySignature, { fifths: 1 });
const clefRedone = redoLocalScoreProject({
  project: clefUndone,
  expectedRevision: 4,
  now: "2026-07-24T00:00:04.000Z",
});
assert.equal(clefRedone.document.parts[0].staves[0].clef, "bass");
assert.deepEqual(clefRedone.document.keySignature, { fifths: 1 });

assert.throws(
  () => changeLocalScoreProjectClef({
    project,
    expectedRevision: 1,
    location: { partId: "missing", staffId: "missing" },
    clef: "bass",
    now: "2026-07-24T00:00:01.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-found",
);
assert.throws(
  () => changeLocalScoreProjectClef({
    project,
    expectedRevision: 1,
    location: { partId: "part-1", staffId: "staff-1" },
    clef: "alto" as never,
    now: "2026-07-24T00:00:01.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "invalid-input",
);
assert.throws(
  () => changeLocalScoreProjectKeySignature({
    project,
    expectedRevision: 1,
    keySignature: { fifths: 2 } as never,
    now: "2026-07-24T00:00:01.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "invalid-input",
);
assert.throws(
  () => changeLocalScoreProjectKeySignature({
    project,
    expectedRevision: 1,
    keySignature: { fifths: 0, mode: "major" } as never,
    now: "2026-07-24T00:00:01.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "invalid-input",
);
assert.throws(
  () => changeLocalScoreProjectKeySignature({
    project: oneSharp,
    expectedRevision: 1,
    keySignature: { fifths: -1 },
    now: "2026-07-24T00:00:02.000Z",
  }),
  LocalScoreProjectConflictError,
);
assert.throws(
  () => changeLocalScoreProjectKeySignature({
    project: oneSharp,
    expectedRevision: 2,
    keySignature: { fifths: -1 },
    now: "2026-07-23T23:59:59.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "clock-regression",
);

const keyedNaturalNote = addLocalScoreProjectEvent({
  project: oneSharp,
  expectedRevision: 2,
  location: {
    partId: "part-1",
    staffId: "staff-1",
    voiceId: "voice-1",
    measureNumber: 1,
  },
  eventId: "natural-f-under-one-sharp",
  input: { type: "note", pitch: "F4", duration: "quarter" },
  now: "2026-07-24T00:00:02.000Z",
});
assert.equal(
  keyedNaturalNote.document.parts[0].staves[0].voices[0].measures[0]
    .events[0]?.pitch,
  "F4",
  "调号不得移调或改写 canonical 自然音",
);
assert.deepEqual(keyedNaturalNote.document.keySignature, { fifths: 1 });
const keyedWithSecondMeasure = appendLocalScoreProjectMeasure({
  project: keyedNaturalNote,
  expectedRevision: 3,
  partId: "part-1",
  staffId: "staff-1",
  voiceId: "voice-1",
  now: "2026-07-24T00:00:03.000Z",
});
assert.deepEqual(
  keyedWithSecondMeasure.document.keySignature,
  { fifths: 1 },
  "小节领域命令不得丢失调号",
);

const multiStaffContent = {
  scoreCredits: firstContent.scoreCredits,
  meter: "4/4" as const,
  keySignature: { fifths: 0 as const },
  parts: [
    {
      partId: "right-hand",
      name: "右手",
      instrument: { kind: "gm1-program" as const, program: 0 },
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
                augmentationDots: 0 as const,
                tieToNext: false,
                lyric: null,
                fingering: null,
                chordSymbol: null,
                articulations: [],
                dynamicMark: null,
                damperPedalMark: null,
                fermataMark: null,
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
                augmentationDots: 0 as const,
                chordSymbol: null,
                dynamicMark: null,
                damperPedalMark: null,
                fermataMark: null,
              }],
            }],
          },
        ],
      }],
    },
    {
      partId: "second-part",
      name: "第二声部组",
      instrument: { kind: "unassigned" as const },
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
              augmentationDots: 0 as const,
              tieToNext: false,
              lyric: null,
              fingering: null,
              chordSymbol: null,
              articulations: [],
              dynamicMark: null,
              damperPedalMark: null,
              fermataMark: null,
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
  document: LocalNotationProjectScoreDocumentV2;
};
const firstEvent =
  duplicateEvent.document.parts[0].staves[0].voices[0].measures[0].events[0];
(duplicateEvent.document.parts[0].staves[0].voices[1].measures[0].events as unknown[])
  .push({ ...firstEvent });
assert.equal(parseLocalScoreProject(duplicateEvent), null);

const legacySchema = JSON.parse(serialized) as {
  schemaVersion: string;
  tempoBpm?: number;
  document: {
    schemaVersion: string;
    parts: { staves: { voices: { measures: { events: Record<string, unknown>[] }[] }[] }[] }[];
  };
  undoStack: { parts: { staves: { voices: { measures: { events: Record<string, unknown>[] }[] }[] }[] }[] }[];
  redoStack: { parts: { staves: { voices: { measures: { events: Record<string, unknown>[] }[] }[] }[] }[] }[];
};
legacySchema.schemaVersion = "local-score-project-storage-v1";
delete legacySchema.tempoBpm;
legacySchema.document.schemaVersion = "score-document-v1";
for (const content of [
  legacySchema.document,
  ...legacySchema.undoStack,
  ...legacySchema.redoStack,
]) {
  for (const part of content.parts) for (const staff of part.staves) {
    for (const voice of staff.voices) for (const measure of voice.measures) {
      for (const event of measure.events) {
        delete event.augmentationDots;
        delete event.tieToNext;
        delete event.lyric;
        delete event.damperPedalMark;
        delete event.fermataMark;
      }
    }
  }
}
const legacyBefore = JSON.stringify(legacySchema);
const migratedLegacy = parseLocalScoreProject(legacySchema);
assert.equal(migratedLegacy?.schemaVersion, "local-score-project-storage-v13");
assert.equal(migratedLegacy?.document.schemaVersion, "score-document-v12");
assert.deepEqual(migratedLegacy?.document.scoreCredits, {
  title: multiStaff.title,
  subtitle: null,
  creators: [],
  rightsNotice: null,
});
assert.ok(migratedLegacy?.undoStack.every((content) =>
  content.scoreCredits.title === multiStaff.title));
assert.ok(migratedLegacy?.redoStack.every((content) =>
  content.scoreCredits.title === multiStaff.title));
assert.deepEqual(
  migratedLegacy?.document.parts.map((part) => part.name),
  ["声部组 1", "声部组 2"],
);
assert.ok(migratedLegacy?.document.parts.every((part) =>
  part.instrument.kind === "unassigned"));
assert.deepEqual(migratedLegacy?.document.keySignature, { fifths: 0 });
assert.equal(migratedLegacy?.tempoBpm, 90);
assert.equal(migratedLegacy?.projectId, multiStaff.projectId);
assert.equal(migratedLegacy?.createdAt, multiStaff.createdAt);
assert.equal(migratedLegacy?.updatedAt, multiStaff.updatedAt);
assert.equal(
  migratedLegacy?.document.revision,
  multiStaff.document.revision,
);
assert.equal(
  migratedLegacy?.document.parts[0].staves[0].voices[0].measures[0]
    .events[0]?.augmentationDots,
  0,
);
assert.equal(JSON.stringify(legacySchema), legacyBefore, "读取旧版不得原地修改");
assert.equal(
  deserializeLocalScoreProject(legacyBefore)?.tempoBpm,
  90,
);
assert.match(
  serializeLocalScoreProject(migratedLegacy!),
  /local-score-project-storage-v13/,
);

const previousSchema = JSON.parse(legacyBefore) as typeof legacySchema;
previousSchema.schemaVersion = "local-score-project-storage-v2";
previousSchema.tempoBpm = 120;
assert.equal(parseLocalScoreProject(previousSchema)?.tempoBpm, 120);

const storageV3 = JSON.parse(serialized) as {
  schemaVersion: string;
  document: {
    schemaVersion: string;
    keySignature?: unknown;
    revision: number;
  };
  undoStack: { keySignature?: unknown }[];
  redoStack: { keySignature?: unknown }[];
  createdAt: string;
  updatedAt: string;
};
storageV3.schemaVersion = "local-score-project-storage-v3";
storageV3.document.schemaVersion = "score-document-v2";
delete storageV3.document.keySignature;
for (const content of [...storageV3.undoStack, ...storageV3.redoStack]) {
  delete content.keySignature;
}
const storageV3Before = JSON.stringify(storageV3);
const migratedStorageV3 = parseLocalScoreProject(storageV3);
assert.equal(migratedStorageV3?.schemaVersion, "local-score-project-storage-v13");
assert.equal(migratedStorageV3?.document.schemaVersion, "score-document-v12");
assert.equal(
  migratedStorageV3?.document.scoreCredits.title,
  multiStaff.title,
);
assert.ok(migratedStorageV3?.undoStack.every((content) =>
  content.scoreCredits.title === multiStaff.title));
assert.deepEqual(migratedStorageV3?.document.keySignature, { fifths: 0 });
assert.equal(migratedStorageV3?.document.revision, storageV3.document.revision);
assert.equal(migratedStorageV3?.createdAt, storageV3.createdAt);
assert.equal(migratedStorageV3?.updatedAt, storageV3.updatedAt);
assert.ok(migratedStorageV3?.undoStack.every(
  (content) => content.keySignature.fifths === 0,
));
assert.ok(migratedStorageV3?.redoStack.every(
  (content) => content.keySignature.fifths === 0,
));
assert.equal(JSON.stringify(storageV3), storageV3Before);

const storageV4 = JSON.parse(serialized) as {
  schemaVersion: string;
  document: {
    schemaVersion: string;
    parts: { name?: string }[];
  };
  undoStack: { parts: { name?: string }[] }[];
  redoStack: { parts: { name?: string }[] }[];
};
storageV4.schemaVersion = "local-score-project-storage-v4";
storageV4.document.schemaVersion = "score-document-v3";
for (const content of [
  storageV4.document,
  ...storageV4.undoStack,
  ...storageV4.redoStack,
]) {
  for (const part of content.parts) delete part.name;
}
const storageV4Before = JSON.stringify(storageV4);
const migratedStorageV4 = parseLocalScoreProject(storageV4);
assert.equal(migratedStorageV4?.schemaVersion, "local-score-project-storage-v13");
assert.equal(migratedStorageV4?.document.schemaVersion, "score-document-v12");
assert.equal(
  migratedStorageV4?.document.scoreCredits.title,
  multiStaff.title,
);
assert.ok(migratedStorageV4?.undoStack.every((content) =>
  content.scoreCredits.title === multiStaff.title));
assert.deepEqual(
  migratedStorageV4?.document.parts.map((part) => part.name),
  ["声部组 1", "声部组 2"],
);
assert.ok(migratedStorageV4?.undoStack.every((content) =>
  content.parts.every((part) => part.name.length > 0)));
assert.ok(migratedStorageV4?.redoStack.every((content) =>
  content.parts.every((part) => part.name.length > 0)));
assert.equal(JSON.stringify(storageV4), storageV4Before);

const storageV5 = JSON.parse(serialized) as {
  schemaVersion: string;
  document: {
    schemaVersion: string;
    parts: { instrument?: unknown }[];
  };
  undoStack: { parts: { instrument?: unknown }[] }[];
  redoStack: { parts: { instrument?: unknown }[] }[];
};
storageV5.schemaVersion = "local-score-project-storage-v5";
storageV5.document.schemaVersion = "score-document-v4";
for (const content of [
  storageV5.document,
  ...storageV5.undoStack,
  ...storageV5.redoStack,
]) {
  for (const part of content.parts) delete part.instrument;
}
const storageV5Before = JSON.stringify(storageV5);
const migratedStorageV5 = parseLocalScoreProject(storageV5);
assert.equal(migratedStorageV5?.schemaVersion, "local-score-project-storage-v13");
assert.equal(migratedStorageV5?.document.schemaVersion, "score-document-v12");
assert.equal(
  migratedStorageV5?.document.scoreCredits.title,
  multiStaff.title,
);
assert.ok(migratedStorageV5?.undoStack.every((content) =>
  content.scoreCredits.title === multiStaff.title));
assert.deepEqual(
  migratedStorageV5?.document.parts.map((part) => part.name),
  ["右手", "第二声部组"],
  "storage-v5 已有名称必须无损保留",
);
assert.ok(migratedStorageV5?.document.parts.every((part) =>
  part.instrument.kind === "unassigned"));
assert.ok(migratedStorageV5?.undoStack.every((content) =>
  content.parts.every((part) => part.instrument.kind === "unassigned")));
assert.ok(migratedStorageV5?.redoStack.every((content) =>
  content.parts.every((part) => part.instrument.kind === "unassigned")));
assert.equal(JSON.stringify(storageV5), storageV5Before);

const missingTempo = JSON.parse(serialized) as { tempoBpm?: number };
delete missingTempo.tempoBpm;
assert.equal(parseLocalScoreProject(missingTempo), null);

const futureSchema = JSON.parse(serialized) as { schemaVersion: string };
  futureSchema.schemaVersion = "local-score-project-storage-v14";
assert.equal(parseLocalScoreProject(futureSchema), null);

const missingKeySignature = JSON.parse(serialized) as {
  document: { keySignature?: unknown };
};
delete missingKeySignature.document.keySignature;
assert.equal(parseLocalScoreProject(missingKeySignature), null);
const invalidKeySignature = JSON.parse(serialized) as {
  document: { keySignature: unknown };
};
invalidKeySignature.document.keySignature = { fifths: 2 };
assert.equal(parseLocalScoreProject(invalidKeySignature), null);
const invalidCurrentClef = JSON.parse(serialized) as {
  document: { parts: { staves: { clef: string }[] }[] };
};
invalidCurrentClef.document.parts[0].staves[0].clef = "alto";
assert.equal(parseLocalScoreProject(invalidCurrentClef), null);
for (const invalidName of ["", " 未修剪", "未修剪 ", "含\n换行", "😀".repeat(41)]) {
  const invalidPartName = JSON.parse(serialized) as {
    document: { parts: { name: string }[] };
  };
  invalidPartName.document.parts[0].name = invalidName;
  assert.equal(parseLocalScoreProject(invalidPartName), null);
}
const invalidHistoryPartName = JSON.parse(serialized) as {
  undoStack: { parts: { name: string }[] }[];
};
invalidHistoryPartName.undoStack[0]!.parts[0]!.name = "";
assert.equal(parseLocalScoreProject(invalidHistoryPartName), null);
for (const invalidInstrument of [
  null,
  { kind: "unassigned", program: 0 },
  { kind: "gm1-program", program: -1 },
  { kind: "gm1-program", program: 128 },
  { kind: "gm1-program", program: 40.5 },
  { kind: "gm1-program", program: 40, providerId: "forbidden" },
  { kind: "unknown" },
]) {
  const invalidCurrentInstrument = JSON.parse(serialized) as {
    document: { parts: { instrument: unknown }[] };
  };
  invalidCurrentInstrument.document.parts[0].instrument = invalidInstrument;
  assert.equal(parseLocalScoreProject(invalidCurrentInstrument), null);
}
const invalidHistoryInstrument = JSON.parse(serialized) as {
  undoStack: { parts: { instrument: unknown }[] }[];
};
invalidHistoryInstrument.undoStack[0]!.parts[0]!.instrument = {
  kind: "gm1-program",
  program: 128,
};
assert.equal(parseLocalScoreProject(invalidHistoryInstrument), null);

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

const settingsChanged = changeLocalScoreProjectSettings({
  project: edited,
  expectedRevision: edited.document.revision,
  title: "  联合设置  ",
  tempoBpm: 120,
  now: "2026-07-24T00:00:02.000Z",
});
assert.equal(settingsChanged.title, "联合设置");
assert.equal(settingsChanged.tempoBpm, 120);
assert.equal(settingsChanged.document.revision, edited.document.revision + 1);
assert.equal(settingsChanged.updatedAt, "2026-07-24T00:00:02.000Z");
assert.deepEqual(
  getLocalScoreProjectContent(settingsChanged),
  getLocalScoreProjectContent(edited),
);
assert.deepEqual(settingsChanged.undoStack, edited.undoStack);
assert.deepEqual(settingsChanged.redoStack, edited.redoStack);
assert.equal(changeLocalScoreProjectSettings({
  project: settingsChanged,
  expectedRevision: settingsChanged.document.revision,
  title: " 联合设置 ",
  tempoBpm: 120,
  now: "2026-07-24T00:00:03.000Z",
}), settingsChanged);
assert.throws(
  () => changeLocalScoreProjectSettings({
    project: settingsChanged,
    expectedRevision: edited.document.revision,
    title: "过期设置",
    tempoBpm: 121,
    now: "2026-07-24T00:00:03.000Z",
  }),
  LocalScoreProjectConflictError,
);
assert.throws(
  () => changeLocalScoreProjectSettings({
    project: settingsChanged,
    expectedRevision: settingsChanged.document.revision,
    title: "联合设置",
    tempoBpm: 120,
    now: "2026-07-24T00:00:01.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "clock-regression",
);
assert.throws(
  () => changeLocalScoreProjectSettings({
    project,
    expectedRevision: project.document.revision,
    title: "不会保存",
    tempoBpm: 90.5,
    now: "2026-07-24T00:00:01.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "invalid-input",
);

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

const addedStaff = addLocalScoreProjectStaff({
  project: appendedThirdMeasure,
  expectedRevision: 3,
  partId: "part-1",
  staffId: "staff-2",
  voiceId: "voice-2",
  clef: "bass",
  now: "2026-07-24T00:00:03.000Z",
});
assert.equal(addedStaff.document.revision, 4);
assert.equal(addedStaff.document.parts[0].staves.length, 2);
assert.equal(addedStaff.document.parts[0].staves[1].staffKind, "pitched");
assert.equal(addedStaff.document.parts[0].staves[1].clef, "bass");
assert.deepEqual(
  addedStaff.document.parts[0].staves[1].voices[0].measures,
  [
    { measureNumber: 1, events: [] },
    { measureNumber: 2, events: [] },
    { measureNumber: 3, events: [] },
  ],
);
assert.equal(addedStaff.undoStack.length, 3);
assert.equal(addedStaff.redoStack.length, 0);
const undoneStaffAddition = undoLocalScoreProject({
  project: addedStaff,
  expectedRevision: 4,
  now: "2026-07-24T00:00:04.000Z",
});
assert.equal(undoneStaffAddition.document.revision, 5);
assert.deepEqual(
  undoneStaffAddition.document.parts[0].staves.map(
    (staff) => staff.staffId,
  ),
  ["staff-1"],
);
const redoneStaffAddition = redoLocalScoreProject({
  project: undoneStaffAddition,
  expectedRevision: 5,
  now: "2026-07-24T00:00:05.000Z",
});
assert.equal(redoneStaffAddition.document.revision, 6);
assert.deepEqual(
  redoneStaffAddition.document.parts[0].staves.map(
    (staff) => staff.staffId,
  ),
  ["staff-1", "staff-2"],
);

const addedVoice = addLocalScoreProjectVoice({
  project: addedStaff,
  expectedRevision: 4,
  location: { partId: "part-1", staffId: "staff-2" },
  voiceId: "voice-3",
  now: "2026-07-24T00:00:04.000Z",
});
assert.equal(addedVoice.document.revision, 5);
assert.deepEqual(
  addedVoice.document.parts[0].staves[1].voices[1].measures,
  [
    { measureNumber: 1, events: [] },
    { measureNumber: 2, events: [] },
    { measureNumber: 3, events: [] },
  ],
);
assert.equal(addedVoice.undoStack.length, 4);

for (const createDuplicate of [
  () => addLocalScoreProjectStaff({
    project: addedStaff,
    expectedRevision: 4,
    partId: "part-1",
    staffId: "staff-1",
    voiceId: "new-voice",
    clef: "treble" as const,
    now: "2026-07-24T00:00:04.000Z",
  }),
  () => addLocalScoreProjectStaff({
    project: addedStaff,
    expectedRevision: 4,
    partId: "part-1",
    staffId: "new-staff",
    voiceId: "voice-1",
    clef: "treble" as const,
    now: "2026-07-24T00:00:04.000Z",
  }),
  () => addLocalScoreProjectVoice({
    project: addedStaff,
    expectedRevision: 4,
    location: { partId: "part-1", staffId: "staff-2" },
    voiceId: "voice-1",
    now: "2026-07-24T00:00:04.000Z",
  }),
]) {
  assert.throws(
    createDuplicate,
    (error) =>
      error instanceof LocalScoreProjectDomainError
      && error.code === "duplicate",
  );
}
assert.throws(
  () => addLocalScoreProjectStaff({
    project: addedStaff,
    expectedRevision: 3,
    partId: "part-1",
    staffId: "stale-staff",
    voiceId: "stale-voice",
    clef: "treble",
    now: "2026-07-24T00:00:04.000Z",
  }),
  LocalScoreProjectConflictError,
);
assert.throws(
  () => addLocalScoreProjectVoice({
    project: addedStaff,
    expectedRevision: 4,
    location: { partId: "part-1", staffId: "staff-2" },
    voiceId: "",
    now: "2026-07-24T00:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "invalid-input",
);
assert.throws(
  () => addLocalScoreProjectVoice({
    project: addedStaff,
    expectedRevision: 4,
    location: { partId: "part-1", staffId: "staff-2" },
    voiceId: "clock-voice",
    now: "2026-07-24T00:00:02.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "clock-regression",
);
for (const createInvalidStaff of [
  () => addLocalScoreProjectStaff({
    project: addedStaff,
    expectedRevision: 4,
    partId: "part-1",
    staffId: "",
    voiceId: "valid-new-voice",
    clef: "treble" as const,
    now: "2026-07-24T00:00:04.000Z",
  }),
  () => addLocalScoreProjectStaff({
    project: addedStaff,
    expectedRevision: 4,
    partId: "part-1",
    staffId: "valid-new-staff",
    voiceId: "",
    clef: "treble" as const,
    now: "2026-07-24T00:00:04.000Z",
  }),
  () => addLocalScoreProjectStaff({
    project: addedStaff,
    expectedRevision: 4,
    partId: "part-1",
    staffId: "valid-new-staff",
    voiceId: "valid-new-voice",
    clef: "alto" as never,
    now: "2026-07-24T00:00:04.000Z",
  }),
]) {
  assert.throws(
    createInvalidStaff,
    (error) =>
      error instanceof LocalScoreProjectDomainError
      && error.code === "invalid-input",
  );
}
assert.throws(
  () => addLocalScoreProjectStaff({
    project: addedStaff,
    expectedRevision: 4,
    partId: "missing-part",
    staffId: "missing-part-staff",
    voiceId: "missing-part-voice",
    clef: "treble",
    now: "2026-07-24T00:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-found",
);
assert.throws(
  () => addLocalScoreProjectVoice({
    project: addedStaff,
    expectedRevision: 4,
    location: { partId: "part-1", staffId: "missing-staff" },
    voiceId: "missing-target-voice",
    now: "2026-07-24T00:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-found",
);

assert.throws(
  () => deleteEmptyLocalScoreProjectVoice({
    project: addedStaff,
    expectedRevision: 4,
    location: {
      partId: "part-1",
      staffId: "staff-2",
      voiceId: "voice-2",
    },
    now: "2026-07-24T00:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "would-empty",
);
assert.throws(
  () => deleteEmptyLocalScoreProjectVoice({
    project: addedVoice,
    expectedRevision: 5,
    location: {
      partId: "part-1",
      staffId: "staff-2",
      voiceId: "missing-voice",
    },
    now: "2026-07-24T00:00:05.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-found",
);
assert.throws(
  () => deleteEmptyLocalScoreProjectStaff({
    project: addedStaff,
    expectedRevision: 4,
    location: { partId: "part-1", staffId: "missing-staff" },
    now: "2026-07-24T00:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-found",
);
assert.throws(
  () => deleteEmptyLocalScoreProjectVoice({
    project: addedVoice,
    expectedRevision: 4,
    location: {
      partId: "part-1",
      staffId: "staff-2",
      voiceId: "voice-3",
    },
    now: "2026-07-24T00:00:05.000Z",
  }),
  LocalScoreProjectConflictError,
);
assert.throws(
  () => deleteEmptyLocalScoreProjectVoice({
    project: addedVoice,
    expectedRevision: 5,
    location: {
      partId: "part-1",
      staffId: "staff-2",
      voiceId: "voice-3",
    },
    now: "2026-07-24T00:00:03.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "clock-regression",
);
const deletedVoice = deleteEmptyLocalScoreProjectVoice({
  project: addedVoice,
  expectedRevision: 5,
  location: {
    partId: "part-1",
    staffId: "staff-2",
    voiceId: "voice-3",
  },
  now: "2026-07-24T00:00:05.000Z",
});
assert.equal(deletedVoice.document.revision, 6);
assert.deepEqual(
  deletedVoice.document.parts[0].staves[1].voices.map(
    (voice) => voice.voiceId,
  ),
  ["voice-2"],
);
const undoneVoiceDelete = undoLocalScoreProject({
  project: deletedVoice,
  expectedRevision: 6,
  now: "2026-07-24T00:00:06.000Z",
});
assert.equal(undoneVoiceDelete.document.revision, 7);
assert.deepEqual(
  undoneVoiceDelete.document.parts[0].staves[1].voices.map(
    (voice) => voice.voiceId,
  ),
  ["voice-2", "voice-3"],
);
const redoneVoiceDelete = redoLocalScoreProject({
  project: undoneVoiceDelete,
  expectedRevision: 7,
  now: "2026-07-24T00:00:07.000Z",
});
assert.equal(redoneVoiceDelete.document.revision, 8);
assert.deepEqual(
  redoneVoiceDelete.document.parts[0].staves[1].voices.map(
    (voice) => voice.voiceId,
  ),
  ["voice-2"],
);

const secondVoiceWithNote = addLocalScoreProjectEvent({
  project: addedVoice,
  expectedRevision: 5,
  location: {
    partId: "part-1",
    staffId: "staff-2",
    voiceId: "voice-3",
    measureNumber: 1,
  },
  eventId: "voice-3-note",
  input: { type: "note", pitch: "C4", duration: "quarter" },
  now: "2026-07-24T00:00:05.000Z",
});
assert.throws(
  () => deleteEmptyLocalScoreProjectVoice({
    project: secondVoiceWithNote,
    expectedRevision: 6,
    location: {
      partId: "part-1",
      staffId: "staff-2",
      voiceId: "voice-3",
    },
    now: "2026-07-24T00:00:06.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-empty",
);
assert.throws(
  () => deleteEmptyLocalScoreProjectStaff({
    project: secondVoiceWithNote,
    expectedRevision: 6,
    location: { partId: "part-1", staffId: "staff-2" },
    now: "2026-07-24T00:00:06.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-empty",
);
assert.throws(
  () => deleteEmptyLocalScoreProjectStaff({
    project,
    expectedRevision: 1,
    location: { partId: "part-1", staffId: "staff-1" },
    now: "2026-07-24T00:00:01.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "would-empty",
);
const deletedStaff = deleteEmptyLocalScoreProjectStaff({
  project: deletedVoice,
  expectedRevision: 6,
  location: { partId: "part-1", staffId: "staff-2" },
  now: "2026-07-24T00:00:06.000Z",
});
assert.equal(deletedStaff.document.revision, 7);
assert.deepEqual(
  deletedStaff.document.parts[0].staves.map((staff) => staff.staffId),
  ["staff-1"],
);
const undoneStaffDelete = undoLocalScoreProject({
  project: deletedStaff,
  expectedRevision: 7,
  now: "2026-07-24T00:00:07.000Z",
});
assert.equal(undoneStaffDelete.document.revision, 8);
assert.deepEqual(
  undoneStaffDelete.document.parts[0].staves.map((staff) => staff.staffId),
  ["staff-1", "staff-2"],
);
const redoneStaffDelete = redoLocalScoreProject({
  project: undoneStaffDelete,
  expectedRevision: 8,
  now: "2026-07-24T00:00:08.000Z",
});
assert.equal(redoneStaffDelete.document.revision, 9);
assert.deepEqual(
  redoneStaffDelete.document.parts[0].staves.map((staff) => staff.staffId),
  ["staff-1"],
);

const voiceWithExtraMeasure = appendLocalScoreProjectMeasure({
  project: addedVoice,
  expectedRevision: 5,
  partId: "part-1",
  staffId: "staff-2",
  voiceId: "voice-3",
  now: "2026-07-24T00:00:05.000Z",
});
const voiceFromMeasureUnion = addLocalScoreProjectVoice({
  project: voiceWithExtraMeasure,
  expectedRevision: 6,
  location: { partId: "part-1", staffId: "staff-2" },
  voiceId: "voice-4",
  now: "2026-07-24T00:00:06.000Z",
});
assert.deepEqual(
  voiceFromMeasureUnion.document.parts[0].staves[1].voices[2].measures,
  [
    { measureNumber: 1, events: [] },
    { measureNumber: 2, events: [] },
    { measureNumber: 3, events: [] },
    { measureNumber: 4, events: [] },
  ],
);
const staffFromPartMeasureUnion = addLocalScoreProjectStaff({
  project: voiceWithExtraMeasure,
  expectedRevision: 6,
  partId: "part-1",
  staffId: "staff-3",
  voiceId: "voice-5",
  clef: "treble",
  now: "2026-07-24T00:00:06.000Z",
});
assert.deepEqual(
  staffFromPartMeasureUnion.document.parts[0].staves[2].voices[0].measures,
  [
    { measureNumber: 1, events: [] },
    { measureNumber: 2, events: [] },
    { measureNumber: 3, events: [] },
    { measureNumber: 4, events: [] },
  ],
);
const sparseBaseWithSecondVoice = addLocalScoreProjectVoice({
  project,
  expectedRevision: 1,
  location: { partId: "part-1", staffId: "staff-1" },
  voiceId: "sparse-voice-2",
  now: "2026-07-24T00:00:01.000Z",
});
const sparseBaseContent = getLocalScoreProjectContent(
  sparseBaseWithSecondVoice,
);
const sparseMeasureProject = applyLocalScoreProjectContent({
  project: sparseBaseWithSecondVoice,
  expectedRevision: 2,
  content: {
    ...sparseBaseContent,
    parts: sparseBaseContent.parts.map((part) => ({
      ...part,
      staves: part.staves.map((staff) => ({
        ...staff,
        voices: staff.voices.map((voice, index) => ({
          ...voice,
          measures: index === 0
            ? [{ measureNumber: 2, events: [] }]
            : [
              { measureNumber: 2, events: [] },
              { measureNumber: 4, events: [] },
            ],
        })),
      })),
    })),
  },
  now: "2026-07-24T00:00:02.000Z",
});
const sparseUnionVoice = addLocalScoreProjectVoice({
  project: sparseMeasureProject,
  expectedRevision: 3,
  location: { partId: "part-1", staffId: "staff-1" },
  voiceId: "sparse-voice-3",
  now: "2026-07-24T00:00:03.000Z",
});
assert.deepEqual(
  sparseUnionVoice.document.parts[0].staves[0].voices[2].measures,
  [
    { measureNumber: 1, events: [] },
    { measureNumber: 2, events: [] },
    { measureNumber: 4, events: [] },
  ],
);
const sparseUnionStaff = addLocalScoreProjectStaff({
  project: sparseMeasureProject,
  expectedRevision: 3,
  partId: "part-1",
  staffId: "sparse-staff-2",
  voiceId: "sparse-staff-voice",
  clef: "bass",
  now: "2026-07-24T00:00:03.000Z",
});
assert.deepEqual(
  sparseUnionStaff.document.parts[0].staves[1].voices[0].measures,
  [
    { measureNumber: 1, events: [] },
    { measureNumber: 2, events: [] },
    { measureNumber: 4, events: [] },
  ],
);

const addedPart = addLocalScoreProjectPart({
  project: sparseMeasureProject,
  expectedRevision: 3,
  partId: "part-2",
  staffId: "part-2-staff-1",
  voiceId: "part-2-voice-1",
  clef: "bass",
  now: "2026-07-24T00:00:03.000Z",
});
assert.equal(addedPart.document.revision, 4);
assert.equal(addedPart.document.parts.length, 2);
assert.deepEqual(addedPart.document.parts[1], {
  partId: "part-2",
  name: "声部组 2",
  instrument: { kind: "unassigned" },
  staves: [{
    staffId: "part-2-staff-1",
    staffKind: "pitched",
    clef: "bass",
    voices: [{
      voiceId: "part-2-voice-1",
      measures: [
        { measureNumber: 1, events: [] },
        { measureNumber: 2, events: [] },
        { measureNumber: 4, events: [] },
      ],
    }],
  }],
});
assert.deepEqual(
  addedPart.document.parts[0],
  sparseMeasureProject.document.parts[0],
);
assert.equal(sparseMeasureProject.document.parts.length, 1);
assert.equal(addedPart.undoStack.length, sparseMeasureProject.undoStack.length + 1);
assert.equal(addedPart.redoStack.length, 0);
const instrumentInput = { kind: "gm1-program" as const, program: 0 };
const assignedInstrument = changeLocalScoreProjectPartInstrument({
  project: addedPart,
  expectedRevision: 4,
  partId: "part-2",
  instrument: instrumentInput,
  now: "2026-07-24T00:00:04.000Z",
});
(instrumentInput as { program: number }).program = 73;
assert.equal(assignedInstrument.document.revision, 5);
assert.deepEqual(
  assignedInstrument.document.parts[1].instrument,
  { kind: "gm1-program", program: 0 },
  "领域命令必须深拷贝输入归属",
);
assert.equal(assignedInstrument.document.parts[1].name, "声部组 2");
assert.deepEqual(
  assignedInstrument.document.parts[1].staves,
  addedPart.document.parts[1].staves,
  "改变归属不得改写谱表、声部或事件",
);
assert.deepEqual(
  assignedInstrument.undoStack.at(-1)?.parts[1]?.instrument,
  { kind: "unassigned" },
);
assert.equal(changeLocalScoreProjectPartInstrument({
  project: assignedInstrument,
  expectedRevision: 5,
  partId: "part-2",
  instrument: { kind: "gm1-program", program: 0 },
  now: "2026-07-24T00:00:05.000Z",
}), assignedInstrument, "相同归属不得创建无效 revision");
const maxProgramInstrument = changeLocalScoreProjectPartInstrument({
  project: assignedInstrument,
  expectedRevision: 5,
  partId: "part-2",
  instrument: { kind: "gm1-program", program: 127 },
  now: "2026-07-24T00:00:05.000Z",
});
assert.deepEqual(
  maxProgramInstrument.document.parts[1].instrument,
  { kind: "gm1-program", program: 127 },
);
const duplicateInstrument = changeLocalScoreProjectPartInstrument({
  project: maxProgramInstrument,
  expectedRevision: 6,
  partId: "part-1",
  instrument: { kind: "gm1-program", program: 127 },
  now: "2026-07-24T00:00:06.000Z",
});
assert.deepEqual(
  duplicateInstrument.document.parts.map((part) => part.instrument),
  [
    { kind: "gm1-program", program: 127 },
    { kind: "gm1-program", program: 127 },
  ],
  "多个声部组允许使用相同归属",
);
const undoneInstrument = undoLocalScoreProject({
  project: maxProgramInstrument,
  expectedRevision: 6,
  now: "2026-07-24T00:00:06.000Z",
});
assert.deepEqual(
  undoneInstrument.document.parts[1].instrument,
  { kind: "gm1-program", program: 0 },
);
const redoneInstrument = redoLocalScoreProject({
  project: undoneInstrument,
  expectedRevision: 7,
  now: "2026-07-24T00:00:07.000Z",
});
assert.deepEqual(
  redoneInstrument.document.parts[1].instrument,
  { kind: "gm1-program", program: 127 },
);
const instrumentAfterUndo = changeLocalScoreProjectPartInstrument({
  project: undoneInstrument,
  expectedRevision: 7,
  partId: "part-2",
  instrument: { kind: "unassigned" },
  now: "2026-07-24T00:00:07.000Z",
});
assert.equal(instrumentAfterUndo.redoStack.length, 0);
for (const instrument of [
  { kind: "gm1-program", program: -1 },
  { kind: "gm1-program", program: 128 },
  { kind: "gm1-program", program: 1.5 },
  { kind: "gm1-program", program: Number.NaN },
  { kind: "unassigned", program: 0 },
  { kind: "gm1-program", program: 0, providerId: "forbidden" },
  { kind: "piano" },
] as const) {
  assert.throws(
    () => changeLocalScoreProjectPartInstrument({
      project: addedPart,
      expectedRevision: 4,
      partId: "part-2",
      instrument: instrument as never,
      now: "2026-07-24T00:00:04.000Z",
    }),
    (error) =>
      error instanceof LocalScoreProjectDomainError
      && error.code === "invalid-input",
  );
}
assert.throws(
  () => changeLocalScoreProjectPartInstrument({
    project: addedPart,
    expectedRevision: 4,
    partId: "missing-part",
    instrument: { kind: "unassigned" },
    now: "2026-07-24T00:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-found",
);
assert.throws(
  () => changeLocalScoreProjectPartInstrument({
    project: addedPart,
    expectedRevision: 3,
    partId: "part-2",
    instrument: { kind: "unassigned" },
    now: "2026-07-24T00:00:04.000Z",
  }),
  LocalScoreProjectConflictError,
);
assert.throws(
  () => changeLocalScoreProjectPartInstrument({
    project: addedPart,
    expectedRevision: 4,
    partId: "part-2",
    instrument: { kind: "gm1-program", program: 40 },
    now: "2026-07-24T00:00:02.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "clock-regression",
);
const renamedPart = renameLocalScoreProjectPart({
  project: addedPart,
  expectedRevision: 4,
  partId: "part-2",
  name: "  钢琴右手  ",
  now: "2026-07-24T00:00:04.000Z",
});
assert.equal(renamedPart.document.revision, 5);
assert.equal(renamedPart.document.parts[1].name, "钢琴右手");
assert.equal(renamedPart.undoStack.at(-1)?.parts[1]?.name, "声部组 2");
assert.equal(renameLocalScoreProjectPart({
  project: renamedPart,
  expectedRevision: 5,
  partId: "part-2",
  name: " 钢琴右手 ",
  now: "2026-07-24T00:00:05.000Z",
}), renamedPart, "规范化后同名不得创建无效 revision");
const duplicateName = renameLocalScoreProjectPart({
  project: renamedPart,
  expectedRevision: 5,
  partId: "part-2",
  name: "声部组 1",
  now: "2026-07-24T00:00:05.000Z",
});
assert.equal(duplicateName.document.parts[0].name, "声部组 1");
assert.equal(duplicateName.document.parts[1].name, "声部组 1");
const undonePartRename = undoLocalScoreProject({
  project: renamedPart,
  expectedRevision: 5,
  now: "2026-07-24T00:00:05.000Z",
});
assert.equal(undonePartRename.document.parts[1].name, "声部组 2");
const redonePartRename = redoLocalScoreProject({
  project: undonePartRename,
  expectedRevision: 6,
  now: "2026-07-24T00:00:06.000Z",
});
assert.equal(redonePartRename.document.parts[1].name, "钢琴右手");
for (const invalidName of [
  "",
  "  ",
  "含\t制表符",
  "音".repeat(41),
  null as never,
]) {
  assert.throws(
    () => renameLocalScoreProjectPart({
      project: addedPart,
      expectedRevision: 4,
      partId: "part-2",
      name: invalidName,
      now: "2026-07-24T00:00:04.000Z",
    }),
    (error) =>
      error instanceof LocalScoreProjectDomainError
      && error.code === "invalid-input",
  );
}
assert.throws(
  () => renameLocalScoreProjectPart({
    project: addedPart,
    expectedRevision: 4,
    partId: "missing-part",
    name: "不存在",
    now: "2026-07-24T00:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-found",
);
assert.throws(
  () => renameLocalScoreProjectPart({
    project: addedPart,
    expectedRevision: 3,
    partId: "part-2",
    name: "旧写入",
    now: "2026-07-24T00:00:04.000Z",
  }),
  LocalScoreProjectConflictError,
);
const addedPartContent = getLocalScoreProjectContent(addedPart);
const sparseSecondPart = applyLocalScoreProjectContent({
  project: addedPart,
  expectedRevision: 4,
  content: {
    ...addedPartContent,
    parts: addedPartContent.parts.map((part) =>
      part.partId !== "part-2"
        ? part
        : {
          ...part,
          staves: part.staves.map((staff) => ({
            ...staff,
            voices: staff.voices.map((voice) => ({
              ...voice,
              measures: [{ measureNumber: 6, events: [] }],
            })),
          })),
        }),
  },
  now: "2026-07-24T00:00:04.000Z",
});
const partFromDocumentMeasureUnion = addLocalScoreProjectPart({
  project: sparseSecondPart,
  expectedRevision: 5,
  partId: "part-3",
  staffId: "part-3-staff-1",
  voiceId: "part-3-voice-1",
  clef: "treble",
  now: "2026-07-24T00:00:05.000Z",
});
assert.deepEqual(
  partFromDocumentMeasureUnion.document.parts[2].staves[0].voices[0].measures,
  [
    { measureNumber: 1, events: [] },
    { measureNumber: 2, events: [] },
    { measureNumber: 4, events: [] },
    { measureNumber: 6, events: [] },
  ],
);
const addedPartAfterUndo = addLocalScoreProjectPart({
  project: undone,
  expectedRevision: 3,
  partId: "part-after-undo",
  staffId: "staff-after-undo",
  voiceId: "voice-after-undo",
  clef: "treble",
  now: "2026-07-24T00:00:03.000Z",
});
assert.equal(undone.redoStack.length, 1);
assert.equal(addedPartAfterUndo.redoStack.length, 0);
assert.equal(addedPartAfterUndo.document.revision, 4);

const undonePartAddition = undoLocalScoreProject({
  project: addedPart,
  expectedRevision: 4,
  now: "2026-07-24T00:00:04.000Z",
});
assert.equal(undonePartAddition.document.revision, 5);
assert.deepEqual(
  undonePartAddition.document.parts.map((part) => part.partId),
  ["part-1"],
);
const redonePartAddition = redoLocalScoreProject({
  project: undonePartAddition,
  expectedRevision: 5,
  now: "2026-07-24T00:00:05.000Z",
});
assert.equal(redonePartAddition.document.revision, 6);
assert.deepEqual(
  redonePartAddition.document.parts.map((part) => part.partId),
  ["part-1", "part-2"],
);
assert.deepEqual(
  redonePartAddition.document.parts[1],
  addedPart.document.parts[1],
);

for (const createInvalidPart of [
  () => addLocalScoreProjectPart({
    project: sparseMeasureProject,
    expectedRevision: 3,
    partId: "",
    staffId: "valid-part-staff",
    voiceId: "valid-part-voice",
    clef: "treble" as const,
    now: "2026-07-24T00:00:03.000Z",
  }),
  () => addLocalScoreProjectPart({
    project: sparseMeasureProject,
    expectedRevision: 3,
    partId: "valid-part",
    staffId: "",
    voiceId: "valid-part-voice",
    clef: "treble" as const,
    now: "2026-07-24T00:00:03.000Z",
  }),
  () => addLocalScoreProjectPart({
    project: sparseMeasureProject,
    expectedRevision: 3,
    partId: "valid-part",
    staffId: "valid-part-staff",
    voiceId: "",
    clef: "treble" as const,
    now: "2026-07-24T00:00:03.000Z",
  }),
  () => addLocalScoreProjectPart({
    project: sparseMeasureProject,
    expectedRevision: 3,
    partId: "valid-part",
    staffId: "valid-part-staff",
    voiceId: "valid-part-voice",
    clef: "alto" as never,
    now: "2026-07-24T00:00:03.000Z",
  }),
]) {
  assert.throws(
    createInvalidPart,
    (error) =>
      error instanceof LocalScoreProjectDomainError
      && error.code === "invalid-input",
  );
}

for (const createDuplicatePartStructure of [
  () => addLocalScoreProjectPart({
    project: sparseMeasureProject,
    expectedRevision: 3,
    partId: "part-1",
    staffId: "unique-part-staff",
    voiceId: "unique-part-voice",
    clef: "treble" as const,
    now: "2026-07-24T00:00:03.000Z",
  }),
  () => addLocalScoreProjectPart({
    project: sparseMeasureProject,
    expectedRevision: 3,
    partId: "unique-part",
    staffId: "staff-1",
    voiceId: "unique-part-voice",
    clef: "treble" as const,
    now: "2026-07-24T00:00:03.000Z",
  }),
  () => addLocalScoreProjectPart({
    project: sparseMeasureProject,
    expectedRevision: 3,
    partId: "unique-part",
    staffId: "unique-part-staff",
    voiceId: "voice-1",
    clef: "treble" as const,
    now: "2026-07-24T00:00:03.000Z",
  }),
]) {
  assert.throws(
    createDuplicatePartStructure,
    (error) =>
      error instanceof LocalScoreProjectDomainError
      && error.code === "duplicate",
  );
}
assert.throws(
  () => addLocalScoreProjectPart({
    project: sparseMeasureProject,
    expectedRevision: 2,
    partId: "stale-part",
    staffId: "stale-part-staff",
    voiceId: "stale-part-voice",
    clef: "treble",
    now: "2026-07-24T00:00:03.000Z",
  }),
  LocalScoreProjectConflictError,
);
for (const [invalidTime, expectedCode] of [
  ["2026-07-24", "invalid-input"],
  ["2026-07-24T00:00:01.000Z", "clock-regression"],
] as const) {
  assert.throws(
    () => addLocalScoreProjectPart({
      project: sparseMeasureProject,
      expectedRevision: 3,
      partId: `timed-part-${expectedCode}`,
      staffId: `timed-staff-${expectedCode}`,
      voiceId: `timed-voice-${expectedCode}`,
      clef: "treble",
      now: invalidTime,
    }),
    (error) =>
      error instanceof LocalScoreProjectDomainError
      && error.code === expectedCode,
  );
}

assert.throws(
  () => deleteEmptyLocalScoreProjectPart({
    project,
    expectedRevision: 1,
    partId: "part-1",
    now: "2026-07-24T00:00:01.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "would-empty",
);
assert.throws(
  () => deleteEmptyLocalScoreProjectPart({
    project: addedPart,
    expectedRevision: 4,
    partId: "",
    now: "2026-07-24T00:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "invalid-input",
);
assert.throws(
  () => deleteEmptyLocalScoreProjectPart({
    project: addedPart,
    expectedRevision: 4,
    partId: "missing-part",
    now: "2026-07-24T00:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-found",
);
assert.throws(
  () => deleteEmptyLocalScoreProjectPart({
    project: addedPart,
    expectedRevision: 3,
    partId: "part-2",
    now: "2026-07-24T00:00:04.000Z",
  }),
  LocalScoreProjectConflictError,
);
assert.throws(
  () => deleteEmptyLocalScoreProjectPart({
    project: addedPart,
    expectedRevision: 4,
    partId: "part-2",
    now: "2026-07-24T00:00:02.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "clock-regression",
);

const nonEmptySecondPart = addLocalScoreProjectEvent({
  project: addedPart,
  expectedRevision: 4,
  location: {
    partId: "part-2",
    staffId: "part-2-staff-1",
    voiceId: "part-2-voice-1",
    measureNumber: 1,
  },
  eventId: "part-2-note",
  input: { type: "note", pitch: "C4", duration: "quarter" },
  now: "2026-07-24T00:00:04.000Z",
});
assert.throws(
  () => deleteEmptyLocalScoreProjectPart({
    project: nonEmptySecondPart,
    expectedRevision: 5,
    partId: "part-2",
    now: "2026-07-24T00:00:05.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "not-empty",
);

const deletedPart = deleteEmptyLocalScoreProjectPart({
  project: addedPart,
  expectedRevision: 4,
  partId: "part-2",
  now: "2026-07-24T00:00:04.000Z",
});
assert.equal(deletedPart.document.revision, 5);
assert.deepEqual(
  deletedPart.document.parts.map((part) => part.partId),
  ["part-1"],
);
assert.deepEqual(
  deletedPart.document.parts[0],
  sparseMeasureProject.document.parts[0],
);
const reusedDefaultPartName = addLocalScoreProjectPart({
  project: deletedPart,
  expectedRevision: 5,
  partId: "part-recreated",
  staffId: "part-recreated-staff",
  voiceId: "part-recreated-voice",
  clef: "treble",
  now: "2026-07-24T00:00:05.000Z",
});
assert.equal(
  reusedDefaultPartName.document.parts[1].name,
  "声部组 2",
  "默认名称必须使用最小未占用编号",
);
const undonePartDelete = undoLocalScoreProject({
  project: deletedPart,
  expectedRevision: 5,
  now: "2026-07-24T00:00:05.000Z",
});
assert.equal(undonePartDelete.document.revision, 6);
assert.deepEqual(
  undonePartDelete.document.parts.map((part) => part.partId),
  ["part-1", "part-2"],
);
const redonePartDelete = redoLocalScoreProject({
  project: undonePartDelete,
  expectedRevision: 6,
  now: "2026-07-24T00:00:06.000Z",
});
assert.equal(redonePartDelete.document.revision, 7);
assert.deepEqual(
  redonePartDelete.document.parts.map((part) => part.partId),
  ["part-1"],
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
                  augmentationDots: 0 as const,
                  tieToNext: false,
                  lyric: null,
                  fingering: null,
                  chordSymbol: null,
                  articulations: [],
                  dynamicMark: null,
                  damperPedalMark: null,
                  fermataMark: null,
                },
                {
                  id: "move-b",
                  type: "rest" as const,
                  pitch: null,
                  duration: "quarter" as const,
                  measure: 1,
                  augmentationDots: 0 as const,
                  chordSymbol: null,
                  dynamicMark: null,
                  damperPedalMark: null,
                  fermataMark: null,
                },
                {
                  id: "move-c",
                  type: "note" as const,
                  pitch: "G4" as const,
                  duration: "half" as const,
                  measure: 1,
                  augmentationDots: 0 as const,
                  tieToNext: false,
                  lyric: null,
                  fingering: null,
                  chordSymbol: null,
                  articulations: [],
                  dynamicMark: null,
                  damperPedalMark: null,
                  fermataMark: null,
                },
              ]
              : [{
                id: "move-d",
                type: "note" as const,
                pitch: "E4" as const,
                duration: "quarter" as const,
                measure: 2,
                augmentationDots: 0 as const,
                tieToNext: false,
                lyric: null,
                fingering: null,
                chordSymbol: null,
                articulations: [],
                dynamicMark: null,
                damperPedalMark: null,
                fermataMark: null,
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
  augmentationDots: 0,
  tieToNext: false,
  lyric: null,
  fingering: null,
  chordSymbol: null,
  articulations: [],
  dynamicMark: null,
  damperPedalMark: null,
  fermataMark: null,
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
  augmentationDots: 0,
  tieToNext: false,
  lyric: null,
  fingering: null,
  chordSymbol: null,
  articulations: [],
  dynamicMark: null,
  damperPedalMark: null,
  fermataMark: null,
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
                augmentationDots: 0 as const,
                tieToNext: false,
                lyric: null,
                fingering: null,
                chordSymbol: null,
                articulations: [],
                dynamicMark: null,
                damperPedalMark: null,
                fermataMark: null,
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

const notationV2Base = createLocalScoreProject({
  projectId: "notation-v2",
  title: "附点延音线歌词",
  now: "2026-07-24T04:00:00.000Z",
});
const notationV2First = addLocalScoreProjectEvent({
  project: notationV2Base,
  expectedRevision: 1,
  location,
  eventId: "tie-source",
  input: {
    type: "note",
    pitch: "C4",
    duration: "quarter",
    augmentationDots: 1,
    lyric: "你",
  },
  now: "2026-07-24T04:00:01.000Z",
});
const notationV2Pair = addLocalScoreProjectEvent({
  project: notationV2First,
  expectedRevision: 2,
  location,
  eventId: "tie-target",
  input: { type: "note", pitch: "C4", duration: "eighth" },
  now: "2026-07-24T04:00:02.000Z",
});
const notationV2Tied = updateLocalScoreProjectEvent({
  project: notationV2Pair,
  expectedRevision: 3,
  location,
  eventId: "tie-source",
  input: {
    type: "note",
    pitch: "C4",
    duration: "quarter",
    augmentationDots: 1,
    tieToNext: true,
    lyric: "你",
  },
  now: "2026-07-24T04:00:03.000Z",
});
assert.equal(
  notationV2Tied.document.parts[0].staves[0].voices[0].measures[0]
    .events[0]?.augmentationDots,
  1,
);
assert.deepEqual(copyLocalScoreProjectEvent({
  project: notationV2Tied,
  location,
  eventId: "tie-source",
}), {
  type: "note",
  pitch: "C4",
  duration: "quarter",
  augmentationDots: 1,
  tieToNext: false,
  lyric: "你",
  fingering: null,
  chordSymbol: null,
  articulations: [],
  dynamicMark: null,
  damperPedalMark: null,
  fermataMark: null,
});
for (const mutate of [
  () => deleteLocalScoreProjectEvent({
    project: notationV2Tied,
    expectedRevision: 4,
    location,
    eventId: "tie-target",
    now: "2026-07-24T04:00:04.000Z",
  }),
  () => moveLocalScoreProjectEvent({
    project: notationV2Tied,
    expectedRevision: 4,
    source: location,
    destination: location,
    eventId: "tie-source",
    targetIndex: 1,
    now: "2026-07-24T04:00:04.000Z",
  }),
]) {
  assert.throws(
    mutate,
    (error) =>
      error instanceof LocalScoreProjectDomainError
      && error.code === "tie-integrity",
  );
}
assert.throws(
  () => updateLocalScoreProjectEvent({
    project: notationV2Tied,
    expectedRevision: 4,
    location,
    eventId: "tie-target",
    input: { type: "note", pitch: "D4", duration: "eighth" },
    now: "2026-07-24T04:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "tie-integrity",
);
assert.throws(
  () => addLocalScoreProjectEvent({
    project: notationV2Base,
    expectedRevision: 1,
    location,
    eventId: "bad-lyric",
    input: {
      type: "note",
      pitch: "C4",
      duration: "quarter",
      lyric: `坏${String.fromCharCode(1)}`,
    },
    now: "2026-07-24T04:00:01.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "invalid-input",
);
const twoFour = changeLocalScoreProjectMeter({
  project: notationV2Base,
  expectedRevision: 1,
  meter: "2/4",
  now: "2026-07-24T04:00:01.000Z",
});
assert.throws(
  () => addLocalScoreProjectEvent({
    project: twoFour,
    expectedRevision: 2,
    location,
    eventId: "dotted-overflow",
    input: {
      type: "note",
      pitch: "C4",
      duration: "half",
      augmentationDots: 1,
    },
    now: "2026-07-24T04:00:02.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "measure-capacity",
);
const dottedQuarter = addLocalScoreProjectEvent({
  project: twoFour,
  expectedRevision: 2,
  location,
  eventId: "dotted-quarter",
  input: {
    type: "note",
    pitch: "C4",
    duration: "quarter",
    augmentationDots: 1,
  },
  now: "2026-07-24T04:00:02.000Z",
});
const exactDottedCapacity = addLocalScoreProjectEvent({
  project: dottedQuarter,
  expectedRevision: 3,
  location,
  eventId: "capacity-eighth",
  input: { type: "note", pitch: "D4", duration: "eighth" },
  now: "2026-07-24T04:00:03.000Z",
});
assert.equal(
  exactDottedCapacity.document.parts[0].staves[0].voices[0].measures[0]
    .events.length,
  2,
);

const crossMeasureEmpty = appendLocalScoreProjectMeasure({
  project: notationV2Base,
  expectedRevision: 1,
  partId: "part-1",
  staffId: "staff-1",
  voiceId: "voice-1",
  now: "2026-07-24T05:00:01.000Z",
});
const crossMeasureSource = addLocalScoreProjectEvent({
  project: crossMeasureEmpty,
  expectedRevision: 2,
  location,
  eventId: "cross-source",
  input: { type: "note", pitch: "E4", duration: "quarter" },
  now: "2026-07-24T05:00:02.000Z",
});
const crossMeasurePair = addLocalScoreProjectEvent({
  project: crossMeasureSource,
  expectedRevision: 3,
  location: secondMeasureLocation,
  eventId: "cross-target",
  input: { type: "note", pitch: "E4", duration: "quarter" },
  now: "2026-07-24T05:00:03.000Z",
});
assert.throws(
  () => updateLocalScoreProjectEvent({
    project: crossMeasurePair,
    expectedRevision: 4,
    location,
    eventId: "cross-source",
    input: {
      type: "note",
      pitch: "E4",
      duration: "quarter",
      tieToNext: true,
    },
    now: "2026-07-24T05:00:04.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "tie-integrity"
    && error.message.includes("跨小节时必须结束于小节线"),
);
assert.equal(crossMeasurePair.document.revision, 4);
assert.equal(
  crossMeasurePair.document.parts[0].staves[0].voices[0].measures[0]
    .events[0]?.type === "note"
    && crossMeasurePair.document.parts[0].staves[0].voices[0].measures[0]
      .events[0].tieToNext,
  false,
);
const invalidStoredGapTie = structuredClone(crossMeasurePair);
const invalidStoredSource =
  invalidStoredGapTie.document.parts[0].staves[0].voices[0].measures[0]
    .events[0];
assert.equal(Reflect.set(invalidStoredSource ?? {}, "tieToNext", true), true);
const invalidStoredGapTieSnapshot = JSON.stringify(invalidStoredGapTie);
assert.equal(parseLocalScoreProject(invalidStoredGapTie), null);
assert.equal(
  JSON.stringify(invalidStoredGapTie),
  invalidStoredGapTieSnapshot,
  "解析拒绝不得修改或修复原始持久化记录",
);

const legalCrossMeasureBase = changeLocalScoreProjectMeter({
  project: crossMeasureEmpty,
  expectedRevision: 2,
  meter: "2/4",
  now: "2026-07-24T05:10:01.000Z",
});
const legalCrossMeasurePrefix = addLocalScoreProjectEvent({
  project: legalCrossMeasureBase,
  expectedRevision: 3,
  location,
  eventId: "legal-prefix",
  input: { type: "note", pitch: "C4", duration: "quarter" },
  now: "2026-07-24T05:10:02.000Z",
});
const legalCrossMeasureSource = addLocalScoreProjectEvent({
  project: legalCrossMeasurePrefix,
  expectedRevision: 4,
  location,
  eventId: "legal-cross-source",
  input: { type: "note", pitch: "E4", duration: "quarter" },
  now: "2026-07-24T05:10:03.000Z",
});
const legalCrossMeasureTarget = addLocalScoreProjectEvent({
  project: legalCrossMeasureSource,
  expectedRevision: 5,
  location: secondMeasureLocation,
  eventId: "legal-cross-target",
  input: { type: "note", pitch: "E4", duration: "quarter" },
  now: "2026-07-24T05:10:04.000Z",
});
const legalCrossMeasureTail = addLocalScoreProjectEvent({
  project: legalCrossMeasureTarget,
  expectedRevision: 6,
  location: secondMeasureLocation,
  eventId: "legal-cross-tail",
  input: { type: "note", pitch: "E4", duration: "quarter" },
  now: "2026-07-24T05:10:05.000Z",
});
const legalTargetTied = updateLocalScoreProjectEvent({
  project: legalCrossMeasureTail,
  expectedRevision: 7,
  location: secondMeasureLocation,
  eventId: "legal-cross-target",
  input: {
    type: "note",
    pitch: "E4",
    duration: "quarter",
    tieToNext: true,
  },
  now: "2026-07-24T05:10:06.000Z",
});
const legalCrossMeasureTied = updateLocalScoreProjectEvent({
  project: legalTargetTied,
  expectedRevision: 8,
  location,
  eventId: "legal-cross-source",
  input: {
    type: "note",
    pitch: "E4",
    duration: "quarter",
    tieToNext: true,
  },
  now: "2026-07-24T05:10:07.000Z",
});
assert.equal(legalCrossMeasureTied.document.revision, 9);
assert.throws(
  () => changeLocalScoreProjectMeter({
    project: legalCrossMeasureTied,
    expectedRevision: 9,
    meter: "3/4",
    now: "2026-07-24T05:10:08.000Z",
  }),
  (error) =>
    error instanceof LocalScoreProjectDomainError
    && error.code === "tie-integrity",
);
assert.equal(legalCrossMeasureTied.document.meter, "2/4");

console.log("Local score project domain tests passed.");
