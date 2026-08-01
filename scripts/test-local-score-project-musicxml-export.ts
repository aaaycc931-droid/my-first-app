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
import {
  createSupportedCanonicalChordSymbol,
  parseSupportedCanonicalChordSymbol,
} from "../lib/music/localScoreProjectMusicXmlChordSymbol";
import { createLocalScoreProjectMusicXmlImportDraft } from "../lib/music/localScoreProjectMusicXmlImport";
import { parseMusicXML } from "../lib/musicxml/musicxmlParser";
import {
  extractMusicXMLFromMxl,
} from "../lib/musicxml/mxlExtractor";
import type {
  LocalScoreProjectDynamicMarkV1,
  LocalScoreProjectEventV9,
} from "../lib/music/scoreDocument";
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
  scoreCredits: project.document.scoreCredits,
  tempoBpm: project.tempoBpm,
  meter: project.document.meter,
  fifths: project.document.keySignature.fifths,
  partName: project.document.parts[0].name,
  instrument: project.document.parts[0].instrument,
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
        chordSymbol: event.chordSymbol,
        articulations: event.type === "note" ? event.articulations : [],
        dynamicMark: event.dynamicMark,
        damperPedalMark: event.damperPedalMark,
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

const createArticulationSupportedProject = (): LocalScoreProjectV1 => {
  const base = createFingeringSupportedProject();
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
                if (event.id === "event-4") {
                  return {
                    ...event,
                    articulations: ["accent", "staccato", "tenuto"],
                  };
                }
                if (event.id === "event-5") {
                  return { ...event, articulations: ["staccato"] };
                }
                return event;
              }),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "articulation export fixture must be canonical");
  return parsed;
};

const createDynamicSupportedProject = (): LocalScoreProjectV1 => {
  const base = createArticulationSupportedProject();
  const measures = base.document.parts[0].staves[0].voices[0].measures;
  const marks = new Map<string, LocalScoreProjectDynamicMarkV1>([
    ["event-1", "pp"],
    ["event-2", "p"],
    ["event-3", "mp"],
    ["event-4", "mf"],
    ["event-5", "f"],
  ] as const);
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
              events: measure.events.map((event) => ({
                ...event,
                dynamicMark: marks.get(event.id) ?? null,
              })),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "dynamic mark export fixture must be canonical");
  return parsed;
};

const createDamperPedalSupportedProject = (): LocalScoreProjectV1 => {
  const base = createDynamicSupportedProject();
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
              events: measure.events.map((event) => ({
                ...event,
                damperPedalMark: event.id === "event-1"
                  ? "down"
                  : event.id === "event-2" || event.id === "event-5"
                    ? "up"
                    : null,
              })),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "damper pedal export fixture must be canonical");
  return parsed;
};

const createChordSymbolSupportedProject = (): LocalScoreProjectV1 => {
  const base = createDamperPedalSupportedProject();
  const measures = base.document.parts[0].staves[0].voices[0].measures;
  const symbols = new Map<string, string>([
    ["event-1", "C#aug"],
    ["event-2", "Dbdim"],
    ["event-3", "E#sus4"],
    ["event-4", "Fbmaj7"],
    ["event-5", "Gm7"],
  ] as const);
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
              events: measure.events.map((event) => ({
                ...event,
                chordSymbol: symbols.get(event.id) ?? null,
              })),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "chord symbol export fixture must be canonical");
  return parsed;
};

const createSuspendedSecondSupportedProject = (): LocalScoreProjectV1 => {
  const base = createChordSymbolSupportedProject();
  const measures = base.document.parts[0].staves[0].voices[0].measures;
  const symbols = new Map<string, string>([
    ["event-1", "C#sus2"],
    ["event-2", "Dbsus2"],
  ] as const);
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
              events: measure.events.map((event) => ({
                ...event,
                chordSymbol: symbols.get(event.id) ?? null,
              })),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "suspended-second export fixture must be canonical");
  return parsed;
};

const createPowerChordSupportedProject = (): LocalScoreProjectV1 => {
  const base = createChordSymbolSupportedProject();
  const measures = base.document.parts[0].staves[0].voices[0].measures;
  const symbols = new Map<string, string>([
    ["event-1", "C#5"],
    ["event-2", "Db5"],
  ] as const);
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
              events: measure.events.map((event) => ({
                ...event,
                chordSymbol: symbols.get(event.id) ?? null,
              })),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "power chord export fixture must be canonical");
  return parsed;
};

const createDominantNinthSupportedProject = (): LocalScoreProjectV1 => {
  const base = createChordSymbolSupportedProject();
  const measures = base.document.parts[0].staves[0].voices[0].measures;
  const symbols = new Map<string, string>([
    ["event-1", "C#9"],
    ["event-2", "Db9"],
  ] as const);
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
              events: measure.events.map((event) => ({
                ...event,
                chordSymbol: symbols.get(event.id) ?? null,
              })),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "dominant-ninth export fixture must be canonical");
  return parsed;
};

const createMajorNinthSupportedProject = (): LocalScoreProjectV1 => {
  const base = createChordSymbolSupportedProject();
  const measures = base.document.parts[0].staves[0].voices[0].measures;
  const symbols = new Map<string, string>([
    ["event-1", "C#maj9"],
    ["event-2", "Dbmaj9"],
  ] as const);
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
              events: measure.events.map((event) => ({
                ...event,
                chordSymbol: symbols.get(event.id) ?? null,
              })),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "major-ninth export fixture must be canonical");
  return parsed;
};

const createMinorNinthSupportedProject = (): LocalScoreProjectV1 => {
  const base = createChordSymbolSupportedProject();
  const measures = base.document.parts[0].staves[0].voices[0].measures;
  const symbols = new Map<string, string>([
    ["event-1", "C#m9"],
    ["event-2", "Dbm9"],
  ] as const);
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
              events: measure.events.map((event) => ({
                ...event,
                chordSymbol: symbols.get(event.id) ?? null,
              })),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "minor-ninth export fixture must be canonical");
  return parsed;
};

const createDominantEleventhSupportedProject = (): LocalScoreProjectV1 => {
  const base = createChordSymbolSupportedProject();
  const measures = base.document.parts[0].staves[0].voices[0].measures;
  const symbols = new Map<string, string>([
    ["event-1", "C#11"],
    ["event-2", "Db11"],
  ] as const);
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
              events: measure.events.map((event) => ({
                ...event,
                chordSymbol: symbols.get(event.id) ?? null,
              })),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "dominant-11th export fixture must be canonical");
  return parsed;
};

const createMajorEleventhSupportedProject = (): LocalScoreProjectV1 => {
  const base = createChordSymbolSupportedProject();
  const measures = base.document.parts[0].staves[0].voices[0].measures;
  const symbols = new Map<string, string>([
    ["event-1", "C#maj11"],
    ["event-2", "Dbmaj11"],
  ] as const);
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
              events: measure.events.map((event) => ({
                ...event,
                chordSymbol: symbols.get(event.id) ?? null,
              })),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "major-11th export fixture must be canonical");
  return parsed;
};

const createMinorEleventhSupportedProject = (): LocalScoreProjectV1 => {
  const base = createChordSymbolSupportedProject();
  const measures = base.document.parts[0].staves[0].voices[0].measures;
  const symbols = new Map<string, string>([
    ["event-1", "C#m11"],
    ["event-2", "Dbm11"],
  ] as const);
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
              events: measure.events.map((event) => ({
                ...event,
                chordSymbol: symbols.get(event.id) ?? null,
              })),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "minor-11th export fixture must be canonical");
  return parsed;
};

const createDominantThirteenthSupportedProject = (): LocalScoreProjectV1 => {
  const base = createChordSymbolSupportedProject();
  const measures = base.document.parts[0].staves[0].voices[0].measures;
  const symbols = new Map<string, string>([
    ["event-1", "C#13"],
    ["event-2", "Db13"],
  ] as const);
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
              events: measure.events.map((event) => ({
                ...event,
                chordSymbol: symbols.get(event.id) ?? null,
              })),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "dominant-13th export fixture must be canonical");
  return parsed;
};

const createMajorThirteenthSupportedProject = (): LocalScoreProjectV1 => {
  const base = createChordSymbolSupportedProject();
  const measures = base.document.parts[0].staves[0].voices[0].measures;
  const symbols = new Map<string, string>([
    ["event-1", "C#maj13"],
    ["event-2", "Dbmaj13"],
  ] as const);
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
              events: measure.events.map((event) => ({
                ...event,
                chordSymbol: symbols.get(event.id) ?? null,
              })),
            })),
          }],
        }],
      }],
    },
  };
  const parsed = parseLocalScoreProject(candidate);
  assert.ok(parsed, "major-13th export fixture must be canonical");
  return parsed;
};

