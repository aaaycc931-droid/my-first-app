import assert from "node:assert/strict";
import { DOMParser as XmlDomParser } from "@xmldom/xmldom";

import {
  confirmLocalScoreProjectMusicXmlImportDraft,
  createLocalScoreProjectMusicXmlImportDraft,
  type LocalScoreProjectMusicXmlImportDraft,
} from "../lib/music/localScoreProjectMusicXmlImport";
import {
  LOCAL_SCORE_PROJECT_SCHEMA_VERSION,
  parseLocalScoreProject,
} from "../lib/music/localScoreProject";

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

const supportedXml = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>练习</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>1</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/></notations></note>
      <note><rest/><duration>2</duration><voice>1</voice><type>quarter</type><notations><fermata/></notations></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
    </measure>
  </part>
</score-partwise>`;

let eventSequence = 0;
const ready = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml,
  fileName: "我的练习.musicxml",
  sourceFormat: "musicxml",
  projectId: "import-project-1",
  now: "2026-07-27T08:00:00.000Z",
  createEventId: () => `import-event-${++eventSequence}`,
});
assert.equal(ready.status, "ready");
assert.ok(ready.project);
assert.equal(ready.fingerprint?.startsWith(
  "local-score-project-musicxml-import-v1:",
), true);
assert.deepEqual(ready.summary, { measureCount: 2, eventCount: 5 });
assert.deepEqual(ready.issues, []);
assert.equal(ready.sourceFormat, "musicxml");
assert.equal(ready.fileName, "我的练习.musicxml");
assert.equal(ready.project?.schemaVersion, LOCAL_SCORE_PROJECT_SCHEMA_VERSION);
assert.equal(ready.project?.document.schemaVersion, "score-document-v13");
assert.equal(ready.project?.document.revision, 1);
assert.equal(ready.project?.document.meter, "4/4");
assert.deepEqual(ready.project?.document.keySignature, { fifths: 1 });
assert.equal(ready.project?.document.parts[0]?.staves[0]?.clef, "treble");
assert.deepEqual(
  ready.project?.document.parts[0]?.staves[0]?.voices[0]?.measures
    .flatMap((measure) => measure.events)
    .map((event) => [
      event.type,
      event.pitch,
      event.duration,
      event.measure,
      event.fermataMark,
    ]),
  [
    ["note", "C4", "quarter", 1, "fermata"],
    ["rest", null, "quarter", 1, "fermata"],
    ["note", "D4", "half", 1, null],
    ["note", "E4", "eighth", 2, null],
    ["note", "F4", "eighth", 2, null],
  ],
);
assert.deepEqual(ready.project?.undoStack, []);
assert.deepEqual(ready.project?.redoStack, []);
assert.ok(parseLocalScoreProject(ready.project));

let metadataEventSequence = 0;
const metadataReady = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml
    .replace(
      "<score-partwise version=\"4.0\">",
      "<score-partwise version=\"4.0\"><work><work-title>标题 &amp; 练习 &#x97F3;</work-title></work>",
    )
    .replace("<part-name>练习</part-name>", "<part-name>钢琴 &lt;主部&gt;</part-name>"),
  fileName: "文件名不应覆盖标题.musicxml",
  sourceFormat: "musicxml",
  projectId: "import-project-metadata",
  now: "2026-07-27T08:00:00.000Z",
  createEventId: () => `metadata-event-${++metadataEventSequence}`,
});
assert.equal(metadataReady.status, "ready");
assert.equal(metadataReady.project?.title, "标题 & 练习 音");
assert.equal(metadataReady.project?.document.scoreCredits.title, "标题 & 练习 音");
assert.equal(metadataReady.project?.document.parts[0]?.name, "钢琴 <主部>");

eventSequence = 0;
const mxlEquivalent = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml,
  fileName: "我的练习.mxl",
  sourceFormat: "mxl",
  projectId: "import-project-1",
  now: "2026-07-27T08:00:00.000Z",
  createEventId: () => `import-event-${++eventSequence}`,
});
assert.equal(mxlEquivalent.status, "ready");
assert.deepEqual(
  mxlEquivalent.project,
  ready.project,
  "相同 XML 内容经 MXL 解包后必须生成等价 canonical",
);

const confirmed = confirmLocalScoreProjectMusicXmlImportDraft(ready);
assert.deepEqual(confirmed, ready.project);
assert.notEqual(confirmed, ready.project, "确认必须返回隔离 clone");

const blockedXml = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>阻断样本</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions>
        <key><fifths>3</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <backup><duration>2</duration></backup>
      <forward><duration>2</duration></forward>
      <note><grace/><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type></note>
      <note><chord/><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type><dot/></note>
      <note><chord/><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type><notations><tuplet type="start"/></notations></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>8</duration><voice>2</voice><type>whole</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;
let blockedIdCalls = 0;
const blockedArgs = {
  xml: blockedXml,
  fileName: "blocked.xml",
  sourceFormat: "xml" as const,
  projectId: "import-project-blocked",
  now: "2026-07-27T08:05:00.000Z",
  createEventId: () => {
    blockedIdCalls += 1;
    return `should-not-be-used-${blockedIdCalls}`;
  },
};
const blockedArgsSnapshot = {
  xml: blockedArgs.xml,
  fileName: blockedArgs.fileName,
  sourceFormat: blockedArgs.sourceFormat,
  projectId: blockedArgs.projectId,
  now: blockedArgs.now,
};
const blocked = createLocalScoreProjectMusicXmlImportDraft(blockedArgs);
assert.equal(blocked.status, "blocked");
assert.equal(blocked.project, null);
assert.equal(blocked.fingerprint, null);
assert.equal(blockedIdCalls, 0, "阻断输入不得分配 canonical event id");
assert.deepEqual(
  {
    xml: blockedArgs.xml,
    fileName: blockedArgs.fileName,
    sourceFormat: blockedArgs.sourceFormat,
    projectId: blockedArgs.projectId,
    now: blockedArgs.now,
  },
  blockedArgsSnapshot,
  "导入不得修改输入参数",
);
const blockingCodes = blocked.issues
  .filter((issue) => issue.severity === "blocking")
  .map((issue) => issue.code);
for (const code of [
  "unsupported-key-signature",
  "unsupported-voice-count",
  "unsupported-backup",
  "unsupported-forward",
  "unsupported-grace",
  "unsupported-chord",
  "unsupported-dot",
  "unsupported-tuplet",
  "unsupported-pitch",
  "unsupported-duration",
  "overfull-measure",
]) {
  assert.ok(blockingCodes.includes(code), `缺少 blocking ledger code: ${code}`);
}
assert.equal(
  blockingCodes.filter((code) => code === "unsupported-chord").length,
  2,
  "每个 chord 必须形成独立 ledger 项",
);
assert.throws(
  () => confirmLocalScoreProjectMusicXmlImportDraft(blocked),
  /阻断问题/,
);

const tampered = {
  ...ready,
  project: ready.project
    ? { ...ready.project, title: "未重新检查的标题" }
    : null,
} satisfies LocalScoreProjectMusicXmlImportDraft;
assert.throws(
  () => confirmLocalScoreProjectMusicXmlImportDraft(tampered),
  /已变化/,
);

const invalidCanonical = {
  ...ready,
  project: ready.project
    ? {
      ...ready.project,
      document: {
        ...ready.project.document,
        parts: [{
          ...ready.project.document.parts[0],
          staves: [{
            ...ready.project.document.parts[0].staves[0],
            voices: [{
              ...ready.project.document.parts[0].staves[0].voices[0],
              measures: [{
                ...ready.project.document.parts[0].staves[0].voices[0].measures[0],
                events: [{
                  ...ready.project.document.parts[0].staves[0].voices[0]
                    .measures[0].events[0],
                  pitch: "F#4",
                }],
              }],
            }],
          }],
        }],
      },
    } as unknown as NonNullable<LocalScoreProjectMusicXmlImportDraft["project"]>
    : null,
} satisfies LocalScoreProjectMusicXmlImportDraft;
assert.throws(
  () => confirmLocalScoreProjectMusicXmlImportDraft(invalidCanonical),
  /canonical/,
);

for (const [element, code] of [
  ["<tie type=\"start\"/>", "unsupported-tie"],
  ["<notations><slur type=\"start\"/></notations>", "unsupported-slur"],
  ["<lyric><text>la</text></lyric>", "unsupported-lyric"],
  ["<notations><technical><fingering>1</fingering></technical></notations>", "unsupported-fingering"],
  ["<notations><articulations><accent/></articulations></notations>", "unsupported-articulation"],
  ["<accidental>sharp</accidental>", "unsupported-accidental"],
  ["<cue/>", "unsupported-element"],
] as const) {
  const semanticXml = supportedXml.replace(
    "<type>half</type></note>",
    `<type>half</type>${element}</note>`,
  );
  const semanticDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: semanticXml,
    fileName: "semantic.musicxml",
    sourceFormat: "musicxml",
    projectId: `blocked-${code}`,
    now: "2026-07-27T08:10:00.000Z",
    createEventId: () => "unused-event",
  });
  assert.equal(semanticDraft.status, "blocked");
  assert.ok(
    semanticDraft.issues.some((issue) => issue.code === code),
    `canonical 语义不得静默丢失：${code}`,
  );
}

for (const invalidFermata of [
  "<notations><fermata type=\"upright\"/></notations>",
  "<notations><fermata>normal</fermata></notations>",
  "<notations placement=\"above\"><fermata/></notations>",
  "<notations><fermata><other/></fermata></notations>",
  "<notations><fermata/><fermata/></notations>",
  "<notations><fermata/></notations><notations><fermata/></notations>",
  "<notations/>",
  "<fermata/>",
]) {
  const invalidFermataDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: supportedXml.replace(
      "<type>half</type></note>",
      `<type>half</type>${invalidFermata}</note>`,
    ),
    fileName: "invalid-fermata.musicxml",
    sourceFormat: "musicxml",
    projectId: "blocked-invalid-fermata",
    now: "2026-07-27T08:12:00.000Z",
    createEventId: () => "unused-event",
  });
  assert.equal(invalidFermataDraft.status, "blocked");
  assert.ok(
    invalidFermataDraft.issues.some(
      (issue) =>
        issue.code === "unsupported-fermata"
        || issue.code === "unsupported-notations",
    ),
    "非严格 fermata 结构必须失败关闭",
  );
}

for (const misplacedFermataXml of [
  supportedXml.replace(
    "<note><pitch>",
    "<notations><fermata/></notations><note><pitch>",
  ),
  supportedXml.replace(
    "<note><pitch>",
    "<fermata/><note><pitch>",
  ),
  supportedXml.replace(
    "<attributes>",
    "<attributes><notations><fermata/></notations>",
  ),
]) {
  const misplacedFermataDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: misplacedFermataXml,
    fileName: "misplaced-fermata.musicxml",
    sourceFormat: "musicxml",
    projectId: "blocked-misplaced-fermata",
    now: "2026-07-27T08:13:00.000Z",
    createEventId: () => "unused-event",
  });
  assert.equal(misplacedFermataDraft.status, "blocked");
  assert.ok(
    misplacedFermataDraft.issues.some(
      (issue) =>
        issue.code === "unsupported-fermata"
        || issue.code === "unsupported-notations",
    ),
    "note 外错误层级的 fermata/notations 必须失败关闭",
  );
}

const nestedNoteXml = supportedXml.replace(
  /(<note><pitch>[\s\S]*?<\/note>)/,
  "<attributes>$1</attributes>",
);
const nestedNoteDraft = createLocalScoreProjectMusicXmlImportDraft({
  xml: nestedNoteXml,
  fileName: "nested-note.musicxml",
  sourceFormat: "musicxml",
  projectId: "blocked-nested-note",
  now: "2026-07-27T08:14:00.000Z",
  createEventId: () => "unused-event",
});
assert.equal(nestedNoteDraft.status, "blocked");
assert.ok(
  nestedNoteDraft.issues.some(
    (issue) => issue.code === "unsupported-note-hierarchy",
  ),
  "嵌套在非 measure 元素中的 note 必须失败关闭",
);

const missingMeasureNumber = createLocalScoreProjectMusicXmlImportDraft({
  xml: supportedXml.replace('measure number="1"', "measure"),
  fileName: "missing-measure-number.musicxml",
  sourceFormat: "musicxml",
  projectId: "blocked-measure-number",
  now: "2026-07-27T08:15:00.000Z",
  createEventId: () => "unused-event",
});
assert.equal(missingMeasureNumber.status, "blocked");
assert.ok(
  missingMeasureNumber.issues.some(
    (issue) => issue.code === "invalid-measure-number",
  ),
);

for (const malformedXml of [
  supportedXml.replace("<part-name>练习</part-name>", "<part-name>A & B</part-name>"),
  supportedXml.replace("</part-name>", "</part-name-broken>"),
  supportedXml.slice(0, -20),
]) {
  const malformedDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: malformedXml,
    fileName: "malformed.musicxml",
    sourceFormat: "musicxml",
    projectId: "blocked-malformed",
    now: "2026-07-27T08:20:00.000Z",
    createEventId: () => "unused-event",
  });
  assert.equal(malformedDraft.status, "blocked");
  assert.ok(
    malformedDraft.issues.some((issue) => issue.code === "malformed-xml"),
    "非良构 XML 必须失败关闭",
  );
}

for (const [unsupportedXml, code] of [
  [
    supportedXml.replace(
      "<part-list>",
      "<identification><creator type=\"composer\">作者</creator><rights>保留权利</rights></identification><part-list>",
    ),
    "unsupported-root-element",
  ],
  [
    supportedXml.replace(
      "</part-name>",
      "</part-name><score-instrument id=\"P1-I1\"><instrument-name>Piano</instrument-name></score-instrument>",
    ),
    "unsupported-score-part-element",
  ],
  [
    supportedXml.replace('<part id="P1">', '<part id="P2">'),
    "invalid-part-reference",
  ],
  [
    supportedXml.replace(
      '<measure number="1">',
      '<direction><direction-type><words>Allegro</words></direction-type></direction><measure number="1">',
    ),
    "unsupported-part-element",
  ],
  [
    supportedXml.replace("<part-name>练习</part-name>", ""),
    "unsupported-part-name-count",
  ],
] as const) {
  const unsupportedDraft = createLocalScoreProjectMusicXmlImportDraft({
    xml: unsupportedXml,
    fileName: "unsupported-metadata.musicxml",
    sourceFormat: "musicxml",
    projectId: `blocked-${code}`,
    now: "2026-07-27T08:25:00.000Z",
    createEventId: () => "unused-event",
  });
  assert.equal(unsupportedDraft.status, "blocked");
  assert.ok(
    unsupportedDraft.issues.some((issue) => issue.code === code),
    `根级 MusicXML 语义不得静默丢失：${code}`,
  );
}

console.log("Local score project MusicXML import tests passed.");
