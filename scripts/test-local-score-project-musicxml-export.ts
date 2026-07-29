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
                fermataMark: "fermata",
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
                fermataMark: "fermata",
              }, {
                id: "event-3",
                type: "note",
                pitch: "C5",
                duration: "half",
                measure: 1,
                augmentationDots: 0,
                tieToNext: true,
                slurToNext: true,
                lyric: null,
                fingering: null,
                chordSymbol: null,
                articulations: [],
                dynamicMark: null,
                damperPedalMark: null,
                fermataMark: "fermata",
              }],
            }, {
              measureNumber: 2,
              events: [{
                id: "event-4",
                type: "note",
                pitch: "C5",
                duration: "eighth",
                measure: 2,
                augmentationDots: 0,
                tieToNext: true,
                slurToNext: true,
                lyric: null,
                fingering: null,
                chordSymbol: null,
                articulations: [],
                dynamicMark: null,
                damperPedalMark: null,
                fermataMark: "fermata",
              }, {
                id: "event-5",
                type: "note",
                pitch: "C5",
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
        augmentationDots: event.augmentationDots,
        lyric: event.type === "note" ? event.lyric : null,
        fingering: event.type === "note" ? event.fingering : null,
        fermataMark: event.fermataMark,
        tieToNext: event.type === "note" ? event.tieToNext : null,
        slurToNext: event.type === "note" ? event.slurToNext : null,
      })),
    }),
  ),
});