let supportedChordCombinationCount = 0;
for (const rootStep of ["A", "B", "C", "D", "E", "F", "G"] as const) {
  for (const [suffix, kind] of [
    ["", "major"],
    ["m", "minor"],
    ["7", "dominant"],
    ["maj7", "major-seventh"],
    ["m7", "minor-seventh"],
    ["aug", "augmented"],
    ["dim", "diminished"],
    ["dim7", "diminished-seventh"],
    ["m7b5", "half-diminished"],
    ["aug7", "augmented-seventh"],
    ["6", "major-sixth"],
    ["m6", "minor-sixth"],
    ["sus2", "suspended-second"],
    ["sus4", "suspended-fourth"],
    ["5", "power"],
    ["9", "dominant-ninth"],
    ["maj9", "major-ninth"],
    ["m9", "minor-ninth"],
    ["11", "dominant-11th"],
    ["maj11", "major-11th"],
    ["m11", "minor-11th"],
    ["13", "dominant-13th"],
    ["maj13", "major-13th"],
  ] as const) {
    const canonical = `${rootStep}${suffix}`;
    assert.deepEqual(
      parseSupportedCanonicalChordSymbol(canonical),
      { canonical, rootStep, rootAlter: 0, kind },
    );
    assert.deepEqual(
      createSupportedCanonicalChordSymbol({ rootStep, kind }),
      { canonical, rootStep, rootAlter: 0, kind },
    );
    supportedChordCombinationCount += 1;
  }
}
for (const rootStep of ["A", "B", "C", "D", "E", "F", "G"] as const) {
  for (const [accidental, rootAlter] of [
    ["#", 1],
    ["b", -1],
  ] as const) {
    for (const [suffix, kind] of [
      ["", "major"],
      ["m", "minor"],
      ["7", "dominant"],
      ["maj7", "major-seventh"],
      ["m7", "minor-seventh"],
      ["aug", "augmented"],
      ["dim", "diminished"],
      ["dim7", "diminished-seventh"],
      ["m7b5", "half-diminished"],
      ["aug7", "augmented-seventh"],
      ["6", "major-sixth"],
      ["m6", "minor-sixth"],
      ["sus2", "suspended-second"],
      ["sus4", "suspended-fourth"],
      ["5", "power"],
      ["9", "dominant-ninth"],
      ["maj9", "major-ninth"],
      ["m9", "minor-ninth"],
      ["11", "dominant-11th"],
      ["maj11", "major-11th"],
      ["m11", "minor-11th"],
      ["13", "dominant-13th"],
      ["maj13", "major-13th"],
    ] as const) {
      const canonical = `${rootStep}${accidental}${suffix}`;
      assert.deepEqual(
        parseSupportedCanonicalChordSymbol(canonical),
        { canonical, rootStep, rootAlter, kind },
      );
      assert.deepEqual(
        createSupportedCanonicalChordSymbol({ rootStep, rootAlter, kind }),
        { canonical, rootStep, rootAlter, kind },
      );
      supportedChordCombinationCount += 1;
    }
  }
}
assert.equal(
  supportedChordCombinationCount,
  483,
  "23 chord kinds across natural, single-sharp, and single-flat A-G roots must produce 483 controlled combinations",
);
for (const unsupported of [
  "C##",
  "Dbb",
  "C♯",
  "Db♭",
  "C+",
  "C°",
  "C+7",
  "C°7",
  "Cø7",
  "Cmaj6",
  "Csus",
  "C2",
  "C4",
  "Cm5",
  "C55",
  "Cpower",
  "C(no3)",
  "Comit3",
  "C5/E",
  "Cadd9",
  "C69",
  "C99",
  "C9/E",
  "Cdom9",
  "Cmajor9",
  "Cmaj99",
  "Cmaj7add9",
  "Cmaj9/E",
  "Cmaj9#5",
  "Cmaj9b5",
  "Cminor9",
  "Cm99",
  "Cm7add9",
  "Cm9/E",
  "Cm9#5",
  "Cm9b5",
  "Cadd11",
  "C7add11",
  "C9add11",
  "C111",
  "C11/E",
  "C11#5",
  "C11b5",
  "Cdom11",
  "Cdominant11",
  "Cmajor11",
  "Cmaj111",
  "Cmaj7add11",
  "Cmaj11/E",
  "Cmaj11#5",
  "Cmaj11b5",
  "CΔ11",
  "Cmin11",
  "Cminor11",
  "C-11",
  "Cm111",
  "Cm7add11",
  "Cm9add11",
  "Cm11/E",
  "Cm11#5",
  "Cm11b5",
  "Cdom13",
  "Cdominant13",
  "C131",
  "C7add13",
  "C11add13",
  "C13/E",
  "C13#5",
  "C13b5",
  "Cmajor13",
  "Cmaj131",
  "Cmaj11add13",
  "Cmaj13/E",
  "Cmaj13#5",
  "Cmaj13b5",
  "CΔ13",
  "Cm13",
  "Csus6",
  "C/E",
  "c",
  " C",
  "C ",
]) {
  assert.equal(parseSupportedCanonicalChordSymbol(unsupported), null);
}
for (const rootAlter of [-2, -0.5, 0.5, 2, Number.NaN]) {
  assert.equal(
    createSupportedCanonicalChordSymbol({
      rootStep: "C",
      rootAlter,
      kind: "major",
    }),
    null,
  );
}

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
  ready.xml.match(/<sound tempo="90"\/>/g)?.length,
  1,
  "the default canonical tempo must emit one explicit strict sound declaration",
);
assert.match(
  ready.xml,
  /<\/attributes>\s*<sound tempo="90"\/>\s*<note>/,
  "tempo must be the first music-data element after first-measure attributes",
);
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
assert.doesNotMatch(
  ready.xml,
  /<(?:score-instrument|midi-instrument|midi-program)\b/,
  "unassigned canonical parts must not invent instrument semantics",
);
for (const program of [0, 1, 127] as const) {
  const gm1Project = parseLocalScoreProject({
    ...project,
    document: {
      ...project.document,
      parts: [{
        ...project.document.parts[0],
        instrument: { kind: "gm1-program", program },
      }],
    },
  });
  assert.ok(gm1Project, `GM1 program ${program} fixture must be canonical`);
  const gm1Draft = createLocalScoreProjectMusicXmlExportDraft({
    project: gm1Project,
  });
  assert.equal(
    gm1Draft.status,
    "ready",
    `GM1 program ${program} must be exportable`,
  );
  assert.deepEqual(gm1Draft.issues, []);
  assert.match(
    gm1Draft.xml ?? "",
    new RegExp(
      `<part-name>旋律 &amp; &lt;主声部&gt;</part-name>\\s*`
      + `<score-instrument id="P1-I1">\\s*`
      + `<instrument-name>旋律 &amp; &lt;主声部&gt;</instrument-name>\\s*`
      + `</score-instrument>\\s*`
      + `<midi-instrument id="P1-I1">\\s*`
      + `<midi-program>${program + 1}</midi-program>\\s*`
      + "</midi-instrument>",
    ),
    "GM1 assignment must use the deterministic strict score-part order",
  );
  let gm1EventIndex = 0;
  const reopenedGm1Xml = createLocalScoreProjectMusicXmlImportDraft({
    xml: gm1Draft.xml ?? "",
    fileName: `gm1-${program}.musicxml`,
    sourceFormat: "musicxml",
    projectId: gm1Project.projectId,
    now: gm1Project.createdAt,
    createEventId: () => `gm1-${program}-event-${++gm1EventIndex}`,
  });
  assert.equal(reopenedGm1Xml.status, "ready");
  assert.deepEqual(
    musicalProjection(reopenedGm1Xml.project as LocalScoreProjectV1),
    musicalProjection(gm1Project),
    `MusicXML must preserve zero-based canonical GM1 program ${program}`,
  );
  const gm1MxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
    draft: gm1Draft,
    currentProject: gm1Project,
    format: "mxl",
  });
  const reopenedGm1Mxl = createLocalScoreProjectMusicXmlImportDraft({
    xml: extractMusicXMLFromMxl(gm1MxlPayload.data as Uint8Array),
    fileName: gm1MxlPayload.fileName,
    sourceFormat: "mxl",
    projectId: gm1Project.projectId,
    now: gm1Project.createdAt,
    createEventId: () => `gm1-${program}-mxl-event-${++gm1EventIndex}`,
  });
  assert.equal(reopenedGm1Mxl.status, "ready");
  assert.deepEqual(
    musicalProjection(reopenedGm1Mxl.project as LocalScoreProjectV1),
    musicalProjection(gm1Project),
    `MXL must preserve zero-based canonical GM1 program ${program}`,
  );
}
const creditedProject = parseLocalScoreProject({
  ...project,
  document: {
    ...project.document,
    scoreCredits: {
      ...project.document.scoreCredits,
      subtitle: "副标题 & <段落>",
      creators: [
        { role: "composer", name: "作曲者 & <甲>" },
        { role: "lyricist", name: "作词者" },
        { role: "arranger", name: "编曲者" },
      ],
      rightsNotice: "© 权利 & 保留",
    },
  },
});
assert.ok(creditedProject, "credited fixture must be canonical");
const creditedDraft = createLocalScoreProjectMusicXmlExportDraft({
  project: creditedProject,
});
assert.equal(creditedDraft.status, "ready", JSON.stringify(creditedDraft.issues));
assert.match(
  creditedDraft.xml ?? "",
  /<work>[\s\S]*<\/work>\s*<movement-title>副标题 &amp; &lt;段落&gt;<\/movement-title>\s*<identification>[\s\S]*<creator type="composer">作曲者 &amp; &lt;甲&gt;<\/creator>[\s\S]*<creator type="lyricist">作词者<\/creator>[\s\S]*<creator type="arranger">编曲者<\/creator>[\s\S]*<rights>© 权利 &amp; 保留<\/rights>[\s\S]*<\/identification>\s*<part-list>/,
  "credits must use the deterministic root order and escape XML text",
);
let creditedEventIndex = 0;
const reopenedCredited = createLocalScoreProjectMusicXmlImportDraft({
  xml: creditedDraft.xml ?? "",
  fileName: "credits.musicxml",
  sourceFormat: "musicxml",
  projectId: creditedProject.projectId,
  now: creditedProject.createdAt,
  createEventId: () => `credited-event-${++creditedEventIndex}`,
});
assert.equal(reopenedCredited.status, "ready");
assert.deepEqual(
  musicalProjection(reopenedCredited.project as LocalScoreProjectV1),
  musicalProjection(creditedProject),
  "MusicXML credits must round-trip without changing canonical score credits or tempo",
);
const creditedMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: creditedDraft,
  currentProject: creditedProject,
  format: "mxl",
});
assert.ok(creditedMxlPayload.data instanceof Uint8Array);
let creditedMxlEventIndex = 0;
const reopenedCreditedMxl = createLocalScoreProjectMusicXmlImportDraft({
  xml: extractMusicXMLFromMxl(creditedMxlPayload.data as Uint8Array),
  fileName: creditedMxlPayload.fileName,
  sourceFormat: "mxl",
  projectId: creditedProject.projectId,
  now: creditedProject.createdAt,
  createEventId: () => `credited-mxl-event-${++creditedMxlEventIndex}`,
});
assert.equal(reopenedCreditedMxl.status, "ready");
assert.deepEqual(
  musicalProjection(reopenedCreditedMxl.project as LocalScoreProjectV1),
  musicalProjection(creditedProject),
  "MXL credits must round-trip without changing canonical score credits or tempo",
);
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

