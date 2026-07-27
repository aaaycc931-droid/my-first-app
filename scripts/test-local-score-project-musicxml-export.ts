import assert from "node:assert/strict";
import { DOMParser as XmlDomParser } from "@xmldom/xmldom";
import { strFromU8, unzipSync } from "fflate";
import {
  createLocalScoreProject,
  parseLocalScoreProject,
  type LocalScoreProjectV1,
} from "../lib/music/localScoreProject";
import {
  confirmLocalScoreProjectMusicXmlExportDraft,
  createLocalScoreProjectMusicXmlExportDraft,
  type LocalScoreProjectMusicXmlExportDraft,
} from "../lib/music/localScoreProjectMusicXmlExport";
import { createLocalScoreProjectMusicXmlImportDraft } from "../lib/music/localScoreProjectMusicXmlImport";
import { parseMusicXML } from "../lib/musicxml/musicxmlParser";
import {
  extractMusicXMLFromMxl,
} from "../lib/musicxml/mxlExtractor";
import type { LocalScoreProjectEventV9 } from "../lib/music/scoreDocument";
import {
  createMusicXmlMxlArchive,
  MUSICXML_MIME_TYPE,
  MXL_MIME_TYPE,
} from "../lib/musicxml/mxlWriter";

if (typeof globalThis.DOMParser === "undefined") {
  class QuietXmlDomParser extends XmlDomParser {
    constructor() {
      super({
        onError: (_level, message) => {
          throw new Error(message);
        },
      });
    }
  }
  (globalThis as { DOMParser?: unknown }).DOMParser = QuietXmlDomParser;
}