const createDottedSupportedProject = (): LocalScoreProjectV1 => {
  const base = createSupportedProject();
  const firstMeasure = base.document.parts[0].staves[0].voices[0].measures[0];
  const secondMeasure = base.document.parts[0].staves[0].voices[0].measures[1];
  const candidate: LocalScoreProjectV1 = {
    ...base,
    document: {
      ...base.document,
      parts: [{
        ...base.document.parts[0],
        staves: [{
          ...base.document.parts[0].staves[0],
          voices: [{
            ...base.document.parts[0].staves[0].voices[0],
            measures: [{
              ...firstMeasure,
              events: [{
                ...firstMeasure.events[0],
                augmentationDots: 1,
              }, {
                ...firstMeasure.events[1],
                augmentationDots: 1,
              }, {
                ...firstMeasure.events[2],
                duration: "quarter",
              }],
            }, {
              ...secondMeasure,
              events: secondMeasure.events.map((event) => ({
                ...event,
                augmentationDots: 1 as const,
              })),
            }, {
              measureNumber: 3,
              events: [{
                ...firstMeasure.events[0],
                id: "dotted-half-event",
                duration: "half",
                measure: 3,
                augmentationDots: 1,
                fermataMark: null,
              }],
            }],
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "dotted export fixture must be canonical");
  return parsed;
};

const lyricText = "你好 😀 内部 空格 & < > \" '";

const createLyricSupportedProject = (): LocalScoreProjectV1 => {
  const base = createDottedSupportedProject();
  const measures = base.document.parts[0].staves[0].voices[0].measures;
  const candidate: LocalScoreProjectV1 = {
    ...base,
    document: {
      ...base.document,
      parts: [{
        ...base.document.parts[0],
        staves: [{
          ...base.document.parts[0].staves[0],
          voices: [{
            ...base.document.parts[0].staves[0].voices[0],
            measures: measures.map((measure) => ({
              ...measure,
              events: measure.events.map((event) =>
                event.id === "event-4" && event.type === "note"
                  ? { ...event, lyric: lyricText }
                  : event),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "lyric export fixture must be canonical");
  return parsed;
};

const createFingeringSupportedProject = (): LocalScoreProjectV1 => {
  const base = createLyricSupportedProject();
  const measures = base.document.parts[0].staves[0].voices[0].measures;
  const candidate: LocalScoreProjectV1 = {
    ...base,
    document: {
      ...base.document,
      parts: [{
        ...base.document.parts[0],
        staves: [{
          ...base.document.parts[0].staves[0],
          voices: [{
            ...base.document.parts[0].staves[0].voices[0],
            measures: measures.map((measure) => ({
              ...measure,
              events: measure.events.map((event) => {
                if (event.type !== "note") return event;
                if (event.id === "event-4") return { ...event, fingering: 1 };
                if (event.id === "event-5") return { ...event, fingering: 5 };
                return event;
              }),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "fingering export fixture must be canonical");
  return parsed;
};

const project = createSupportedProject();
const sourceSnapshot = JSON.stringify(project);
const ready = createLocalScoreProjectMusicXmlExportDraft({ project });
assert.equal(JSON.stringify(project), sourceSnapshot, "export draft must be pure");
assert.equal(ready.status, "ready");
assert.equal(ready.issues.length, 0);
assert.ok(ready.xml);
assert.ok(ready.fileNames);
assert.ok(ready.byteSizes);
assert.match(ready.xml, /<divisions>4<\/divisions>/);
assert.equal(
  ready.byteSizes?.musicxml,
  new TextEncoder().encode(ready.xml ?? "").byteLength,
);
assert.deepEqual(ready.summary, {
  partCount: 1,
  staffCount: 1,
  voiceCount: 1,
  measureCount: 2,
  eventCount: 5,
});
assert.match(ready.xml, /<work-title>基础 &amp; &lt;视唱&gt;<\/work-title>/);
assert.match(ready.xml, /<part-name>旋律 &amp; &lt;主声部&gt;<\/part-name>/);
assert.equal(
  ready.xml.match(/<notations><fermata\/><\/notations>/g)?.length,
  2,
  "note and rest fermatas must be exported deterministically",
);
assert.equal(
  ready.xml.match(/<tie type="start"\/>/g)?.length,
  2,
  "each canonical tie must emit one direct start",
);
assert.equal(
  ready.xml.match(/<tie type="stop"\/>/g)?.length,
  2,
  "each canonical tie target must emit one direct stop",
);
assert.equal(
  ready.xml.match(/<tied type="start"\/>/g)?.length,
  2,
  "each canonical tie must emit one notated start",
);
assert.equal(
  ready.xml.match(/<tied type="stop"\/>/g)?.length,
  2,
  "each canonical tie target must emit one notated stop",
);
assert.match(
  ready.xml,
  /<duration>8<\/duration>\s*<tie type="start"\/>\s*<voice>1<\/voice>[\s\S]*?<notations><fermata\/><tied type="start"\/><slur type="start"\/><\/notations>/,
  "the cross-measure source must export direct and notated tie starts in fixed order",
);
assert.match(
  ready.xml,
  /<duration>2<\/duration>\s*<tie type="stop"\/>\s*<tie type="start"\/>\s*<voice>1<\/voice>[\s\S]*?<notations><fermata\/><tied type="stop"\/><tied type="start"\/><slur type="stop"\/><slur type="start"\/><\/notations>/,
  "the chain midpoint must emit tie stop before start and share one deterministic notations container",
);
assert.match(
  ready.xml,
  /<duration>2<\/duration>\s*<tie type="stop"\/>\s*<voice>1<\/voice>[\s\S]*?<notations><tied type="stop"\/><slur type="stop"\/><\/notations>/,
  "the chain target must export matching direct and notated tie stops",
);
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
    { pitch: "C5", duration: "eighth", measure: 2, beat: 1 },
    { pitch: "C5", duration: "eighth", measure: 2, beat: 1.5 },
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

const dottedProject = createDottedSupportedProject();
const dottedSnapshot = JSON.stringify(dottedProject);
const dottedReady = createLocalScoreProjectMusicXmlExportDraft({
  project: dottedProject,
});
assert.equal(
  JSON.stringify(dottedProject),
  dottedSnapshot,
  "dotted export draft must be pure",
);
assert.equal(dottedReady.status, "ready");
assert.ok(dottedReady.xml);
assert.match(dottedReady.xml, /<divisions>4<\/divisions>/);
assert.equal(
  dottedReady.xml.match(/<dot\/>/g)?.length,
  5,
  "each canonical single dot must emit exactly one MusicXML dot",
);
assert.match(
  dottedReady.xml,
  /<rest\/>\s*<duration>6<\/duration>\s*<voice>1<\/voice>\s*<type>quarter<\/type>\s*<dot\/>\s*<staff>1<\/staff>/,
  "a dotted quarter rest must use duration 6 and place dot after type",
);
assert.match(
  dottedReady.xml,
  /<duration>3<\/duration>\s*<tie type="stop"\/>\s*<tie type="start"\/>\s*<voice>1<\/voice>\s*<type>eighth<\/type>\s*<dot\/>\s*<staff>1<\/staff>\s*<notations><fermata\/><tied type="stop"\/><tied type="start"\/><slur type="stop"\/><slur type="start"\/><\/notations>/,
  "a dotted eighth must coexist deterministically with fermata, tie, and slur markup",
);
assert.match(
  dottedReady.xml,
  /<duration>12<\/duration>\s*<voice>1<\/voice>\s*<type>half<\/type>\s*<dot\/>\s*<staff>1<\/staff>/,
  "a dotted half note must use duration 12 and place dot after type",
);
assert.deepEqual(
  parseMusicXML(dottedReady.xml).notes.map(
    ({ pitch, duration, measure, beat }) => ({
      pitch,
      duration,
      measure,
      beat,
    }),
  ),
  [
    { pitch: "C4", duration: "quarter", measure: 1, beat: 1 },
    { pitch: "C5", duration: "quarter", measure: 1, beat: 4 },
    { pitch: "C5", duration: "eighth", measure: 2, beat: 1 },
    { pitch: "C5", duration: "eighth", measure: 2, beat: 1.75 },
    { pitch: "C4", duration: "half", measure: 3, beat: 1 },
  ],
  "legacy parsing must keep base duration enums while advancing beats by dotted raw durations",
);
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({ project: dottedProject }),
  dottedReady,
  "the same dotted canonical revision must produce a deterministic draft",
);

const dottedXmlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: dottedReady,
  currentProject: dottedProject,
  format: "musicxml",
});
const reopenedDottedXml = createLocalScoreProjectMusicXmlImportDraft({
  xml: String(dottedXmlPayload.data),
  fileName: dottedXmlPayload.fileName,
  sourceFormat: "musicxml",
  projectId: dottedProject.projectId,
  now: dottedProject.createdAt,
  createEventId: () => `reopened-dotted-event-${++importedEventIndex}`,
});
assert.equal(reopenedDottedXml.status, "ready");
assert.ok(reopenedDottedXml.project);
assert.deepEqual(
  musicalProjection(reopenedDottedXml.project),
  musicalProjection(dottedProject),
  "strict MusicXML re-import must preserve augmentationDots and coexisting notation",
);

const dottedMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: dottedReady,
  currentProject: dottedProject,
  format: "mxl",
});
assert.ok(dottedMxlPayload.data instanceof Uint8Array);
assert.deepEqual(
  dottedMxlPayload.data,
  createMusicXmlMxlArchive(dottedReady.xml),
  "dotted MXL generation must remain deterministic",
);
const reopenedDottedMxl = createLocalScoreProjectMusicXmlImportDraft({
  xml: extractMusicXMLFromMxl(dottedMxlPayload.data as Uint8Array),
  fileName: dottedMxlPayload.fileName,
  sourceFormat: "mxl",
  projectId: dottedProject.projectId,
  now: dottedProject.createdAt,
  createEventId: () => `reopened-dotted-mxl-event-${++importedEventIndex}`,
});
assert.equal(reopenedDottedMxl.status, "ready");
assert.ok(reopenedDottedMxl.project);
assert.deepEqual(
  musicalProjection(reopenedDottedMxl.project),
  musicalProjection(dottedProject),
  "strict MXL re-import must preserve augmentationDots and coexisting notation",
);

const lyricProject = createLyricSupportedProject();
const lyricSnapshot = JSON.stringify(lyricProject);
const lyricReady = createLocalScoreProjectMusicXmlExportDraft({
  project: lyricProject,
});
assert.equal(
  JSON.stringify(lyricProject),
  lyricSnapshot,
  "lyric export draft must be pure",
);
assert.equal(lyricReady.status, "ready");
assert.deepEqual(lyricReady.issues, []);
assert.ok(lyricReady.xml);
assert.match(
  lyricReady.xml,
  /<duration>3<\/duration>\s*<tie type="stop"\/>\s*<tie type="start"\/>\s*<voice>1<\/voice>\s*<type>eighth<\/type>\s*<dot\/>\s*<staff>1<\/staff>\s*<notations><fermata\/><tied type="stop"\/><tied type="start"\/><slur type="stop"\/><slur type="start"\/><\/notations>\s*<lyric><text>你好 😀 内部 空格 &amp; &lt; &gt; &quot; &apos;<\/text><\/lyric>\s*<\/note>/,
  "escaped exact lyric text must follow notations on the dotted chain midpoint",
);
assert.deepEqual(
  parseMusicXML(lyricReady.xml),
  parseMusicXML(dottedReady.xml),
  "legacy parsing must ignore lyric markup without changing note timing",
);
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({ project: lyricProject }),
  lyricReady,
  "the same lyric canonical revision must produce a deterministic draft",
);

const lyricXmlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: lyricReady,
  currentProject: lyricProject,
  format: "musicxml",
});
const reopenedLyricXml = createLocalScoreProjectMusicXmlImportDraft({
  xml: String(lyricXmlPayload.data),
  fileName: lyricXmlPayload.fileName,
  sourceFormat: "musicxml",
  projectId: lyricProject.projectId,
  now: lyricProject.createdAt,
  createEventId: () => `reopened-lyric-event-${++importedEventIndex}`,
});
assert.equal(reopenedLyricXml.status, "ready");
assert.ok(reopenedLyricXml.project);
assert.deepEqual(
  musicalProjection(reopenedLyricXml.project),
  musicalProjection(lyricProject),
  "strict MusicXML re-import must preserve exact escaped lyric text",
);

const lyricMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: lyricReady,
  currentProject: lyricProject,
  format: "mxl",
});
assert.ok(lyricMxlPayload.data instanceof Uint8Array);
assert.deepEqual(
  lyricMxlPayload.data,
  createMusicXmlMxlArchive(lyricReady.xml),
  "lyric MXL generation must remain deterministic",
);
const reopenedLyricMxl = createLocalScoreProjectMusicXmlImportDraft({
  xml: extractMusicXMLFromMxl(lyricMxlPayload.data as Uint8Array),
  fileName: lyricMxlPayload.fileName,
  sourceFormat: "mxl",
  projectId: lyricProject.projectId,
  now: lyricProject.createdAt,
  createEventId: () => `reopened-lyric-mxl-event-${++importedEventIndex}`,
});
assert.equal(reopenedLyricMxl.status, "ready");
assert.ok(reopenedLyricMxl.project);
assert.deepEqual(
  musicalProjection(reopenedLyricMxl.project),
  musicalProjection(lyricProject),
  "strict MXL re-import must preserve exact escaped lyric text",
);

const fingeringProject = createFingeringSupportedProject();
const fingeringSnapshot = JSON.stringify(fingeringProject);
const fingeringReady = createLocalScoreProjectMusicXmlExportDraft({
  project: fingeringProject,
});
assert.equal(
  JSON.stringify(fingeringProject),
  fingeringSnapshot,
  "fingering export draft must be pure",
);
assert.equal(fingeringReady.status, "ready");
assert.deepEqual(fingeringReady.issues, []);
assert.ok(fingeringReady.xml);
assert.match(
  fingeringReady.xml,
  /<notations><fermata\/><tied type="stop"\/><tied type="start"\/><slur type="stop"\/><slur type="start"\/><technical><fingering>1<\/fingering><\/technical><\/notations>\s*<lyric><text>你好 😀 内部 空格 &amp; &lt; &gt; &quot; &apos;<\/text><\/lyric>/,
  "fingering must share the deterministic notations container with all existing strict marks",
);
assert.match(
  fingeringReady.xml,
  /<notations><tied type="stop"\/><slur type="stop"\/><technical><fingering>5<\/fingering><\/technical><\/notations>/,
  "the upper boundary fingering must coexist with tie and slur stops",
);
assert.deepEqual(
  parseMusicXML(fingeringReady.xml),
  parseMusicXML(lyricReady.xml),
  "legacy parsing must ignore technical fingering without changing note timing",
);
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({ project: fingeringProject }),
  fingeringReady,
  "the same fingering canonical revision must produce a deterministic draft",
);

const fingeringXmlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: fingeringReady,
  currentProject: fingeringProject,
  format: "musicxml",
});
const reopenedFingeringXml = createLocalScoreProjectMusicXmlImportDraft({
  xml: String(fingeringXmlPayload.data),
  fileName: fingeringXmlPayload.fileName,
  sourceFormat: "musicxml",
  projectId: fingeringProject.projectId,
  now: fingeringProject.createdAt,
  createEventId: () => `reopened-fingering-event-${++importedEventIndex}`,
});
assert.equal(reopenedFingeringXml.status, "ready");
assert.ok(reopenedFingeringXml.project);
assert.deepEqual(
  musicalProjection(reopenedFingeringXml.project),
  musicalProjection(fingeringProject),
  "strict MusicXML re-import must preserve fingering 1 and 5",
);

const fingeringMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: fingeringReady,
  currentProject: fingeringProject,
  format: "mxl",
});
assert.ok(fingeringMxlPayload.data instanceof Uint8Array);
assert.deepEqual(
  fingeringMxlPayload.data,
  createMusicXmlMxlArchive(fingeringReady.xml),
  "fingering MXL generation must remain deterministic",
);
const reopenedFingeringMxl = createLocalScoreProjectMusicXmlImportDraft({
  xml: extractMusicXMLFromMxl(fingeringMxlPayload.data as Uint8Array),
  fileName: fingeringMxlPayload.fileName,
  sourceFormat: "mxl",
  projectId: fingeringProject.projectId,
  now: fingeringProject.createdAt,
  createEventId: () => `reopened-fingering-mxl-event-${++importedEventIndex}`,
});
assert.equal(reopenedFingeringMxl.status, "ready");
assert.ok(reopenedFingeringMxl.project);
assert.deepEqual(
  musicalProjection(reopenedFingeringMxl.project),
  musicalProjection(fingeringProject),
  "strict MXL re-import must preserve fingering 1 and 5",
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
const maxLyricProject = withFirstMeasureEvents([{
  ...sourceNote,
  lyric: `${"歌".repeat(79)}🎵`,
}]);
const maxLyricDraft = createLocalScoreProjectMusicXmlExportDraft({
  project: maxLyricProject,
});
assert.equal(maxLyricDraft.status, "ready");
assert.match(
  maxLyricDraft.xml ?? "",
  new RegExp(`<lyric><text>${"歌".repeat(79)}🎵</text></lyric>`),
  "80 Unicode code points must remain exportable",
);
const invalidLyricCases = [
  ["empty", ""],
  ["whitespace-only", "   "],
  ["outer-whitespace", " la "],
  ["over-80-code-points", "歌".repeat(81)],
  ["c0-control", "la\u0001"],
  ["c1-control", "la\u0085"],
  ["lone-high-surrogate", "la\ud800"],
  ["lone-low-surrogate", "la\udfff"],
  ["unicode-line-separator", "la\u2028next"],
  ["unicode-paragraph-separator", "la\u2029next"],
  ["unicode-fffe", "la\ufffe"],
  ["unicode-ffff", "la\uffff"],
  ["above-xml-1.0-range", `la${String.fromCodePoint(0xf0000)}`],
] as const;
for (const [label, lyric] of invalidLyricCases) {
  const invalidLyricProject = withFirstMeasureEvents([{
    ...sourceNote,
    lyric,
  }]);
  const invalidLyricDraft = createLocalScoreProjectMusicXmlExportDraft({
    project: invalidLyricProject,
  });
  assert.equal(invalidLyricDraft.status, "blocked", label);
  assert.equal(invalidLyricDraft.xml, null, label);
  assert.equal(
    invalidLyricDraft.issues[0]?.code,
    "unsupported-lyric",
    `${label} must produce the stable lyric blocker before any generic canonical blocker`,
  );
  assert.throws(
    () => confirmLocalScoreProjectMusicXmlExportDraft({
      draft: invalidLyricDraft,
      currentProject: invalidLyricProject,
      format: "musicxml",
    }),
    /阻断问题/,
  );
}

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
      lyric: "la",
      fingering: 1,
      chordSymbol: "C",
      articulations: ["accent"],
      dynamicMark: "f",
      damperPedalMark: "down",
    }, {
      ...sourceRest,
      chordSymbol: "Dm",
      dynamicMark: "p",
      damperPedalMark: "up",
    }]),
    [
      "unsupported-chord-symbol",
      "unsupported-dynamic",
      "unsupported-damper-pedal",
      "unsupported-articulation",
    ],
  ],
  [
    withFirstMeasureEvents([{
      ...sourceRest,
      duration: "half",
      augmentationDots: 1,
    }]),
    ["invalid-canonical-project"],
  ],
  [
    withFirstMeasureEvents(Array.from({ length: 3 }, (_, index) => ({
      ...sourceNote,
      id: `overfull-event-${index + 1}`,
      duration: "half" as const,
      augmentationDots: 1 as const,
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
    assert.ok(
      codes.includes(code),
      `missing export blocking code: ${code}; received ${codes.join(", ")}`,
    );
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