for (const tempoBpm of [30, 90, 240] as const) {
  const tempoProject: LocalScoreProjectV1 = {
    ...project,
    tempoBpm,
  };
  const tempoProjectSnapshot = JSON.stringify(tempoProject);
  const tempoDraft = createLocalScoreProjectMusicXmlExportDraft({
    project: tempoProject,
  });
  assert.equal(
    JSON.stringify(tempoProject),
    tempoProjectSnapshot,
    `${tempoBpm} BPM export draft generation must be pure`,
  );
  assert.equal(
    tempoDraft.status,
    "ready",
    `${tempoBpm} BPM must be exportable`,
  );
  assert.deepEqual(tempoDraft.issues, []);
  assert.ok(tempoDraft.xml);
  assert.equal(
    tempoDraft.xml.match(
      new RegExp(`<sound tempo="${tempoBpm}"\\/>`, "g"),
    )?.length,
    1,
    `${tempoBpm} BPM must emit exactly one sound tempo declaration`,
  );
  assert.match(
    tempoDraft.xml,
    new RegExp(
      `<\\/attributes>\\s*<sound tempo="${tempoBpm}"\\/>\\s*<note>`,
    ),
    `${tempoBpm} BPM must be emitted immediately after first-measure attributes`,
  );
  assert.deepEqual(
    createLocalScoreProjectMusicXmlExportDraft({ project: tempoProject }),
    tempoDraft,
    `${tempoBpm} BPM MusicXML/MXL candidate generation must be deterministic`,
  );

  const tempoXmlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
    draft: tempoDraft,
    currentProject: tempoProject,
    format: "musicxml",
  });
  assert.equal(tempoXmlPayload.mimeType, MUSICXML_MIME_TYPE);
  assert.equal(tempoXmlPayload.data, tempoDraft.xml);
  let tempoImportedEventIndex = 0;
  const tempoReopenedXml = createLocalScoreProjectMusicXmlImportDraft({
    xml: String(tempoXmlPayload.data),
    fileName: tempoXmlPayload.fileName,
    sourceFormat: "musicxml",
    projectId: `tempo-xml-${tempoBpm}`,
    now: tempoProject.createdAt,
    createEventId: () =>
      `tempo-${tempoBpm}-xml-event-${++tempoImportedEventIndex}`,
  });
  assert.equal(tempoReopenedXml.status, "ready");
  assert.ok(tempoReopenedXml.project);
  assert.deepEqual(
    musicalProjection(tempoReopenedXml.project),
    musicalProjection(tempoProject),
    `${tempoBpm} BPM MusicXML must reopen with exact canonical semantics`,
  );

  const tempoMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
    draft: tempoDraft,
    currentProject: tempoProject,
    format: "mxl",
  });
  assert.equal(tempoMxlPayload.mimeType, MXL_MIME_TYPE);
  assert.ok(tempoMxlPayload.data instanceof Uint8Array);
  const tempoMxlData = tempoMxlPayload.data as Uint8Array;
  assert.deepEqual(
    tempoMxlData,
    createMusicXmlMxlArchive(tempoDraft.xml),
    `${tempoBpm} BPM MXL confirmation must be deterministic`,
  );
  const tempoExtractedXml = extractMusicXMLFromMxl(tempoMxlData);
  assert.equal(
    tempoExtractedXml,
    tempoDraft.xml,
    `${tempoBpm} BPM MXL must contain the exact MusicXML candidate`,
  );
  const tempoReopenedMxl = createLocalScoreProjectMusicXmlImportDraft({
    xml: tempoExtractedXml,
    fileName: tempoMxlPayload.fileName,
    sourceFormat: "mxl",
    projectId: `tempo-mxl-${tempoBpm}`,
    now: tempoProject.createdAt,
    createEventId: () =>
      `tempo-${tempoBpm}-mxl-event-${++tempoImportedEventIndex}`,
  });
  assert.equal(tempoReopenedMxl.status, "ready");
  assert.ok(tempoReopenedMxl.project);
  assert.deepEqual(
    musicalProjection(tempoReopenedMxl.project),
    musicalProjection(tempoProject),
    `${tempoBpm} BPM MXL must reopen with exact canonical semantics`,
  );
}

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

const articulationProject = createArticulationSupportedProject();
const articulationReady = createLocalScoreProjectMusicXmlExportDraft({
  project: articulationProject,
});
assert.equal(articulationReady.status, "ready");
assert.deepEqual(articulationReady.issues, []);
assert.ok(articulationReady.xml);
assert.match(
  articulationReady.xml,
  /<technical><fingering>1<\/fingering><\/technical><articulations><accent\/><staccato\/><tenuto\/><\/articulations><\/notations>\s*<lyric>/,
  "all articulations must follow fingering in canonical order inside one notations container",
);
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({ project: articulationProject }),
  articulationReady,
  "articulation output must be deterministic",
);
const articulationXmlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: articulationReady,
  currentProject: articulationProject,
  format: "musicxml",
});
const reopenedArticulationXml = createLocalScoreProjectMusicXmlImportDraft({
  xml: String(articulationXmlPayload.data),
  fileName: articulationXmlPayload.fileName,
  sourceFormat: "musicxml",
  projectId: articulationProject.projectId,
  now: articulationProject.createdAt,
  createEventId: () => `reopened-articulation-event-${++importedEventIndex}`,
});
assert.equal(reopenedArticulationXml.status, "ready");
assert.ok(reopenedArticulationXml.project);
assert.deepEqual(
  musicalProjection(reopenedArticulationXml.project),
  musicalProjection(articulationProject),
  "strict MusicXML re-import must preserve articulation sets",
);
const articulationMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: articulationReady,
  currentProject: articulationProject,
  format: "mxl",
});
const reopenedArticulationMxl = createLocalScoreProjectMusicXmlImportDraft({
  xml: extractMusicXMLFromMxl(articulationMxlPayload.data as Uint8Array),
  fileName: articulationMxlPayload.fileName,
  sourceFormat: "mxl",
  projectId: articulationProject.projectId,
  now: articulationProject.createdAt,
  createEventId: () => `reopened-articulation-mxl-event-${++importedEventIndex}`,
});
assert.equal(reopenedArticulationMxl.status, "ready");
assert.ok(reopenedArticulationMxl.project);
assert.deepEqual(
  musicalProjection(reopenedArticulationMxl.project),
  musicalProjection(articulationProject),
  "strict MXL re-import must preserve articulation sets",
);

const dynamicProject = createDynamicSupportedProject();
const dynamicReady = createLocalScoreProjectMusicXmlExportDraft({
  project: dynamicProject,
});
assert.equal(dynamicReady.status, "ready");
assert.deepEqual(dynamicReady.issues, []);
assert.ok(dynamicReady.xml);
assert.match(
  dynamicReady.xml,
  /<rest\/>[\s\S]*?<notations><fermata\/><dynamics><p\/><\/dynamics><\/notations>/,
  "rest dynamics must share the canonical notations container",
);
assert.match(
  dynamicReady.xml,
  /<technical><fingering>1<\/fingering><\/technical><articulations><accent\/><staccato\/><tenuto\/><\/articulations><dynamics><mf\/><\/dynamics><\/notations>\s*<lyric>/,
  "note dynamics must follow articulations and precede lyric in the shared notations container",
);
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({ project: dynamicProject }),
  dynamicReady,
  "dynamic mark output must be deterministic",
);
const dynamicXmlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: dynamicReady,
  currentProject: dynamicProject,
  format: "musicxml",
});
const reopenedDynamicXml = createLocalScoreProjectMusicXmlImportDraft({
  xml: String(dynamicXmlPayload.data),
  fileName: dynamicXmlPayload.fileName,
  sourceFormat: "musicxml",
  projectId: dynamicProject.projectId,
  now: dynamicProject.createdAt,
  createEventId: () => `reopened-dynamic-event-${++importedEventIndex}`,
});
assert.equal(reopenedDynamicXml.status, "ready");
assert.ok(reopenedDynamicXml.project);
assert.deepEqual(
  musicalProjection(reopenedDynamicXml.project),
  musicalProjection(dynamicProject),
  "strict MusicXML re-import must preserve note and rest dynamic marks",
);
const dynamicMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: dynamicReady,
  currentProject: dynamicProject,
  format: "mxl",
});
assert.deepEqual(
  dynamicMxlPayload.data,
  createMusicXmlMxlArchive(dynamicReady.xml),
  "dynamic mark MXL generation must remain deterministic",
);
const reopenedDynamicMxl = createLocalScoreProjectMusicXmlImportDraft({
  xml: extractMusicXMLFromMxl(dynamicMxlPayload.data as Uint8Array),
  fileName: dynamicMxlPayload.fileName,
  sourceFormat: "mxl",
  projectId: dynamicProject.projectId,
  now: dynamicProject.createdAt,
  createEventId: () => `reopened-dynamic-mxl-event-${++importedEventIndex}`,
});
assert.equal(reopenedDynamicMxl.status, "ready");
assert.ok(reopenedDynamicMxl.project);
assert.deepEqual(
  musicalProjection(reopenedDynamicMxl.project),
  musicalProjection(dynamicProject),
  "strict MXL re-import must preserve note and rest dynamic marks",
);