const createSupportedProject = (): LocalScoreProjectV1 => {
  const base = createLocalScoreProject({
    projectId: "export-project-1",
    title: "基础 & <视唱>",
    now: "2026-07-27T09:00:00.000Z",
  });
  const candidate: LocalScoreProjectV1 = {
    ...base,
    document: {
      ...base.document,
      meter: "4/4",
      keySignature: { fifths: 1 },
      parts: [{
        ...base.document.parts[0],
        name: "旋律 & <主声部>",
        staves: [{
          ...base.document.parts[0].staves[0],
          clef: "treble",
          voices: [{
            ...base.document.parts[0].staves[0].voices[0],
            measures: [{
              measureNumber: 1,
              events: [{
                id: "event-1",
                type: "note",
                pitch: "C4",
                duration: "quarter",
                measure: 1,
                augmentationDots: 0,
                tieToNext: false,
                slurToNext: false,
                lyric: null,
                fingering: null,
                chordSymbol: null,
                articulations: [],
                dynamicMark: null,
                damperPedalMark: null,
                fermataMark: null,
              }, {
                id: "event-2",
                type: "rest",
                pitch: null,
                duration: "quarter",
                measure: 1,
                augmentationDots: 0,
                chordSymbol: null,
                dynamicMark: null,
                damperPedalMark: null,
                fermataMark: null,
              }, {
                id: "event-3",
                type: "note",
                pitch: "C5",
                duration: "half",
                measure: 1,
                augmentationDots: 0,
                tieToNext: false,
                slurToNext: false,
                lyric: null,
                fingering: null,
                chordSymbol: null,
                articulations: [],
                dynamicMark: null,
                damperPedalMark: null,
                fermataMark: null,
              }],
            }, {
              measureNumber: 2,
              events: [{
                id: "event-4",
                type: "note",
                pitch: "D4",
                duration: "eighth",
                measure: 2,
                augmentationDots: 0,
                tieToNext: false,
                slurToNext: false,
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
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "supported export fixture must be canonical");
  return parsed;
};

const musicalProjection = (project: LocalScoreProjectV1) => ({
  title: project.title,
  scoreTitle: project.document.scoreCredits.title,
  tempoBpm: project.tempoBpm,
  meter: project.document.meter,
  fifths: project.document.keySignature.fifths,
  partName: project.document.parts[0].name,
  clef: project.document.parts[0].staves[0].clef,
  measures: project.document.parts[0].staves[0].voices[0].measures.map(
    (measure) => ({
      measureNumber: measure.measureNumber,
      events: measure.events.map((event) => ({
        type: event.type,
        pitch: event.pitch,
        duration: event.duration,
        measure: event.measure,
      })),
    }),
  ),
});

const project = createSupportedProject();
const sourceSnapshot = JSON.stringify(project);
const ready = createLocalScoreProjectMusicXmlExportDraft({ project });
assert.equal(JSON.stringify(project), sourceSnapshot, "export draft must be pure");
assert.equal(ready.status, "ready");
assert.equal(ready.issues.length, 0);
assert.ok(ready.xml);
assert.ok(ready.fileNames);
assert.ok(ready.byteSizes);
assert.equal(
  ready.byteSizes?.musicxml,
  new TextEncoder().encode(ready.xml ?? "").byteLength,
);
assert.deepEqual(ready.summary, {
  partCount: 1,
  staffCount: 1,
  voiceCount: 1,
  measureCount: 2,
  eventCount: 4,
});
assert.match(ready.xml, /<work-title>基础 &amp; &lt;视唱&gt;<\/work-title>/);
assert.match(ready.xml, /<part-name>旋律 &amp; &lt;主声部&gt;<\/part-name>/);
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({ project }),
  ready,
  "same canonical revision must produce a deterministic draft",
);

const xmlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: ready,
  currentProject: project,
  format: "musicxml",
});
assert.equal(xmlPayload.mimeType, MUSICXML_MIME_TYPE);
assert.equal(xmlPayload.fileName, ready.fileNames?.musicxml);
assert.equal(xmlPayload.data, ready.xml);

let importedEventIndex = 0;
const reopenedXml = createLocalScoreProjectMusicXmlImportDraft({
  xml: String(xmlPayload.data),
  fileName: xmlPayload.fileName,
  sourceFormat: "musicxml",
  projectId: project.projectId,
  now: project.createdAt,
  createEventId: () => `reopened-event-${++importedEventIndex}`,
});
assert.equal(reopenedXml.status, "ready");
assert.ok(reopenedXml.project);
assert.deepEqual(
  musicalProjection(reopenedXml.project),
  musicalProjection(project),
  "the strict importer must reopen all supported canonical semantics",
);

const legacyParsed = parseMusicXML(ready.xml);
assert.deepEqual(
  legacyParsed.notes.map(({ pitch, duration, measure, beat }) => ({
    pitch,
    duration,
    measure,
    beat,
  })),
  [
    { pitch: "C4", duration: "quarter", measure: 1, beat: 1 },
    { pitch: "C5", duration: "half", measure: 1, beat: 3 },
    { pitch: "D4", duration: "eighth", measure: 2, beat: 1 },
  ],
  "the independent legacy parser must read the exported note timeline",
);

const mxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: ready,
  currentProject: project,
  format: "mxl",
});
assert.equal(mxlPayload.mimeType, MXL_MIME_TYPE);
assert.equal(mxlPayload.fileName, ready.fileNames?.mxl);
assert.ok(mxlPayload.data instanceof Uint8Array);
const mxlData = mxlPayload.data as Uint8Array;
assert.equal(ready.byteSizes?.mxl, mxlData.byteLength);
assert.deepEqual(
  mxlData,
  createMusicXmlMxlArchive(ready.xml),
  "MXL generation must be deterministic",
);
assert.equal(
  new TextDecoder().decode(mxlData.slice(30, 38)),
  "mimetype",
  "the uncompressed mimetype entry must be first",
);
assert.equal(
  mxlData[8] | mxlData[9] << 8,
  0,
  "the leading mimetype entry must use the ZIP store method",
);
const mxlEntries = unzipSync(mxlData);
assert.equal(strFromU8(mxlEntries.mimetype), MXL_MIME_TYPE);
const mxlContainer = strFromU8(mxlEntries["META-INF/container.xml"]);
assert.match(mxlContainer, /<container>\s*<rootfiles>/);
assert.doesNotMatch(mxlContainer, /<container[^>]+(?:xmlns|version)=/);
assert.match(
  mxlContainer,
  /full-path="score\.musicxml"[\s\S]*media-type="application\/vnd\.recordare\.musicxml\+xml"/,
);
assert.equal(extractMusicXMLFromMxl(mxlData), ready.xml);
const reopenedMxl = createLocalScoreProjectMusicXmlImportDraft({
  xml: extractMusicXMLFromMxl(mxlData),
  fileName: mxlPayload.fileName,
  sourceFormat: "mxl",
  projectId: project.projectId,
  now: project.createdAt,
  createEventId: () => `reopened-mxl-event-${++importedEventIndex}`,
});
assert.equal(reopenedMxl.status, "ready");
assert.ok(reopenedMxl.project);
assert.deepEqual(
  musicalProjection(reopenedMxl.project),
  musicalProjection(project),
  "MXL extraction plus the strict importer must preserve supported semantics",
);

const changedProject: LocalScoreProjectV1 = {
  ...project,
  document: {
    ...project.document,
    revision: project.document.revision + 1,
  },
  updatedAt: "2026-07-27T09:01:00.000Z",
};
assert.throws(
  () => confirmLocalScoreProjectMusicXmlExportDraft({
    draft: ready,
    currentProject: changedProject,
    format: "musicxml",
  }),
  /已变化/,
);
assert.throws(
  () => confirmLocalScoreProjectMusicXmlExportDraft({
    draft: {
      ...ready,
      xml: `${ready.xml}<!-- tampered -->`,
    },
    currentProject: project,
    format: "musicxml",
  }),
  /候选已变化/,
);
assert.throws(
  () => confirmLocalScoreProjectMusicXmlExportDraft({
    draft: {
      ...ready,
      sourceFingerprint: `${ready.sourceFingerprint}-tampered`,
    },
    currentProject: project,
    format: "mxl",
  }),
  /已变化/,
);
assert.throws(
  () => confirmLocalScoreProjectMusicXmlExportDraft({
    draft: ready,
    currentProject: project,
    format: "xml" as never,
  }),
  /格式无效/,
);

const withChanges = (
  changes: Partial<LocalScoreProjectV1>,
): LocalScoreProjectV1 => ({
  ...project,
  ...changes,
});
const sourceNote =
  project.document.parts[0].staves[0].voices[0].measures[0].events[0];
const sourceRest =
  project.document.parts[0].staves[0].voices[0].measures[0].events[1];
assert.equal(sourceNote.type, "note");
assert.equal(sourceRest.type, "rest");
if (sourceNote.type !== "note" || sourceRest.type !== "rest") {
  throw new Error("export fixture event types changed unexpectedly");
}
const withFirstMeasureEvents = (
  events: readonly LocalScoreProjectEventV9[],
): LocalScoreProjectV1 => withChanges({
  document: {
    ...project.document,
    parts: [{
      ...project.document.parts[0],
      staves: [{
        ...project.document.parts[0].staves[0],
        voices: [{
          ...project.document.parts[0].staves[0].voices[0],
          measures: [{ measureNumber: 1, events }],
        }],
      }],
    }],
  },
});
const emptyMeasure = [{ measureNumber: 1, events: [] }] as const;
const blockedFixtures: readonly [
  LocalScoreProjectV1,
  readonly string[],
][] = [
  [
    withChanges({ tempoBpm: 120 }),
    ["unsupported-tempo"],
  ],
  [
    withChanges({ title: "另一个项目名称" }),
    ["unsupported-distinct-score-title"],
  ],
  [
    withChanges({
      document: {
        ...project.document,
        scoreCredits: {
          ...project.document.scoreCredits,
          subtitle: "副标题",
          creators: [{ role: "composer", name: "作者" }],
          rightsNotice: "保留权利",
        },
      },
    }),
    ["unsupported-subtitle", "unsupported-creators", "unsupported-rights-notice"],
  ],
  [
    withChanges({
      document: {
        ...project.document,
        parts: [{
          ...project.document.parts[0],
          instrument: { kind: "gm1-program", program: 1 },
        }],
      },
    }),
    ["unsupported-instrument"],
  ],
  [
    withChanges({
      document: {
        ...project.document,
        parts: [
          project.document.parts[0],
          {
            ...project.document.parts[0],
            partId: "part-2",
            name: "第二声部组",
            staves: [{
              ...project.document.parts[0].staves[0],
              staffId: "part-2-staff-1",
              voices: [{
                ...project.document.parts[0].staves[0].voices[0],
                voiceId: "part-2-voice-1",
                measures: emptyMeasure,
              }],
            }],
          },
        ],
      },
    }),
    ["unsupported-part-count"],
  ],
  [
    withChanges({
      document: {
        ...project.document,
        parts: [{
          ...project.document.parts[0],
          staves: [
            project.document.parts[0].staves[0],
            {
              ...project.document.parts[0].staves[0],
              staffId: "staff-2",
              voices: [{
                ...project.document.parts[0].staves[0].voices[0],
                voiceId: "staff-2-voice-1",
                measures: emptyMeasure,
              }],
            },
          ],
        }],
      },
    }),
    ["unsupported-staff-count"],
  ],
  [
    withChanges({
      document: {
        ...project.document,
        parts: [{
          ...project.document.parts[0],
          staves: [{
            ...project.document.parts[0].staves[0],
            voices: [
              project.document.parts[0].staves[0].voices[0],
              {
                ...project.document.parts[0].staves[0].voices[0],
                voiceId: "voice-2",
                measures: emptyMeasure,
              },
            ],
          }],
        }],
      },
    }),
    ["unsupported-voice-count"],
  ],
  [
    withFirstMeasureEvents([{
      ...sourceNote,
      augmentationDots: 1,
      lyric: "la",
      fingering: 1,
      chordSymbol: "C",
      articulations: ["accent"],
      dynamicMark: "f",
      damperPedalMark: "down",
      fermataMark: "fermata",
    }, {
      ...sourceRest,
      chordSymbol: "Dm",
      dynamicMark: "p",
      damperPedalMark: "up",
      fermataMark: "fermata",
    }]),
    [
      "unsupported-augmentation-dot",
      "unsupported-chord-symbol",
      "unsupported-dynamic",
      "unsupported-damper-pedal",
      "unsupported-fermata",
      "unsupported-lyric",
      "unsupported-fingering",
      "unsupported-articulation",
    ],
  ],
  [
    withFirstMeasureEvents([{
      ...sourceNote,
      tieToNext: true,
    }, {
      ...sourceNote,
      id: "tied-event-2",
    }]),
    ["unsupported-tie"],
  ],
  [
    withFirstMeasureEvents([{
      ...sourceNote,
      slurToNext: true,
    }, {
      ...sourceNote,
      id: "slurred-event-2",
      pitch: "D4",
    }]),
    ["unsupported-slur"],
  ],
  [
    withFirstMeasureEvents(Array.from({ length: 5 }, (_, index) => ({
      ...sourceNote,
      id: `overfull-event-${index + 1}`,
    }))),
    ["overfull-measure"],
  ],
  [
    createLocalScoreProject({
      projectId: "empty-project",
      title: "空白项目",
      now: "2026-07-27T09:02:00.000Z",
    }),
    ["missing-events"],
  ],
];

for (const [blockedProject, expectedCodes] of blockedFixtures) {
  const blocked = createLocalScoreProjectMusicXmlExportDraft({
    project: blockedProject,
  });
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.xml, null);
  assert.equal(blocked.fileNames, null);
  assert.equal(blocked.byteSizes, null);
  const codes = blocked.issues.map((issue) => issue.code);
  for (const code of expectedCodes) {
    assert.ok(codes.includes(code), `missing export blocking code: ${code}`);
  }
  assert.throws(
    () => confirmLocalScoreProjectMusicXmlExportDraft({
      draft: blocked,
      currentProject: blockedProject,
      format: "musicxml",
    }),
    /阻断问题/,
  );
}

const invalidCanonical = {
  ...project,
  document: {
    ...project.document,
    parts: [{
      ...project.document.parts[0],
      staves: [{
        ...project.document.parts[0].staves[0],
        voices: [{
          ...project.document.parts[0].staves[0].voices[0],
          measures: [{
            measureNumber: 1,
            events: [{
              ...project.document.parts[0].staves[0].voices[0].measures[0].events[0],
              pitch: "F#4",
            }],
          }],
        }],
      }],
    }],
  },
} as unknown as LocalScoreProjectV1;
const invalidDraft = createLocalScoreProjectMusicXmlExportDraft({
  project: invalidCanonical,
});
assert.equal(invalidDraft.status, "blocked");
assert.deepEqual(
  invalidDraft.issues.map((issue) => issue.code),
  ["invalid-canonical-project"],
);

const largeProject = withChanges({
  document: {
    ...project.document,
    parts: [{
      ...project.document.parts[0],
      staves: [{
        ...project.document.parts[0].staves[0],
        voices: [{
          ...project.document.parts[0].staves[0].voices[0],
          measures: Array.from({ length: 12_000 }, (_, index) => ({
            measureNumber: index + 1,
            events: [{
              ...sourceNote,
              id: `large-event-${index + 1}`,
              measure: index + 1,
              duration: "eighth" as const,
            }],
          })),
        }],
      }],
    }],
  },
});
const oversizedDraft = createLocalScoreProjectMusicXmlExportDraft({
  project: largeProject,
});
assert.equal(oversizedDraft.status, "blocked");
assert.ok(
  oversizedDraft.issues.some((issue) => issue.code === "musicxml-size-limit"),
  "MusicXML output above 2 MiB must fail closed",
);
assert.equal(oversizedDraft.xml, null);

const tamperedReady = {
  ...ready,
  summary: { ...ready.summary, eventCount: 99 },
} satisfies LocalScoreProjectMusicXmlExportDraft;
assert.throws(
  () => confirmLocalScoreProjectMusicXmlExportDraft({
    draft: tamperedReady,
    currentProject: project,
    format: "musicxml",
  }),
  /候选已变化/,
);

console.log("Local score project MusicXML/MXL export tests passed.");