const damperPedalProject = createDamperPedalSupportedProject();
const damperPedalReady = createLocalScoreProjectMusicXmlExportDraft({
  project: damperPedalProject,
});
assert.equal(damperPedalReady.status, "ready");
assert.deepEqual(damperPedalReady.issues, []);
assert.ok(damperPedalReady.xml);
assert.equal(
  damperPedalReady.xml.match(/<pedal type="start"\/>/g)?.length,
  1,
);
assert.equal(
  damperPedalReady.xml.match(/<pedal type="stop"\/>/g)?.length,
  2,
);
assert.match(
  damperPedalReady.xml,
  /<direction>\s*<direction-type><pedal type="start"\/><\/direction-type>\s*<voice>1<\/voice>\s*<staff>1<\/staff>\s*<\/direction>\s*<note>/,
  "down must emit one strict direction immediately before its note",
);
assert.match(
  damperPedalReady.xml,
  /<direction>\s*<direction-type><pedal type="stop"\/><\/direction-type>\s*<voice>1<\/voice>\s*<staff>1<\/staff>\s*<\/direction>\s*<note>\s*<rest\/>/,
  "up must emit one strict direction immediately before its rest",
);
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({ project: damperPedalProject }),
  damperPedalReady,
  "damper pedal output must be deterministic",
);
const damperPedalXmlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: damperPedalReady,
  currentProject: damperPedalProject,
  format: "musicxml",
});
const reopenedDamperPedalXml = createLocalScoreProjectMusicXmlImportDraft({
  xml: String(damperPedalXmlPayload.data),
  fileName: damperPedalXmlPayload.fileName,
  sourceFormat: "musicxml",
  projectId: damperPedalProject.projectId,
  now: damperPedalProject.createdAt,
  createEventId: () => `reopened-pedal-event-${++importedEventIndex}`,
});
assert.equal(reopenedDamperPedalXml.status, "ready");
assert.ok(reopenedDamperPedalXml.project);
assert.deepEqual(
  musicalProjection(reopenedDamperPedalXml.project),
  musicalProjection(damperPedalProject),
  "strict MusicXML re-import must preserve note and rest pedal marks",
);
const damperPedalMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: damperPedalReady,
  currentProject: damperPedalProject,
  format: "mxl",
});
assert.deepEqual(
  damperPedalMxlPayload.data,
  createMusicXmlMxlArchive(damperPedalReady.xml),
  "damper pedal MXL generation must remain deterministic",
);
const reopenedDamperPedalMxl = createLocalScoreProjectMusicXmlImportDraft({
  xml: extractMusicXMLFromMxl(damperPedalMxlPayload.data as Uint8Array),
  fileName: damperPedalMxlPayload.fileName,
  sourceFormat: "mxl",
  projectId: damperPedalProject.projectId,
  now: damperPedalProject.createdAt,
  createEventId: () => `reopened-pedal-mxl-event-${++importedEventIndex}`,
});
assert.equal(reopenedDamperPedalMxl.status, "ready");
assert.ok(reopenedDamperPedalMxl.project);
assert.deepEqual(
  musicalProjection(reopenedDamperPedalMxl.project),
  musicalProjection(damperPedalProject),
  "strict MXL re-import must preserve note and rest pedal marks",
);
assert.deepEqual(
  parseMusicXML(damperPedalReady.xml),
  parseMusicXML(dynamicReady.xml),
  "legacy parsing must ignore pedal directions without changing note timing",
);

const chordSymbolProject = createChordSymbolSupportedProject();
const chordSymbolReady = createLocalScoreProjectMusicXmlExportDraft({
  project: chordSymbolProject,
});
assert.equal(chordSymbolReady.status, "ready");
assert.deepEqual(chordSymbolReady.issues, []);
assert.ok(chordSymbolReady.xml);
for (const [rootStep, rootAlter, kind] of [
  ["C", "1", "augmented"],
  ["D", "-1", "diminished"],
  ["E", "1", "suspended-fourth"],
  ["F", "-1", "major-seventh"],
  ["G", null, "minor-seventh"],
] as const) {
  const alterMarkup = rootAlter === null
    ? ""
    : `<root-alter>${rootAlter}</root-alter>`;
  assert.match(
    chordSymbolReady.xml,
    new RegExp(
      `<harmony>\\s*<root><root-step>${rootStep}</root-step>`
      + `${alterMarkup}</root>\\s*`
      + `<kind>${kind}</kind>\\s*<staff>1</staff>\\s*</harmony>`,
    ),
  );
}
assert.match(
  chordSymbolReady.xml,
  /<harmony>\s*<root><root-step>C<\/root-step><root-alter>1<\/root-alter><\/root>\s*<kind>augmented<\/kind>\s*<staff>1<\/staff>\s*<\/harmony>\s*<direction>\s*<direction-type><pedal type="start"\/><\/direction-type>\s*<voice>1<\/voice>\s*<staff>1<\/staff>\s*<\/direction>\s*<note>/,
  "harmony must precede a coexisting strict pedal direction and target note",
);
const tempoChordSymbolProject: LocalScoreProjectV1 = {
  ...chordSymbolProject,
  tempoBpm: 120,
};
const tempoChordSymbolReady = createLocalScoreProjectMusicXmlExportDraft({
  project: tempoChordSymbolProject,
});
assert.equal(tempoChordSymbolReady.status, "ready");
assert.deepEqual(tempoChordSymbolReady.issues, []);
assert.ok(tempoChordSymbolReady.xml);
assert.match(
  tempoChordSymbolReady.xml,
  /<\/attributes>\s*<sound tempo="120"\/>\s*<harmony>\s*<root><root-step>C<\/root-step><root-alter>1<\/root-alter><\/root>\s*<kind>augmented<\/kind>\s*<staff>1<\/staff>\s*<\/harmony>\s*<direction>\s*<direction-type><pedal type="start"\/><\/direction-type>\s*<voice>1<\/voice>\s*<staff>1<\/staff>\s*<\/direction>\s*<note>/,
  "combined export must keep attributes, sound, harmony, pedal, then note",
);
const tempoChordSymbolPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: tempoChordSymbolReady,
  currentProject: tempoChordSymbolProject,
  format: "musicxml",
});
const reopenedTempoChordSymbol = createLocalScoreProjectMusicXmlImportDraft({
  xml: String(tempoChordSymbolPayload.data),
  fileName: tempoChordSymbolPayload.fileName,
  sourceFormat: "musicxml",
  projectId: tempoChordSymbolProject.projectId,
  now: tempoChordSymbolProject.createdAt,
  createEventId: () =>
    `reopened-tempo-chord-event-${++importedEventIndex}`,
});
assert.equal(reopenedTempoChordSymbol.status, "ready");
assert.ok(reopenedTempoChordSymbol.project);
assert.deepEqual(
  musicalProjection(reopenedTempoChordSymbol.project),
  musicalProjection(tempoChordSymbolProject),
  "the full strict tempo, harmony, and pedal combination must reopen exactly",
);
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({ project: chordSymbolProject }),
  chordSymbolReady,
  "chord symbol output must be deterministic",
);
const chordSymbolXmlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: chordSymbolReady,
  currentProject: chordSymbolProject,
  format: "musicxml",
});
const reopenedChordSymbolXml = createLocalScoreProjectMusicXmlImportDraft({
  xml: String(chordSymbolXmlPayload.data),
  fileName: chordSymbolXmlPayload.fileName,
  sourceFormat: "musicxml",
  projectId: chordSymbolProject.projectId,
  now: chordSymbolProject.createdAt,
  createEventId: () => `reopened-chord-event-${++importedEventIndex}`,
});
assert.equal(reopenedChordSymbolXml.status, "ready");
assert.ok(reopenedChordSymbolXml.project);
assert.deepEqual(
  musicalProjection(reopenedChordSymbolXml.project),
  musicalProjection(chordSymbolProject),
  "strict MusicXML re-import must preserve note/rest chord symbols and existing marks",
);
const chordSymbolMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: chordSymbolReady,
  currentProject: chordSymbolProject,
  format: "mxl",
});
assert.deepEqual(
  chordSymbolMxlPayload.data,
  createMusicXmlMxlArchive(chordSymbolReady.xml),
  "chord symbol MXL generation must remain deterministic",
);
const reopenedChordSymbolMxl = createLocalScoreProjectMusicXmlImportDraft({
  xml: extractMusicXMLFromMxl(chordSymbolMxlPayload.data as Uint8Array),
  fileName: chordSymbolMxlPayload.fileName,
  sourceFormat: "mxl",
  projectId: chordSymbolProject.projectId,
  now: chordSymbolProject.createdAt,
  createEventId: () => `reopened-chord-mxl-event-${++importedEventIndex}`,
});
assert.equal(reopenedChordSymbolMxl.status, "ready");
assert.ok(reopenedChordSymbolMxl.project);
assert.deepEqual(
  musicalProjection(reopenedChordSymbolMxl.project),
  musicalProjection(chordSymbolProject),
  "strict MXL re-import must preserve note/rest chord symbols and existing marks",
);
assert.deepEqual(
  parseMusicXML(chordSymbolReady.xml),
  parseMusicXML(damperPedalReady.xml),
  "legacy parsing must ignore harmony without changing note timing",
);

const suspendedSecondProject = createSuspendedSecondSupportedProject();
const suspendedSecondReady = createLocalScoreProjectMusicXmlExportDraft({
  project: suspendedSecondProject,
});
assert.equal(suspendedSecondReady.status, "ready");
assert.deepEqual(suspendedSecondReady.issues, []);
assert.ok(suspendedSecondReady.xml);
for (const [rootStep, rootAlter] of [
  ["C", "1"],
  ["D", "-1"],
] as const) {
  assert.match(
    suspendedSecondReady.xml,
    new RegExp(
      `<harmony>\\s*<root><root-step>${rootStep}</root-step>`
      + `<root-alter>${rootAlter}</root-alter></root>\\s*`
      + "<kind>suspended-second</kind>\\s*"
      + "<staff>1</staff>\\s*</harmony>",
    ),
  );
}
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({
    project: suspendedSecondProject,
  }),
  suspendedSecondReady,
  "suspended-second MusicXML output must be deterministic",
);
const suspendedSecondXmlPayload =
  confirmLocalScoreProjectMusicXmlExportDraft({
    draft: suspendedSecondReady,
    currentProject: suspendedSecondProject,
    format: "musicxml",
  });
const reopenedSuspendedSecondXml =
  createLocalScoreProjectMusicXmlImportDraft({
    xml: String(suspendedSecondXmlPayload.data),
    fileName: suspendedSecondXmlPayload.fileName,
    sourceFormat: "musicxml",
    projectId: suspendedSecondProject.projectId,
    now: suspendedSecondProject.createdAt,
    createEventId: () =>
      `reopened-suspended-second-event-${++importedEventIndex}`,
  });
assert.equal(reopenedSuspendedSecondXml.status, "ready");
assert.ok(reopenedSuspendedSecondXml.project);
assert.deepEqual(
  musicalProjection(reopenedSuspendedSecondXml.project),
  musicalProjection(suspendedSecondProject),
  "strict MusicXML re-import must preserve pitched-note and rest suspended-second symbols",
);
const suspendedSecondMxlPayload =
  confirmLocalScoreProjectMusicXmlExportDraft({
    draft: suspendedSecondReady,
    currentProject: suspendedSecondProject,
    format: "mxl",
  });
assert.deepEqual(
  suspendedSecondMxlPayload.data,
  createMusicXmlMxlArchive(suspendedSecondReady.xml),
  "suspended-second MXL generation must remain deterministic",
);
const reopenedSuspendedSecondMxl =
  createLocalScoreProjectMusicXmlImportDraft({
    xml: extractMusicXMLFromMxl(
      suspendedSecondMxlPayload.data as Uint8Array,
    ),
    fileName: suspendedSecondMxlPayload.fileName,
    sourceFormat: "mxl",
    projectId: suspendedSecondProject.projectId,
    now: suspendedSecondProject.createdAt,
    createEventId: () =>
      `reopened-suspended-second-mxl-event-${++importedEventIndex}`,
  });
assert.equal(reopenedSuspendedSecondMxl.status, "ready");
assert.ok(reopenedSuspendedSecondMxl.project);
assert.deepEqual(
  musicalProjection(reopenedSuspendedSecondMxl.project),
  musicalProjection(suspendedSecondProject),
  "strict MXL re-import must preserve pitched-note and rest suspended-second symbols",
);
assert.deepEqual(
  parseMusicXML(suspendedSecondReady.xml),
  parseMusicXML(damperPedalReady.xml),
  "legacy parsing must ignore suspended-second harmony without changing note timing",
);

const powerChordProject = createPowerChordSupportedProject();
const powerChordReady = createLocalScoreProjectMusicXmlExportDraft({
  project: powerChordProject,
});
assert.equal(powerChordReady.status, "ready");
assert.deepEqual(powerChordReady.issues, []);
assert.ok(powerChordReady.xml);
for (const [rootStep, rootAlter] of [
  ["C", "1"],
  ["D", "-1"],
] as const) {
  assert.match(
    powerChordReady.xml,
    new RegExp(
      `<harmony>\\s*<root><root-step>${rootStep}</root-step>`
      + `<root-alter>${rootAlter}</root-alter></root>\\s*`
      + "<kind>power</kind>\\s*"
      + "<staff>1</staff>\\s*</harmony>",
    ),
  );
}
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({
    project: powerChordProject,
  }),
  powerChordReady,
  "power chord MusicXML output must be deterministic",
);
const powerChordXmlPayload =
  confirmLocalScoreProjectMusicXmlExportDraft({
    draft: powerChordReady,
    currentProject: powerChordProject,
    format: "musicxml",
  });
const reopenedPowerChordXml =
  createLocalScoreProjectMusicXmlImportDraft({
    xml: String(powerChordXmlPayload.data),
    fileName: powerChordXmlPayload.fileName,
    sourceFormat: "musicxml",
    projectId: powerChordProject.projectId,
    now: powerChordProject.createdAt,
    createEventId: () =>
      `reopened-power-chord-event-${++importedEventIndex}`,
  });
assert.equal(reopenedPowerChordXml.status, "ready");
assert.ok(reopenedPowerChordXml.project);
assert.deepEqual(
  musicalProjection(reopenedPowerChordXml.project),
  musicalProjection(powerChordProject),
  "strict MusicXML re-import must preserve pitched-note and rest power chord symbols",
);
const powerChordMxlPayload =
  confirmLocalScoreProjectMusicXmlExportDraft({
    draft: powerChordReady,
    currentProject: powerChordProject,
    format: "mxl",
  });
assert.deepEqual(
  powerChordMxlPayload.data,
  createMusicXmlMxlArchive(powerChordReady.xml),
  "power chord MXL generation must remain deterministic",
);
const reopenedPowerChordMxl =
  createLocalScoreProjectMusicXmlImportDraft({
    xml: extractMusicXMLFromMxl(
      powerChordMxlPayload.data as Uint8Array,
    ),
    fileName: powerChordMxlPayload.fileName,
    sourceFormat: "mxl",
    projectId: powerChordProject.projectId,
    now: powerChordProject.createdAt,
    createEventId: () =>
      `reopened-power-chord-mxl-event-${++importedEventIndex}`,
  });
assert.equal(reopenedPowerChordMxl.status, "ready");
assert.ok(reopenedPowerChordMxl.project);
assert.deepEqual(
  musicalProjection(reopenedPowerChordMxl.project),
  musicalProjection(powerChordProject),
  "strict MXL re-import must preserve pitched-note and rest power chord symbols",
);
assert.deepEqual(
  parseMusicXML(powerChordReady.xml),
  parseMusicXML(damperPedalReady.xml),
  "legacy parsing must ignore power harmony without changing note timing",
);

const dominantNinthProject = createDominantNinthSupportedProject();
const dominantNinthReady = createLocalScoreProjectMusicXmlExportDraft({
  project: dominantNinthProject,
});
assert.equal(dominantNinthReady.status, "ready");
assert.deepEqual(dominantNinthReady.issues, []);
assert.ok(dominantNinthReady.xml);
for (const [rootStep, rootAlter] of [
  ["C", "1"],
  ["D", "-1"],
] as const) {
  assert.match(
    dominantNinthReady.xml,
    new RegExp(
      `<harmony>\\s*<root><root-step>${rootStep}</root-step>`
      + `<root-alter>${rootAlter}</root-alter></root>\\s*`
      + "<kind>dominant-ninth</kind>\\s*"
      + "<staff>1</staff>\\s*</harmony>",
    ),
  );
}
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({
    project: dominantNinthProject,
  }),
  dominantNinthReady,
  "dominant-ninth MusicXML output must be deterministic",
);
const dominantNinthXmlPayload =
  confirmLocalScoreProjectMusicXmlExportDraft({
    draft: dominantNinthReady,
    currentProject: dominantNinthProject,
    format: "musicxml",
  });
const reopenedDominantNinthXml =
  createLocalScoreProjectMusicXmlImportDraft({
    xml: String(dominantNinthXmlPayload.data),
    fileName: dominantNinthXmlPayload.fileName,
    sourceFormat: "musicxml",
    projectId: dominantNinthProject.projectId,
    now: dominantNinthProject.createdAt,
    createEventId: () =>
      `reopened-dominant-ninth-event-${++importedEventIndex}`,
  });
assert.equal(reopenedDominantNinthXml.status, "ready");
assert.ok(reopenedDominantNinthXml.project);
assert.deepEqual(
  musicalProjection(reopenedDominantNinthXml.project),
  musicalProjection(dominantNinthProject),
  "strict MusicXML re-import must preserve pitched-note and rest dominant-ninth symbols",
);
const dominantNinthMxlPayload =
  confirmLocalScoreProjectMusicXmlExportDraft({
    draft: dominantNinthReady,
    currentProject: dominantNinthProject,
    format: "mxl",
  });
assert.deepEqual(
  dominantNinthMxlPayload.data,
  createMusicXmlMxlArchive(dominantNinthReady.xml),
  "dominant-ninth MXL generation must remain deterministic",
);
const reopenedDominantNinthMxl =
  createLocalScoreProjectMusicXmlImportDraft({
    xml: extractMusicXMLFromMxl(
      dominantNinthMxlPayload.data as Uint8Array,
    ),
    fileName: dominantNinthMxlPayload.fileName,
    sourceFormat: "mxl",
    projectId: dominantNinthProject.projectId,
    now: dominantNinthProject.createdAt,
    createEventId: () =>
      `reopened-dominant-ninth-mxl-event-${++importedEventIndex}`,
  });
assert.equal(reopenedDominantNinthMxl.status, "ready");
assert.ok(reopenedDominantNinthMxl.project);
assert.deepEqual(
  musicalProjection(reopenedDominantNinthMxl.project),
  musicalProjection(dominantNinthProject),
  "strict MXL re-import must preserve pitched-note and rest dominant-ninth symbols",
);
assert.deepEqual(
  parseMusicXML(dominantNinthReady.xml),
  parseMusicXML(damperPedalReady.xml),
  "legacy parsing must ignore dominant-ninth harmony without changing note timing",
);

const majorNinthProject = createMajorNinthSupportedProject();
const majorNinthReady = createLocalScoreProjectMusicXmlExportDraft({
  project: majorNinthProject,
});
assert.equal(majorNinthReady.status, "ready");
assert.deepEqual(majorNinthReady.issues, []);
assert.ok(majorNinthReady.xml);
for (const [rootStep, rootAlter] of [
  ["C", "1"],
  ["D", "-1"],
] as const) {
  assert.match(
    majorNinthReady.xml,
    new RegExp(
      `<harmony>\\s*<root><root-step>${rootStep}</root-step>`
      + `<root-alter>${rootAlter}</root-alter></root>\\s*`
      + "<kind>major-ninth</kind>\\s*"
      + "<staff>1</staff>\\s*</harmony>",
    ),
  );
}
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({ project: majorNinthProject }),
  majorNinthReady,
  "major-ninth MusicXML output must be deterministic",
);
const majorNinthXmlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: majorNinthReady,
  currentProject: majorNinthProject,
  format: "musicxml",
});
const reopenedMajorNinthXml = createLocalScoreProjectMusicXmlImportDraft({
  xml: String(majorNinthXmlPayload.data),
  fileName: majorNinthXmlPayload.fileName,
  sourceFormat: "musicxml",
  projectId: majorNinthProject.projectId,
  now: majorNinthProject.createdAt,
  createEventId: () =>
    `reopened-major-ninth-event-${++importedEventIndex}`,
});
assert.equal(reopenedMajorNinthXml.status, "ready");
assert.ok(reopenedMajorNinthXml.project);
assert.deepEqual(
  musicalProjection(reopenedMajorNinthXml.project),
  musicalProjection(majorNinthProject),
  "strict MusicXML re-import must preserve pitched-note and rest major-ninth symbols",
);
const majorNinthMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: majorNinthReady,
  currentProject: majorNinthProject,
  format: "mxl",
});
assert.deepEqual(
  majorNinthMxlPayload.data,
  createMusicXmlMxlArchive(majorNinthReady.xml),
  "major-ninth MXL generation must remain deterministic",
);
const reopenedMajorNinthMxl = createLocalScoreProjectMusicXmlImportDraft({
  xml: extractMusicXMLFromMxl(majorNinthMxlPayload.data as Uint8Array),
  fileName: majorNinthMxlPayload.fileName,
  sourceFormat: "mxl",
  projectId: majorNinthProject.projectId,
  now: majorNinthProject.createdAt,
  createEventId: () =>
    `reopened-major-ninth-mxl-event-${++importedEventIndex}`,
});
assert.equal(reopenedMajorNinthMxl.status, "ready");
assert.ok(reopenedMajorNinthMxl.project);
assert.deepEqual(
  musicalProjection(reopenedMajorNinthMxl.project),
  musicalProjection(majorNinthProject),
  "strict MXL re-import must preserve pitched-note and rest major-ninth symbols",
);
assert.deepEqual(
  parseMusicXML(majorNinthReady.xml),
  parseMusicXML(damperPedalReady.xml),
  "legacy parsing must ignore major-ninth harmony without changing note timing",
);

const minorNinthProject = createMinorNinthSupportedProject();
const minorNinthReady = createLocalScoreProjectMusicXmlExportDraft({
  project: minorNinthProject,
});
assert.equal(minorNinthReady.status, "ready");
assert.deepEqual(minorNinthReady.issues, []);
assert.ok(minorNinthReady.xml);
for (const [rootStep, rootAlter] of [
  ["C", "1"],
  ["D", "-1"],
] as const) {
  assert.match(
    minorNinthReady.xml,
    new RegExp(
      `<harmony>\\s*<root><root-step>${rootStep}</root-step>`
      + `<root-alter>${rootAlter}</root-alter></root>\\s*`
      + "<kind>minor-ninth</kind>\\s*"
      + "<staff>1</staff>\\s*</harmony>",
    ),
  );
}
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({ project: minorNinthProject }),
  minorNinthReady,
  "minor-ninth MusicXML output must be deterministic",
);
const minorNinthXmlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: minorNinthReady,
  currentProject: minorNinthProject,
  format: "musicxml",
});
const reopenedMinorNinthXml = createLocalScoreProjectMusicXmlImportDraft({
  xml: String(minorNinthXmlPayload.data),
  fileName: minorNinthXmlPayload.fileName,
  sourceFormat: "musicxml",
  projectId: minorNinthProject.projectId,
  now: minorNinthProject.createdAt,
  createEventId: () =>
    `reopened-minor-ninth-event-${++importedEventIndex}`,
});
assert.equal(reopenedMinorNinthXml.status, "ready");
assert.ok(reopenedMinorNinthXml.project);
assert.deepEqual(
  musicalProjection(reopenedMinorNinthXml.project),
  musicalProjection(minorNinthProject),
  "strict MusicXML re-import must preserve pitched-note and rest minor-ninth symbols",
);
const minorNinthMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: minorNinthReady,
  currentProject: minorNinthProject,
  format: "mxl",
});
assert.deepEqual(
  minorNinthMxlPayload.data,
  createMusicXmlMxlArchive(minorNinthReady.xml),
  "minor-ninth MXL generation must remain deterministic",
);
const reopenedMinorNinthMxl = createLocalScoreProjectMusicXmlImportDraft({
  xml: extractMusicXMLFromMxl(minorNinthMxlPayload.data as Uint8Array),
  fileName: minorNinthMxlPayload.fileName,
  sourceFormat: "mxl",
  projectId: minorNinthProject.projectId,
  now: minorNinthProject.createdAt,
  createEventId: () =>
    `reopened-minor-ninth-mxl-event-${++importedEventIndex}`,
});
assert.equal(reopenedMinorNinthMxl.status, "ready");
assert.ok(reopenedMinorNinthMxl.project);
assert.deepEqual(
  musicalProjection(reopenedMinorNinthMxl.project),
  musicalProjection(minorNinthProject),
  "strict MXL re-import must preserve pitched-note and rest minor-ninth symbols",
);
assert.deepEqual(
  parseMusicXML(minorNinthReady.xml),
  parseMusicXML(damperPedalReady.xml),
  "legacy parsing must ignore minor-ninth harmony without changing note timing",
);

const dominantEleventhProject = createDominantEleventhSupportedProject();
const dominantEleventhReady = createLocalScoreProjectMusicXmlExportDraft({
  project: dominantEleventhProject,
});
assert.equal(dominantEleventhReady.status, "ready");
assert.deepEqual(dominantEleventhReady.issues, []);
assert.ok(dominantEleventhReady.xml);
for (const [rootStep, rootAlter] of [
  ["C", "1"],
  ["D", "-1"],
] as const) {
  assert.match(
    dominantEleventhReady.xml,
    new RegExp(
      `<harmony>\\s*<root><root-step>${rootStep}</root-step>`
      + `<root-alter>${rootAlter}</root-alter></root>\\s*`
      + "<kind>dominant-11th</kind>\\s*"
      + "<staff>1</staff>\\s*</harmony>",
    ),
  );
}
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({
    project: dominantEleventhProject,
  }),
  dominantEleventhReady,
  "dominant-11th MusicXML output must be deterministic",
);
const dominantEleventhXmlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: dominantEleventhReady,
  currentProject: dominantEleventhProject,
  format: "musicxml",
});
const reopenedDominantEleventhXml = createLocalScoreProjectMusicXmlImportDraft({
  xml: String(dominantEleventhXmlPayload.data),
  fileName: dominantEleventhXmlPayload.fileName,
  sourceFormat: "musicxml",
  projectId: dominantEleventhProject.projectId,
  now: dominantEleventhProject.createdAt,
  createEventId: () =>
    `reopened-dominant-eleventh-event-${++importedEventIndex}`,
});
assert.equal(reopenedDominantEleventhXml.status, "ready");
assert.ok(reopenedDominantEleventhXml.project);
assert.deepEqual(
  musicalProjection(reopenedDominantEleventhXml.project),
  musicalProjection(dominantEleventhProject),
  "strict MusicXML re-import must preserve pitched-note and rest dominant-11th symbols",
);
const dominantEleventhMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: dominantEleventhReady,
  currentProject: dominantEleventhProject,
  format: "mxl",
});
assert.deepEqual(
  dominantEleventhMxlPayload.data,
  createMusicXmlMxlArchive(dominantEleventhReady.xml),
  "dominant-11th MXL generation must remain deterministic",
);
const reopenedDominantEleventhMxl = createLocalScoreProjectMusicXmlImportDraft({
  xml: extractMusicXMLFromMxl(
    dominantEleventhMxlPayload.data as Uint8Array,
  ),
  fileName: dominantEleventhMxlPayload.fileName,
  sourceFormat: "mxl",
  projectId: dominantEleventhProject.projectId,
  now: dominantEleventhProject.createdAt,
  createEventId: () =>
    `reopened-dominant-eleventh-mxl-event-${++importedEventIndex}`,
});
assert.equal(reopenedDominantEleventhMxl.status, "ready");
assert.ok(reopenedDominantEleventhMxl.project);
assert.deepEqual(
  musicalProjection(reopenedDominantEleventhMxl.project),
  musicalProjection(dominantEleventhProject),
  "strict MXL re-import must preserve pitched-note and rest dominant-11th symbols",
);
assert.deepEqual(
  parseMusicXML(dominantEleventhReady.xml),
  parseMusicXML(damperPedalReady.xml),
  "legacy parsing must ignore dominant-11th harmony without changing note timing",
);

const majorEleventhProject = createMajorEleventhSupportedProject();
const majorEleventhReady = createLocalScoreProjectMusicXmlExportDraft({
  project: majorEleventhProject,
});
assert.equal(majorEleventhReady.status, "ready");
assert.deepEqual(majorEleventhReady.issues, []);
assert.ok(majorEleventhReady.xml);
for (const [rootStep, rootAlter] of [
  ["C", "1"],
  ["D", "-1"],
] as const) {
  assert.match(
    majorEleventhReady.xml,
    new RegExp(
      `<harmony>\\s*<root><root-step>${rootStep}</root-step>`
      + `<root-alter>${rootAlter}</root-alter></root>\\s*`
      + "<kind>major-11th</kind>\\s*"
      + "<staff>1</staff>\\s*</harmony>",
    ),
  );
}
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({
    project: majorEleventhProject,
  }),
  majorEleventhReady,
  "major-11th MusicXML output must be deterministic",
);
const majorEleventhXmlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: majorEleventhReady,
  currentProject: majorEleventhProject,
  format: "musicxml",
});
const reopenedMajorEleventhXml = createLocalScoreProjectMusicXmlImportDraft({
  xml: String(majorEleventhXmlPayload.data),
  fileName: majorEleventhXmlPayload.fileName,
  sourceFormat: "musicxml",
  projectId: majorEleventhProject.projectId,
  now: majorEleventhProject.createdAt,
  createEventId: () =>
    `reopened-major-eleventh-event-${++importedEventIndex}`,
});
assert.equal(reopenedMajorEleventhXml.status, "ready");
assert.ok(reopenedMajorEleventhXml.project);
assert.deepEqual(
  musicalProjection(reopenedMajorEleventhXml.project),
  musicalProjection(majorEleventhProject),
  "strict MusicXML re-import must preserve pitched-note and rest major-11th symbols",
);
const majorEleventhMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: majorEleventhReady,
  currentProject: majorEleventhProject,
  format: "mxl",
});
assert.deepEqual(
  majorEleventhMxlPayload.data,
  createMusicXmlMxlArchive(majorEleventhReady.xml),
  "major-11th MXL generation must remain deterministic",
);
const reopenedMajorEleventhMxl = createLocalScoreProjectMusicXmlImportDraft({
  xml: extractMusicXMLFromMxl(
    majorEleventhMxlPayload.data as Uint8Array,
  ),
  fileName: majorEleventhMxlPayload.fileName,
  sourceFormat: "mxl",
  projectId: majorEleventhProject.projectId,
  now: majorEleventhProject.createdAt,
  createEventId: () =>
    `reopened-major-eleventh-mxl-event-${++importedEventIndex}`,
});
assert.equal(reopenedMajorEleventhMxl.status, "ready");
assert.ok(reopenedMajorEleventhMxl.project);
assert.deepEqual(
  musicalProjection(reopenedMajorEleventhMxl.project),
  musicalProjection(majorEleventhProject),
  "strict MXL re-import must preserve pitched-note and rest major-11th symbols",
);
assert.deepEqual(
  parseMusicXML(majorEleventhReady.xml),
  parseMusicXML(damperPedalReady.xml),
  "legacy parsing must ignore major-11th harmony without changing note timing",
);

const minorEleventhProject = createMinorEleventhSupportedProject();
const minorEleventhReady = createLocalScoreProjectMusicXmlExportDraft({
  project: minorEleventhProject,
});
assert.equal(minorEleventhReady.status, "ready");
assert.deepEqual(minorEleventhReady.issues, []);
assert.ok(minorEleventhReady.xml);
for (const [rootStep, rootAlter] of [
  ["C", "1"],
  ["D", "-1"],
] as const) {
  assert.match(
    minorEleventhReady.xml,
    new RegExp(
      `<harmony>\\s*<root><root-step>${rootStep}</root-step>`
      + `<root-alter>${rootAlter}</root-alter></root>\\s*`
      + "<kind>minor-11th</kind>\\s*"
      + "<staff>1</staff>\\s*</harmony>",
    ),
  );
}
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({
    project: minorEleventhProject,
  }),
  minorEleventhReady,
  "minor-11th MusicXML output must be deterministic",
);
const minorEleventhXmlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: minorEleventhReady,
  currentProject: minorEleventhProject,
  format: "musicxml",
});
const reopenedMinorEleventhXml = createLocalScoreProjectMusicXmlImportDraft({
  xml: String(minorEleventhXmlPayload.data),
  fileName: minorEleventhXmlPayload.fileName,
  sourceFormat: "musicxml",
  projectId: minorEleventhProject.projectId,
  now: minorEleventhProject.createdAt,
  createEventId: () =>
    `reopened-minor-eleventh-event-${++importedEventIndex}`,
});
assert.equal(reopenedMinorEleventhXml.status, "ready");
assert.ok(reopenedMinorEleventhXml.project);
assert.deepEqual(
  musicalProjection(reopenedMinorEleventhXml.project),
  musicalProjection(minorEleventhProject),
  "strict MusicXML re-import must preserve pitched-note and rest minor-11th symbols",
);
const minorEleventhMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: minorEleventhReady,
  currentProject: minorEleventhProject,
  format: "mxl",
});
assert.deepEqual(
  minorEleventhMxlPayload.data,
  createMusicXmlMxlArchive(minorEleventhReady.xml),
  "minor-11th MXL generation must remain deterministic",
);
const reopenedMinorEleventhMxl = createLocalScoreProjectMusicXmlImportDraft({
  xml: extractMusicXMLFromMxl(
    minorEleventhMxlPayload.data as Uint8Array,
  ),
  fileName: minorEleventhMxlPayload.fileName,
  sourceFormat: "mxl",
  projectId: minorEleventhProject.projectId,
  now: minorEleventhProject.createdAt,
  createEventId: () =>
    `reopened-minor-eleventh-mxl-event-${++importedEventIndex}`,
});
assert.equal(reopenedMinorEleventhMxl.status, "ready");
assert.ok(reopenedMinorEleventhMxl.project);
assert.deepEqual(
  musicalProjection(reopenedMinorEleventhMxl.project),
  musicalProjection(minorEleventhProject),
  "strict MXL re-import must preserve pitched-note and rest minor-11th symbols",
);
assert.deepEqual(
  parseMusicXML(minorEleventhReady.xml),
  parseMusicXML(damperPedalReady.xml),
  "legacy parsing must ignore minor-11th harmony without changing note timing",
);

const dominantThirteenthProject = createDominantThirteenthSupportedProject();
const dominantThirteenthReady = createLocalScoreProjectMusicXmlExportDraft({
  project: dominantThirteenthProject,
});
assert.equal(dominantThirteenthReady.status, "ready");
assert.deepEqual(dominantThirteenthReady.issues, []);
assert.ok(dominantThirteenthReady.xml);
for (const [rootStep, rootAlter] of [
  ["C", "1"],
  ["D", "-1"],
] as const) {
  assert.match(
    dominantThirteenthReady.xml,
    new RegExp(
      `<harmony>\\s*<root><root-step>${rootStep}</root-step>`
      + `<root-alter>${rootAlter}</root-alter></root>\\s*`
      + "<kind>dominant-13th</kind>\\s*"
      + "<staff>1</staff>\\s*</harmony>",
    ),
  );
}
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({
    project: dominantThirteenthProject,
  }),
  dominantThirteenthReady,
  "dominant-13th MusicXML output must be deterministic",
);
const dominantThirteenthXmlPayload = confirmLocalScoreProjectMusicXmlExportDraft(
  {
    draft: dominantThirteenthReady,
    currentProject: dominantThirteenthProject,
    format: "musicxml",
  },
);
const reopenedDominantThirteenthXml = createLocalScoreProjectMusicXmlImportDraft(
  {
    xml: String(dominantThirteenthXmlPayload.data),
    fileName: dominantThirteenthXmlPayload.fileName,
    sourceFormat: "musicxml",
    projectId: dominantThirteenthProject.projectId,
    now: dominantThirteenthProject.createdAt,
    createEventId: () =>
      `reopened-dominant-thirteenth-event-${++importedEventIndex}`,
  },
);
assert.equal(reopenedDominantThirteenthXml.status, "ready");
assert.ok(reopenedDominantThirteenthXml.project);
assert.deepEqual(
  musicalProjection(reopenedDominantThirteenthXml.project),
  musicalProjection(dominantThirteenthProject),
  "strict MusicXML re-import must preserve pitched-note and rest dominant-13th symbols",
);
const dominantThirteenthMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft(
  {
    draft: dominantThirteenthReady,
    currentProject: dominantThirteenthProject,
    format: "mxl",
  },
);
assert.deepEqual(
  dominantThirteenthMxlPayload.data,
  createMusicXmlMxlArchive(dominantThirteenthReady.xml),
  "dominant-13th MXL generation must remain deterministic",
);
const reopenedDominantThirteenthMxl = createLocalScoreProjectMusicXmlImportDraft(
  {
    xml: extractMusicXMLFromMxl(
      dominantThirteenthMxlPayload.data as Uint8Array,
    ),
    fileName: dominantThirteenthMxlPayload.fileName,
    sourceFormat: "mxl",
    projectId: dominantThirteenthProject.projectId,
    now: dominantThirteenthProject.createdAt,
    createEventId: () =>
      `reopened-dominant-thirteenth-mxl-event-${++importedEventIndex}`,
  },
);
assert.equal(reopenedDominantThirteenthMxl.status, "ready");
assert.ok(reopenedDominantThirteenthMxl.project);
assert.deepEqual(
  musicalProjection(reopenedDominantThirteenthMxl.project),
  musicalProjection(dominantThirteenthProject),
  "strict MXL re-import must preserve pitched-note and rest dominant-13th symbols",
);
assert.deepEqual(
  parseMusicXML(dominantThirteenthReady.xml),
  parseMusicXML(damperPedalReady.xml),
  "legacy parsing must ignore dominant-13th harmony without changing note timing",
);

const majorThirteenthProject = createMajorThirteenthSupportedProject();
const majorThirteenthReady = createLocalScoreProjectMusicXmlExportDraft({
  project: majorThirteenthProject,
});
assert.equal(majorThirteenthReady.status, "ready");
assert.deepEqual(majorThirteenthReady.issues, []);
assert.ok(majorThirteenthReady.xml);
for (const [rootStep, rootAlter] of [
  ["C", "1"],
  ["D", "-1"],
] as const) {
  assert.match(
    majorThirteenthReady.xml,
    new RegExp(
      `<harmony>\\s*<root><root-step>${rootStep}</root-step>`
      + `<root-alter>${rootAlter}</root-alter></root>\\s*`
      + "<kind>major-13th</kind>\\s*"
      + "<staff>1</staff>\\s*</harmony>",
    ),
  );
}
assert.deepEqual(
  createLocalScoreProjectMusicXmlExportDraft({
    project: majorThirteenthProject,
  }),
  majorThirteenthReady,
  "major-13th MusicXML output must be deterministic",
);
const majorThirteenthXmlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: majorThirteenthReady,
  currentProject: majorThirteenthProject,
  format: "musicxml",
});
const reopenedMajorThirteenthXml = createLocalScoreProjectMusicXmlImportDraft({
  xml: String(majorThirteenthXmlPayload.data),
  fileName: majorThirteenthXmlPayload.fileName,
  sourceFormat: "musicxml",
  projectId: majorThirteenthProject.projectId,
  now: majorThirteenthProject.createdAt,
  createEventId: () =>
    `reopened-major-thirteenth-event-${++importedEventIndex}`,
});
assert.equal(reopenedMajorThirteenthXml.status, "ready");
assert.ok(reopenedMajorThirteenthXml.project);
assert.deepEqual(
  musicalProjection(reopenedMajorThirteenthXml.project),
  musicalProjection(majorThirteenthProject),
  "strict MusicXML re-import must preserve pitched-note and rest major-13th symbols",
);
const majorThirteenthMxlPayload = confirmLocalScoreProjectMusicXmlExportDraft({
  draft: majorThirteenthReady,
  currentProject: majorThirteenthProject,
  format: "mxl",
});
assert.deepEqual(
  majorThirteenthMxlPayload.data,
  createMusicXmlMxlArchive(majorThirteenthReady.xml),
  "major-13th MXL generation must remain deterministic",
);
const reopenedMajorThirteenthMxl = createLocalScoreProjectMusicXmlImportDraft({
  xml: extractMusicXMLFromMxl(
    majorThirteenthMxlPayload.data as Uint8Array,
  ),
  fileName: majorThirteenthMxlPayload.fileName,
  sourceFormat: "mxl",
  projectId: majorThirteenthProject.projectId,
  now: majorThirteenthProject.createdAt,
  createEventId: () =>
    `reopened-major-thirteenth-mxl-event-${++importedEventIndex}`,
});
assert.equal(reopenedMajorThirteenthMxl.status, "ready");
assert.ok(reopenedMajorThirteenthMxl.project);
assert.deepEqual(
  musicalProjection(reopenedMajorThirteenthMxl.project),
  musicalProjection(majorThirteenthProject),
  "strict MXL re-import must preserve pitched-note and rest major-13th symbols",
);
assert.deepEqual(
  parseMusicXML(majorThirteenthReady.xml),
  parseMusicXML(damperPedalReady.xml),
  "legacy parsing must ignore major-13th harmony without changing note timing",
);

for (const mark of ["pp", "p", "mp", "mf", "f", "ff"] as const) {
  const measures =
    dynamicProject.document.parts[0].staves[0].voices[0].measures;
  const singleMarkProject = parseLocalScoreProject({
    ...dynamicProject,
    document: {
      ...dynamicProject.document,
      parts: [{
        ...dynamicProject.document.parts[0],
        staves: [{
          ...dynamicProject.document.parts[0].staves[0],
          voices: [{
            ...dynamicProject.document.parts[0].staves[0].voices[0],
            measures: measures.map((measure) => ({
              ...measure,
              events: measure.events.map((event) => ({
                ...event,
                dynamicMark: event.id === "event-1" ? mark : null,
              })),
            })),
          }],
        }],
      }],
    },
  });
  assert.ok(singleMarkProject);
  const markDraft = createLocalScoreProjectMusicXmlExportDraft({
    project: singleMarkProject,
  });
  assert.equal(markDraft.status, "ready");
  assert.match(
    markDraft.xml ?? "",
    new RegExp(`<dynamics><${mark}\\/><\\/dynamics>`),
    `${mark} must use its exact canonical MusicXML element`,
  );
}

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
const withScoreTitle = (title: string): LocalScoreProjectV1 => withChanges({
  title,
  document: {
    ...project.document,
    scoreCredits: {
      ...project.document.scoreCredits,
      title,
    },
  },
});
const invalidXmlTextCases = [
  ["lone-high-surrogate", "\ud800"],
  ["lone-low-surrogate", "\udfff"],
  ["unicode-fffe", "\ufffe"],
  ["unicode-ffff", "\uffff"],
] as const;
for (const [label, invalidCharacter] of invalidXmlTextCases) {
  const invalidTitleProject = withScoreTitle(`标题${invalidCharacter}`);
  assert.ok(
    parseLocalScoreProject(invalidTitleProject),
    `${label} title remains canonical and must be blocked at exchange time`,
  );
  const invalidTitleDraft = createLocalScoreProjectMusicXmlExportDraft({
    project: invalidTitleProject,
  });
  assert.equal(invalidTitleDraft.status, "blocked", label);
  assert.equal(invalidTitleDraft.xml, null, label);
  assert.equal(invalidTitleDraft.fileNames, null, label);
  assert.equal(invalidTitleDraft.byteSizes, null, label);
  assert.ok(
    invalidTitleDraft.issues.some(
      (issue) => issue.code === "unsupported-score-title-text",
    ),
    `${label} title must produce the stable XML text blocker`,
  );
  for (const format of ["musicxml", "mxl"] as const) {
    assert.throws(
      () => confirmLocalScoreProjectMusicXmlExportDraft({
        draft: invalidTitleDraft,
        currentProject: invalidTitleProject,
        format,
      }),
      /阻断问题/,
      `${label} title must block ${format} confirmation`,
    );
  }

  const invalidPartNameProject = withChanges({
    document: {
      ...project.document,
      parts: [{
        ...project.document.parts[0],
        name: `声部${invalidCharacter}`,
      }],
    },
  });
  assert.ok(
    parseLocalScoreProject(invalidPartNameProject),
    `${label} part name remains canonical and must be blocked at exchange time`,
  );
  const invalidPartNameDraft = createLocalScoreProjectMusicXmlExportDraft({
    project: invalidPartNameProject,
  });
  assert.equal(invalidPartNameDraft.status, "blocked", label);
  assert.equal(invalidPartNameDraft.xml, null, label);
  assert.equal(invalidPartNameDraft.fileNames, null, label);
  assert.equal(invalidPartNameDraft.byteSizes, null, label);
  assert.ok(
    invalidPartNameDraft.issues.some(
      (issue) => issue.code === "unsupported-part-name-text",
    ),
    `${label} part name must produce the stable XML text blocker`,
  );
  for (const format of ["musicxml", "mxl"] as const) {
    assert.throws(
      () => confirmLocalScoreProjectMusicXmlExportDraft({
        draft: invalidPartNameDraft,
        currentProject: invalidPartNameProject,
        format,
      }),
      /阻断问题/,
      `${label} part name must block ${format} confirmation`,
    );
  }

  const invalidProjectTitleOnly = withChanges({
    title: `项目${invalidCharacter}`,
  });
  assert.ok(
    parseLocalScoreProject(invalidProjectTitleOnly),
    `${label} project title remains canonical and must be blocked at exchange time`,
  );
  const invalidProjectTitleOnlyDraft =
    createLocalScoreProjectMusicXmlExportDraft({
      project: invalidProjectTitleOnly,
    });
  assert.equal(invalidProjectTitleOnlyDraft.status, "blocked", label);
  assert.equal(invalidProjectTitleOnlyDraft.xml, null, label);
  assert.equal(invalidProjectTitleOnlyDraft.fileNames, null, label);
  assert.equal(invalidProjectTitleOnlyDraft.byteSizes, null, label);
  assert.ok(
    invalidProjectTitleOnlyDraft.issues.some(
      (issue) => issue.code === "unsupported-project-title-text",
    ),
    `${label} project title must produce the stable filename blocker`,
  );
  for (const format of ["musicxml", "mxl"] as const) {
    assert.throws(
      () => confirmLocalScoreProjectMusicXmlExportDraft({
        draft: invalidProjectTitleOnlyDraft,
        currentProject: invalidProjectTitleOnly,
        format,
      }),
      /阻断问题/,
      `${label} project title must block ${format} confirmation`,
    );
  }
}

const supplementarySafeTitle = `${"谱".repeat(78)}🎵`;
const supplementaryTitleProject = withScoreTitle(supplementarySafeTitle);
const supplementarySafePartName = "声部🎵";
const supplementarySafeProject: LocalScoreProjectV1 = {
  ...supplementaryTitleProject,
  document: {
    ...supplementaryTitleProject.document,
    parts: [{
      ...supplementaryTitleProject.document.parts[0],
      name: supplementarySafePartName,
    }],
  },
};
const supplementarySafeDraft = createLocalScoreProjectMusicXmlExportDraft({
  project: supplementarySafeProject,
});
assert.equal(
  supplementarySafeDraft.status,
  "ready",
  JSON.stringify(supplementarySafeDraft.issues),
);
assert.match(
  supplementarySafeDraft.xml ?? "",
  new RegExp(`<work-title>${supplementarySafeTitle}</work-title>`),
);
assert.match(
  supplementarySafeDraft.xml ?? "",
  new RegExp(`<part-name>${supplementarySafePartName}</part-name>`),
);
assert.equal(
  supplementarySafeDraft.fileNames?.musicxml,
  `${supplementarySafeTitle}.musicxml`,
  "a supplementary-plane character at the canonical title boundary must be preserved",
);
assert.doesNotMatch(
  supplementarySafeDraft.fileNames?.musicxml ?? "",
  /\ufffd/,
  "safe filenames must not contain a UTF-8 replacement character",
);
const supplementarySafeMxlPayload =
  confirmLocalScoreProjectMusicXmlExportDraft({
    draft: supplementarySafeDraft,
    currentProject: supplementarySafeProject,
    format: "mxl",
  });
assert.ok(supplementarySafeMxlPayload.data instanceof Uint8Array);
const supplementarySafeMxlXml = extractMusicXMLFromMxl(
  supplementarySafeMxlPayload.data as Uint8Array,
);
assert.equal(
  supplementarySafeMxlXml,
  supplementarySafeDraft.xml,
  "MXL must preserve the exact supplementary-plane XML text",
);
assert.doesNotMatch(
  supplementarySafeMxlXml,
  /\ufffd/,
  "MXL XML must not contain a UTF-8 replacement character",
);
let supplementarySafeEventIndex = 0;
const reopenedSupplementarySafeMxl =
  createLocalScoreProjectMusicXmlImportDraft({
    xml: supplementarySafeMxlXml,
    fileName: supplementarySafeMxlPayload.fileName,
    sourceFormat: "mxl",
    projectId: supplementarySafeProject.projectId,
    now: supplementarySafeProject.createdAt,
    createEventId: () =>
      `reopened-supplementary-event-${++supplementarySafeEventIndex}`,
  });
assert.equal(reopenedSupplementarySafeMxl.status, "ready");
assert.equal(
  reopenedSupplementarySafeMxl.project?.document.scoreCredits.title,
  supplementarySafeTitle,
);
assert.equal(
  reopenedSupplementarySafeMxl.project?.document.parts[0]?.name,
  supplementarySafePartName,
);

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
    withChanges({ title: "另一个项目名称" }),
    ["unsupported-distinct-score-title"],
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
      chordSymbol: "C#maj7",
    }, {
      ...sourceRest,
      chordSymbol: "Cdom9",
    }]),
    ["unsupported-chord-symbol"],
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
